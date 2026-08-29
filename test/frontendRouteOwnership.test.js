import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFrontendRoute } from '../server/app/frontendRouteOwnership.js';

test('frontend route ownership recognizes canonical and parameterized routes', () => {
  assert.equal(resolveFrontendRoute('/community').matched, true);
  assert.equal(resolveFrontendRoute('/explore/templates').routeId, 'community-home');
  assert.equal(resolveFrontendRoute('/explore/comparisons').routeId, 'community-home');
  assert.equal(resolveFrontendRoute('/posts/post_123').routeId, 'community-post');
  assert.equal(resolveFrontendRoute('/explore/characters').routeId, 'community-characters');
  assert.equal(resolveFrontendRoute('/characters/char_123').routeId, 'community-characters');
  assert.equal(resolveFrontendRoute('/profiles/creator_123/works').routeId, 'creator-profile');
  assert.equal(resolveFrontendRoute('/me').routeId, 'creator-profile');
  assert.equal(resolveFrontendRoute('/community/post_123').routeId, 'community-post');
  assert.equal(resolveFrontendRoute('/community/characters').routeId, 'community-characters');
  assert.equal(resolveFrontendRoute('/community/characters/char_123').routeId, 'community-characters');
  assert.equal(resolveFrontendRoute('/creators/mint/gallery').routeId, 'creator-profile');
  assert.equal(resolveFrontendRoute('/comparisons/set_123').routeId, 'comparisons');
  assert.equal(resolveFrontendRoute('/create/simple').routeId, 'create');
  assert.equal(resolveFrontendRoute('/create/characters').routeId, 'create');
  assert.equal(resolveFrontendRoute('/create/scenes').routeId, 'create');
  assert.equal(resolveFrontendRoute('/create/fashion').routeId, 'create');
  assert.equal(resolveFrontendRoute('/create/studio/face').routeId, 'create');
  assert.equal(resolveFrontendRoute('/create/cinematic/cineproj_123/cast').routeId, 'create');
  assert.equal(resolveFrontendRoute('/create/cinematic/cineproj_123/shot/shot_456').routeId, 'create');
  assert.equal(resolveFrontendRoute('/studio/scene').routeId, 'create');
  assert.equal(resolveFrontendRoute('/playground').routeId, 'playground');
  assert.equal(resolveFrontendRoute('/history/job_123').routeId, 'history');
  assert.equal(resolveFrontendRoute('/library/recent/job_123').routeId, 'history');
  assert.equal(resolveFrontendRoute('/recent-generations').routeId, 'history');
  assert.equal(resolveFrontendRoute('/collections/collection_123').routeId, 'collections');
  assert.equal(resolveFrontendRoute('/library/collections/collection_123').routeId, 'collections');
  assert.equal(resolveFrontendRoute('/credits').routeId, 'credits');
  assert.equal(resolveFrontendRoute('/admin').routeId, 'admin');
  assert.equal(resolveFrontendRoute('/admin/attributes').routeId, 'admin');
});

test('frontend route ownership rejects API and unknown browser routes', () => {
  assert.equal(resolveFrontendRoute('/api/community/posts').matched, false);
  assert.equal(resolveFrontendRoute('/not-a-real-page').matched, false);
});

test('enabled browser routes have one React runtime owner', () => {
  const route = resolveFrontendRoute('/community');
  assert.equal(route.requestedRuntime, 'react');
  assert.equal(route.runtime, 'react');
});
