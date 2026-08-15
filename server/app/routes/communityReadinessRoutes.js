export function registerCommunityReadinessRoutes(app, {
  readinessService,
  communityFeaturePolicyService
}) {
  app.get('/api/community/readiness', async (req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.enabled');
      return res.json(await readinessService.getReadiness());
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'community_readiness_failed',
          message: error.message || 'Community readiness is unavailable.'
        }
      });
    }
  });
}
