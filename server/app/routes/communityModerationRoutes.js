function sendModerationError(res, error) {
  return res.status(error.statusCode || 400).json({
    error: {
      code: error.code || 'community_moderation_failed',
      message: error.message || 'Community moderation request failed.'
    }
  });
}

export function registerCommunityModerationRoutes(app, {
  moderationService,
  communityFeaturePolicyService
}) {
  app.post('/api/community/posts/:postId/reports', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.moderationEnabled');
      const result = await moderationService.reportPost({
        postId: req.params.postId,
        reason: req.body?.reason,
        details: req.body?.details
      }, req.actorContext);
      return res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
      return sendModerationError(res, error);
    }
  });

  app.get('/api/admin/community/reports', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.moderationEnabled');
      return res.json(await moderationService.listReports(req.query || {}, req.actorContext));
    } catch (error) {
      return sendModerationError(res, error);
    }
  });
}
