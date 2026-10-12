import nodemailer from 'nodemailer';
import { assertIdentityRuntime } from '../../config/identityRuntime.js';
import { createPostgresDatabase } from '../../repositories/postgres/database.js';
import { runMigrations } from '../../repositories/postgres/migrations.js';
import { migrations } from '../../repositories/postgres/migrationRegistry.js';
import { IdentityContextService, authFail } from './IdentityContextService.js';
import { IdentitySessionService } from './IdentitySessionService.js';
import { IdentityEnrollmentService } from './IdentityEnrollmentService.js';
import { IdentityPrimaryAuthenticationService } from './IdentityPrimaryAuthenticationService.js';
import { IdentityChallengeService } from './IdentityChallengeService.js';
import { IdentityDeliveryService } from './IdentityDeliveryService.js';
import { IdentityEmailEventService } from './IdentityEmailEventService.js';
import { IdentityOperationService } from './IdentityOperationService.js';
import { IdentityActionService } from './IdentityActionService.js';
import { IdentityResetService } from './IdentityResetService.js';
import { IdentityGoogleService } from './IdentityGoogleService.js';
import { IdentityFacebookService } from './IdentityFacebookService.js';
import { IdentityFacebookEventService } from './IdentityFacebookEventService.js';
import { IdentitySocialSources } from './IdentitySocialSources.js';
import { IdentityApplicationService } from './IdentityApplicationService.js';
import { IdentityPublicPolicyService } from './IdentityPublicPolicyService.js';
import { IdentityCookies } from './adapters/identityCookies.js';
import { IdentityPasswordAdapter } from './adapters/IdentityPasswordAdapter.js';
import { IdentityPasswordScreeningAdapter } from './adapters/IdentityPasswordScreeningAdapter.js';
import { IdentitySmtpAdapter } from './adapters/IdentitySmtpAdapter.js';
import { IdentityGoogleAdapter } from './adapters/IdentityGoogleAdapter.js';
import { IdentityFacebookAdapter } from './adapters/IdentityFacebookAdapter.js';
import { PostgresIdentityRepository } from '../../repositories/identity/PostgresIdentityRepository.js';
import { PostgresIdentityContextRepository } from '../../repositories/identity/PostgresIdentityContextRepository.js';
import { PostgresIdentitySessionRepository } from '../../repositories/identity/PostgresIdentitySessionRepository.js';
import { PostgresIdentityEnrollmentRepository } from '../../repositories/identity/PostgresIdentityEnrollmentRepository.js';
import { PostgresIdentityPrimaryRepository } from '../../repositories/identity/PostgresIdentityPrimaryRepository.js';
import { PostgresIdentityChallengeRepository } from '../../repositories/identity/PostgresIdentityChallengeRepository.js';
import { PostgresIdentityOperationRepository } from '../../repositories/identity/PostgresIdentityOperationRepository.js';
import { PostgresIdentityActionRepository } from '../../repositories/identity/PostgresIdentityActionRepository.js';
import { PostgresIdentityResetRepository } from '../../repositories/identity/PostgresIdentityResetRepository.js';
import { PostgresIdentityEmailEventRepository } from '../../repositories/identity/PostgresIdentityEmailEventRepository.js';
import { PostgresIdentitySocialRepository } from '../../repositories/identity/PostgresIdentitySocialRepository.js';
import { PostgresIdentityFacebookEventRepository } from '../../repositories/identity/PostgresIdentityFacebookEventRepository.js';
import { PostgresSecurityAuditRepository } from '../../repositories/audit/PostgresSecurityAuditRepository.js';
import { AuditService } from '../audit/AuditService.js';

const compositions = new WeakMap();
export const isIdentityRuntimeComposition = value => !!value && compositions.has(value);
export const isIdentityRuntimeDeploymentReady = value => isIdentityRuntimeComposition(value) && compositions.get(value)() === true;

