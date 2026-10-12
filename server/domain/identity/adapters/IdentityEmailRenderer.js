import { readFileSync } from 'node:fs';
import { identityRuntimeQualified } from '../../../config/identityRuntime.js';
import { normalizeIdentityEmail } from '../identityEmail.js';

const catalogs = Object.fromEntries(
  ['en', 'th'].map((locale) => [
    locale,
    JSON.parse(
      readFileSync(
        new URL(`../../../../client/i18n/locales/${locale}/authentication.json`, import.meta.url),
        'utf8'
      )
    ),
  ])
);
const fail = () => {
  throw Object.assign(new Error('Identity email template rejected.'), {
    code: 'IDENTITY_EMAIL_TEMPLATE_REJECTED',
  });
};
const interpolate = (template, values) =>
  template.replace(/\{([A-Za-z]+)\}/g, (_, key) => values[key] ?? fail());
export function renderIdentityEmail(message, { runtime } = {}) {
  const catalog = Object.hasOwn(catalogs, message.locale) ? catalogs[message.locale] : catalogs.en;
  const purposeKey = `mail.purposes.${message.templatePurpose}`;
  const purpose = Object.hasOwn(catalog, purposeKey) ? catalog[purposeKey] : null;
  if (!purpose || typeof message.to !== 'string' || !identityRuntimeQualified(runtime, 'email') && !/^[^@\s]+@example\.invalid$/.test(message.to)) fail();
  const recipient = normalizeIdentityEmail(message.to).deliveryEmail;
  const expiresAt = new Date(message.expiresAt),
    issuedAt = new Date(message.issuedAt);
  if (!Number.isFinite(+expiresAt) || !Number.isFinite(+issuedAt)) fail();
  const values = {
    purpose,
    recipient,
    expiresAt: expiresAt.toISOString(),
    issuedAt: issuedAt.toISOString(),
    code: message.code,
  };
  const isCode = [
    'registration',
    'login',
    'password_reset',
    'email_change_new',
    'link_email',
    'reauthentication',
  ].includes(message.templatePurpose);
  if (isCode && (typeof message.code !== 'string' || !/^\d{6}$/.test(message.code))) fail();
  if (!isCode && message.code !== undefined) fail();
  return {
    subject: interpolate(catalog['mail.subject'], values),
    text: interpolate(catalog[isCode ? 'mail.codeBody' : 'mail.notificationBody'], values),
  };
}
