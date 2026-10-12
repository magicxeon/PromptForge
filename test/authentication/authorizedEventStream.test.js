import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { createAuthorizedEventStream } from '../../server/middleware/authorizedEventStream.js';
import { registerGenerationRoutes } from '../../server/app/routes/generationRoutes.js';
import { registerCinematicRoutes } from '../../server/app/routes/cinematicRoutes.js';

class Response extends EventEmitter {
  chunks = []; headers = {}; writableEnded = false; destroyed = false;
  setHeader(name, value) { this.headers[name] = value; }
  set(name, value) { this.setHeader(name, value); return this; }
  flushHeaders() {}
  write(chunk) { this.chunks.push(Buffer.from(chunk).toString()); return true; }
  end() { this.writableEnded = true; this.emit('close'); }
  destroy() { this.destroyed = true; this.emit('close'); }
  status(value) { this.statusCode = value; return this; }
  json(value) { this.body = value; this.end(); }
}
function fixture() {
  const req = new EventEmitter(), res = new Response(); let active = true, checks = 0;
  req.reauthorizeIdentity = async () => { checks++; if (!active) throw new Error('revoked'); };
  return { req, res, revoke: () => { active = false; }, checks: () => checks };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('terminal output drains in order, with a fresh decision for each frame', async () => {
  const f = fixture(), stream = await createAuthorizedEventStream(f.req, f.res);
  stream.response.write('progress'); stream.response.write('result'); stream.response.end();
  await stream.finished;
  assert.deepEqual(f.res.chunks, ['progress', 'result']);
  assert.equal(f.checks(), 3); assert.equal(f.res.writableEnded, true);
  assert.equal(f.req.listenerCount('aborted'), 0);
});

test('revocation/outage after accepted progress blocks queued private frames and cleans transport only', async () => {
  const f = fixture(), stream = await createAuthorizedEventStream(f.req, f.res); let removed = 0;
  stream.onClose(() => removed++);
  stream.response.write('accepted'); await tick(); f.revoke();
  stream.response.write('secret completion'); await stream.finished;
  assert.deepEqual(f.res.chunks, ['accepted']); assert.equal(removed, 1);
  assert.equal(f.res.destroyed, true); assert.equal(stream.response.write('late'), false);
});

test('a slow reader does not bypass revalidation of the next frame', async () => {
  const f = fixture(), stream = await createAuthorizedEventStream(f.req, f.res);
  f.res.write = chunk => { f.res.chunks.push(String(chunk)); return false; };
  stream.response.write('first'); stream.response.write('private next');
  await tick(); f.revoke(); f.res.emit('drain'); await stream.finished;
  assert.deepEqual(f.res.chunks, ['first']); assert.equal(f.res.destroyed, true);
});

test('bounded queue and stalled drain close transport without unbounded buffered work', async () => {
  const f = fixture(); let release;
  const stream = await createAuthorizedEventStream(f.req, f.res, { maxBytes: 8, maxFrames: 2 });
  f.req.reauthorizeIdentity = () => new Promise(resolve => { release = resolve; });
  stream.response.write('a'); stream.response.write('12345');
  assert.equal(stream.response.write('12345'), false); await stream.finished;
  release(); assert.equal(f.res.destroyed, true); assert.deepEqual(f.res.chunks, []);
  const slow = fixture(), timed = await createAuthorizedEventStream(slow.req, slow.res, { drainTimeoutMs: 10 });
  slow.res.write = () => false; timed.response.write('frame');
  await new Promise(resolve => setTimeout(resolve, 25)); await timed.finished;
  assert.equal(slow.res.destroyed, true);
});

test('open requires reauthorization and disconnect removes listeners without retrying accepted work', async () => {
  await assert.rejects(createAuthorizedEventStream({}, new Response()), { code: 'auth_session_expired' });
  const f = fixture(), stream = await createAuthorizedEventStream(f.req, f.res); let removed = 0;
  stream.onClose(() => removed++); f.res.destroy(); await stream.finished;
  assert.equal(removed, 1); assert.equal(f.req.listenerCount('aborted'), 0);
});

test('disconnect during initial Identity lookup cannot attach a listener or accept work', async () => {
  const f = fixture(); let release;
  f.req.reauthorizeIdentity = () => new Promise(resolve => { release = resolve; });
  const opening = createAuthorizedEventStream(f.req, f.res);
  f.res.destroy(); release();
  await assert.rejects(opening, { code: 'auth_session_expired' });
  assert.equal(f.req.listenerCount('aborted'), 0);
  assert.equal(f.res.listenerCount('close'), 0);
});

test('Generation registrar wraps the canonical listener and removes that same handle after revocation', async () => {
  const routes = new Map(), f = fixture(); let listener, removed, submissions = 0;
  const app = { get: (path, handler) => routes.set(path, handler), post() {} };
  registerGenerationRoutes(app, { resolveRequestUsername: () => 'owner', generationApplicationService: {
    addJobListener: (_id, response) => { listener = response; response.setHeader('Content-Type', 'text/event-stream'); return true; },
    removeJobListener: (_id, response) => { removed = response; }, submit: () => { submissions++; }
  } });
  f.req.params = { id: 'job' };
  await routes.get('/api/jobs/:id/stream')(f.req, f.res);
  listener.write('existing job progress'); await tick(); f.revoke(); listener.write('private result'); await tick();
  assert.deepEqual(f.res.chunks, ['existing job progress']);
  assert.equal(removed, listener); assert.equal(submissions, 0);
});

test('Cinematic progress revocation stops private result delivery while accepted work finishes once', async () => {
  const routes = new Map(), f = fixture(); let accepted = 0, finishedWork = 0;
  const app = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(method => [method, (path, handler) => routes.set(`${method}:${path}`, handler)]));
  registerCinematicRoutes(app, { cinematicService: { executeWriting: async (_id, _input, _actor, options) => {
    accepted++; options.onProgress({ stage: 'accepted' }); await tick(); f.revoke(); finishedWork++;
    return { privateProposal: 'do not deliver' };
  } } });
  f.req.params = { projectId: 'project' }; f.req.body = { writingQuoteId: 'fixture' };
  f.req.headers = { accept: 'text/event-stream' }; f.req.actorContext = { userId: 'owner' };
  await routes.get('post:/api/cinematic/projects/:projectId/story-plan/proposals')(f.req, f.res);
  assert.equal(accepted, 1); assert.equal(finishedWork, 1);
  assert.equal(f.res.chunks.length, 1); assert.match(f.res.chunks[0], /event: progress/);
  assert.ok(!f.res.chunks.join('').includes('privateProposal')); assert.equal(f.res.destroyed, true);
});

test('Cinematic serialization failure closes delivery and completes the accepted handler', async () => {
  const routes = new Map(), f = fixture(); let accepted = 0;
  const app = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(method => [method, (path, handler) => routes.set(`${method}:${path}`, handler)]));
  registerCinematicRoutes(app, { cinematicService: { executeWriting: async () => { accepted++;
    const result = {}; result.circular = result; return result;
  } } });
  f.req.params = { projectId: 'project' }; f.req.body = { writingQuoteId: 'fixture' };
  f.req.headers = { accept: 'text/event-stream' }; f.req.actorContext = { userId: 'owner' };
  await routes.get('post:/api/cinematic/projects/:projectId/story-plan/proposals')(f.req, f.res);
  assert.equal(accepted, 1); assert.equal(f.res.destroyed, true); assert.deepEqual(f.res.chunks, []);
});
