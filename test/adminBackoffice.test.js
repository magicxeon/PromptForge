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
