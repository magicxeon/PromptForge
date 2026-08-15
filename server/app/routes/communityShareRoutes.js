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
  communityFeaturePolicyService
}) {
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
}
