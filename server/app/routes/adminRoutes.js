import { adminBackofficeService } from '../../domain/admin/AdminBackofficeService.js';
import { communityModerationService } from '../../domain/community/CommunityModerationService.js';
import { creditApplicationService } from '../../domain/credits/CreditApplicationService.js';
import { adminOperationPresentationService } from '../../domain/admin/AdminOperationPresentationService.js';
import { adminIdentityService } from '../../domain/identity/AdminIdentityService.js';
import { adminFeaturePolicyService } from '../../domain/admin/AdminFeaturePolicyService.js';
import { adminInvestigationService } from '../../domain/admin/AdminInvestigationService.js';
import { supportCaseService } from '../../domain/support/SupportCaseService.js';
import { adminConfigurationService } from '../../domain/admin-configuration/AdminConfigurationService.js';
import { providerControlApplicationService } from '../../domain/admin-configuration/ProviderControlApplicationService.js';

function sendError(res, error) {
  res.status(error.statusCode || 500).json({
    error: {
      code: error.code || 'admin_request_failed',
      message: error.message || 'Admin request failed.',
      ...(error.details ? { details: error.details } : {})
    }
  });
}

export function registerAdminRoutes(app, {
  backofficeService = adminBackofficeService,
  moderationService = communityModerationService,
  adjustmentService = creditApplicationService,
  communityFeaturePolicyService = null,
  operationPresentationService = adminOperationPresentationService,
  identityService = adminIdentityService,
  featurePolicy = adminFeaturePolicyService,
  investigationService = adminInvestigationService,
  casesService = supportCaseService,
  configurationService = adminConfigurationService,
  providerControlService = providerControlApplicationService
} = {}) {
  app.get('/api/admin/capabilities', async (req, res) => {
    try { res.json(featurePolicy.getExposure(req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/provider-health', async (req, res) => {
    try { res.json(investigationService.providerHealth(req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/provider-controls', async (req, res) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      res.json(await providerControlService.list(req.actorContext));
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/provider-controls/commands', async (req, res) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      res.json(await providerControlService.applyCommand({
        ...req.body,
        commandId: req.headers['idempotency-key'] || req.body?.commandId
      }, req.actorContext, req));
    } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/content', async (req, res) => {
    try { res.json(await investigationService.listContent(req.query, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/traces/:identifier', async (req, res) => {
    try { res.json(await investigationService.trace(req.params.identifier, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/generation-command-previews/:identifier', async (req, res) => {
    try { res.json(investigationService.generationCommandPreview(req.params.identifier, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/support/cases', async (req, res) => {
    try { res.json(await casesService.list(req.query, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/support/cases', async (req, res) => {
    try {
      res.status(201).json(await casesService.create({
        ...req.body,
        idempotencyKey: req.headers['idempotency-key'] || req.body?.idempotencyKey
      }, req.actorContext, req));
    } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/support/cases/:caseId', async (req, res) => {
    try { res.json(await casesService.get(req.params.caseId, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.patch('/api/admin/support/cases/:caseId', async (req, res) => {
    try { res.json(await casesService.update(req.params.caseId, req.body, req.actorContext, req)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/configuration/revisions', async (req, res) => {
    try { res.json(await configurationService.list(req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/configuration/validations', async (req, res) => {
    try { res.json(configurationService.validate(req.body, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/configuration/revisions', async (req, res) => {
    try { res.status(201).json(await configurationService.createDraft(req.body, req.actorContext, req)); } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/configuration/revisions/:revisionId/publications', async (req, res) => {
    try { res.json(await configurationService.publish(req.params.revisionId, req.actorContext, req)); } catch (error) { sendError(res, error); }
  });
  app.get('/api/admin/overview', async (req, res) => {
    try { res.json(await backofficeService.getOverview(req.actorContext, req.query)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/users', async (req, res) => {
    try { res.json(await backofficeService.listUsersPage(req.query, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/users/:userId', async (req, res) => {
    try { res.json(await backofficeService.getUserDetail(req.params.userId, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/users/:userId/status-commands', async (req, res) => {
    try {
      res.json(await identityService.changeStatus({
        userId: req.params.userId, ...req.body,
        idempotencyKey: req.headers['idempotency-key'] || req.body?.idempotencyKey
      }, req.actorContext, req));
    } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/generations', async (req, res) => {
    try { res.json(await backofficeService.listGenerationJobs(req.query, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/operations', async (req, res) => {
    try { res.json(await backofficeService.listGenerationOperations(req.query, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/operations/:operationId/dismissals', async (req, res) => {
    try { res.json(await operationPresentationService.dismiss({ operationId: req.params.operationId, ...req.body }, req.actorContext, req)); } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/operations/:operationId/restorations', async (req, res) => {
    try { res.json(await operationPresentationService.restore({ operationId: req.params.operationId, ...req.body }, req.actorContext, req)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/community/posts', async (req, res) => {
    try { res.json(await backofficeService.listCommunityPosts(req.query, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/community/posts/:postId/moderation', async (req, res) => {
    try {
      await communityFeaturePolicyService?.assertEnabled('community.moderationEnabled');
      const post = await moderationService.moderate({ postId: req.params.postId, ...req.body }, req.actorContext, req);
      res.json({ post });
    } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/credits/:userId/ledger', async (req, res) => {
    try { res.json(await backofficeService.getCreditLedger(req.params.userId, req.query, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/credit-reconciliation', async (req, res) => {
    try {
      featurePolicy.assertEnabled('operationsRead', req.actorContext);
      res.json(await adjustmentService.getOperationalSummary(req.query));
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/credits/:userId/adjustments', async (req, res) => {
    try {
      featurePolicy.assertEnabled('financialCommands', req.actorContext);
      const result = await adjustmentService.adjust({
        userId: req.params.userId,
        deltaCredits: req.body?.deltaCredits,
        reason: req.body?.reason,
        idempotencyKey: req.headers['idempotency-key'] || req.body?.idempotencyKey || null
      }, req.actorContext, req);
      res.json(result);
    } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/audit-events', async (req, res) => {
    try { res.json(await backofficeService.listAuditEvents(req.query, req.actorContext)); } catch (error) { sendError(res, error); }
  });
}
