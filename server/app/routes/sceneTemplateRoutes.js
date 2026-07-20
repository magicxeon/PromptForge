export function registerSceneTemplateRoutes(app, {
  communityShareService,
  communityPostRepo
}) {
  app.post('/api/scene-templates/share-drafts', async (req, res) => {
    try {
      const { sourceGenerationId } = req.body || {};
      const draft = await communityShareService.createSceneShareDraft(sourceGenerationId, req.actorContext);
      res.json(draft);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message });
    }
  });

  app.post('/api/scene-templates/share-drafts/:draftId/publish', async (req, res) => {
    try {
      const { title, description, promptVisibility } = req.body || {};
      const post = await communityShareService.publishSceneTemplateShare(
        req.params.draftId,
        { title, description, promptVisibility },
        req.actorContext
      );
      res.json(post);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message });
    }
  });

  app.get('/api/scene-templates/shared', async (req, res) => {
    try {
      const page = await communityPostRepo.listPublic(req.query, req.actorContext);
      res.json(page.items);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  app.get('/api/scene-templates/shared/:postId', async (req, res) => {
    try {
      const post = await communityPostRepo.findPublicById(req.params.postId);
      if (!post) return res.status(404).json({ error: 'Post not found' });
      return res.json(post);
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  app.post('/api/scene-templates/shared/:postId/use-template', async (req, res) => {
    try {
      return res.json(await communityShareService.getTemplateForViewer(req.params.postId, req.actorContext));
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  app.post('/api/scene-templates/remix-events', async (req, res) => {
    try {
      const { templateId, sourcePostId, generatedJobId, replacementSummary } = req.body || {};
      const event = await communityShareService.recordRemix({
        templateId,
        sourcePostId,
        generatedJobId,
        replacementSummary
      }, req.actorContext);
      res.json(event);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message });
    }
  });
}
