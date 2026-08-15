import assert from 'node:assert/strict';
import test from 'node:test';
import { fashionModelQualificationService } from '../server/domain/fashion-blueprint/FashionModelQualificationService.js';
import { fashionRoutingPolicyService } from '../server/domain/fashion-blueprint/FashionRoutingPolicyService.js';

test('Simple Fashion qualification admits final Gemini route and rejects Lite final output', () => {
  const qualified = fashionModelQualificationService.requireSimpleEligible(
    'gemini',
    'gemini-3.1-flash-image'
  );
  assert.equal(qualified.status, 'qualified');
  assert.equal(qualified.promptStrategyVersion, 'GNB2-S6');
  assert.throws(
    () => fashionModelQualificationService.requireSimpleEligible(
      'gemini',
      'gemini-3.1-flash-lite-image'
    ),
    error => error.code === 'fashion_model_not_qualified'
  );
});

test('Nano Banana Lite remains eligible only for Pose Proxy preparation', () => {
  const record = fashionModelQualificationService.resolve(
    'gemini',
    'gemini-3.1-flash-lite-image',
    'template_pose_proxy_prepare'
  );
  assert.equal(record.operationEligible, true);
  assert.equal(record.status, 'operation_only');
  assert.equal(
    record.promptStrategyVersion,
    'GNB2-S6-CLOTHED-GRID-PROXY-V2'
  );
});

test('Seedream 5.0 Lite is operation-only for wireframe Pose Proxy preparation', () => {
  const record = fashionModelQualificationService.resolve(
    'modelark',
    'seedream-5-0-lite-260128',
    'template_pose_proxy_prepare'
  );
  assert.equal(record.operationEligible, true);
  assert.equal(record.status, 'operation_only');
  assert.equal(record.promptStrategyVersion, 'SEEDREAM5L-WIREFRAME-PROXY-V1');
  assert.throws(
    () => fashionModelQualificationService.requireSimpleEligible(
      'modelark',
      'seedream-5-0-lite-260128'
    ),
    error => error.code === 'fashion_model_not_qualified'
  );
});

test('operation-only proxy models cannot be routed into final Fashion composition', () => {
  assert.throws(
    () => fashionModelQualificationService.requireOperationEligible(
      'gemini',
      'gemini-3.1-flash-lite-image',
      'fashion_final_composition'
    ),
    error => error?.code === 'fashion_model_operation_not_supported'
  );
  const qualified = fashionModelQualificationService.requireOperationEligible(
    'gemini',
    'gemini-3-pro-image',
    'fashion_final_composition'
  );
  assert.equal(qualified.operationEligible, true);
});

test('Fashion Advanced catalog excludes proxy-only and failed models', () => {
  const catalog = fashionRoutingPolicyService.getAdvancedCatalog({
    getPublicCatalog: () => ({
      schemaVersion: 1,
      defaultProvider: 'gemini',
      providers: [{
        id: 'gemini',
        defaultModel: 'gemini-3.1-flash-lite-image',
        models: [
          { id: 'gemini-3.1-flash-lite-image' },
          { id: 'gemini-3.1-flash-image' },
          { id: 'gemini-3-pro-image' }
        ]
      }, {
        id: 'xai',
        defaultModel: 'grok-imagine-image',
        models: [{ id: 'grok-imagine-image' }]
      }]
    })
  });
  assert.deepEqual(
    catalog.providers.find(provider => provider.id === 'gemini').models.map(model => model.id),
    ['gemini-3.1-flash-image', 'gemini-3-pro-image']
  );
  assert.equal(
    catalog.providers.find(provider => provider.id === 'gemini').defaultModel,
    'gemini-3.1-flash-image'
  );
  assert.equal(catalog.providers.some(provider => provider.id === 'xai'), false);
});
