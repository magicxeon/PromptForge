import { adminBackofficeService } from '../../domain/admin/AdminBackofficeService.js';
import { communityModerationService } from '../../domain/community/CommunityModerationService.js';
import { creditAdjustmentService } from '../../domain/credits/CreditAdjustmentService.js';

function sendError(res, error) {
  res.status(error.statusCode || 500).json({
    error: { code: error.code || 'admin_request_failed', message: error.message || 'Admin request failed.' }
  });
}

export function registerAdminRoutes(app, {
  backofficeService = adminBackofficeService,
  moderationService = communityModerationService,
  adjustmentService = creditAdjustmentService
} = {}) {
  app.get('/api/admin/overview', async (req, res) => {
    try { res.json(await backofficeService.getOverview(req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/users', async (req, res) => {
    try { res.json({ items: await backofficeService.listUsers(req.actorContext) }); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/generations', async (req, res) => {
    try { res.json(await backofficeService.listGenerationJobs(req.query, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/community/posts', async (req, res) => {
    try { res.json(await backofficeService.listCommunityPosts(req.query, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/community/posts/:postId/moderation', async (req, res) => {
    try {
      const post = await moderationService.moderate({ postId: req.params.postId, ...req.body }, req.actorContext, req);
      res.json({ post });
    } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/credits/:userId/ledger', async (req, res) => {
    try { res.json(await backofficeService.getCreditLedger(req.params.userId, req.query, req.actorContext)); } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/credits/:userId/adjustments', async (req, res) => {
    try {
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
