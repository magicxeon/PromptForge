import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CommunityPostRepository } from '../server/repositories/community/CommunityPostRepository.js';
import { CommunityReportRepository } from '../server/repositories/community/CommunityReportRepository.js';
import { CommunityCommentRepository } from '../server/repositories/community/CommunityCommentRepository.js';
import { AuditLogRepository } from '../server/repositories/audit/AuditLogRepository.js';
import { CommunityModerationService } from '../server/domain/community/CommunityModerationService.js';
import { AdminPolicyService } from '../server/domain/admin/AdminPolicyService.js';
import { AuditService } from '../server/domain/audit/AuditService.js';
import { buildCommunityPostPublicView } from '../server/domain/community/communityPostPublicView.js';

const alice = { userId: 'usr_alice', username: 'user_alice', role: 'creator' };
const bob = { userId: 'usr_bob', username: 'user_bob', role: 'user' };
const admin = { userId: 'usr_admin', username: 'admin_demo', role: 'admin' };

async function createFixture({ reportLimit = 5 } = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'community-moderation-'));
  const users = {
    async findById(id) {
      return {
        usr_alice: { id: 'usr_alice', username: 'user_alice' },
        usr_bob: { id: 'usr_bob', username: 'user_bob' },
        usr_admin: { id: 'usr_admin', username: 'admin_demo' }
      }[id] || null;
    },
    async findByUsername(username) {
      return this.findById({
        user_alice: 'usr_alice',
        user_bob: 'usr_bob',
        admin_demo: 'usr_admin'
      }[username]);
    }
  };
  const posts = new CommunityPostRepository({
    postsFile: path.join(directory, 'posts.json'),
    userRepository: users,
    cursorSecret: 'moderation-post-test'
  });
  const reports = new CommunityReportRepository({
    reportsFile: path.join(directory, 'reports.json'),
    cursorSecret: 'moderation-report-test'
  });
  const comments = new CommunityCommentRepository({
    commentsFile: path.join(directory, 'comments.json'),
    cursorSecret: 'moderation-comment-test'
  });
  const auditRepository = new AuditLogRepository({
    auditFile: path.join(directory, 'audit.json'),
    userRepository: users,
    cursorSecret: 'moderation-audit-test'
  });
  const service = new CommunityModerationService({
    postRepository: posts,
    reportRepository: reports,
    commentRepository: comments,
    policy: new AdminPolicyService(),
    audit: new AuditService({ auditRepository, ipHashSalt: 'test' }),
    reportLimit
  });
  return { directory, posts, reports, comments, auditRepository, service };
}

test('reporting is idempotent and reported posts remain in Latest but not Trending', async t => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.directory, { recursive: true, force: true }));
  const post = await fixture.posts.create({
    title: 'Public fashion portrait',
    visibility: 'public',
    status: 'published',
    trendingCategoryCodes: ['fashion']
  }, alice);

  const concurrent = await Promise.all([
    fixture.service.reportPost({
      postId: post.id,
      reason: 'misleading_or_spam',
      details: 'Repeated promotional copy.'
    }, bob),
    fixture.service.reportPost({
      postId: post.id,
      reason: 'misleading_or_spam',
      details: 'Concurrent duplicate.'
    }, bob)
  ]);
  const first = concurrent.find(result => result.created);
  const duplicate = await fixture.service.reportPost({
    postId: post.id,
    reason: 'misleading_or_spam'
  }, bob);

  assert.equal(concurrent.filter(result => result.created).length, 1);
  assert.ok(first);
  assert.equal(duplicate.created, false);
  assert.equal(first.report.reporterUserId, undefined);
  assert.equal(first.report.details, undefined);
  assert.equal((await fixture.reports.readAll()).length, 1);
  assert.equal((await fixture.posts.findById(post.id)).status, 'reported');
  assert.deepEqual((await fixture.posts.listPublic({ sort: 'newest' })).items.map(item => item.id), [post.id]);
  assert.deepEqual((await fixture.posts.listPublic({ sort: 'trending' })).items, []);
  assert.equal(buildCommunityPostPublicView(post).contentDisclosure, 'ai_generated');

  await assert.rejects(
    () => fixture.service.reportPost({
      postId: post.id,
      reason: 'other'
    }, null),
    error => error.code === 'actor_context_required'
  );
  await assert.rejects(
    () => fixture.service.reportPost({
      postId: post.id,
      reason: 'other',
      details: 'Owner report.'
    }, alice),
    error => error.code === 'community_self_report_forbidden'
  );

  const comment = await fixture.comments.create({
    postId: post.id,
    body: 'A reportable comment.'
  }, bob);
  const commentReport = await fixture.service.reportComment({
    postId: post.id,
    commentId: comment.id,
    reason: 'inappropriate_content',
    details: 'Comment-level report.'
  }, alice);
  assert.equal(commentReport.created, true);
  assert.equal(commentReport.report.targetType, 'community_comment');
  assert.equal(commentReport.report.targetId, comment.id);
});

test('report rate limit and audited moderation protect public discovery', async t => {
  const fixture = await createFixture({ reportLimit: 1 });
  t.after(() => fs.rm(fixture.directory, { recursive: true, force: true }));
  const firstPost = await fixture.posts.create({
    title: 'First post',
    visibility: 'public',
    status: 'published'
  }, alice);
  const secondPost = await fixture.posts.create({
    title: 'Second post',
    visibility: 'public',
    status: 'published'
  }, alice);

  await fixture.service.reportPost({
    postId: firstPost.id,
    reason: 'wrong_category'
  }, bob);
  await assert.rejects(
    () => fixture.service.reportPost({
      postId: secondPost.id,
      reason: 'inappropriate_content'
    }, bob),
    error => error.code === 'community_report_rate_limited' && error.statusCode === 429
  );
  await assert.rejects(
    () => fixture.service.moderate({
      postId: firstPost.id,
      action: 'hide',
      reason: 'Member attempt'
    }, bob),
    error => error.code === 'admin_access_forbidden'
  );

  const hidden = await fixture.service.moderate({
    postId: firstPost.id,
    action: 'hide',
    reason: 'Safety review'
  }, admin);
  assert.equal(hidden.status, 'hidden');
  assert.equal((await fixture.posts.listPublic({ sort: 'newest' })).items.some(
    item => item.id === firstPost.id
  ), false);
  const audit = await fixture.auditRepository.listForBackoffice({ limit: 10 });
  assert.ok(audit.items.some(event =>
    event.action === 'community.post.hide' && event.targetId === firstPost.id
  ));
});
