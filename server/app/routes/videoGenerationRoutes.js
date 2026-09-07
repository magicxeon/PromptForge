function sendVideoGenerationError(res, error) {
  return res.status(error.statusCode || 400).json({
    error: {
      code: error.code || 'video_generation_request_failed',
      message: error.message || 'Video generation request failed.',
      details: error.details || null
    }
  });
}

export function registerVideoGenerationRoutes(app, {
  videoGenerationService,
  communityFeaturePolicyService
}) {
  app.get('/api/generation/video/capabilities', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('cinematic.playgroundVideoEnabled');
      const catalog = videoGenerationService.getCatalog();
      res.set('Cache-Control', 'private, no-store');
      return res.json({
        ...catalog,
        mediaType: 'video',
        comparison: {
          enabled: await communityFeaturePolicyService.isEnabled(
            'cinematic.videoComparisonEnabled'
          ),
          minimumSlots: 2,
          maximumSlots: 2
        },
        launchStatus: catalog.models.length ? 'available' : 'qualification_blocked'
      });
    } catch (error) {
      return sendVideoGenerationError(res, error);
    }
  });

  app.post('/api/generation/video/quote', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('cinematic.playgroundVideoEnabled');
      const quote = await videoGenerationService.quote(req.body || {}, req.actorContext);
      res.set('Cache-Control', 'private, no-store');
      return res.json(quote);
    } catch (error) {
      return sendVideoGenerationError(res, error);
    }
  });

  app.get('/api/generation/video/trusted-sources', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('cinematic.playgroundVideoEnabled');
      res.set('Cache-Control', 'private, no-store');
      return res.json(await videoGenerationService.listTrustedSources(req.actorContext, {
        cursor: req.query?.cursor,
        eligibleOnly: req.query?.eligibleOnly === 'true'
      }));
    } catch (error) { return sendVideoGenerationError(res, error); }
  });

  app.post('/api/generation/video/tasks', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('cinematic.playgroundVideoEnabled');
      const task = await videoGenerationService.submit(req.body || {}, req.actorContext);
      res.set('Cache-Control', 'private, no-store');
      // Submission created a durable task even when the provider rejected it
      // immediately. Return that terminal resource instead of obscuring the
      // provider code behind an HTTP gateway error.
      return res.status(task.status === 'failed' ? 200 : 202).json(task);
    } catch (error) {
      return sendVideoGenerationError(res, error);
    }
  });

  app.get('/api/generation/video/tasks', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('cinematic.playgroundVideoEnabled');
      res.set('Cache-Control', 'private, no-store');
      const result = await videoGenerationService.listRecent(req.actorContext, {
        limit: req.query?.limit
      });
      return res.json(result);
    } catch (error) {
      return sendVideoGenerationError(res, error);
    }
  });

  app.get('/api/generation/video/tasks/:taskId', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('cinematic.playgroundVideoEnabled');
      res.set('Cache-Control', 'private, no-store');
      const task = await videoGenerationService.getAndPoll(req.params.taskId, req.actorContext);
      return res.json(task);
    } catch (error) {
      return sendVideoGenerationError(res, error);
    }
  });
}
