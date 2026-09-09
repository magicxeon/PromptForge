import { getLookSheetPreset } from '../../domain/character-profiles/LookSheetDefinitionService.js';

export function registerGenerationRoutes(app, {
  generationApplicationService,
  resolveRequestUsername
}) {
  app.get('/api/generation/look-sheet-preset', (_req, res) => res.json(getLookSheetPreset()));
  app.post('/api/generation/look-sheet-preview', async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    const body = req.body || {};
    if (!req.actorContext?.userId) return res.status(401).json({ error: { code: 'actor_required' } });
    if (!body.lookSheetDefinition || body.sceneTemplateSnapshot || body.templateUseSessionId
      || body.sceneBuilder?.templateDraft || body.generationMode !== 'character-sheet') {
      return res.status(400).json({ error: { code: 'look_sheet_definition_invalid' } });
    }
    try {
      return res.json(await generationApplicationService.preview(body, req.actorContext, req.userRole));
    } catch (error) {
      return res.status(error.statusCode || 400).json({ error: {
        code: error.code || 'prompt_preview_failed', message: 'Look Sheet preview is unavailable.'
      } });
    }
  });
  app.post('/api/generation/prompt-preview', async (req, res) => {
    try {
      if (!isPromptPreviewEnabled(req)) {
        return res.status(404).json({
          error: { code: 'not_found', message: 'Route not found.' }
        });
      }
      return res.json(await generationApplicationService.preview(
        req.body || {},
        req.actorContext,
        req.userRole
      ));
    } catch (error) {
      return res.status(error.statusCode || 400).json({
        error: {
          code: error.code || 'prompt_preview_failed',
          message: error.message || 'Prompt preview could not be compiled.',
          ...(error.details ? { details: error.details } : {})
        }
      });
    }
  });

  for (const action of ['quote', 'execute']) {
    app.post(`/api/generation/look-sheet-enhancement/${action}`, async (req, res) => {
      res.set('Cache-Control', 'private, no-store');
      try {
        await app.locals.modelPromptForge?.startupCreditReconciliation;
        return res.json(await generationApplicationService.enhanceLookSheet({ body: req.body || {},
          actorContext: req.actorContext, userRole: req.userRole, action }));
      } catch (error) {
        return res.status(error.statusCode || 400).json({ error: { code: error.code || 'enhancement_failed',
          message: 'Look Sheet enhancement is unavailable. Review the form and price before retrying.' } });
      }
    });
  }
  app.get('/api/generation/look-sheet-enhancement/:id', async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try {
      return res.json(await generationApplicationService.getLookSheetEnhancement(req.params.id, req.actorContext));
    } catch (error) {
      return res.status(error.statusCode || 400).json({ error: { code: error.code || 'enhancement_failed', message: 'Enhancement not available.' } });
    }
  });

  app.post('/api/generate', async (req, res) => {
    try {
      const result = await generationApplicationService.submit({
        body: req.body || {},
        actorContext: req.actorContext,
        userRole: req.userRole,
        requestId: req.requestId
      });
      return res.json(result);
    } catch (error) {
      console.error('[Generation] Enqueue failed:', JSON.stringify({
        code: error.code || 'generation_enqueue_failed',
        statusCode: error.statusCode || 500,
        message: error.message,
        details: error.details || null
      }));
      if (error.toJSON) {
        return res.status(error.statusCode || 400).json(error.toJSON());
      }
      return res.status(error.statusCode || 500).json({ error: {
        code: error.code || 'generation_enqueue_failed',
        message: error.message || 'Generation could not be queued.',
        ...(error.details ? { details: error.details } : {})
      } });
    }
  });

  app.get('/api/jobs/:id', async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    const username = resolveRequestUsername(req, { allowBody: false });
    const status = await generationApplicationService.getJobStatusForUser(
      req.params.id,
      username
    );
    if (!status) {
      const knownStatus = await generationApplicationService.getJobStatus(req.params.id);
      console.warn(
        `[Jobs] Status unavailable for ${req.params.id}: ${knownStatus ? 'owner mismatch' : 'job missing'} (requester: ${username})`
      );
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.json(status);
  });

  app.get('/api/generation-groups/:id', async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    const group = await generationApplicationService.getGroupStatusForActor(
      req.params.id,
      req.actorContext
    );
    if (!group) {
      return res.status(404).json({
        error: { code: 'generation_group_not_found', message: 'Generation group not found.' }
      });
    }
    return res.json(group);
  });

  app.get('/api/jobs/:id/stream', (req, res) => {
    const jobId = req.params.id;
    const username = resolveRequestUsername(req, { allowBody: false });
    const success = generationApplicationService.addJobListener(jobId, res, username);
    if (!success) {
      return res.status(404).json({ error: 'Job not found or closed' });
    }
    req.on('close', () => {
      generationApplicationService.removeJobListener(jobId, res);
    });
  });
}

function isPromptPreviewEnabled(req) {
  if (req.actorContext?.role === 'admin' || req.userRole === 'admin') return true;
  return ['1', 'true', 'yes', 'on'].includes(
    String(process.env.OVERRIDE_DEBUG_PROMPT || '').trim().toLowerCase()
  );
}
