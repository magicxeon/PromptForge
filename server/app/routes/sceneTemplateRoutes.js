import { sanitizeReferenceSlotsForPublic } from '../../domain/scene-templates/sceneTemplateSanitizer.js';

export function registerSceneTemplateRoutes(app, {
  createSceneShareDraft,
  publishSceneTemplateShare,
  communityPostRepo,
  communityRemixRepo,
  resolveRequestUsername
}) {
  app.post('/api/scene-templates/share-drafts', async (req, res) => {
    try {
      const { sourceGenerationId } = req.body || {};
      const identity = resolveRequestUsername(req, { allowQuery: false });
      const draft = await createSceneShareDraft(sourceGenerationId, identity);
      res.json(draft);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message });
    }
  });

  app.post('/api/scene-templates/share-drafts/:draftId/publish', async (req, res) => {
    try {
      const { title, description, promptVisibility } = req.body || {};
      const post = await publishSceneTemplateShare(req.params.draftId, title, description, promptVisibility);
      res.json(post);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/scene-templates/shared', async (req, res) => {
    try {
      const posts = await communityPostRepo.readAll();
      res.json(posts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/scene-templates/shared/:postId', async (req, res) => {
    try {
      const post = await communityPostRepo.getById(req.params.postId);
      if (!post) return res.status(404).json({ error: 'Post not found' });
      return res.json(post);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/scene-templates/shared/:postId/use-template', async (req, res) => {
    try {
      const post = await communityPostRepo.getById(req.params.postId);
      if (!post) return res.status(404).json({ error: 'Post not found' });

      const viewerContext = { username: resolveRequestUsername(req, { allowQuery: false }) };
      const ownerUsername = post.ownerUsername || 'user_demo';
      const sanitizedSnapshot = sanitizeReferenceSlotsForPublic(
        post.sceneTemplateSnapshot,
        viewerContext,
        ownerUsername
      );

      return res.json({
        postId: post.id,
        title: post.title,
        description: post.description,
        ownerUsername: post.ownerUsername,
        sceneTemplateSnapshot: sanitizedSnapshot
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  app.post('/api/scene-templates/remix-events', async (req, res) => {
    try {
      const { templateId, sourcePostId, generatedJobId } = req.body || {};
      const identity = resolveRequestUsername(req, { allowQuery: false });
      const event = await communityRemixRepo.recordRemix({
        templateId,
        sourcePostId,
        username: identity,
        generatedJobId
      });
      res.json(event);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message });
    }
  });
}
