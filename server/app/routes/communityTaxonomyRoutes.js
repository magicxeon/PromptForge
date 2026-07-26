export function registerCommunityTaxonomyRoutes(app, {
  communityClassificationService
}) {
  app.get('/api/community/taxonomy', async (_req, res) => {
    try {
      res.json(await communityClassificationService.getPublicCatalog());
    } catch (error) {
      res.status(error.statusCode || 500).json({
        code: error.code || 'community_taxonomy_unavailable',
        error: error.message || 'Community taxonomy is unavailable.'
      });
    }
  });
}
