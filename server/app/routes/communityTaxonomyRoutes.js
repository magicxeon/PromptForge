export function registerCommunityTaxonomyRoutes(app, {
  communityClassificationService,
  communityFeaturePolicyService
}) {
  app.get('/api/community/features', async (_req, res) => {
    try {
      res.json(await communityFeaturePolicyService.getPublicFlags());
    } catch (error) {
      res.status(error.statusCode || 500).json({
        code: error.code || 'community_features_unavailable',
        error: error.message || 'Community feature availability is unavailable.'
      });
    }
  });

  app.get('/api/community/taxonomy', async (_req, res) => {
    try {
      await communityFeaturePolicyService.assertEnabled('community.enabled');
      res.json(await communityClassificationService.getPublicCatalog());
    } catch (error) {
      res.status(error.statusCode || 500).json({
        code: error.code || 'community_taxonomy_unavailable',
        error: error.message || 'Community taxonomy is unavailable.'
      });
    }
  });
}
