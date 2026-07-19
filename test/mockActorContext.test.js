import assert from 'node:assert/strict';
import test from 'node:test';
import { actorContextMiddleware } from '../server/middleware/actorContextMiddleware.js';
import { mockUserRepo } from '../server/identity/MockUserRepository.js';
import { createSystemActorContext, normalizeActorContext } from '../server/identity/mockActorContext.js';

test('MockUserRepository resolves usr_demo properties correctly', async () => {
  const user = await mockUserRepo.findById('usr_demo');
  assert.ok(user);
  assert.equal(user.username, 'user_demo');
  assert.equal(user.role, 'user');
});

test('MockUserRepository constructs ActorContext with correct shape', async () => {
  const user = await mockUserRepo.findById('usr_alice');
  assert.ok(user);
  const context = mockUserRepo.toActorContext(user, 'req_123');
  assert.equal(context.userId, 'usr_alice');
  assert.equal(context.username, 'user_alice');
  assert.equal(context.role, 'creator');
  assert.equal(context.authProvider, 'mock');
  assert.equal(context.isMockActor, true);
  assert.equal(context.requestId, 'req_123');
});

test('createSystemActorContext creates system process identity', () => {
  const context = createSystemActorContext('usr_demo', 'req_sys_123');
  assert.equal(context.userId, 'system_agent');
  assert.equal(context.role, 'support');
  assert.equal(context.authProvider, 'system');
  assert.equal(context.originalRequesterUserId, 'usr_demo');
  assert.equal(context.requestId, 'req_sys_123');
});

test('actorContextMiddleware defaults to usr_demo in development when header is missing', async () => {
  const req = {
    headers: {},
    method: 'GET'
  };
  const res = {};
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await actorContextMiddleware(req, res, next);

  assert.ok(nextCalled);
  assert.ok(req.actorContext);
  assert.equal(req.actorContext.userId, 'usr_demo');
  assert.equal(req.actorContext.username, 'user_demo');
});

test('actorContextMiddleware resolves userId from x-mpf-user-id header', async () => {
  const req = {
    headers: {
      'x-mpf-user-id': 'usr_bob'
    },
    method: 'POST'
  };
  const res = {};
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await actorContextMiddleware(req, res, next);

  assert.ok(nextCalled);
  assert.equal(req.actorContext.userId, 'usr_bob');
  assert.equal(req.actorContext.username, 'user_bob');
  assert.equal(req.actorContext.role, 'user');
});

test('actorContextMiddleware rejects mutating requests with invalid user id', async () => {
  const req = {
    headers: {
      'x-mpf-user-id': 'usr_nonexistent'
    },
    method: 'POST'
  };
  let statusSet = null;
  let jsonSent = null;
  const res = {
    status(s) {
      statusSet = s;
      return this;
    },
    json(j) {
      jsonSent = j;
      return this;
    }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await actorContextMiddleware(req, res, next);

  assert.ok(!nextCalled);
  assert.equal(statusSet, 401);
  assert.ok(jsonSent.error.includes('Invalid user identity'));
});

test('actorContextMiddleware rejects mutating requests for disabled user', async () => {
  const req = {
    headers: {
      'x-mpf-user-id': 'usr_disabled'
    },
    method: 'DELETE'
  };
  let statusSet = null;
  let jsonSent = null;
  const res = {
    status(s) {
      statusSet = s;
      return this;
    },
    json(j) {
      jsonSent = j;
      return this;
    }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await actorContextMiddleware(req, res, next);

  assert.ok(!nextCalled);
  assert.equal(statusSet, 403);
  assert.ok(jsonSent.error.includes('disabled'));
});
