import fs from 'fs/promises';
import zlib from 'zlib';
import path from 'path';
import { PROJECT_ROOT } from '../../config/paths.js';
import { getPublicGenerationInputPolicy } from '../../config/generationInputPolicy.js';

const ATTRIBUTE_FILES = [
  '001-character.json',
  '002-face.json',
  '003-eyes.json',
  '004-eyebrows.json',
  '005-nose.json',
  '006-lips.json',
  '007-skin.json',
  '008-hair.json',
  '009-body.json',
  '010-clothing.json',
  '011-pose.json',
  '012-environment.json',
  '013-lighting.json',
  '014-camera.json',
  '015-quality.json',
  '016-nsfw.json',
  '017-photographic-context.json',
  '018-scene-story.json',
  '019-expression.json',
  '020-camera-framing.json',
  '021-accessories.json',
  '022-hair-extra.json',
  '023-architecture.json',
  '024-fashion-commerce.json',
  '025-facial-hair.json'
];

export function createAttributesBundleLoader() {
  let cachedAttributesBundle = null;

  return async function getAttributesBundle() {
    const enabledCache = process.env.ENABLED_CACHE_ATTRIBUTE_BUNDLE === 'true';

    if (enabledCache && cachedAttributesBundle) {
      return cachedAttributesBundle;
    }

    try {
      const attributesDir = path.join(PROJECT_ROOT, 'attributes');

      const schemaRaw = await fs.readFile(path.join(attributesDir, 'spec/ui-schema.json'), 'utf-8');
      const templatesRaw = await fs.readFile(path.join(attributesDir, 'spec/prompt-templates.json'), 'utf-8');
      const orderRaw = await fs.readFile(path.join(attributesDir, 'spec/prompt-order.json'), 'utf-8');
      const presetsRaw = await fs.readFile(path.join(attributesDir, 'spec/presets.json'), 'utf-8');
      const scenePoseRecipesRaw = await fs.readFile(
        path.join(PROJECT_ROOT, 'server/config/scene-pose-recipes.json'),
        'utf-8'
      );

      const schema = JSON.parse(schemaRaw);
      const templates = JSON.parse(templatesRaw);
      const orderData = JSON.parse(orderRaw);
      const order = orderData.order;
      const presets = JSON.parse(presetsRaw);
      const scenePoseRecipes = validateScenePoseRecipes(JSON.parse(scenePoseRecipesRaw));

      const library = [];
      for (const file of ATTRIBUTE_FILES) {
        try {
          const fileContent = await fs.readFile(path.join(attributesDir, file), 'utf-8');
          const fileData = JSON.parse(fileContent);
          const items = Array.isArray(fileData) ? fileData : (fileData.entries || []);
          library.push(...items);
        } catch (err) {
          console.warn(`[Bundle] Failed to read ${file}, skipping:`, err.message);
        }
      }

      const compiledBundle = {
        schema,
        templates,
        order,
        library,
        presets,
        scenePoseRecipes,
        inputPolicy: getPublicGenerationInputPolicy()
      };

      if (enabledCache) {
        cachedAttributesBundle = compiledBundle;
      }

      return compiledBundle;
    } catch (err) {
      console.error('[Bundle] Failed to compile attributes bundle:', err);
      throw err;
    }
  };
}

function validateScenePoseRecipes(catalog) {
  if (
    !catalog
    || !Number.isInteger(catalog.schemaVersion)
    || !Array.isArray(catalog.poseStyles)
    || !Array.isArray(catalog.recipes)
  ) {
    throw new Error('Scene Pose recipe catalog is invalid.');
  }
  const styleIds = new Set();
  for (const style of catalog.poseStyles) {
    if (
      !style
      || typeof style.id !== 'string'
      || !style.id.startsWith('pose-style.')
      || !style.label?.en
      || !style.label?.th
      || !style.description?.en
      || !style.description?.th
      || (style.optionId !== null && typeof style.optionId !== 'string')
      || !Array.isArray(style.excludedRecipeIds)
      || style.excludedRecipeIds.some(recipeId => typeof recipeId !== 'string')
      || new Set(style.excludedRecipeIds).size !== style.excludedRecipeIds.length
      || typeof style.enabled !== 'boolean'
    ) {
      throw new Error(`Scene Pose style '${style?.id || 'unknown'}' is invalid.`);
    }
    if (styleIds.has(style.id)) throw new Error(`Duplicate Scene Pose style '${style.id}'.`);
    styleIds.add(style.id);
  }
  if (catalog.poseStyles.filter(style => style.optionId === null).length !== 1) {
    throw new Error('Scene Pose style catalog must define exactly one Auto Match style.');
  }
  const ids = new Set();
  for (const recipe of catalog.recipes) {
    if (
      !recipe
      || typeof recipe.id !== 'string'
      || !recipe.id.startsWith('scene-pose.')
      || !Number.isInteger(recipe.version)
      || !recipe.label?.en
      || !recipe.label?.th
      || !recipe.description?.en
      || !recipe.description?.th
      || (recipe.previewAsset !== undefined && typeof recipe.previewAsset !== 'string')
      || (recipe.discoverable !== undefined && typeof recipe.discoverable !== 'boolean')
      || !recipe.fieldSelections
      || typeof recipe.fieldSelections !== 'object'
      || (recipe.clearFields !== undefined && (
        !Array.isArray(recipe.clearFields)
        || recipe.clearFields.some(fieldName => typeof fieldName !== 'string' || !fieldName.trim())
      ))
    ) {
      throw new Error(`Scene Pose recipe '${recipe?.id || 'unknown'}' is invalid.`);
    }
    if (ids.has(recipe.id)) {
      throw new Error(`Duplicate Scene Pose recipe '${recipe.id}'.`);
    }
    const clearFields = recipe.clearFields || [];
    if (
      new Set(clearFields).size !== clearFields.length
      || clearFields.some(fieldName => Object.hasOwn(recipe.fieldSelections, fieldName))
    ) {
      throw new Error(`Scene Pose recipe '${recipe.id}' has conflicting clear fields.`);
    }
    ids.add(recipe.id);
  }
  for (const style of catalog.poseStyles) {
    const unknownRecipeId = style.excludedRecipeIds.find(recipeId => !ids.has(recipeId));
    if (unknownRecipeId) {
      throw new Error(`Scene Pose style '${style.id}' references unknown recipe '${unknownRecipeId}'.`);
    }
  }
  return catalog;
}

export function registerAttributesRoutes(app, { providerRegistry, getAttributesBundle }) {
  app.get('/api/providers', (req, res) => {
    res.json(providerRegistry.getPublicCatalog());
  });

  app.get('/api/attributes/bundle', async (req, res) => {
    try {
      const bundle = await getAttributesBundle();
      const jsonStr = JSON.stringify(bundle);

      const acceptEncoding = req.headers['accept-encoding'] || '';
      if (acceptEncoding.includes('gzip')) {
        zlib.gzip(jsonStr, (err, buffer) => {
          if (err) {
            console.error('[Bundle] Gzip compression failed:', err);
            return res.status(500).json({ error: 'Compression failed' });
          }
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Encoding': 'gzip'
          });
          res.end(buffer);
        });
      } else {
        res.json(bundle);
      }
    } catch (err) {
      res.status(500).json({ error: `Failed to load attributes: ${err.message}` });
    }
  });
}
