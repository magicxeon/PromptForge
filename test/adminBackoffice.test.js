import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CommunityPostRepository } from '../server/repositories/community/CommunityPostRepository.js';
import { AuditLogRepository } from '../server/repositories/audit/AuditLogRepository.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';
import { CommunityModerationService } from '../server/domain/community/CommunityModerationService.js';
import { CreditAdjustmentService } from '../server/domain/credits/CreditAdjustmentService.js';
import { AdminPolicyService } from '../server/domain/admin/AdminPolicyService.js';
import { AuditService } from '../server/domain/audit/AuditService.js';
import { AdminBackofficeService } from '../server/domain/admin/AdminBackofficeService.js';
import { AdminOperationPresentationRepository } from '../server/repositories/admin/AdminOperationPresentationRepository.js';
import { AdminOperationPresentationService } from '../server/domain/admin/AdminOperationPresentationService.js';
import { MockUserRepository } from '../server/repositories/identity/MockUserRepository.js';
import { AdminIdentityService } from '../server/domain/identity/AdminIdentityService.js';

const testRoot = path.join(os.tmpdir(), `mpf-admin-${Date.now()}`);
const admin = { userId: 'usr_admin', username: 'admin_demo', role: 'admin', isMockActor: true, requestId: 'req_admin_test' };
const support = { userId: 'usr_support', username: 'support_demo', role: 'support', isMockActor: true, requestId: 'req_support_test' };
const member = { userId: 'usr_demo', username: 'user_demo', role: 'user', isMockActor: true, requestId: 'req_member_test' };
const users = {
  async findById(id) {
    return {
      usr_admin: { id: 'usr_admin', username: 'admin_demo' },
      usr_demo: { id: 'usr_demo', username: 'user_demo' }
    }[id] || null;
  },
  async findByUsername(username) {
    return username === 'user_demo' ? this.findById('usr_demo') : username === 'admin_demo' ? this.findById('usr_admin') : null;
  }
};

test('Admin backoffice denies member moderation, records moderation and ledger adjustments', async t => {
  await fs.mkdir(testRoot, { recursive: true });
  t.after(async () => fs.rm(testRoot, { recursive: true, force: true }));

  const postsFile = path.join(testRoot, 'posts.json');
  const auditFile = path.join(testRoot, 'audit.json');
  const creditsFile = path.join(testRoot, 'credits.json');
  await fs.writeFile(postsFile, JSON.stringify([
    {
      id: 'post_1', ownerUserId: 'usr_demo', ownerUsername: 'user_demo', title: 'Test post',
      visibility: 'public', status: 'published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: 'post_2', ownerUserId: 'usr_demo', ownerUsername: 'user_demo', title: 'Support moderation test',
      visibility: 'public', status: 'published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }
  ]));
  await fs.writeFile(creditsFile, JSON.stringify({ schemaVersion: 2, accounts: [{
    userId: 'usr_demo', username: 'user_demo', availableCredits: 10, reservedCredits: 0, status: 'active', lifetimeGrantedCredits: 10, lifetimeCapturedCredits: 0
  }], estimates: [], reservations: [], ledgerEntries: [] }));

  const policy = new AdminPolicyService();
  const auditRepository = new AuditLogRepository({ auditFile, userRepository: users });
  const audit = new AuditService({ auditRepository, ipHashSalt: 'test' });
  const posts = new CommunityPostRepository({ postsFile, userRepository: users });
  const moderation = new CommunityModerationService({ postRepository: posts, policy, audit });
  await assert.rejects(() => moderation.moderate({ postId: 'post_1', action: 'hide', reason: 'policy test' }, member), { code: 'admin_access_forbidden' });

  const supportHidden = await moderation.moderate({ postId: 'post_2', action: 'hide', reason: 'support policy test' }, support);
  assert.equal(supportHidden.status, 'hidden');
  const hidden = await moderation.moderate({ postId: 'post_1', action: 'hide', reason: 'copyright concern' }, admin);
  assert.equal(hidden.status, 'hidden');
  const removed = await moderation.moderate({ postId: 'post_1', action: 'remove', reason: 'confirmed removal' }, admin);
  assert.equal(removed.status, 'removed');
  assert.equal(await posts.findPublicById('post_1'), null);
  const moderationAudit = await auditRepository.listForBackoffice({ limit: 10 });
  assert.ok(moderationAudit.items.some(event => event.action === 'community.post.hide'));
  assert.ok(moderationAudit.items.some(event => event.action === 'community.post.remove'));

  const accounts = new CreditAccountRepository({ databaseFile: creditsFile, userRepository: users });
  const adjustments = new CreditAdjustmentService({ accountRepository: accounts, policy, audit });
  await assert.rejects(
    () => adjustments.adjust({ userId: 'usr_demo', deltaCredits: 5, reason: 'support correction' }, support),
    { code: 'credit_adjustment_forbidden' }
  );
  const adjusted = await adjustments.adjust({ userId: 'usr_demo', deltaCredits: 5, reason: 'support correction', idempotencyKey: 'admin-adjust-1' }, admin);
  assert.equal(adjusted.account.availableCredits, 15);
  const duplicate = await adjustments.adjust({ userId: 'usr_demo', deltaCredits: 5, reason: 'support correction', idempotencyKey: 'admin-adjust-1' }, admin);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.account.availableCredits, 15);
  const ledger = await accounts.readRaw();
  assert.equal(ledger.ledgerEntries.filter(entry => entry.operationType === 'manual_adjustment').length, 1);
  const auditPage = await auditRepository.listForBackoffice({ limit: 10 });
  assert.equal(auditPage.items.filter(event => event.action === 'credit.adjust').length, 1);
});

