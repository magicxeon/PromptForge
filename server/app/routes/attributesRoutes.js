import fs from 'fs/promises';
import zlib from 'zlib';
import path from 'path';
import { PROJECT_ROOT } from '../../config/paths.js';

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
  '024-fashion-commerce.json'
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

      const schema = JSON.parse(schemaRaw);
      const templates = JSON.parse(templatesRaw);
      const orderData = JSON.parse(orderRaw);
      const order = orderData.order;
      const presets = JSON.parse(presetsRaw);

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
        presets
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
