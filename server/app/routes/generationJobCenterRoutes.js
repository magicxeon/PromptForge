export function registerGenerationJobCenterRoutes(app, { generationJobCenterService }) {
  app.get('/api/generation/job-center', async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try {
      return res.json(await generationJobCenterService.list(req.actorContext, {
        scope: req.query.scope,
        limit: req.query.limit
      }));
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'generation_job_center_unavailable',
          message: error.message || 'Generation Job Center is unavailable.'
        }
      });
    }
  });
}
