import { challengePolicy } from '../../config/authPolicy.js';

// Pure safe projection. Constructor configuration is trusted composition state,
// never request input or an environment dump. Fixture adapters cannot qualify it.
export class IdentityPublicPolicyService {
  constructor({ qualification = {}, legal = {} } = {}) {
    this.qualification = qualification;
    this.legal = legal;
  }
  project({ authMode = 'session' } = {}) {
    const mode = authMode === 'development_bypass' ? 'development_bypass' : 'session';
    const version = (value) =>
      typeof value === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(value) ? value : null;
    const termsVersion = version(this.legal.termsVersion),
      privacyVersion = version(this.legal.privacyVersion);
    const q = this.qualification;
    const active =
      mode === 'session' &&
      q.productionApproved === true &&
      q.durableContextQualified === true &&
      q.retentionApproved === true &&
      !!termsVersion &&
      !!privacyVersion;
    const email =
      active && q.email?.configured === true && q.email?.qualified === true && q.email?.fixtureOnly === false;
    const method = (name) =>
      active && q[name]?.configured === true && q[name]?.qualified === true && q[name]?.fixtureOnly === false;
    const legalUrl = value => {
      try {
        const url = new URL(value);
        return typeof value === 'string' && value.length <= 2048 && !url.username && !url.password && !url.hash && !url.search
          && (url.protocol === 'https:' || url.protocol === 'http:' && url.hostname === '127.0.0.1') ? value : undefined;
      } catch { return undefined; }
    };
    const termsUrl = legalUrl(this.legal.termsUrl), privacyUrl = legalUrl(this.legal.privacyUrl);
    return {
      contractVersion: 1,
      authMode: mode,
      methods: {
        password: email && method('password'),
        emailOtp: email,
        google: method('google'),
        facebook: method('facebook'),
      },
      policy: {
        otpDigits: challengePolicy.digits,
        otpExpiresSeconds: challengePolicy.lifetimeMs / 1000,
        resendSeconds: challengePolicy.resendMs / 1000,
        passwordMinLength: 15,
        passwordMaxLength: 128,
      },
      legal: { termsVersion, privacyVersion, ...(termsUrl ? { termsUrl } : {}), ...(privacyUrl ? { privacyUrl } : {}) },
    };
  }
}
