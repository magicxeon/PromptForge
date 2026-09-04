import dotenv from 'dotenv';

dotenv.config();

const { createApp } = await import('./app/createApp.js');

const PORT = process.env.PORT || 6500;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);

  const {
    collectionManager,
    comparisonOrchestrator,
    getAttributesBundle,
    startupCreditReconciliation,
    videoGenerationApplicationService
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

  Promise.resolve(startupCreditReconciliation)
    .then(() => videoGenerationApplicationService?.resumeRecoverable?.())
    .then(results => {
      if (Array.isArray(results) && results.length) {
        const counts = results.reduce((summary, task) => {
          const status = String(task?.status || 'unknown');
          summary[status] = (summary[status] || 0) + 1;
          return summary;
        }, {});
        console.log('[VideoRecovery] Recovered persisted tasks:', counts);
      }
    })
    .catch(err => {
      console.warn('[VideoRecovery] Startup recovery failed:', err.message);
    });
});
