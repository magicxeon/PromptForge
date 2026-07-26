export function registerCommunityComparisonRoutes(app, {
  comparisonShareService,
  postAccessService,
  communityFeaturePolicyService
}) {
  app.post('/api/community/comparisons/:setId/publish', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.shareEnabled');
      return res.status(201).json(await comparisonShareService.publish(
        req.params.setId,
        req.body || {},
        req.actorContext
      ));
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.get('/api/community/posts/:postId/comparison-slots/:slotId/image', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.exploreEnabled');
      const filePath = await postAccessService.getComparisonSlotMediaFile(
        req.params.postId,
        req.params.slotId,
        req.actorContext
      );
      return res.sendFile(filePath);
    } catch (error) {
      return sendError(res, error);
    }
  });
}

function sendError(res, error) {
  return res.status(error.statusCode || 400).json({
    error: {
      code: error.code || 'community_comparison_failed',
      message: error.message || 'Community comparison request failed.'
    }
  });
}
