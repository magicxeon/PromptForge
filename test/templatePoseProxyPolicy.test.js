import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import test from 'node:test';
import { TemplatePoseProxyPolicyService } from '../server/domain/template-pose-proxy/TemplatePoseProxyPolicyService.js';

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
