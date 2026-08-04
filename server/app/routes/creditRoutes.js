import { normalizeGenerationContext } from '../../domain/generation/generationRequestService.js';
import { prepareGenerationReferences } from '../../domain/generation/prepareGenerationReferences.js';

export function registerCreditRoutes(app, {
  resolveRequestUsername,
  templateCoreService,
  providerRegistry,
  creditApplicationService
}) {
  // GET /api/credits/account
  app.get('/api/credits/account', async (req, res) => {
    try {
      const userId = req.actorContext?.userId || resolveRequestUsername(req, { allowBody: false });
      const account = await creditApplicationService.getAccount(userId);
      res.json({ account });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: { code: err.code || 'internal_error', message: err.message } });
    }
  });

  // GET /api/credits (legacy alias)
  app.get('/api/credits', async (req, res) => {
    try {
      const userId = req.actorContext?.userId || resolveRequestUsername(req, { allowBody: false });
      const account = await creditApplicationService.getAccount(userId);
      res.json({
        credits: account.availableCredits,
        reservedCredits: account.reservedCredits,
        role: req.actorContext?.role || 'user'
      });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // POST /api/credits/estimate
  app.post('/api/credits/estimate', async (req, res) => {
    try {
      const userId = req.actorContext?.userId || resolveRequestUsername(req);
      const templatePricing = await templateCoreService.resolvePricing(
        req.body?.templateUseSessionId,
        req.actorContext,
        req.body?.outputCount
      );
      const processing = await resolveEstimateReferenceProcessing({
        body: req.body || {},
        actorContext: req.actorContext,
        templateCoreService,
        providerRegistry
      });
      const estimate = await creditApplicationService.estimate({
        ...req.body,
        referenceCount: processing
          ? processing.referenceCount
          : Math.max(0, Number(req.body?.referenceCount) || 0)
            + Math.max(0, Number(templatePricing?.executionReferenceCount) || 0),
        referenceProcessingPlanFingerprint:
          processing?.planFingerprint || null,
        templatePricing,
        userId
      });
      const account = await creditApplicationService.getAccount(userId);
      const available = account.availableCredits;

      res.json({
        estimate,
        account: {
          availableCredits: available,
          canAfford: available >= estimate.estimatedCredits
        }
      });
    } catch (err) {
      if (err.toJSON) {
        res.status(err.statusCode || 400).json(err.toJSON());
      } else {
        res.status(err.statusCode || 500).json({ error: { code: err.code || 'estimate_failed', message: err.message } });
      }
    }
  });

  // GET /api/credits/ledger
  app.get('/api/credits/ledger', async (req, res) => {
    try {
      const userId = req.actorContext?.userId || resolveRequestUsername(req);
      const page = await creditApplicationService.listLedger(userId, req.query);
      res.json(page);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: { code: err.code || 'ledger_error', message: err.message } });
    }
  });

  // POST /api/credits/mock-grants (Local dev recharge)
  app.post('/api/credits/mock-grants', async (req, res) => {
    try {
      const userId = req.actorContext?.userId || resolveRequestUsername(req);
      const amountCredits = Number(req.body?.amountCredits || 10);
      const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey;

      const result = await creditApplicationService.grantMockCredits({
        userId,
        amountCredits,
        idempotencyKey,
        actorContext: req.actorContext
      });
      res.json({ account: result.account });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: { code: err.code || 'grant_failed', message: err.message } });
    }
  });

  // POST /api/credits/recharge (legacy)
  app.post('/api/credits/recharge', async (req, res) => {
    try {
      const userId = req.actorContext?.userId || resolveRequestUsername(req);
      const result = await creditApplicationService.rechargeLegacy({
        userId,
        actorContext: req.actorContext
      });
      res.json({ credits: result.account.availableCredits, role: req.actorContext?.role || 'user' });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: `Recharge failed: ${err.message}` });
    }
  });
}

async function resolveEstimateReferenceProcessing({
  body,
  actorContext,
  templateCoreService,
  providerRegistry
}) {
  const generationRequest = body.generationRequest;
  if (!generationRequest || typeof generationRequest !== 'object') return null;
  const { provider, model } = providerRegistry.resolveSelection(
    body.requestedProviderId,
    body.requestedModelId
  );
  const templateExecution = generationRequest.templateUseSessionId
    ? await templateCoreService.resolveSession(
      generationRequest.templateUseSessionId,
      actorContext,
      generationRequest.templateReplacements || {}
    )
    : null;
  const payload = templateExecution
    ? {
      ...generationRequest,
      sceneTemplateSnapshot: templateExecution.executionSnapshot,
      selections: templateExecution.executionSnapshot.structuredSelectionsSnapshot || {},
      sceneBuilder: {
        ...(generationRequest.sceneBuilder || {}),
        authoringMode: templateExecution.executionSnapshot.authoringMode || 'guided',
        manualPromptText: templateExecution.executionSnapshot.manualPromptSnapshot
          || templateExecution.executionSnapshot.finalPromptSnapshot
          || ''
      },
      templateBaselineReference: templateExecution.baselineReference?.imageUrl || null,
      authorizedTemplateReferenceJobIds:
        templateExecution.baselineReference?.sourceGenerationId
          ? [templateExecution.baselineReference.sourceGenerationId]
          : []
    }
    : generationRequest;
  const context = normalizeGenerationContext(payload, actorContext);
  const result = await prepareGenerationReferences(context, {
    actorContext,
    providerId: provider.id,
    modelId: model.id,
    modelConfig: model
  });
  return {
    referenceCount: result.providerPlan.referenceCount,
    planFingerprint: result.planFingerprint
  };
}
