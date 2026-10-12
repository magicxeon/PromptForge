// Isolated browser qualification only. Never imports createApp, dotenv or workers.
// Prerequisites: disposable Auth PostgreSQL and frontend-only Vite on5189.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import http from 'node:http';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import express from 'express';
import { chromium } from 'playwright';
import { withDisposableAuthDatabase, createFakeMail, createFakeClock } from './fixtures.mjs';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { identityMigrations } from '../../server/repositories/identity/identityMigrations.js';
import { securityAuditMigrations } from '../../server/repositories/audit/securityAuditMigrations.js';
import { identityOperationMigrations } from '../../server/repositories/identity/identityOperationMigrations.js';
import { identityChallengeMigrations } from '../../server/repositories/identity/identityChallengeMigrations.js';
import { identityEmailDeliveryMigrations } from '../../server/repositories/identity/identityEmailDeliveryMigrations.js';
import { identitySessionMigrations } from '../../server/repositories/identity/identitySessionMigrations.js';
import { identityActorMigrations } from '../../server/repositories/identity/identityActorMigrations.js';
import { identityEnrollmentMigrations } from '../../server/repositories/identity/identityEnrollmentMigrations.js';
import { identityPrimaryMigrations } from '../../server/repositories/identity/identityPrimaryMigrations.js';
import { identityOtpLoginMigrations } from '../../server/repositories/identity/identityOtpLoginMigrations.js';
import { identityActionMigrations } from '../../server/repositories/identity/identityActionMigrations.js';
import { PostgresIdentityActionRepository } from '../../server/repositories/identity/PostgresIdentityActionRepository.js';
import { PostgresIdentityResetRepository } from '../../server/repositories/identity/PostgresIdentityResetRepository.js';
import { IdentityActionService } from '../../server/domain/identity/IdentityActionService.js';
import { IdentityResetService } from '../../server/domain/identity/IdentityResetService.js';
import { IdentityOperationService } from '../../server/domain/identity/IdentityOperationService.js';
import { PostgresIdentityRepository } from '../../server/repositories/identity/PostgresIdentityRepository.js';
import { PostgresIdentityOperationRepository } from '../../server/repositories/identity/PostgresIdentityOperationRepository.js';
import { PostgresIdentityChallengeRepository } from '../../server/repositories/identity/PostgresIdentityChallengeRepository.js';
import { PostgresIdentityContextRepository } from '../../server/repositories/identity/PostgresIdentityContextRepository.js';
import { PostgresIdentitySessionRepository } from '../../server/repositories/identity/PostgresIdentitySessionRepository.js';
import { PostgresIdentityEnrollmentRepository } from '../../server/repositories/identity/PostgresIdentityEnrollmentRepository.js';
import { PostgresIdentityPrimaryRepository } from '../../server/repositories/identity/PostgresIdentityPrimaryRepository.js';
import { PostgresIdentityEmailEventRepository } from '../../server/repositories/identity/PostgresIdentityEmailEventRepository.js';
import { PostgresSecurityAuditRepository } from '../../server/repositories/audit/PostgresSecurityAuditRepository.js';
import { IdentityContextService } from '../../server/domain/identity/IdentityContextService.js';
import { IdentitySessionService } from '../../server/domain/identity/IdentitySessionService.js';
import { IdentityChallengeService } from '../../server/domain/identity/IdentityChallengeService.js';
import { IdentityDeliveryService } from '../../server/domain/identity/IdentityDeliveryService.js';
import { IdentityEnrollmentService } from '../../server/domain/identity/IdentityEnrollmentService.js';
import { IdentityPrimaryAuthenticationService } from '../../server/domain/identity/IdentityPrimaryAuthenticationService.js';
import { IdentityApplicationService } from '../../server/domain/identity/IdentityApplicationService.js';
import { IdentityPublicPolicyService } from '../../server/domain/identity/IdentityPublicPolicyService.js';
import { IdentityPasswordAdapter } from '../../server/domain/identity/adapters/IdentityPasswordAdapter.js';
import { IdentityCookies } from '../../server/domain/identity/adapters/identityCookies.js';
import { AuditService } from '../../server/domain/audit/AuditService.js';
import { registerAuthRoutes } from '../../server/app/routes/authRoutes.js';
import { registerIdentityRoutes } from '../../server/app/routes/identityRoutes.js';
import { createRealActorContextMiddleware } from '../../server/middleware/actorContextMiddleware.js';

