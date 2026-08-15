export function registerCommunityCollectionRoutes(app, {
  collectionShareService,
  postAccessService,
  communityFeaturePolicyService
}) {
  app.post('/api/community/collections/:collectionId/publish', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.shareEnabled');
      return res.status(201).json(await collectionShareService.publish(
        req.params.collectionId,
        req.body || {},
        req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get(
    '/api/community/posts/:postId/collection-items/:itemId/:mediaKind(image|thumbnail)',
    async (req, res) => {
      try {
        await communityFeaturePolicyService.assertEnabled('community.exploreEnabled');
        const filePath = await postAccessService.getCollectionItemMediaFile(
          req.params.postId,
          req.params.itemId,
          req.params.mediaKind,
          req.actorContext
        );
        return res.sendFile(filePath);
      } catch (error) {
        return sendError(res, error);
      }
    }
  );
}

function sendError(res, error) {
  return res.status(error.statusCode || 400).json({
    error: {
      code: error.code || 'community_collection_failed',
      message: error.message || 'Community Collection request failed.'
    }
  });
}
