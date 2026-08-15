import { apiRequest } from '../../../lib/api/apiClient';
import {
  adminMutationSchema,
  adminOverviewSchema,
  adminPageSchema,
  adminUsersSchema
} from '../schemas/adminSchemas';

export function getAdminOverview() {
  return apiRequest('/api/admin/overview', { schema: adminOverviewSchema });
}

export function listAdminUsers() {
  return apiRequest('/api/admin/users', { schema: adminUsersSchema });
}

export function listAdminGenerations(cursor?: string | null) {
  const query = new URLSearchParams({ limit: '25' });
  if (cursor) query.set('cursor', cursor);
  return apiRequest(`/api/admin/generations?${query}`, { schema: adminPageSchema });
}

export function listAdminPosts(cursor?: string | null) {
  const query = new URLSearchParams({ limit: '25' });
  if (cursor) query.set('cursor', cursor);
  return apiRequest(`/api/admin/community/posts?${query}`, { schema: adminPageSchema });
}

export function listAuditEvents(cursor?: string | null) {
  const query = new URLSearchParams({ limit: '25' });
  if (cursor) query.set('cursor', cursor);
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
