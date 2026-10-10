import express from 'express';
import { TutorialApplicationService } from '../../domain/tutorials/TutorialApplicationService.js';
import { AICinemaApplicationService } from '../../domain/ai-cinema/AICinemaApplicationService.js';
import { learningAccessPolicy } from '../../domain/content-access/LearningAccessPolicy.js';
import { LearningError, invalid, strictObject, typeForId } from '../../domain/content-access/catalogContract.js';

export function registerLearningRoutes(app, {
  policy = learningAccessPolicy,
  tutorials = new TutorialApplicationService({ policy }),
  cinema = new AICinemaApplicationService({ policy })
} = {}) {
  const router = express.Router();
  const handler = (operation, status = 200) => async (req, res, next) => {
    try {
      const result = await operation(req);
      if (status === 204) res.status(204).end();
      else res.status(status).json(result);
    } catch (error) { next(error); }
  };
  const forType = type => {
    if (type === 'tutorial') return tutorials;
    if (type === 'film' || type === 'series') return cinema;
    invalid();
  };
  const forId = req => forType(typeForId(req.params.id));

  app.use('/api/learning', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/config', handler(req => policy.getConfig(req.actorContext)));
  router.use((req, res, next) => {
    try {
      policy.assertCatalogAccess(req.actorContext);
      next();
    } catch (error) { next(error); }
  });

  router.get('/catalog', handler(req => {
    const service = req.query.kind === 'tutorial' ? tutorials : req.query.kind === 'cinema' ? cinema : null;
    if (!service) invalid();
    return service.list(req.query, req.actorContext);
  }));
  router.post('/catalog', handler(async req => ({
    item: await forType(req.body?.type).create(req.body, req.actorContext)
  }), 201));
  router.get('/catalog/:id', handler(async req => {
    strictObject(req.query, []);
    return { item: await forId(req).get(req.params.id, req.actorContext) };
  }));
  router.patch('/catalog/:id', handler(async req => ({
    item: await forId(req).patch(req.params.id, req.body, req.actorContext)
  })));
  router.delete('/catalog/:id', handler(req => forId(req).remove(req.params.id, req.body, req.actorContext), 204));
  router.post('/catalog/:id/publish', handler(req => forId(req).publish(req.params.id, req.body, req.actorContext)));
  router.post(['/purchases', '/catalog/:id/purchase'], handler(req => policy.purchase(req.actorContext)));
  router.use((req, res, next) => next(new LearningError('learning_not_found', 'Learning endpoint not found.', 404)));
  app.use('/api/learning', router);

  // Also catches upstream Express body-parser failures without exposing payloads or stacks.
  app.use('/api/learning', (error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.set('Cache-Control', 'no-store');
    if (error instanceof LearningError) {
      return res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
    }
    if (error.type === 'entity.parse.failed' || error instanceof URIError) {
      return res.status(400).json({ error: { code: 'learning_invalid_input', message: 'Invalid catalog metadata or query.' } });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'learning_payload_too_large', message: 'Catalog request is too large.' } });
    }
    return res.status(500).json({ error: { code: 'learning_unavailable', message: 'Learning catalog is unavailable.' } });
  });
}
