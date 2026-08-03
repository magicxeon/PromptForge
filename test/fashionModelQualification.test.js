import assert from 'node:assert/strict';
import test from 'node:test';
import { fashionModelQualificationService } from '../server/domain/fashion-blueprint/FashionModelQualificationService.js';

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