test('real React browser entry with canonical SQL Auth and private fake email', { timeout: 90000 }, async (t) => {
  assert.equal(process.env.MPF_TEST_AUTH_BROWSER_FIXTURE, 'true', 'Explicit isolated browser-fixture opt-in required.');
  const frontend = 'http://127.0.0.1:5189';
  await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
    const clock = createFakeClock(Date.now()), ring = () => ({ current: 1, keys: { 1: randomBytes(32) } });
    await runMigrations(database, [identityMigrations, securityAuditMigrations, identityOperationMigrations,
      identityChallengeMigrations, identityEmailDeliveryMigrations, identitySessionMigrations, identityActorMigrations,
      identityEnrollmentMigrations, identityPrimaryMigrations, identityOtpLoginMigrations, identityActionMigrations].flatMap(m => m(schema)), { mode: 'apply', schema });
    const options = { database, schema }, identity = new PostgresIdentityRepository(options),
      operations = new PostgresIdentityOperationRepository(options), mail = createFakeMail();
    let primary, enrollment, facade, actions, reset;
    const contexts = new IdentityContextService({ repository: new PostgresIdentityContextRepository(options),
      browserKeys: ring(), csrfKeys: ring(), metadataKeys: ring(),
      targetResolver: p => p.purpose === 'password_reset' ? reset.resolveTarget(p)
        : p.purpose === 'login' ? primary.resolveOtpTarget(p) : enrollment.resolveTarget(p), clock });
    const audit = new AuditService({ securityRepository: new PostgresSecurityAuditRepository({ schema }),
      securityFingerprintKey: randomBytes(32), securityFingerprintKeyVersion: 1 });
    const sessions = new IdentitySessionService({ repository: new PostgresIdentitySessionRepository(options), contexts,
      sessionKeys: ring(), verifyAuthentication: p => primary.verifyAuthentication(p),
      verifyEnrollment: p => enrollment.verifiedActivation(p), auditService: audit, peerProvider: () => facade.requestPeer(), clock });
    const passwords = new IdentityPasswordAdapter({ fixtureOnly: true,
      screening: { available: true, async check() { return { compromised: false }; } } });
    await passwords.prepare();
    const legal = { approved: true, termsVersion: 'fixture-terms-v1', privacyVersion: 'fixture-privacy-v1' };
    enrollment = new IdentityEnrollmentService({ repository: new PostgresIdentityEnrollmentRepository(options), contexts,
      sessions, passwordAdapter: passwords, legal, fixtureOnly: true });
    primary = new IdentityPrimaryAuthenticationService({ repository: new PostgresIdentityPrimaryRepository(options),
      rateRepository: new PostgresIdentityChallengeRepository(options), contexts, sessions, passwordAdapter: passwords,
      proofKeys: ring(), rateKeys: ring(), fixtureOnly: true, clock });
    const delivery = new IdentityDeliveryService({ repository: operations, eventRepository: new PostgresIdentityEmailEventRepository(options),
      keyring: ring(), recipientKeys: ring(), adapter: mail, clock, fixtureOnly: true });
    const operationService = new IdentityOperationService({ repository: operations, identityRepository: identity,
      auditService: audit, deliveryService: delivery, fingerprintKeys: ring(), receiptKeys: ring(),
      verifyProof: p => actions.verifyOperation(p), handlers: { password_reset: p => reset.mutate(p) }, clock });
    actions = new IdentityActionService({ repository: new PostgresIdentityActionRepository(options), contexts, sessions,
      operations: operationService, verifyMethod: p => reset.verifyMethod(p), fixtureOnly: true });
    reset = new IdentityResetService({ repository: new PostgresIdentityResetRepository(options), contexts, actions,
      operations: operationService, passwordAdapter: passwords, fixtureOnly: true });
    const challenges = new IdentityChallengeService({ repository: new PostgresIdentityChallengeRepository(options),
      operationRepository: operations, identityRepository: identity, deliveryService: delivery,
      resolveBinding: p => contexts.resolveBinding(p), handlers: { registration: p => enrollment.recordVerification(p),
        login: p => primary.recordOtpVerification(p), password_reset: p => reset.recordVerification(p) },
      otpKeys: ring(), targetKeys: ring(), rateKeys: ring(), operationKeys: ring(), receiptKeys: ring(), clock });
    // Fixture-only presentation enables these forms inside this test. This never
    // changes production qualification or claims the fake mail is a real sender.
    const projection = new IdentityPublicPolicyService({ legal }).project();
    facade = new IdentityApplicationService({ contexts, sessions, enrollment, primary, challenges, actions, reset, identityRepository: identity,
      cookies: new IdentityCookies({ mode: 'local', allowedOrigins: [frontend], fixtureOnly: true }),
      publicPolicy: { project: () => ({ ...projection, methods: { password: true, emailOtp: true, google: false, facebook: false } }) } });
    const app = express();
    app.use(express.json({ limit: '32kb' }));
    app.use(createRealActorContextMiddleware({ identityApplicationService: facade }));
    registerAuthRoutes(app, { identityApplicationService: facade });
    registerIdentityRoutes(app, { identityApplicationService: facade });
    const server = http.createServer(app); server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const backend = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const catalog = JSON.parse(await readFile(new URL('../../client/i18n/locales/en/authentication.json', import.meta.url), 'utf8'));
      const label = key => catalog[key];
      const browserContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await browserContext.addInitScript(() => { localStorage.setItem('model_prompt_forge_language', 'en'); });
      const page = await browserContext.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', async route => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin !== frontend) return route.abort();
        // These Vite prefixes proxy the application server; never forward them.
        if (/^\/(assets|outputs)(\/|$)/.test(url.pathname)) return route.abort();
        if (url.pathname.startsWith('/i18n/')) {
          if (!/^\/i18n\/(manifest\.json|locales\/[a-z-]+\/[a-z-]+\.json)$/.test(url.pathname)) return route.abort();
          return route.fulfill({ contentType: 'application/json', body: await readFile(new URL(`../../client${url.pathname}`, import.meta.url), 'utf8') });
        }
        if (!url.pathname.startsWith('/api/')) return route.continue();
        if (url.pathname === '/api/me' || url.pathname.startsWith('/api/auth/') || url.pathname === '/api/user-preferences') {
          const headers = await req.allHeaders(); delete headers.host; delete headers['content-length'];
          const response = await browserContext.request.fetch(`${backend}${url.pathname}${url.search}`, { method: req.method(), headers, data: req.postDataBuffer() ?? undefined });
          if (req.method() === 'POST' && url.pathname === '/api/auth/challenges' && response.status() === 202) await delivery.process();
          return route.fulfill({ response });
        }
        if (url.pathname === '/api/community/features') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ actorId: null, flags: {}, public: {}, viewer: {} }) });
        return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"isolated_fixture_unavailable"}' });
      });
      async function open(path) { await page.goto(`${frontend}${path}`); }
      async function fillEmail(value) { await page.getByLabel(label('form.email'), { exact: true }).fill(value); }
      async function verifyCode(email) {
        await page.getByLabel(label('form.code'), { exact: true }).waitFor();
        await page.getByLabel(label('form.code'), { exact: true }).fill(mail.messages().filter(m => m.to === email && typeof m.code === 'string').at(-1).code);
        await page.getByRole('button', { name: label('form.verify'), exact: true }).click();
      }
      const email = `browser-${randomUUID()}@example.invalid`, password = `Private fixture ${randomUUID()}`;
      await t.test('signup creates one SQL account and cookie session from explicit OTP/consent', async () => {
        await open('/register?returnTo=%2F'); await fillEmail(email);
        await page.getByRole('button', { name: label('form.sendCode'), exact: true }).click();
        await verifyCode(email);
        await page.getByLabel(label('form.name'), { exact: true }).fill('Browser Fixture');
        await page.getByLabel(label('form.addPassword'), { exact: true }).check();
        await page.getByLabel(label('form.password'), { exact: true }).fill(password);
        await page.getByLabel(label('form.confirmPassword'), { exact: true }).fill(password);
        await page.getByLabel(label('form.acceptTerms'), { exact: true }).check();
        await page.getByRole('button', { name: label('form.createAccount'), exact: true }).click();
        await page.waitForURL(`${frontend}/`);
        assert.equal((await database.query(`SELECT count(*)::int n FROM "${schema}".identity_accounts`)).rows[0].n, 1);
        assert.ok((await browserContext.cookies()).some(c => c.httpOnly && /session/.test(c.name)));
      });
      await t.test('wrong password is recoverable and valid password confirms SQL session', async () => {
        await browserContext.clearCookies(); await open('/login?returnTo=%2F'); await fillEmail(email);
        await page.getByLabel(label('form.password'), { exact: true }).fill('incorrect fixture password');
        await page.getByRole('button', { name: label('auth.signIn'), exact: true }).click();
        await page.getByRole('alert').filter({ hasText: label('form.credentialsRejected') }).waitFor();
        assert.equal(await page.getByLabel(label('form.email'), { exact: true }).inputValue(), email);
        assert.equal(await page.getByLabel(label('form.password'), { exact: true }).inputValue(), '');
        await page.getByLabel(label('form.password'), { exact: true }).fill(password);
        await page.getByRole('button', { name: label('auth.signIn'), exact: true }).click();
        await page.waitForURL(`${frontend}/`);
      });
      await t.test('known email OTP authenticates without changing the password', async () => {
        // Shared email cooldown applies across enrollment/login contexts.
        clock.advance(61000);
        await browserContext.clearCookies(); await open('/login?returnTo=%2F'); await fillEmail(email);
        await page.getByRole('button', { name: label('form.useCode'), exact: true }).click();
        await verifyCode(email); await page.waitForURL(`${frontend}/`);
        assert.equal((await database.query(`SELECT count(*)::int n FROM "${schema}".identity_password_credentials`)).rows[0].n, 1);
      });
      await t.test('forgot-password reuses login OTP without changing the existing credential', async () => {
        clock.advance(61000);
        const before = (await database.query(`SELECT protected_hash FROM "${schema}".identity_password_credentials`)).rows[0].protected_hash;
        await browserContext.clearCookies(); await open('/login?returnTo=%2F'); await fillEmail(email);
        await page.getByRole('link', { name: label('form.forgotPassword'), exact: true }).click();
        await page.getByText(label('form.recoverAccess'), { exact: true }).waitFor();
        assert.equal(await page.getByLabel(label('form.password'), { exact: true }).count(), 0);
        assert.equal(await page.getByLabel(label('form.email'), { exact: true }).inputValue(), email);
        await page.getByRole('button', { name: label('form.sendLoginCode'), exact: true }).click();
        await verifyCode(email); await page.waitForURL(`${frontend}/`);
        assert.equal((await database.query(`SELECT protected_hash FROM "${schema}".identity_password_credentials`)).rows[0].protected_hash, before);
      });
      await t.test('unknown OTP email requires explicit enrollment exchange before signup form', async () => {
        const unknown = `new-${randomUUID()}@example.invalid`;
        await browserContext.clearCookies(); await open('/login?returnTo=%2F'); await fillEmail(unknown);
        await page.getByRole('button', { name: label('form.useCode'), exact: true }).click(); await verifyCode(unknown);
        await page.getByRole('button', { name: label('form.createAccount'), exact: true }).click();
        await page.getByLabel(label('form.name'), { exact: true }).waitFor();
        assert.equal(await page.getByLabel(label('form.acceptTerms'), { exact: true }).isChecked(), false);
        assert.equal((await database.query(`SELECT count(*)::int n FROM "${schema}".identity_accounts`)).rows[0].n, 1);
        assert.equal(mail.messages().filter(m => m.to === unknown).length, 1);
      });
      await t.test('explicit password replacement ends old sessions and requires normal login', async () => {
        clock.advance(61000);
        const before = (await database.query(`SELECT protected_hash FROM "${schema}".identity_password_credentials`)).rows[0].protected_hash;
        await browserContext.clearCookies(); await open('/reset-password?returnTo=%2F'); await fillEmail(email);
        await page.getByRole('button', { name: label('form.sendCode'), exact: true }).click(); await verifyCode(email);
        const replacement = `New browser fixture ${randomUUID()}`;
        await page.getByLabel(label('form.password'), { exact: true }).fill(replacement);
        await page.getByLabel(label('form.confirmPassword'), { exact: true }).fill(replacement);
        await page.getByRole('button', { name: label('reset.save'), exact: true }).click();
        await page.getByText(label('reset.success'), { exact: true }).waitFor();
        assert.equal(new URL(page.url()).pathname, '/reset-password');
        assert.equal((await browserContext.cookies()).filter(c => /session/.test(c.name) && c.value).length, 0);
        assert.notEqual((await database.query(`SELECT protected_hash FROM "${schema}".identity_password_credentials`)).rows[0].protected_hash, before);
        assert.equal((await database.query(`SELECT count(*)::int n FROM "${schema}".identity_sessions WHERE revoked_at IS NULL`)).rows[0].n, 0);
        await page.getByRole('region', { name: label('reset.successTitle'), exact: true }).getByRole('link', { name: label('auth.signIn'), exact: true }).click();
        await page.getByLabel(label('form.password'), { exact: true }).fill(replacement);
        await page.getByRole('button', { name: label('auth.signIn'), exact: true }).click();
        await page.waitForURL(`${frontend}/`);
      });
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
  });
});
