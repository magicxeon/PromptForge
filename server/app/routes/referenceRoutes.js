import { referenceAssetService } from '../../domain/assets/ReferenceAssetService.js';

export function registerReferenceRoutes(app) {
  app.post('/api/references', async (req, res) => {
    try {
      const reference = await referenceAssetService.storeReference(req.body || {}, req.actorContext);
      res.status(201).json(reference);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'reference_upload_failed',
          message: error.message
        }
      });
    }
  });
}
