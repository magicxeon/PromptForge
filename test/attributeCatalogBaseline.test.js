import assert from 'node:assert/strict';
import test from 'node:test';
import { ATTRIBUTE_SOURCE_FILES } from '../server/config/attributeCatalogSource.js';
import { createAttributesBundleLoader } from '../server/app/routes/attributesRoutes.js';
import { AttributeCatalogShadowService } from '../server/domain/attribute-catalog/AttributeCatalogShadowService.js';
import { AttributeCatalogSourceRepository } from '../server/repositories/attribute-catalog/AttributeCatalogSourceRepository.js';

test('Attribute Catalog inventory accounts for current semantic and visual sources', async () => {
  assert.equal(ATTRIBUTE_SOURCE_FILES.length, 25);
  assert.equal(new Set(ATTRIBUTE_SOURCE_FILES).size, 25);

  const repository = new AttributeCatalogSourceRepository();
  const inventory = await repository.createInventory();
  assert.equal(inventory.attributeFiles.length, 25);
  assert.equal(inventory.specFiles.length, 5);
  assert.equal(inventory.manifestIndexes.length, 2);
  assert.equal(inventory.fieldManifests.length, 19);
  assert.equal(inventory.indexedFieldManifestCount, 18);
  assert.deepEqual(
    inventory.unindexedFieldManifests.map(item => item.file),
    ['headshot-v1/face-structure/shape/manifest.json']
  );
  assert.deepEqual(inventory.duplicateAttributeIds, [
    'clothing.casual_05',
    'clothing.casual_06',
    'clothing.casual_07',
    'clothing.casual_08',
    'clothing.casual_09'
  ]);
  assert.equal(inventory.unknownVisualAttributeIds.length, 0);
  assert.ok(inventory.attributeOptionCount > 0);
  assert.ok(inventory.visualItemCount > 0);
});

test('shadow release round-trips the current public bundle without semantic loss', async () => {
  const getAttributesBundle = createAttributesBundleLoader();
  const legacyBundle = await getAttributesBundle();
  const shadow = await new AttributeCatalogShadowService().inspectLegacyBundle(legacyBundle);

  assert.equal(shadow.validation.valid, false);
  assert.deepEqual(
    shadow.validation.errors.map(error => error.entityId),
    [
      'clothing.casual_05',
      'clothing.casual_06',
      'clothing.casual_07',
      'clothing.casual_08',
      'clothing.casual_09'
    ]
  );
  assert.equal(shadow.parity.equal, true);
  assert.equal(shadow.parity.legacyFingerprint, shadow.parity.shadowFingerprint);
  assert.deepEqual(shadow.release.bundle, legacyBundle);
  assert.equal(shadow.release.inventorySummary.attributeFileCount, 25);
  assert.equal(shadow.release.inventorySummary.fieldManifestCount, 19);
});

test('catalog baseline protects Age order and custom input limits', async () => {
  const bundle = await createAttributesBundleLoader()();
  const ageIds = bundle.library
    .filter(item => item.category === 'character' && item.subcategory === 'Age')
    .map(item => item.id);

  assert.deepEqual(ageIds, [
    'character.004_teen',
    'character.004_e20',
    'character.004',
    'character.004_l20',
    'character.005_30s',
    'character.005',
    'character.005_50s',
    'character.006'
  ]);
  assert.deepEqual(bundle.inputPolicy.customAttribute, {
    maxCharactersPerField: 1000,
    maxCharactersTotal: 2000
  });
});
