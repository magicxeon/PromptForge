import fs from 'fs/promises';
import crypto from 'node:crypto';
import zlib from 'zlib';
import path from 'path';
import { PROJECT_ROOT } from '../../config/paths.js';
import { getPublicGenerationInputPolicy } from '../../config/generationInputPolicy.js';
import { ATTRIBUTE_SOURCE_FILES } from '../../config/attributeCatalogSource.js';

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
      for (const file of ATTRIBUTE_SOURCE_FILES) {
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

export function registerAttributesRoutes(app, {
  providerRegistry,
  getAttributesBundle,
  getRuntimeAttributesBundle = null
}) {
  app.get('/api/providers', (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json(providerRegistry.getPublicCatalog({
      generationSurface: req.query?.generationSurface || null,
      generationMode: req.query?.generationMode || null,
      workflow: req.query?.workflow || null
    }));
  });

  app.get('/api/attributes/bundle', async (req, res) => {
    try {
      const runtime = getRuntimeAttributesBundle
        ? await getRuntimeAttributesBundle()
        : { bundle: await getAttributesBundle(), source: 'legacy', releaseId: null };
      const bundle = runtime.bundle;
      const jsonStr = JSON.stringify(bundle);
      const etag = `"attr-${createResponseFingerprint(jsonStr)}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
      res.setHeader('X-MPF-Attribute-Source', runtime.source);
      if (runtime.releaseId) res.setHeader('X-MPF-Attribute-Release', runtime.releaseId);
      if (req.headers['if-none-match'] === etag) return res.status(304).end();

      const acceptEncoding = req.headers['accept-encoding'] || '';
      if (acceptEncoding.includes('gzip')) {
        zlib.gzip(jsonStr, (err, buffer) => {
          if (err) {
            console.error('[Bundle] Gzip compression failed:', err);
            return res.status(500).json({ error: 'Compression failed' });
          }
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Encoding': 'gzip',
            'ETag': etag,
            'Cache-Control': 'private, max-age=0, must-revalidate',
            'X-MPF-Attribute-Source': runtime.source,
            ...(runtime.releaseId ? { 'X-MPF-Attribute-Release': runtime.releaseId } : {})
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

function createResponseFingerprint(value) {
  return crypto.createHash('sha256').update(value).digest('base64url').slice(0, 32);
}
