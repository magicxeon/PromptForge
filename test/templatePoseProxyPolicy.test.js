import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import test from 'node:test';
import { TemplatePoseProxyPolicyService } from '../server/domain/template-pose-proxy/TemplatePoseProxyPolicyService.js';
import { TemplatePoseProxyService } from '../server/domain/template-pose-proxy/TemplatePoseProxyService.js';

test('TemplatePoseProxyPolicyService selects the provider-specific wireframe strategy', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-pose-policy-'));
  const policyPath = path.join(directory, 'policy.json');
  await fs.writeFile(policyPath, JSON.stringify({
    policyVersion: 'test-v1',
    operationPurpose: 'template_pose_proxy_prepare',
    providerId: 'modelark',
    modelId: 'seedream-5-0-lite-260128',
    processorStrategyVersion: 'default-strategy',
    prompt: 'Default prompt '.repeat(12),
    automaticFallbacks: [],
    promptProfiles: [{
      providerId: 'modelark',
      modelId: 'seedream-5-0-lite-260128',
      processorStrategyVersion: 'SEEDREAM-WIREFRAME-V1',
      outputRepresentation: 'technical_pose_wireframe',
      prompt: 'Preserve head yaw, pitch, roll, neck rotation and facial plane direction. '.repeat(3)
    }]
  }));

  const policy = new TemplatePoseProxyPolicyService({ policyPath }).getPolicy();
  assert.equal(policy.processorStrategyVersion, 'SEEDREAM-WIREFRAME-V1');
  assert.equal(policy.outputRepresentation, 'technical_pose_wireframe');
  assert.match(policy.prompt, /head yaw, pitch, roll/i);
  assert.match(policy.prompt, /facial plane direction/i);
});

test('default Pose Proxy uses a visibly clothed grid mannequin', () => {
  const policy = new TemplatePoseProxyPolicyService().getPolicy();
  assert.equal(policy.outputRepresentation, 'clothed_grid_mannequin');
  assert.match(policy.processorStrategyVersion, /CLOTHED-GRID/);
  assert.match(policy.prompt, /high crew-neck short-sleeve top/i);
  assert.match(policy.prompt, /mid-thigh shorts/i);
  assert.match(policy.prompt, /contour grid/i);
  assert.match(policy.prompt, /do not show nude anatomy/i);
});

test('Fashion rejects an active Pose Proxy from an obsolete safety strategy', async () => {
  const policy = new TemplatePoseProxyPolicyService().getPolicy();
  const repository = {
    async readAll() {
      return [{
        id: 'proxy_old',
        templateVersionId: 'tmplv_1',
        poseVariantId: 'default',
        status: 'active',
        providerId: policy.providerId,
        modelId: policy.modelId,
        processorPolicyVersion: 'obsolete-policy',
        processorStrategyVersion: 'obsolete-strategy',
        outputRepresentation: 'matte_mannequin'
      }];
    }
  };
  const service = new TemplatePoseProxyService({
    providerRegistry: {},
    queueManager: {},
    repository,
    templateRepository: {},
    versionRepository: {},
    reservationService: {},
    policyService: { getPolicy: () => policy }
  });
  await assert.rejects(
    service.requireActive('tmplv_1'),
    error => error.code === 'fashion_template_pose_proxy_required'
  );
});

test('approving a Pose Proxy activates its owning Template publication once', async () => {
  const activated = [];
  let record = {
    id: 'proxy_review',
    templateId: 'tmpl_1',
    templateVersionId: 'tmplv_1',
    poseVariantId: 'default',
    status: 'review_required',
    qaDecision: 'pending',
    qaReasonCodes: []
  };
  const service = new TemplatePoseProxyService({
    providerRegistry: {},
    generationApplicationService: {},
    repository: {
      findById: async () => structuredClone(record),
      update: async (_id, updater) => {
        record = updater(structuredClone(record));
        return structuredClone(record);
      }
    },
    templateRepository: {
      findById: async () => ({ id: 'tmpl_1', ownerUserId: 'usr_owner' })
    },
    versionRepository: {},
    reservationService: {},
    policyService: {
      getPolicy: () => ({
        policyVersion: 'test-policy',
        processorStrategyVersion: 'test-strategy'
      })
    },
    onActivated: async (input, actor) => activated.push({ input, actor })
  });

  const result = await service.review({
    templateId: 'tmpl_1',
    proxyId: 'proxy_review',
    decision: 'approve'
  }, { userId: 'usr_owner', username: 'owner', role: 'creator' });

  assert.equal(result.status, 'active');
  assert.equal(activated.length, 1);
  assert.deepEqual(activated[0].input, {
    templateId: 'tmpl_1',
    templateVersionId: 'tmplv_1'
  });
});
