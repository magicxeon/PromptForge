import { fashionAssetService } from '../../domain/fashion-blueprint/FashionAssetService.js';
import { FashionBlueprintService } from '../../domain/fashion-blueprint/FashionBlueprintService.js';
import { FashionQuoteService } from '../../domain/fashion-blueprint/FashionQuoteService.js';
import { FashionRunService } from '../../domain/fashion-blueprint/FashionRunService.js';

export function registerFashionBlueprintRoutes(app, {
  providerRegistry,
  queueManager,
  generationApplicationService,
  templatePoseProxyService
}) {
  const blueprintService = new FashionBlueprintService({ providerRegistry });
  const quoteService = new FashionQuoteService({
    blueprintService,
    providerRegistry,
    templatePoseProxyService
  });
  const runService = new FashionRunService({
    quoteService,
    providerRegistry,
    queueManager,
    generationApplicationService
  });

  app.post('/api/fashion-blueprints/assets', async (req, res) => {
    try {
      res.status(201).json(await fashionAssetService.storeReference(req.body || {}, req.actorContext));
    } catch (error) {
      sendError(res, error);
    }
  });
  app.post('/api/fashion-blueprints/resolve', async (req, res) => {
    try {
      const normalized = blueprintService.resolvePlan(
        req.body || {},
        req.actorContext
      );
      const plan = await blueprintService.authorizePlanAssets(
        normalized,
        req.actorContext
      );
      res.json({
        route: plan.route,
        qualityTier: plan.qualityTier,
        routingMode: plan.routingMode,
        resolution: plan.resolution,
        aspectRatio: plan.aspectRatio
      });
    } catch (error) {
      sendError(res, error);
    }
  });
  app.post('/api/fashion-blueprints/quotes', async (req, res) => {
    try {
      res.status(201).json(await quoteService.createQuote(req.body || {}, req.actorContext));
    } catch (error) {
      sendError(res, error);
    }
  });
  app.post('/api/fashion-blueprints/runs', async (req, res) => {
    try {
      res.status(202).json(await runService.createRun(req.body || {}, req.actorContext));
    } catch (error) {
      sendError(res, error);
    }
  });
  app.get('/api/fashion-blueprints/runs/:id', async (req, res) => {
    try {
      res.json(await runService.getRun(req.params.id, req.actorContext));
    } catch (error) {
      sendError(res, error);
    }
  });
  app.get('/api/fashion-blueprints/runs', async (req, res) => {
    try {
      res.json({
        items: await runService.listRuns(
          req.actorContext,
          Number(req.query.limit) || 12
        )
      });
    } catch (error) {
      sendError(res, error);
    }
  });
  app.post('/api/fashion-blueprints/runs/:id/approve-proof', async (req, res) => {
    try {
      res.json(await runService.approveProof(req.params.id, req.actorContext));
    } catch (error) {
      sendError(res, error);
    }
  });
}

function sendError(res, error) {
  res.status(error.statusCode || 500).json({
    error: {
      code: error.code || 'fashion_blueprint_failed',
      message: error.message,
      details: error.details || {}
    }
  });
}
