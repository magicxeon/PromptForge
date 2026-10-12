import nodemailer from 'nodemailer';
import { identityRuntimeQualified } from '../../../config/identityRuntime.js';
import { normalizeIdentityEmail } from '../identityEmail.js';
import { renderIdentityEmail } from './IdentityEmailRenderer.js';
import { opaque } from '../identitySecrets.js';

const fail = () => {
  throw Object.assign(new Error('Identity email delivery unavailable.'), {
    code: 'IDENTITY_EMAIL_DELIVERY_UNAVAILABLE',
  });
};
export class IdentitySmtpAdapter {
  constructor({ config, transportFactory, fixtureOnly = false, runtime } = {}) {
    this.available = false;
    if (!config?.enabled) return;
    if (
      fixtureOnly !== true && !identityRuntimeQualified(runtime, 'email') ||
      typeof transportFactory !== 'function' ||
      typeof config.host !== 'string' ||
      !/^[A-Za-z0-9.-]{1,253}$/.test(config.host) ||
      ![465, 587].includes(config.port) ||
      typeof config.username !== 'string' ||
      config.username.length > 254 ||
      !config.username ||
      typeof config.password !== 'string' ||
      config.password.length > 4096 ||
      !config.password ||
      typeof config.from !== 'string' ||
      (!identityRuntimeQualified(runtime, 'email') && !/^[A-Za-z0-9._+-]+@example\.invalid$/.test(config.from))
    )
      fail();
    normalizeIdentityEmail(config.from);
    const options = {
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      requireTLS: true,
      auth: { user: config.username, pass: config.password },
      tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      dnsTimeout: 5000,
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: false,
      debug: false,
      pool: false,
    };
    // Nodemailer owns MIME/envelope compilation even in fixture qualification.
    // The injected transport factory receives the exact inactive SMTP options;
    // no default network transport is created in this fixture-only adapter.
    const transport = transportFactory(Object.freeze(options));
    if (!transport || typeof transport.send !== 'function') fail();
    this.mailer = nodemailer.createTransport(transport, { disableFileAccess: true, disableUrlAccess: true });
    this.from = config.from;
    this.runtime = runtime;
  }
  async send(message, { signal } = {}) {
    if (!this.mailer || signal?.aborted || !opaque(message?.id)) fail();
    try {
      const rendered = renderIdentityEmail(message, { runtime: this.runtime });
      // Nodemailer's unpooled SMTP close() is not an active-send cancellation
      // guarantee. Keep this actual promise unsettled on abort; outer delivery
      // timeout/quarantine retains capacity until transport really settles.
      const result = await this.mailer.sendMail({
        from: { name: 'Momelo', address: this.from },
        to: { address: message.to },
        envelope: { from: this.from, to: [message.to] },
        messageId: `<${message.id}@${identityRuntimeQualified(this.runtime, 'email') ? this.from.split('@')[1] : 'mail.example.invalid'}>`,
        subject: rendered.subject,
        text: rendered.text,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      return { id: message.id, messageId: result.messageId };
    } catch {
      fail();
    }
  }
}
