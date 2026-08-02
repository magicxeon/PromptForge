import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CreatorProfileRepository } from '../server/repositories/community/CreatorProfileRepository.js';
import { CreatorFollowRepository } from '../server/repositories/community/CreatorFollowRepository.js';
import { CommunityPostRepository } from '../server/repositories/community/CommunityPostRepository.js';
import { MockUserRepository } from '../server/repositories/identity/MockUserRepository.js';
import { CreatorProfileService } from '../server/domain/community/CreatorProfileService.js';

const alice = {
  userId: 'usr_alice',
  username: 'user_alice',
  displayName: 'Alice Creator',
  role: 'creator',
  activeCreatorProfileId: 'creator_alice'
};
const bob = {
  userId: 'usr_bob',
  username: 'user_bob',
  displayName: 'Bob Viewer',
  role: 'user',
  activeCreatorProfileId: null
};

async function createFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-profile-'));
  const usersFile = path.join(directory, 'users.json');
  await fs.writeFile(usersFile, JSON.stringify([
    { id: alice.userId, username: alice.username, displayName: alice.displayName, status: 'active', activeCreatorProfileId: alice.activeCreatorProfileId },
    { id: bob.userId, username: bob.username, displayName: bob.displayName, status: 'active', activeCreatorProfileId: null }
  ]), 'utf8');
  const users = new MockUserRepository({ usersFile });
  const profileRepository = new CreatorProfileRepository({
    profilesFile: path.join(directory, 'creatorProfiles.json')
  });
  const followRepository = new CreatorFollowRepository({
    followsFile: path.join(directory, 'creatorFollows.json')
  });
  const postRepository = new CommunityPostRepository({
    postsFile: path.join(directory, 'communityPosts.json'),
    userRepository: users,
    cursorSecret: 'creator-profile-test'
  });
  const service = new CreatorProfileService({
    profileRepository,
    followRepository,
    postRepository
  });
  return { directory, profileRepository, followRepository, postRepository, service };
}

test('creator profile ensure is stable and owner updates cannot change handle', async t => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.directory, { recursive: true, force: true }));

  const first = await fixture.service.getOwnProfile(alice);
  const second = await fixture.service.getOwnProfile(alice);
  assert.equal(first.id, 'creator_alice');
  assert.equal(first.id, second.id);
  assert.equal(first.handle, 'user-alice');
  assert.equal(first.viewer.isOwner, true);
  assert.equal(first.userId, undefined);

  const updated = await fixture.service.updateOwnProfile({
    displayName: 'Alice Studio',
    bio: 'Portrait and fashion creator.',
    handle: 'must-not-change'
  }, alice);
  assert.equal(updated.displayName, 'Alice Studio');
  assert.equal(updated.bio, 'Portrait and fashion creator.');
  assert.equal(updated.handle, 'user-alice');
});

test('creator presentation is normalized, versioned, and owner-only metadata is protected', async t => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.directory, { recursive: true, force: true }));
  const profile = await fixture.service.getOwnProfile(alice);

  const updated = await fixture.service.updateOwnProfile({
    recordVersion: profile.recordVersion,
    presentation: {
      headline: 'Fashion and character creator',
      creatorRoles: ['Fashion_Creator', 'Character-Designer'],
      locationText: 'Bangkok, Thailand',
      websiteUrl: 'https://example.com/creator',
      languageCodes: ['TH', 'EN'],
      contentCategoryCodes: ['fashion', 'character'],
      featuredPostIds: []
    }
  }, alice);

  assert.equal(updated.recordVersion, profile.recordVersion + 1);
  assert.equal(updated.presentation.headline, 'Fashion and character creator');
  assert.deepEqual(updated.presentation.languageCodes, ['th', 'en']);
  assert.deepEqual(updated.presentation.featuredPostIds, []);

  await assert.rejects(
    () => fixture.service.updateOwnProfile({
      recordVersion: profile.recordVersion,
      presentation: { headline: 'Stale edit' }
    }, alice),
    error => error.code === 'creator_profile_version_conflict'
  );

  const publicProfile = await fixture.service.getPublicProfileByHandle(updated.handle, bob);
  assert.equal(publicProfile.recordVersion, undefined);
  assert.equal(publicProfile.presentation.headline, 'Fashion and character creator');

  const cleared = await fixture.service.updateOwnProfile({
    recordVersion: updated.recordVersion,
    presentation: { websiteUrl: null }
  }, alice);
  assert.equal(cleared.presentation.websiteUrl, null);
  assert.equal(cleared.presentation.headline, 'Fashion and character creator');

  await assert.rejects(
    () => fixture.service.updateOwnProfile({
      recordVersion: cleared.recordVersion,
      presentation: { coverPostId: 'post_owned_by_someone_else' }
    }, alice),
    error => error.code === 'creator_presentation_item_forbidden'
  );
});

