import test from 'node:test';
import assert from 'node:assert/strict';
import { actorContextMiddleware } from '../server/middleware/actorContextMiddleware.js';

test('deprecated mock middleware denies missing/header/query identities in every method without fallback', async () => {
  for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    for (const claim of [{}, { headers: { 'x-mpf-user-id': 'usr_demo' } }, { query: { mpfUserId: 'usr_demo' } }]) {
      const req = { method, headers: {}, query: {}, actorContext: { userId: 'injected' }, ...claim };
      const res = { headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(value) { this.statusCode = value; return this; },
        json(value) { this.body = value; return this; } };
      let advanced = false;
      await actorContextMiddleware(req, res, () => { advanced = true; });
      assert.equal(req.actorContext, null); assert.equal(res.statusCode, 503); assert.equal(advanced, false);
      assert.equal(res.headers['Cache-Control'], 'no-store'); assert.equal(res.body.code, 'auth_service_unavailable');
    }
  }
});