test('Admin backoffice returns operational summaries without prompt or reference payloads', async () => {
  const sensitiveGeneration = {
    id: 'job_sensitive',
    ownerUserId: 'usr_demo',
    username: 'user_demo',
    status: 'completed',
    provider: 'google',
    submodel: 'example-model',
    prompt: 'private prompt',
    references: [{ imageData: 'data:image/png;base64,private' }],
    timestamp: 123
  };
  const sensitivePost = {
    id: 'post_sensitive',
    title: 'Public title',
    ownerUserId: 'usr_demo',
    ownerUsername: 'user_demo',
    status: 'published',
    visibility: 'public',
    finalPromptSnapshot: 'private prompt',
    sceneTemplateSnapshot: { references: ['private'] }
  };
  const backoffice = new AdminBackofficeService({
    historyRepo: {
      async listPage() { return { items: [sensitiveGeneration], nextCursor: null, hasMore: false }; }
    },
    postRepository: {
      async listForBackoffice() { return { items: [sensitivePost], nextCursor: null, hasMore: false }; }
    },
    policy: new AdminPolicyService()
  });

  const generations = await backoffice.listGenerationJobs({}, support);
  const posts = await backoffice.listCommunityPosts({}, support);
  assert.equal(generations.items[0].prompt, undefined);
  assert.equal(generations.items[0].references, undefined);
  assert.equal(posts.items[0].finalPromptSnapshot, undefined);
  assert.equal(posts.items[0].sceneTemplateSnapshot, undefined);
});


test('Admin overview remains usable when one capability source is unavailable', async () => {
  const backoffice = new AdminBackofficeService({
    userRepository: { async readAll() { return [{ id: 'usr_demo', username: 'user_demo', displayName: 'Demo', role: 'user', status: 'active' }]; } },
    accountRepository: { async getAccountByUserId() { return null; } },
    historyRepo: { async readAll() { return [{ id: 'job_1', status: 'failed', createdAt: '2026-08-25T00:00:00.000Z' }]; } },
    videoTaskRepository: { async listOperational() { throw new Error('video store unavailable'); } },
    postRepository: { async listForBackoffice() { return { items: [], totalApprox: 2 }; } },
    auditRepository: { async listForBackoffice() { return { items: [], totalApprox: 3 }; } },
    policy: new AdminPolicyService()
  });

  const overview = await backoffice.getOverview(support);
  assert.equal(overview.status, 'partial');
  assert.equal(overview.sources.imageGeneration.status, 'ready');
  assert.equal(overview.sources.imageGeneration.attentionCount, 1);
  assert.equal(overview.sources.videoGeneration.status, 'unavailable');
  assert.equal(overview.generationJobs.totalApprox, 1);
  assert.equal(overview.communityPosts.totalApprox, 2);
});

test('Admin overview aggregates bounded daily Image and Video outcomes on the server', async () => {
  const today = new Date().toISOString();
  const backoffice = new AdminBackofficeService({
    userRepository: { async readAll() { return []; } },
    accountRepository: { async getAccountByUserId() { return null; } },
    historyRepo: { async readAll() { return [
      { id: 'job_done', status: 'completed', updatedAt: today },
      { id: 'job_failed', status: 'failed', updatedAt: today }
    ]; } },
    videoTaskRepository: { async listOperational() { return [
      { id: 'video_active', status: 'provider_processing', updatedAt: today },
      { id: 'video_done', status: 'completed', updatedAt: today }
    ]; } },
    postRepository: { async listForBackoffice() { return { items: [], totalApprox: 0 }; } },
    auditRepository: { async listForBackoffice() { return { items: [], totalApprox: 0 }; } },
    policy: new AdminPolicyService()
  });

  const overview = await backoffice.getOverview(support, { window: '14' });
  assert.equal(overview.analytics.windowDays, 14);
  assert.equal(overview.analytics.daily.length, 14);
  assert.deepEqual(overview.analytics.totals, {
    success: 2, failed: 1, active: 1, other: 0, total: 4, successRate: 66.7
  });
  assert.equal(overview.sources.imageGeneration.analyticsRecords, undefined);
});

