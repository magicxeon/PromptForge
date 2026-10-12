import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IdentitySmtpAdapter } from '../../server/domain/identity/adapters/IdentitySmtpAdapter.js';
import { renderIdentityEmail } from '../../server/domain/identity/adapters/IdentityEmailRenderer.js';
import { IdentityPublicPolicyService } from '../../server/domain/identity/IdentityPublicPolicyService.js';

const config = {
  enabled: true,
  host: 'smtp.example.invalid',
  port: 587,
  username: 'fixture',
  password: 'fixture-secret',
  from: 'security@example.invalid',
};
const message = {
  id: 'fixture_delivery',
  to: 'reader@example.invalid',
  code: '012345',
  templatePurpose: 'login',
  locale: 'en',
  expiresAt: '2026-10-11T00:05:00.000Z',
  issuedAt: '2026-10-11T00:00:00.000Z',
};
test('canonical email catalogs preserve key and interpolation parity and render purpose-specific English/Thai', () => {
  const read = (locale) =>
    JSON.parse(
      readFileSync(
        new URL(`../../client/i18n/locales/${locale}/authentication.json`, import.meta.url),
        'utf8'
      )
    );
  const flatten = (value, prefix = '') =>
    Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) =>
        typeof item === 'string' ? [[prefix + key, item]] : Object.entries(flatten(item, `${prefix}${key}.`))
      )
    );
  const en = flatten(read('en')),
    th = flatten(read('th'));
  assert.ok(Object.values(read('en')).every((value) => typeof value === 'string'));
  assert.ok(Object.values(read('th')).every((value) => typeof value === 'string'));
  assert.deepEqual(Object.keys(en), Object.keys(th));
  for (const key of Object.keys(en)) {
    assert.deepEqual(
      [...en[key].matchAll(/\{([A-Za-z]+)\}/g)].map((m) => m[1]).sort(),
      [...th[key].matchAll(/\{([A-Za-z]+)\}/g)].map((m) => m[1]).sort()
    );
    assert.doesNotMatch(en[key] + th[key], /\{\{/);
  }
  for (const purpose of [
    'registration',
    'login',
    'password_reset',
    'email_change_new',
    'link_email',
    'reauthentication',
  ]) {
    for (const locale of ['en', 'th']) {
      const rendered = renderIdentityEmail({ ...message, templatePurpose: purpose, locale });
      assert.match(rendered.text, /012345/);
      assert.match(rendered.text, /2026-10-11T00:05:00.000Z/);
      assert.match(rendered.text, /reader@example.invalid/);
      assert.doesNotMatch(rendered.text, /\{[A-Za-z]+\}/);
    }
  }
  assert.deepEqual(renderIdentityEmail({ ...message, locale: 'unknown' }), renderIdentityEmail(message));
  assert.throws(() => renderIdentityEmail({ ...message, templatePurpose: 'untrusted_subject' }));
  assert.throws(() => renderIdentityEmail({ ...message, templatePurpose: 'constructor' }));
  assert.deepEqual(renderIdentityEmail({ ...message, locale: 'constructor' }), renderIdentityEmail(message));
});
test('inactive SMTP uses Nodemailer compilation with strict options, one recipient and stable Message-ID', async () => {
  let capturedOptions, capturedMail, mime;
  const adapter = new IdentitySmtpAdapter({
    config,
    fixtureOnly: true,
    transportFactory(options) {
      capturedOptions = options;
      return {
        name: 'fixture',
        version: '1',
        send(mail, callback) {
          capturedMail = mail.data;
          const chunks = [];
          mail.message
            .createReadStream()
            .on('data', (chunk) => chunks.push(chunk))
            .on('end', () => {
              mime = Buffer.concat(chunks).toString();
              callback(null, { messageId: mail.message.messageId() });
            })
            .on('error', callback);
        },
      };
    },
  });
  assert.equal(adapter.available, false);
  const first = await adapter.send(message),
    second = await adapter.send(message);
  assert.equal(first.messageId, second.messageId);
  assert.deepEqual(capturedMail.envelope, { from: config.from, to: [message.to] });
  assert.equal(capturedOptions.requireTLS, true);
  assert.equal(capturedOptions.tls.rejectUnauthorized, true);
  assert.equal(capturedOptions.disableFileAccess, true);
  assert.equal(capturedOptions.disableUrlAccess, true);
  assert.equal(capturedOptions.debug, false);
  assert.equal(capturedOptions.logger, false);
  for (const key of ['connectionTimeout', 'greetingTimeout', 'socketTimeout', 'dnsTimeout'])
    assert.ok(capturedOptions[key] > 0 && capturedOptions[key] <= 10000);
  assert.match(mime, /<fixture_delivery@mail.example.invalid>/);
  assert.match(mime, /012345/);
  assert.doesNotMatch(mime, /fixture-secret/);
  await assert.rejects(new IdentitySmtpAdapter().send(message));
  assert.throws(() => new IdentitySmtpAdapter({ config, transportFactory: () => ({ send() {} }) }));
  await assert.rejects(adapter.send({ ...message, to: 'real@example.com' }));
});
test('SMTP abort is prechecked but does not falsely settle an already active transport', async () => {
  let finish;
  const adapter = new IdentitySmtpAdapter({
    config,
    fixtureOnly: true,
    transportFactory: () => ({
      name: 'fixture',
      version: '1',
      send(mail, callback) {
        finish = () => callback(null, { messageId: mail.message.messageId() });
      },
    }),
  });
  const controller = new AbortController();
  let settled = false;
  const send = adapter.send(message, { signal: controller.signal }).then(() => {
    settled = true;
  });
  for (let n = 0; n < 20 && !finish; n++) await new Promise((resolve) => setTimeout(resolve, 1));
  controller.abort();
  await Promise.resolve();
  assert.equal(settled, false);
  await assert.rejects(adapter.send(message, { signal: controller.signal }));
  finish();
  await send;
});
test('public policy defaults, bypass and fixture configuration never expose methods or secrets', () => {
  const empty = new IdentityPublicPolicyService().project();
  assert.ok(Object.values(empty.methods).every((value) => value === false));
  const qualification = {
    productionApproved: true,
    durableContextQualified: true,
    retentionApproved: true,
    email: { configured: true, qualified: true, fixtureOnly: true, password: 'secret' },
    password: { configured: true, qualified: true, fixtureOnly: false },
    google: { configured: true, qualified: true, fixtureOnly: false, clientId: 'private-client' },
    facebook: { configured: false, qualified: false, fixtureOnly: false },
  };
  const service = new IdentityPublicPolicyService({
    qualification,
    legal: { termsVersion: 'v1', privacyVersion: 'v1' },
  });
  const fixture = service.project();
  assert.equal(fixture.methods.emailOtp, false);
  assert.equal(fixture.methods.password, false);
  assert.equal(fixture.methods.google, true);
  assert.doesNotMatch(JSON.stringify(fixture), /secret|private-client|clientId|smtp|qualification/);
  assert.ok(
    Object.values(service.project({ authMode: 'development_bypass' }).methods).every(
      (value) => value === false
    )
  );
});
