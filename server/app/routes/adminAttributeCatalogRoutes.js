import { attributeCatalogApplicationService } from '../../domain/attribute-catalog/AttributeCatalogApplicationService.js';

export function registerAdminAttributeCatalogRoutes(app, {
  catalogService = attributeCatalogApplicationService
} = {}) {
  app.get('/api/admin/attribute-catalog/overview', async (req, res) => {
    await respond(res, () => catalogService.getOverview(req.actorContext));
  });

  app.get('/api/admin/attribute-catalog/definitions', async (req, res) => {
    await respond(res, () => catalogService.listDefinitions(req.query, req.actorContext));
  });

  app.post('/api/admin/attribute-catalog/drafts', async (req, res) => {
    await respond(res, () => catalogService.createDraft(req.body, req.actorContext, req), 201);
  });

  app.get('/api/admin/attribute-catalog/drafts/:draftId', async (req, res) => {
    await respond(res, () => catalogService.getDraft(req.params.draftId, req.actorContext));
  });

  app.put('/api/admin/attribute-catalog/drafts/:draftId/option', async (req, res) => {
    await respond(res, () => catalogService.saveOption(
      req.params.draftId,
      req.body,
      req.actorContext,
      req
    ));
  });

  app.post('/api/admin/attribute-catalog/drafts/:draftId/validate', async (req, res) => {
    await respond(res, () => catalogService.validateDraft(
      req.params.draftId,
      req.body,
      req.actorContext,
      req
    ));
  });

  app.post('/api/admin/attribute-catalog/drafts/:draftId/visual-candidates/plan', async (req, res) => {
    await respond(res, () => catalogService.createVisualCandidatePlan(
      req.params.draftId,
      req.body,
      req.actorContext
    ));
  });

  app.post('/api/admin/attribute-catalog/drafts/:draftId/focused-test/plan', async (req, res) => {
    await respond(res, () => catalogService.createFocusedTestPlan(
      req.params.draftId,
      req.body,
      req.actorContext
    ));
  });

  app.post('/api/admin/attribute-catalog/drafts/:draftId/visual-candidates/upload', async (req, res) => {
    await respond(res, () => catalogService.uploadVisualCandidate(
      req.params.draftId,
      req.body,
      req.actorContext,
      req
    ), 201);
  });

  app.post('/api/admin/attribute-catalog/drafts/:draftId/visual-candidates/approve', async (req, res) => {
    await respond(res, () => catalogService.approveVisualCandidate(
      req.params.draftId,
      req.body,
      req.actorContext,
      req
    ));
  });

  app.post('/api/admin/attribute-catalog/drafts/:draftId/publish', async (req, res) => {
    await respond(res, () => catalogService.publishDraft(
      req.params.draftId,
      req.body,
      req.actorContext,
      req
    ), 201);
  });

  app.post('/api/admin/attribute-catalog/releases/:releaseId/activate', async (req, res) => {
    await respond(res, () => catalogService.activateRelease(
      req.params.releaseId,
      req.body,
      req.actorContext,
      req
    ));
  });

  app.post('/api/admin/attribute-catalog/rollback', async (req, res) => {
    await respond(res, () => catalogService.rollback(req.body, req.actorContext, req));
  });
}

async function respond(res, operation, status = 200) {
  try {
    res.status(status).json(await operation());
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: {
        code: error.code || 'attribute_catalog_request_failed',
        message: error.message || 'Attribute Catalog request failed.'
      }
    });
  }
}
