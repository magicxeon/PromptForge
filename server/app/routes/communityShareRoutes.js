import { RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { RepositoryCursorError } from '../../repositories/RepositoryCursor.js';

function sendCommunityShareError(res, error) {
  return res.status(error.statusCode || 400).json({
    error: {
      code: error.code || 'community_share_failed',
      message: error.message || 'Community share operation failed.'
    }
  });
}

export function registerCommunityShareRoutes(app, {
  communityShareService,
  communityFeaturePolicyService,
  postAccessService,
  videoShareService
}) {
  app.get('/api/community/generations/:generationId/share-status', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.shareEnabled');
      return res.json(await communityShareService.getGenerationShareStatus(req.params.generationId, req.actorContext));
    } catch (error) {
      if (error instanceof RepositoryContractError) return sendCommunityShareError(res, error);
      return res.status(500).json({ error: { code: 'community_share_status_failed', message: 'Share status could not be loaded.' } });
    }
  });
  app.get('/api/community/posts/:postId/template-detail', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.enabled');
      return res.json(await communityShareService.getTemplateDetail(req.params.postId, req.query, req.actorContext));
    } catch (error) {
      const publicError = error instanceof RepositoryContractError || error instanceof RepositoryCursorError;
      return res.status(publicError ? error.statusCode || 400 : 500).json({ error: {
        code: publicError ? error.code : 'template_detail_failed',
        message: publicError ? error.message : 'Template details could not be loaded.'
      } });
    }
  });

  app.post('/api/community/share-drafts', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.shareEnabled');
      const draft = await communityShareService.createGeneratedShareDraft(
        req.body?.sourceGenerationId,
        req.actorContext
      );
      return res.status(201).json(draft);
    } catch (error) {
      return sendCommunityShareError(res, error);
    }
  });

  app.patch('/api/community/share-drafts/:draftId', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.shareEnabled');
      return res.json(await communityShareService.updateGeneratedShareDraft(
        req.params.draftId,
        req.body || {},
        req.actorContext
      ));
    } catch (error) {
      return sendCommunityShareError(res, error);
    }
  });

  app.post('/api/community/share-drafts/:draftId/publish', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.shareEnabled');
      const post = await communityShareService.publishGeneratedImageShare(
        req.params.draftId,
        req.body || {},
        req.actorContext
      );
      return res.status(201).json(post);
    } catch (error) {
      return sendCommunityShareError(res, error);
    }
  });

  app.delete('/api/community/posts/:postId', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.shareEnabled');
      return res.json(await communityShareService.unpublishOwnPost(
        req.params.postId,
        req.actorContext
      ));
    } catch (error) {
      return sendCommunityShareError(res, error);
    }
  });

  app.get('/api/community/posts/:postId/:mediaKind(video|poster)', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('cinematic.communityVideoEnabled');
      const filePath = await postAccessService.getVideoMediaFile(
        req.params.postId,
        req.params.mediaKind,
        req.actorContext
      );
      return res.sendFile(filePath, error => {
        if (error && !res.headersSent) sendCommunityShareError(res, error);
      });
    } catch (error) {
      return sendCommunityShareError(res, error);
    }
  });

  app.post('/api/community/video-share-drafts', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('cinematic.communityVideoEnabled');
      return res.status(201).json(await videoShareService.createDraft(
        req.body?.assetId,
        req.actorContext
      ));
    } catch (error) {
      return sendCommunityShareError(res, error);
    }
  });

  app.patch('/api/community/video-share-drafts/:draftId', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('cinematic.communityVideoEnabled');
      return res.json(videoShareService.updateDraft(
        req.params.draftId,
        req.body || {},
        req.actorContext
      ));
    } catch (error) {
      return sendCommunityShareError(res, error);
    }
  });

  app.post('/api/community/video-share-drafts/:draftId/publish', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('cinematic.communityVideoEnabled');
      return res.status(201).json(await videoShareService.publish(
        req.params.draftId,
        req.body || {},
        req.actorContext
      ));
    } catch (error) {
      return sendCommunityShareError(res, error);
    }
  });
}
