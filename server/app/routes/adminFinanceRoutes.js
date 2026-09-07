import { financeApplicationService } from '../../domain/finance/FinanceApplicationService.js';

export function registerAdminFinanceRoutes(
  app,
  { service = financeApplicationService } = {},
) {
  const endpoint = (handler) => async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try {
      res.json(await handler(req));
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'finance_request_failed',
          message: error.statusCode
            ? error.code
            : 'Finance data could not be loaded.',
        },
      });
    }
  };
  app.get(
    '/api/admin/finance/inventory',
    endpoint((req) => service.inventory(req.actorContext)),
  );
  app.get(
    '/api/admin/finance/report',
    endpoint((req) => service.report(req.query, req.actorContext)),
  );
  app.get(
    '/api/admin/finance/drafts',
    endpoint((req) => service.drafts(req.actorContext)),
  );
  app.post(
    '/api/admin/finance/drafts',
    endpoint((req) => service.createDraft(req.body, req.actorContext, req)),
  );
}
