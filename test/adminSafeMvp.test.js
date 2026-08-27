import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AdminFeaturePolicyService } from '../server/domain/admin/AdminFeaturePolicyService.js';
import { AdminPolicyService } from '../server/domain/admin/AdminPolicyService.js';
import { SupportCaseRepository } from '../server/repositories/support/SupportCaseRepository.js';
import { SupportCaseService } from '../server/domain/support/SupportCaseService.js';
import { AdminConfigurationRepository } from '../server/repositories/admin-configuration/AdminConfigurationRepository.js';
import { AdminConfigurationService } from '../server/domain/admin-configuration/AdminConfigurationService.js';

const admin = { userId: 'usr_admin', username: 'admin_demo', role: 'admin', requestId: 'req_admin_safe_mvp' };
const support = { userId: 'usr_support', username: 'support_demo', role: 'support', requestId: 'req_support_safe_mvp' };
const member = { userId: 'usr_member', username: 'member', role: 'user', requestId: 'req_member_safe_mvp' };

test('Admin feature exposure enables safe reads and keeps production commands gated', () => {
  const policy = new AdminFeaturePolicyService({ environment: { NODE_ENV: 'test' } });
  const exposure = policy.getExposure(admin);
  assert.equal(exposure.capabilities.supportCases.enabled, true);
  assert.equal(exposure.capabilities.traceRead.enabled, true);
  assert.equal(exposure.capabilities.financialCommands.enabled, false);
  assert.equal(exposure.capabilities.restrictedMediaReveal.enabled, false);
  assert.throws(() => policy.assertEnabled('financialCommands', admin), { code: 'admin_capability_disabled' });
  assert.throws(() => policy.getExposure(member), { code: 'admin_access_forbidden' });
});

test('Support cases preserve versioned transitions and audit metadata', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-support-case-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repository = new SupportCaseRepository({ casesFile: path.join(root, 'cases.json'), cursorSecret: 'case-test' });
  const events = [];
  const featurePolicy = new AdminFeaturePolicyService({ environment: { SUPPORT_CASES_ENABLED: 'true' } });
  const service = new SupportCaseService({
    repository, featurePolicy, policy: new AdminPolicyService(),
    audit: { record: async event => { events.push(event); return event; } }
  });
  const created = await service.create({ title: 'Video task did not settle', priority: 'high', customerUserId: 'usr_customer' }, support);
  assert.equal(created.status, 'open');
  assert.equal(created.version, 1);
  const updated = await service.update(created.id, { expectedVersion: 1, status: 'investigating', note: 'Provider task located.' }, support);
  assert.equal(updated.status, 'investigating');
  assert.equal(updated.version, 2);
  assert.equal(updated.notes.length, 1);
  await assert.rejects(() => service.update(created.id, { expectedVersion: 1, status: 'resolved' }, admin), { code: 'support_case_version_conflict' });
  assert.deepEqual(events.map(event => event.action), ['support_case_created', 'support_case_updated']);
});

test('Runtime configuration accepts secret-free drafts but keeps publication gated', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-admin-config-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repository = new AdminConfigurationRepository({ revisionsFile: path.join(root, 'revisions.json') });
  const featurePolicy = new AdminFeaturePolicyService({ environment: { ADMIN_RUNTIME_CONFIGURATION_ENABLED: 'true' } });
  const service = new AdminConfigurationService({
    repository, featurePolicy, policy: new AdminPolicyService(), audit: { record: async event => event }
  });
  const validation = service.validate({ scope: 'video_pricing', values: { currency: 'credits', rules: [] } }, admin);
  assert.equal(validation.valid, true);
  const secretValidation = service.validate({ scope: 'providers', values: { apiKey: 'must-not-be-stored' } }, admin);
  assert.equal(secretValidation.valid, false);
  await assert.rejects(
    () => service.createDraft({ scope: 'providers', values: { apiKey: 'must-not-be-stored' } }, admin),
    error => error.code === 'admin_configuration_invalid' && error.details?.errors?.[0]?.code === 'secret_key_forbidden'
  );
  const draft = await service.createDraft({ scope: 'video_pricing', values: { currency: 'credits', rules: [] } }, admin);
  assert.equal(draft.status, 'draft');
  assert.throws(() => service.publish(draft.id, admin), { code: 'admin_capability_disabled' });
});
