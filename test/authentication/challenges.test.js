import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIdentityEmail } from '../../server/domain/identity/identityEmail.js';

test('email canonicalization preserves tags and spelling while normalizing IDNA/domain case', () => {
  assert.deepEqual(normalizeIdentityEmail('  Name.Tag+test@EXAMPLE.invalid '), {
    canonicalEmail: 'name.tag+test@example.invalid',
    deliveryEmail: 'Name.Tag+test@example.invalid',
    submittedEmail: 'Name.Tag+test@EXAMPLE.invalid',
  });
  assert.equal(normalizeIdentityEmail('Name@bücher.invalid').canonicalEmail, 'name@xn--bcher-kva.invalid');
  assert.notEqual(
    normalizeIdentityEmail('a.b@example.invalid').canonicalEmail,
    normalizeIdentityEmail('ab@example.invalid').canonicalEmail
  );
});
test('non-email URL syntax, controls and unsupported SMTPUTF8 fail without reinterpretation', () => {
  for (const value of [
    'a@example.invalid/x',
    'a@example.invalid#x',
    'a@example.invalid?x',
    'a@%65xample.invalid',
    'a@example.invalid:80',
    'a@exam\tple.invalid',
    'a@exam\nple.invalid',
    'a@example.invalid\\x',
    'a@exa mple.invalid',
    'ü@example.invalid',
    'a..b@example.invalid',
    'a@-bad.invalid',
    'a@bad-.invalid',
    'a@localhost',
    'a@@example.invalid',
  ]) {
    assert.throws(() => normalizeIdentityEmail(value), { code: 'IDENTITY_EMAIL_INVALID' });
  }
});
