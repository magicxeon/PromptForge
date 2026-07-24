import { promptComposerService } from '../../domain/prompt-composer/PromptComposerService.js';

function sendError(res, error) {
  res.status(error.statusCode || 500).json({
    error: { code: error.code || 'prompt_composer_failed', message: error.message || 'Prompt Composer is unavailable.' }
  });
}

export function registerPromptComposerRoutes(app, { getAttributesBundle, composerService = promptComposerService }) {
  app.post('/api/prompt-composer/proposals', async (req, res) => {
    try {
      const attributesBundle = await getAttributesBundle();
      const proposal = await composerService.compose(req.body || {}, {
        actorContext: req.actorContext,
        attributesBundle
      });
      res.json({ proposal });
    } catch (error) {
      sendError(res, error);
    }
  });
}
