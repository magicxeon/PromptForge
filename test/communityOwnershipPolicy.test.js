import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCanModerateCommunityPost,
  assertCanViewCommunityPost,
  isCommunityPostFeedVisible
} from '../server/domain/community/communityPostPolicy.js';

const owner = { userId: 'usr_alice', username: 'user_alice', role: 'creator' };
const viewer = { userId: 'usr_bob', username: 'user_bob', role: 'user' };
const admin = { userId: 'usr_admin', username: 'admin_demo', role: 'admin' };
const privatePost = { id: 'post_private', ownerUserId: owner.userId, ownerUsername: owner.username, visibility: 'private', status: 'published' };

test('owner can view a private community post while another user cannot', () => {
  assert.doesNotThrow(() => assertCanViewCommunityPost(privatePost, owner, { directLink: true }));
  assert.throws(
    () => assertCanViewCommunityPost(privatePost, viewer, { directLink: true }),
    error => error.code === 'community_post_unavailable' && error.statusCode === 404
  );
});

test('hidden posts do not appear in a public feed and moderation needs a reason', () => {
  assert.equal(isCommunityPostFeedVisible({ visibility: 'public', status: 'hidden' }), false);
  assert.throws(
    () => assertCanModerateCommunityPost(privatePost, admin, 'hide', ''),
    error => error.code === 'community_moderation_reason_required'
  );
  assert.doesNotThrow(() => assertCanModerateCommunityPost(privatePost, admin, 'hide', 'Policy violation'));
});
