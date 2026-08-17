import { performance } from 'node:perf_hooks';
import { createAttributesBundleLoader } from '../server/app/routes/attributesRoutes.js';
import { AttributeCatalogShadowService } from '../server/domain/attribute-catalog/AttributeCatalogShadowService.js';

const startedAt = performance.now();
const bundle = await createAttributesBundleLoader()();
const loadedAt = performance.now();
const result = await new AttributeCatalogShadowService().inspectLegacyBundle(bundle);
const completedAt = performance.now();

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  measuredAt: new Date().toISOString(),
  legacyBundleBytes: Buffer.byteLength(JSON.stringify(bundle)),
  legacyCompileMs: round(loadedAt - startedAt),
  inventoryAndShadowMs: round(completedAt - loadedAt),
  inventory: result.release.inventorySummary,
  validation: result.validation,
  parity: result.parity
}, null, 2)}\n`);

function round(value) {
  return Math.round(value * 100) / 100;
}
