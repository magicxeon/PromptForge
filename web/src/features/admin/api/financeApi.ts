import { apiRequest } from '../../../lib/api/apiClient';
import {
  financeDraftSchema,
  financeDraftsSchema,
  financeInventorySchema,
  financeReportSchema,
} from '../schemas/financeSchemas';

export const getFinanceInventory = () =>
  apiRequest('/api/admin/finance/inventory', {
    schema: financeInventorySchema,
  });
export const getFinanceDrafts = () =>
  apiRequest('/api/admin/finance/drafts', { schema: financeDraftsSchema });
export const getFinanceReport = (filters: Record<string, string>) =>
  apiRequest(`/api/admin/finance/report?${new URLSearchParams(filters)}`, {
    schema: financeReportSchema,
  });
export const createFinanceDraft = (input: {
  scope: string;
  values: Record<string, string>;
}) =>
  apiRequest('/api/admin/finance/drafts', {
    method: 'POST',
    body: input,
    schema: financeDraftSchema,
  });
