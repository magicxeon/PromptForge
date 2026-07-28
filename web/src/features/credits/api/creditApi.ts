import { apiRequest } from '../../../lib/api/apiClient';
import { creditAccountResponseSchema, creditLedgerPageSchema } from '../schemas/creditSchemas';

export function getCreditAccount() {
  return apiRequest('/api/credits/account', { schema: creditAccountResponseSchema });
}

export function listCreditLedger(cursor?: string | null) {
  const query = new URLSearchParams({ limit: '30' });
  if (cursor) query.set('cursor', cursor);
  return apiRequest(`/api/credits/ledger?${query}`, { schema: creditLedgerPageSchema });
}

export function grantMockCredits(amountCredits = 10) {
  return apiRequest('/api/credits/mock-grants', {
    method: 'POST',
    headers: { 'idempotency-key': `mock_grant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` },
    body: { amountCredits },
    schema: creditAccountResponseSchema
  });
}
