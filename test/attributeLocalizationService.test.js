import assert from 'node:assert/strict';
import test from 'node:test';
import { AttributeLocalizationService } from '../server/domain/attribute-catalog/AttributeLocalizationService.js';

test('Attribute localization preserves reviewed locale labels when English is unchanged', async () => {
  let providerCalls = 0;
  const service = new AttributeLocalizationService({
    localeLoader: async () => ['en', 'th'],
    policyLoader: () => ({ enabled: true }),
    providerFactory: () => ({
      localizeAttribute: async () => {
        providerCalls += 1;
        return { translations: { th: 'ใหม่' } };
      }
    }),
    now: () => '2026-08-15T00:00:00.000Z'
  });
  const result = await service.localize({
    englishLabel: 'Structured blazer',
    previousLabels: { en: 'Structured blazer', th: 'เสื้อเบลเซอร์ทรงโครงสร้าง' }
  });
  assert.equal(result.labels.th, 'เสื้อเบลเซอร์ทรงโครงสร้าง');
  assert.equal(result.metadata.status, 'preserved');
  assert.equal(providerCalls, 0);
});

test('Attribute localization generates enabled locales and falls back safely when unavailable', async () => {
  const generated = new AttributeLocalizationService({
    localeLoader: async () => ['th', 'en'],
    policyLoader: () => ({ enabled: true, provider: 'openai', model: 'text-model' }),
    providerFactory: () => ({
      localizeAttribute: async () => ({ translations: { th: 'ชุดสูทผ่อนคลาย' }, responseId: 'resp_1' })
    })
  });
  const generatedResult = await generated.localize({ englishLabel: 'Relaxed suit' });
  assert.deepEqual(generatedResult.labels, { en: 'Relaxed suit', th: 'ชุดสูทผ่อนคลาย' });
  assert.equal(generatedResult.metadata.status, 'generated');

  const fallback = new AttributeLocalizationService({
    localeLoader: async () => ['en', 'th'],
    policyLoader: () => ({ enabled: false, requestedEnabled: true })
  });
  const fallbackResult = await fallback.localize({ englishLabel: 'Relaxed suit' });
  assert.deepEqual(fallbackResult.labels, { en: 'Relaxed suit', th: 'Relaxed suit' });
  assert.equal(fallbackResult.metadata.status, 'fallback');
  assert.equal(fallbackResult.metadata.warning, 'attribute_localization_provider_unavailable');
});