test('follow is idempotent, self-follow is blocked, and unfollow is idempotent', async t => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.directory, { recursive: true, force: true }));
  const profile = await fixture.service.getOwnProfile(alice);

  const followed = await fixture.service.follow(profile.id, bob);
  await fixture.service.follow(profile.id, bob);
  assert.equal(followed.viewer.isFollowing, true);
  assert.equal(await fixture.followRepository.countByCreatorProfileId(profile.id), 1);

  await assert.rejects(
    () => fixture.service.follow(profile.id, alice),
    error => error.code === 'creator_self_follow_forbidden'
  );

  const unfollowed = await fixture.service.unfollow(profile.id, bob);
  const secondUnfollow = await fixture.service.unfollow(profile.id, bob);
  assert.equal(unfollowed.viewer.isFollowing, false);
  assert.equal(secondUnfollow.viewer.isFollowing, false);
  assert.equal(await fixture.followRepository.countByCreatorProfileId(profile.id), 0);

  await fixture.service.follow(profile.id, bob);
  const [reactivated] = await fixture.followRepository.readAll();
  assert.equal(reactivated.status, 'active');
  assert.equal(reactivated.deletedAt, null);
  assert.equal(await fixture.followRepository.countByCreatorProfileId(profile.id), 1);
});

test('public portfolio reads canonical posts and excludes private or hidden records', async t => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.directory, { recursive: true, force: true }));
  const profile = await fixture.service.getOwnProfile(alice);

  await fixture.postRepository.create({
    title: 'Public portrait',
    creatorProfileId: profile.id,
    visibility: 'public',
    status: 'published'
  }, alice);
  await fixture.postRepository.create({
    title: 'Private draft',
    creatorProfileId: profile.id,
    visibility: 'private',
    status: 'published'
  }, alice);
  await fixture.postRepository.create({
    title: 'Hidden campaign',
    creatorProfileId: profile.id,
    visibility: 'public',
    status: 'hidden'
  }, alice);

  const publicProfile = await fixture.service.getPublicProfileByHandle(profile.handle, bob);
  const portfolio = await fixture.service.listPublicPortfolio(profile.handle, {}, bob);
  assert.equal(publicProfile.publicPostCount, 1);
  assert.deepEqual(portfolio.items.map(post => post.title), ['Public portrait']);
  assert.equal(portfolio.items[0].ownerUserId, undefined);
});

test('retired templates stay in the owner portfolio and remain hidden from viewers', async t => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.directory, { recursive: true, force: true }));
  const profile = await fixture.service.getOwnProfile(alice);
  const template = await fixture.postRepository.create({
    postType: 'template',
    title: 'Retired editorial look',
    creatorProfileId: profile.id,
    visibility: 'public',
    status: 'published'
  }, alice);

  await fixture.postRepository.unpublishByOwner(template.id, alice);

  const ownerPortfolio = await fixture.service.listPublicPortfolio(profile.handle, {}, alice);
  const viewerPortfolio = await fixture.service.listPublicPortfolio(profile.handle, {}, bob);
  assert.equal(ownerPortfolio.items.some(post => (
    post.id === template.id && post.status === 'owner_unpublished'
  )), true);
  assert.equal(viewerPortfolio.items.some(post => post.id === template.id), false);
});
