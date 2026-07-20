import { sendCollectionError } from '../routeErrors.js';

export function registerCollectionRoutes(app, { collectionManager, resolveRequestUsername }) {
  app.get('/api/collections', async (req, res) => {
    try {
      res.json(await collectionManager.list(resolveRequestUsername(req, { allowBody: false })));
    } catch (error) {
      sendCollectionError(res, error);
    }
  });

  app.post('/api/collections', async (req, res) => {
    try {
      res.status(201).json(await collectionManager.create(
        req.body,
        resolveRequestUsername(req, { allowQuery: false })
      ));
    } catch (error) {
      sendCollectionError(res, error);
    }
  });

  app.get('/api/collections/:id', async (req, res) => {
    try {
      res.json(await collectionManager.get(
        req.params.id,
        resolveRequestUsername(req, { allowBody: false })
      ));
    } catch (error) {
      sendCollectionError(res, error);
    }
  });

  app.patch('/api/collections/:id', async (req, res) => {
    try {
      res.json(await collectionManager.update(
        req.params.id,
        req.body,
        resolveRequestUsername(req, { allowQuery: false })
      ));
    } catch (error) {
      sendCollectionError(res, error);
    }
  });

  app.delete('/api/collections/default', async (req, res) => {
    try {
      res.json(await collectionManager.clearDefault(resolveRequestUsername(req, { allowBody: false })));
    } catch (error) {
      sendCollectionError(res, error);
    }
  });

  app.delete('/api/collections/:id', async (req, res) => {
    try {
      res.json(await collectionManager.remove(
        req.params.id,
        resolveRequestUsername(req, { allowBody: false })
      ));
    } catch (error) {
      sendCollectionError(res, error);
    }
  });

  app.post('/api/collections/:id/images', async (req, res) => {
    try {
      res.json(await collectionManager.addImages(
        req.params.id,
        req.body.jobIds,
        resolveRequestUsername(req, { allowQuery: false })
      ));
    } catch (error) {
      sendCollectionError(res, error);
    }
  });

  app.delete('/api/collections/:id/images/:jobId', async (req, res) => {
    try {
      res.json(await collectionManager.removeImage(
        req.params.id,
        req.params.jobId,
        resolveRequestUsername(req, { allowBody: false })
      ));
    } catch (error) {
      sendCollectionError(res, error);
    }
  });

  app.put('/api/collections/:id/default', async (req, res) => {
    try {
      res.json(await collectionManager.setDefault(
        req.params.id,
        resolveRequestUsername(req, { allowBody: false })
      ));
    } catch (error) {
      sendCollectionError(res, error);
    }
  });
}
