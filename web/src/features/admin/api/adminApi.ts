import { apiRequest } from '../../../lib/api/apiClient';
import {
  adminMutationSchema,
  adminOverviewSchema,
  adminOperationsSchema,
  adminPageSchema,
  adminUsersSchema,
  adminUserDetailSchema
  , adminCapabilitiesSchema, adminContentSchema, adminTraceSchema,
  adminSupportCaseSchema, adminSupportCasesSchema, adminConfigurationStateSchema, adminProviderHealthSchema,
  adminCreditReconciliationSchema
  , adminProviderControlsSchema
} from '../schemas/adminSchemas';

export function getAdminOverview(windowDays = 7) {
  return apiRequest(`/api/admin/overview?window=${windowDays}`, { schema: adminOverviewSchema });
}

export function listAdminOperations(filters: { mediaType?: string; status?: string; search?: string; visibility?: string; cursor?: string | null } = {}) {
  const query = new URLSearchParams({ limit: '50' });
  if (filters.mediaType) query.set('mediaType', filters.mediaType);
  if (filters.status) query.set('status', filters.status);
  if (filters.search) query.set('search', filters.search);
  if (filters.visibility) query.set('visibility', filters.visibility);
  if (filters.cursor) query.set('cursor', filters.cursor);
  return apiRequest(`/api/admin/operations?${query}`, { schema: adminOperationsSchema });
}

export function dismissAdminOperation(operationId: string, mediaType: string, reason: string) {
  return apiRequest(`/api/admin/operations/${encodeURIComponent(operationId)}/dismissals`, {
    method: 'POST', body: { mediaType, reason }, schema: adminMutationSchema
  });
}

export function restoreAdminOperation(operationId: string, reason: string) {
  return apiRequest(`/api/admin/operations/${encodeURIComponent(operationId)}/restorations`, {
    method: 'POST', body: { reason }, schema: adminMutationSchema
  });
}

export function listAdminUsers(filters: { cursor?: string | null; search?: string; status?: string; role?: string } = {}) {
  const query = buildAdminListQuery(filters);
  return apiRequest(`/api/admin/users?${query}`, { schema: adminUsersSchema });
}

export function getAdminUser(userId: string) {
  return apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, { schema: adminUserDetailSchema });
}

export function changeAdminUserStatus(userId: string, status: string, expectedStatus: string, reason: string) {
  return apiRequest(`/api/admin/users/${encodeURIComponent(userId)}/status-commands`, {
    method: 'POST',
    headers: { 'idempotency-key': `admin_user_status_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` },
    body: { status, expectedStatus, reason },
    schema: adminMutationSchema
  });
}

export function listAdminGenerations(filters: { cursor?: string | null; search?: string; status?: string } = {}) {
  const query = buildAdminListQuery(filters);
  return apiRequest(`/api/admin/generations?${query}`, { schema: adminPageSchema });
}

export function listAdminPosts(filters: { cursor?: string | null; search?: string; status?: string } = {}) {
  const query = buildAdminListQuery(filters);
  return apiRequest(`/api/admin/community/posts?${query}`, { schema: adminPageSchema });
}

export function listAuditEvents(filters: { cursor?: string | null; search?: string; action?: string } = {}) {
  const query = buildAdminListQuery(filters);
  return apiRequest(`/api/admin/audit-events?${query}`, { schema: adminPageSchema });
}

export function moderatePost(postId: string, action: string, reason: string) {
  return apiRequest(`/api/admin/community/posts/${encodeURIComponent(postId)}/moderation`, {
    method: 'POST',
    body: { action, reason },
    schema: adminMutationSchema
  });
}

export function adjustCredits(userId: string, deltaCredits: number, reason: string) {
  return apiRequest(`/api/admin/credits/${encodeURIComponent(userId)}/adjustments`, {
    method: 'POST',
    headers: { 'idempotency-key': `admin_credit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` },
    body: { deltaCredits, reason },
    schema: adminMutationSchema
  });
}

function buildAdminListQuery(filters: Record<string, string | null | undefined>) {
  const query = new URLSearchParams({ limit: '25' });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return query;
}

export function getAdminCapabilities() {
  return apiRequest('/api/admin/capabilities', { schema: adminCapabilitiesSchema });
}

export function listAdminContent(filters: { type?: string; search?: string; status?: string; visibility?: string; cursor?: string | null } = {}) {
  return apiRequest(`/api/admin/content?${buildAdminListQuery(filters)}`, { schema: adminContentSchema });
}

export function getAdminTrace(identifier: string) {
  return apiRequest(`/api/admin/traces/${encodeURIComponent(identifier)}`, { schema: adminTraceSchema });
}

export function listSupportCases(filters: { search?: string; status?: string; priority?: string; cursor?: string | null } = {}) {
  return apiRequest(`/api/admin/support/cases?${buildAdminListQuery(filters)}`, { schema: adminSupportCasesSchema });
}

export function createSupportCase(input: { title: string; description?: string; priority: string; customerUserId?: string; links?: { targetType: string; targetId: string }[] }) {
  return apiRequest('/api/admin/support/cases', {
    method: 'POST',
    headers: { 'idempotency-key': `support_case_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` },
    body: input,
    schema: adminSupportCaseSchema
  });
}

export function getAdminConfigurationRevisions() {
  return apiRequest('/api/admin/configuration/revisions', { schema: adminConfigurationStateSchema });
}

export function updateSupportCase(caseId: string, input: { expectedVersion: number; status?: string; priority?: string; note?: string; reason?: string }) {
  return apiRequest(`/api/admin/support/cases/${encodeURIComponent(caseId)}`, {
    method: 'PATCH', body: input, schema: adminSupportCaseSchema
  });
}

export function createAdminConfigurationDraft(input: { scope: string; values: Record<string, unknown> }) {
  return apiRequest('/api/admin/configuration/revisions', { method: 'POST', body: input, schema: adminMutationSchema });
}

export function getAdminProviderHealth() {
  return apiRequest('/api/admin/provider-health', { schema: adminProviderHealthSchema });
}

export function getAdminCreditReconciliation() {
  return apiRequest('/api/admin/credit-reconciliation', { schema: adminCreditReconciliationSchema });
}

export function getAdminProviderControls() {
  return apiRequest('/api/admin/provider-controls', { schema: adminProviderControlsSchema });
}

export function applyAdminProviderControl(input: {
  targetType: 'provider' | 'model' | 'workflow';
  providerId: string;
  modelId?: string | null;
  workflow?: string | null;
  enabled: boolean;
  expectedVersion: number;
  reason: string;
  commandId: string;
}) {
  return apiRequest('/api/admin/provider-controls/commands', {
    method: 'POST',
    headers: { 'idempotency-key': input.commandId },
    body: input,
    schema: adminProviderControlsSchema
  });
}