test('Admin generation operations merge safe Image and Video metadata', async () => {
  const backoffice = new AdminBackofficeService({
    historyRepo: { async listPage() { return { items: [{ id: 'job_image', status: 'completed', prompt: 'private', references: ['private'], updatedAt: '2026-08-24T00:00:00.000Z' }] }; } },
    videoTaskRepository: { async listOperational() { return [{ id: 'videotask_1', status: 'failed', providerId: 'modelark', modelId: 'seedance', supportReference: 'support_1', prompt: 'private', updatedAt: '2026-08-25T00:00:00.000Z' }]; } },
    operationPresentationRepository: { async listDismissals() { return []; } },
    policy: new AdminPolicyService()
  });

  const page = await backoffice.listGenerationOperations({}, support);
  assert.deepEqual(page.items.map(item => item.id), ['videotask_1', 'job_image']);
  assert.equal(page.items[0].mediaType, 'video');
  assert.equal(page.items[0].supportReference, 'support_1');
  assert.equal(page.items[0].prompt, undefined);
  assert.equal(page.items[1].references, undefined);
  await assert.rejects(() => backoffice.listGenerationOperations({}, member), { code: 'admin_access_forbidden' });
});

test('failed operation dismissal is reversible, idempotent and audited without deleting lifecycle evidence', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-operation-presentation-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const presentationRepository = new AdminOperationPresentationRepository({ presentationFile: path.join(directory, 'presentation.json') });
  const auditRepository = new AuditLogRepository({ auditFile: path.join(directory, 'audit.json'), userRepository: users });
  const service = new AdminOperationPresentationService({
    historyRepo: { async getById(id) { return id === 'job_failed' ? { id, status: 'failed' } : { id, status: 'completed' }; } },
    videoTaskRepository: { async find() { return null; } },
    presentationRepository,
    policy: new AdminPolicyService(),
    audit: new AuditService({ auditRepository, ipHashSalt: 'test' })
  });

  await assert.rejects(() => service.dismiss({ operationId: 'job_failed', mediaType: 'image', reason: 'hide stale failure' }, support), { code: 'admin_operation_dismiss_forbidden' });
  await assert.rejects(() => service.dismiss({ operationId: 'job_done', mediaType: 'image', reason: 'hide completed' }, admin), { code: 'admin_operation_not_dismissible' });
  const first = await service.dismiss({ operationId: 'job_failed', mediaType: 'image', reason: 'hide stale failure' }, admin);
  const replay = await service.dismiss({ operationId: 'job_failed', mediaType: 'image', reason: 'hide stale failure' }, admin);
  assert.equal(first.duplicate, false);
  assert.equal(replay.duplicate, true);
  assert.equal((await presentationRepository.listDismissals()).length, 1);
  await service.restore({ operationId: 'job_failed', reason: 'review again' }, admin);
  assert.ok((await presentationRepository.listDismissals())[0].restoredAt);
  const auditPage = await auditRepository.listForBackoffice({ limit: 10 });
  assert.deepEqual(auditPage.items.map(event => event.action).sort(), ['admin.operation.dismiss', 'admin.operation.restore']);
});

test('Admin user status commands enforce authorization, optimistic state, idempotency and audit', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-user-status-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const usersFile = path.join(directory, 'users.json');
  const auditFile = path.join(directory, 'audit.json');
  await fs.writeFile(usersFile, JSON.stringify([
    { id: 'usr_admin', username: 'admin_demo', displayName: 'Admin', role: 'admin', status: 'active' },
    { id: 'usr_demo', username: 'user_demo', displayName: 'Demo', role: 'user', status: 'active' }
  ]));
  const userRepository = new MockUserRepository({ usersFile });
  const auditRepository = new AuditLogRepository({ auditFile, userRepository });
  const service = new AdminIdentityService({
    userRepository,
    policy: new AdminPolicyService(),
    audit: new AuditService({ auditRepository, ipHashSalt: 'test' })
  });
  const input = {
    userId: 'usr_demo', status: 'suspended', expectedStatus: 'active',
    reason: 'Confirmed account review', idempotencyKey: 'admin-status-command-1'
  };

  await assert.rejects(() => service.changeStatus(input, support), { code: 'admin_user_status_forbidden' });
  await assert.rejects(() => service.changeStatus({ ...input, userId: 'usr_admin' }, admin), { code: 'admin_self_status_change_forbidden' });
  const first = await service.changeStatus(input, admin);
  const replay = await service.changeStatus(input, admin);
  assert.equal(first.user.status, 'suspended');
  assert.equal(first.duplicate, false);
  assert.equal(replay.duplicate, true);
  await assert.rejects(() => service.changeStatus({
    ...input, status: 'disabled', expectedStatus: 'active', idempotencyKey: 'admin-status-command-2'
  }, admin), { code: 'admin_user_status_conflict' });
  const auditPage = await auditRepository.listForBackoffice({ limit: 10 });
  assert.deepEqual(auditPage.items.map(event => event.action), ['identity.suspend']);
});
