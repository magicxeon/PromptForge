import dotenv from 'dotenv';

dotenv.config();

const { createApp } = await import('./app/createApp.js');

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);

  const {
    collectionManager,
    comparisonOrchestrator,
    getAttributesBundle
  } = app.locals.modelPromptForge || {};

  const enabledCache = process.env.ENABLED_CACHE_ATTRIBUTE_BUNDLE === 'true';
  const refreshCache = process.env.REFRESH_CACHE_ATTRIBUTE_BUNDLE === 'true';

  if (enabledCache && refreshCache && getAttributesBundle) {
    getAttributesBundle().then(() => {
      console.log('[Bundle] Attributes cache warmed successfully.');
    }).catch(err => {
      console.error('[Bundle] Failed to warm cache on startup:', err);
    });
  } else {
    console.log(`[Bundle] Attributes cache warming skipped. Cache Enabled: ${enabledCache}, Refresh: ${refreshCache}`);
  }

  collectionManager?.init?.().catch(err => {
    console.error('[Collections] Failed to initialize storage:', err);
  });

  comparisonOrchestrator?.init?.().catch(err => {
    console.error('[Comparison] Failed to initialize storage:', err);
  });
});