// No createApp, workers, dotenv, migration application, Credit or provider
// generation imports. Construction is separate from explicit mail lifecycle.
export async function createIdentityRuntime({ runtime, database: suppliedDatabase, schema = 'public',
  fixtureTransports, clock = Date, onError = () => {} } = {}) {
  assertIdentityRuntime(runtime);
  if (fixtureTransports !== undefined && (!fixtureTransports || Object.getPrototypeOf(fixtureTransports) !== Object.prototype
    || Object.keys(fixtureTransports).some(k => !['fetch', 'smtpTransportFactory', 'emailEventVerifier', 'emailProviderScope'].includes(k))
    || typeof fixtureTransports.fetch !== 'function' || runtime.smtp && typeof fixtureTransports.smtpTransportFactory !== 'function')) authFail('auth_service_unavailable');
  const injected = fixtureTransports !== undefined;
  const database = suppliedDatabase ?? createPostgresDatabase({ env: runtime.databaseEnv });
  let mailAdapter, timer, running, started = false, closed = false;
  const report = () => { try { onError({ code: 'AUTH_RUNTIME_OPERATION_UNAVAILABLE' }); } catch {} };
  const stop = async () => {
    started = false; clearTimeout(timer); timer = undefined;
    if (running) await running;
  };
  const close = async () => {
    if (closed) return;
    closed = true;
    await stop();
    mailAdapter?.mailer?.close();
    if (!suppliedDatabase) await database.close();
  };
  try {
    const registry = migrations.map(m => ({ ...m, sql: m.sql.replaceAll('"public"', `"${schema}"`) }));
    const status = await runMigrations(database, registry, { mode: 'status', schema });
    if (status.pending.length) authFail('auth_service_unavailable');
    const options = { database, schema }, rings = runtime.keyrings;
    const identity = new PostgresIdentityRepository(options), operations = new PostgresIdentityOperationRepository(options);
    const primaryRepository = new PostgresIdentityPrimaryRepository(options), challengeRepository = new PostgresIdentityChallengeRepository(options);
    let primary, enrollment, actions, reset, facade;
    const sources = [];
    const contexts = new IdentityContextService({ repository: new PostgresIdentityContextRepository(options),
      browserKeys: rings.browser, csrfKeys: rings.csrf, metadataKeys: rings.metadata, clock,
      targetResolver: async (proposal, { transaction } = {}) => {
        if (proposal.purpose === 'registration') return enrollment.resolveTarget(proposal);
        if (proposal.purpose === 'login' && primary) return primary.resolveOtpTarget(proposal);
        if (proposal.purpose === 'password_reset' && reset) return reset.resolveTarget(proposal);
        if (proposal.purpose === 'reauthentication' && proposal.actor && actions) {
          // Only the facade's private actor proof supplies this account/session.
          if (!transaction || !sources.length) authFail('auth_action_unavailable');
          const account = await contexts.repository.bind(transaction).account(proposal.actor.accountId);
          const email = account && await sources[0].repository.bind(transaction).email(account.id);
          if (!account || !email || account.status !== 'active' || account.security_version !== proposal.actor.securityVersion || proposal.target !== account.id) authFail('auth_action_unavailable');
          return { purpose: proposal.purpose, targetId: proposal.target, accountId: account.id, securityVersion: account.security_version,
            canonicalEmail: email.canonical_email, deliveryEmail: email.delivery_email,
            action: { name: proposal.action, target: proposal.target, sessionId: proposal.actor.sessionId } };
        }
        authFail('auth_service_unavailable');
      } });
    const audit = new AuditService({ securityRepository: new PostgresSecurityAuditRepository({ schema }),
      securityFingerprintKey: rings.audit.keys[rings.audit.current], securityFingerprintKeyVersion: rings.audit.current });
    const sessions = new IdentitySessionService({ repository: new PostgresIdentitySessionRepository(options), contexts,
      sessionKeys: rings.session, clock, operationRepository: operations, auditService: audit,
      peerProvider: () => facade.requestPeer(), staffBootstrapQualified: false,
      verifyEnrollment: proof => enrollment.verifiedActivation(proof),
      verifyAuthentication: async proof => {
        const matches = [];
        if (primary) {
          const r = primaryRepository.bind(proof.transaction);
          if (await r.proof(proof.context.id, proof.proofRef) || await r.otpProof(proof.context.id, proof.proofRef)) matches.push(primary);
        }
        for (const source of sources) if (await source.repository.bind(proof.transaction).exchange(proof.proofRef)) matches.push(source);
        if (matches.length !== 1) authFail('auth_session_expired');
        return matches[0].verifyAuthentication(proof);
      } });
    const fetch = fixtureTransports?.fetch ?? globalThis.fetch;
    let passwords;
    if (runtime.methods.password) {
      passwords = new IdentityPasswordAdapter({ runtime, screening: new IdentityPasswordScreeningAdapter({ runtime, fetch }) });
      await passwords.prepare();
    }
    enrollment = new IdentityEnrollmentService({ repository: new PostgresIdentityEnrollmentRepository(options), contexts,
      sessions, passwordAdapter: passwords, legal: runtime.legal, runtime });
    let delivery, challenges, emailEvents;
    if (runtime.methods.emailOtp) {
      mailAdapter = new IdentitySmtpAdapter({ config: runtime.smtp, runtime,
        transportFactory: fixtureTransports?.smtpTransportFactory ?? (options => nodemailer.createTransport(options).transporter) });
      const eventsRepository = new PostgresIdentityEmailEventRepository(options);
      delivery = new IdentityDeliveryService({ repository: operations, eventRepository: eventsRepository, adapter: mailAdapter,
        keyring: rings.delivery, recipientKeys: rings.recipient, runtime, clock });
      sessions.deliveryService = delivery;
      primary = new IdentityPrimaryAuthenticationService({ repository: primaryRepository, rateRepository: challengeRepository,
        contexts, sessions, passwordAdapter: passwords, proofKeys: rings.primaryProof, rateKeys: rings.primaryRate, runtime, clock });
      if (fixtureTransports?.emailEventVerifier) emailEvents = new IdentityEmailEventService({ repository: eventsRepository,
        verifyEvent: fixtureTransports.emailEventVerifier, providerScope: fixtureTransports.emailProviderScope, runtime, clock });
    }
    const actionOperations = new IdentityOperationService({ repository: operations, identityRepository: identity,
      auditService: audit, deliveryService: delivery, fingerprintKeys: rings.actionFingerprint, receiptKeys: rings.actionReceipt,
      verifyProof: proof => actions.verifyOperation(proof), handlers: { password_reset: proof => {
        if (!reset) authFail('auth_action_unavailable'); return reset.mutate(proof);
      } }, clock });
    actions = new IdentityActionService({ repository: new PostgresIdentityActionRepository(options), contexts, sessions,
      operations: actionOperations, runtime, verifyMethod: async proof => {
        if (proof.context.purpose === 'password_reset' && reset) return reset.verifyMethod(proof);
        if (proof.context.purpose !== 'reauthentication') authFail('auth_action_unavailable');
        const found = [];
        for (const source of sources) if (await source.repository.bind(proof.transaction).exchange(proof.proofRef)) found.push(source);
        if (found.length !== 1) authFail('auth_action_unavailable');
        return found[0].verifyMethod(proof);
      } });
    if (runtime.methods.password) reset = new IdentityResetService({ repository: new PostgresIdentityResetRepository(options),
      contexts, actions, operations: actionOperations, passwordAdapter: passwords, runtime });
    if (delivery) challenges = new IdentityChallengeService({ repository: challengeRepository, operationRepository: operations,
      identityRepository: identity, deliveryService: delivery, resolveBinding: proof => contexts.resolveBinding(proof),
      handlers: { registration: proof => enrollment.recordVerification(proof), login: proof => primary.recordOtpVerification(proof),
        password_reset: proof => { if (!reset) authFail('auth_action_unavailable'); return reset.recordVerification(proof); } },
      otpKeys: rings.otp, targetKeys: rings.target, rateKeys: rings.challengeRate, operationKeys: rings.challengeOperation,
      receiptKeys: rings.challengeReceipt, clock });
    let google, facebook;
    for (const provider of ['google', 'facebook']) {
      if (!runtime.methods[provider]) continue;
      const Adapter = provider === 'google' ? IdentityGoogleAdapter : IdentityFacebookAdapter;
      const Service = provider === 'google' ? IdentityGoogleService : IdentityFacebookService;
      const adapter = new Adapter({ ...runtime.social[provider], fetch, clock, runtime });
      const service = new Service({ repository: new PostgresIdentitySocialRepository({ ...options, provider, issuer: adapter.issuer }),
        operationRepository: operations, identityRepository: identity, contexts, sessions, actions, enrollment, adapter, runtime,
        stateKeys: rings[`${provider}State`], protectedKeys: rings[`${provider}Protected`],
        fingerprintKeys: rings[`${provider}Fingerprint`], receiptKeys: rings[`${provider}Receipt`] });
      sources.push(service);
      if (provider === 'google') google = service;
      else {
        facebook = service;
        facebook.events = new IdentityFacebookEventService({ repository: new PostgresIdentityFacebookEventRepository(options),
          adapter, sessions, receiptOrigin: `${runtime.receiptOrigin}/`, runtime });
      }
    }
    enrollment.social = new IdentitySocialSources(sources);
    const method = name => ({ configured: runtime.methods[name] === true, qualified: !injected, fixtureOnly: injected });
    const publicPolicy = new IdentityPublicPolicyService({ legal: runtime.legal, qualification: {
      productionApproved: !injected, durableContextQualified: true, retentionApproved: !injected,
      email: method('emailOtp'), password: method('password'), google: method('google'), facebook: method('facebook') } });
    facade = new IdentityApplicationService({ contexts, sessions, cookies: new IdentityCookies({ runtime, mode: runtime.cookieMode,
      allowedOrigins: runtime.origins }), publicPolicy, identityRepository: identity, enrollment, primary, challenges, actions, reset, google, facebook });
    const dispatch = () => {
      if (closed || !delivery) return Promise.resolve({ processed: 0 });
      if (running) return running;
      running = delivery.process().catch(() => { report(); return { processed: 0 }; }).finally(() => { running = undefined; });
      return running;
    };
    const tick = async () => {
      await dispatch();
      if (started && !closed) { timer = setTimeout(tick, 1000); timer.unref?.(); }
    };
    const start = () => {
      if (started || closed || !delivery) return;
      started = true; timer = setTimeout(tick, 0); timer.unref?.();
    };
    const composition = Object.freeze({ identityApplicationService: facade, database, contexts, sessions, enrollment, primary, challenges,
      actions, reset, google, facebook, delivery, emailEvents, publicPolicy, sourceQualified: true, deploymentReady: !injected,
      start, stop, dispatch, close });
    compositions.set(composition, () => !closed && !injected);
    return composition;
  } catch {
    await close().catch(() => {});
    authFail('auth_service_unavailable');
  }
}
