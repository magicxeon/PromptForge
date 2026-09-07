import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { FinanceApplicationService } from '../server/domain/finance/FinanceApplicationService.js';
import { registerAdminFinanceRoutes } from '../server/app/routes/adminFinanceRoutes.js';

test('Finance rejects support, user and production mock identity before any source read', async () => {
  let reads = 0;
  const service = new FinanceApplicationService({ credits: { getFinanceLedger: () => { reads++; return { available: true, entries: [] }; } } });
  for (const role of ['support', 'user']) await assert.rejects(service.report({}, { userId: 'usr_test', role }), { statusCode: 403 });
  const production = new FinanceApplicationService({ environment: { NODE_ENV: 'production', ADMIN_FINANCIAL_COMMANDS_ENABLED: 'true' } });
  await assert.rejects(production.report({}, { userId: 'usr_admin', role: 'admin' }), { code: 'finance_trusted_identity_required' });
  assert.equal(reads, 0);
});

test('HTTP endpoints require actor context, disable caching and sanitize internal errors', async () => {
  const app = express();
  registerAdminFinanceRoutes(app, { service: { report: () => { throw new Error('SECRET_DATABASE_PATH'); } } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/finance/report`);
    assert.equal(response.status, 500);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(JSON.stringify(await response.json()).includes('SECRET'), false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
