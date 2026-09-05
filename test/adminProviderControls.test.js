import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ProviderControlApplicationService } from '../server/domain/admin-configuration/ProviderControlApplicationService.js';
import { ProviderAvailabilityPolicyService } from '../server/domain/admin-configuration/ProviderAvailabilityPolicyService.js';
import { ProviderControlRepository } from '../server/repositories/admin-configuration/ProviderControlRepository.js';
import { AdminFeaturePolicyService } from '../server/domain/admin/AdminFeaturePolicyService.js';

const admin = { userId: 'usr_admin', username: 'admin', role: 'admin' };
const support = { userId: 'usr_support', username: 'support', role: 'support' };

test('admin provider control applies one provider master command to the shared runtime policy', async t => {
  const fixture = await createFixture(t);
  const before = await fixture.service.list(admin);
  assert.equal(before.version, 0);
  assert.equal(before.mutationAvailable, true);
  assert.equal(before.providers.find(item => item.providerId === 'modelark').effectiveEnabled, true);

  const after = await fixture.service.applyCommand({
    targetType: 'provider',
    providerId: 'modelark',
    enabled: false,
    expectedVersion: 0,
    reason: 'Pause all ModelArk generation',
    commandId: 'provider_control_test_0001'
  }, admin);

  assert.equal(after.version, 1);
  assert.equal(after.providers.find(item => item.providerId === 'modelark').runtimeEnabled, false);
  assert.equal(after.providers.find(item => item.providerId === 'modelark').models[0].disabledScope, 'provider');
  assert.throws(() => fixture.availabilityPolicy.assertAvailable({
    providerId: 'modelark', modelId: 'seedream-test', workflow: 'playground.image'
  }), error => error.code === 'provider_runtime_disabled');
  assert.equal(fixture.auditEvents.length, 1);
  assert.equal(fixture.auditEvents[0].event.targetId, 'modelark');
});

test('support sees provider inventory as read-only and cannot mutate it', async t => {
  const fixture = await createFixture(t);
  const inventory = await fixture.service.list(support);
  assert.equal(inventory.mutationAvailable, false);
  assert.match(inventory.mutationReason, /read-only/i);
  await assert.rejects(() => fixture.service.applyCommand({
    targetType: 'provider', providerId: 'modelark', enabled: false,
    expectedVersion: 0, reason: 'Support pause', commandId: 'provider_control_test_0002'
  }, support), error => error.code === 'provider_control_mutation_forbidden');
});

test('admin provider control rejects an unknown workflow target before persistence', async t => {
  const fixture = await createFixture(t);
  await assert.rejects(() => fixture.service.applyCommand({
    targetType: 'workflow', providerId: 'modelark', modelId: 'seedream-test',
    workflow: 'ai.story_plan', enabled: false, expectedVersion: 0,
    reason: 'Wrong workflow mapping', commandId: 'provider_control_test_0003'
  }, admin), error => error.code === 'provider_control_target_unknown');
  assert.equal((await fixture.repository.getState()).version, 0);
});

test('provider runtime mutation defaults on for test and requires an explicit production gate', () => {
  assert.equal(new AdminFeaturePolicyService({ environment: { NODE_ENV: 'test' } })
    .getExposure(admin).capabilities.providerRuntimeControl.enabled, true);
  assert.equal(new AdminFeaturePolicyService({ environment: { NODE_ENV: 'production' } })
    .getExposure(admin).capabilities.providerRuntimeControl.enabled, false);
  assert.equal(new AdminFeaturePolicyService({
    environment: { NODE_ENV: 'production', ADMIN_PROVIDER_RUNTIME_CONTROL_ENABLED: 'true' }
  }).getExposure(admin).capabilities.providerRuntimeControl.enabled, true);
});

async function createFixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-admin-provider-controls-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repository = new ProviderControlRepository({ stateFile: path.join(root, 'controls.json') });
  const availabilityPolicy = new ProviderAvailabilityPolicyService({ repository });
  const auditEvents = [];
  const service = new ProviderControlApplicationService({
    repository,
    availabilityPolicy,
    imageRegistry: {
      getAdminCatalog: () => ({
        schemaVersion: 1,
        providers: [{
          id: 'modelark', displayName: { en: 'ModelArk' }, configured: true, staticEnabled: true,
          models: [{
            id: 'seedream-test', displayName: { en: 'Seedream Test' }, staticEnabled: true,
            paidRoutingEnabled: true, testingRoutingEnabled: false, pricingStatus: 'priced',
            qualificationStatus: 'qualified', capabilities: { imageReferences: true },
            allowedGenerationSurfaces: [], allowedGenerationModes: []
          }]
        }]
      })
    },
    videoRegistry: { getAdminCatalog: () => ({ schemaVersion: 1, models: [] }) },
    featurePolicy: {
      getExposure: () => ({ capabilities: { providerRuntimeControl: { enabled: true, reason: null } } }),
      assertEnabled: () => true
    },
    audit: { record: async (event, actorContext) => { auditEvents.push({ event, actorContext }); } },
    environment: { NODE_ENV: 'test' },
    now: () => '2026-09-05T00:00:00.000Z'
  });
  return { service, repository, availabilityPolicy, auditEvents };
}
