import { creditReservationService } from '../../domain/credits/CreditReservationService.js';
import { creditAccountRepo } from '../../repositories/credits/CreditAccountRepository.js';
import { creditLedgerRepo } from '../../repositories/credits/CreditLedgerRepository.js';

export function registerCreditRoutes(app, { resolveRequestUsername }) {
  // GET /api/credits/account
  app.get('/api/credits/account', async (req, res) => {
    try {
      const userId = req.actorContext?.userId || resolveRequestUsername(req, { allowBody: false });
      let account = await creditAccountRepo.getAccountByUserId(userId);
      if (!account) {
        account = { userId, availableCredits: 0, reservedCredits: 0, status: 'active' };
      }
      res.json({ account });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: { code: err.code || 'internal_error', message: err.message } });
    }
  });

  // GET /api/credits (legacy alias)
  app.get('/api/credits', async (req, res) => {
    try {
      const userId = req.actorContext?.userId || resolveRequestUsername(req, { allowBody: false });
      let account = await creditAccountRepo.getAccountByUserId(userId);
      res.json({
        credits: account ? account.availableCredits : 0,
        reservedCredits: account ? account.reservedCredits : 0,
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
      const estimate = await creditReservationService.estimate({
        ...req.body,
        userId
      });
      const account = await creditAccountRepo.getAccountByUserId(userId);
      const available = account ? account.availableCredits : 0;

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
      const page = await creditLedgerRepo.findByUserId(userId, req.query);
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

      const result = await creditAccountRepo.grantCredits({
        userId,
        amountCredits,
        idempotencyKey,
        reason: 'mock_grant',
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
      const result = await creditAccountRepo.grantCredits({
        userId,
        amountCredits: 10,
        reason: 'recharge',
        actorContext: req.actorContext
      });
      res.json({ credits: result.account.availableCredits, role: req.actorContext?.role || 'user' });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: `Recharge failed: ${err.message}` });
    }
  });
}
