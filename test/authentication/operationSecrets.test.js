import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { canonical,fingerprint,separatedKeys,receiptDigest } from '../../server/domain/identity/identitySecrets.js';

test('canonical fingerprint rejects oversized/deep/non-JSON payloads before persistence',()=> {
  const ring={current:1,keys:{1:randomBytes(32)}};
  const values=['x'.repeat(32769),Array(1025).fill(1),Array(1),Array(100000000),[undefined],[,1],Object.fromEntries(Array.from({length:1025},(_,i)=>[String(i),1])),new Date(),undefined,NaN];
  let deep={}; for(let i=0;i<14;i++) deep={nested:deep}; values.push(deep);
  for(const value of values) assert.throws(()=>fingerprint(ring,1,'password_change',value),{code:'IDENTITY_OPERATION_REJECTED'});
  assert.equal(canonical({b:2,a:1}),canonical({a:1,b:2}));
  assert.equal(canonical([]),'[]');
  assert.throws(()=>canonical(Array(1)),{code:'IDENTITY_OPERATION_REJECTED'});
  assert.notEqual(fingerprint(ring,1,'password_change',{value:'x'}),fingerprint(ring,1,'password_reset',{value:'x'}));
  assert.throws(()=>receiptDigest(ring,1,'bad'),{code:'IDENTITY_RECEIPT_UNAVAILABLE'});
});

test('dedicated rings reject reuse across retained versions and missing rotated keys',()=> {
  const shared=randomBytes(32);
  const a={current:2,keys:{1:shared,2:randomBytes(32)}};
  const b={current:2,keys:{1:randomBytes(32),2:shared}};
  assert.throws(()=>separatedKeys([a,b]),{code:'IDENTITY_KEY_SEPARATION_REQUIRED'});
  assert.throws(()=>fingerprint(a,3,'password_change',{}),{code:'IDENTITY_KEY_UNAVAILABLE'});
});
