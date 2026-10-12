import { randomBytes } from 'node:crypto';
import { identityRuntimeQualified } from '../../../config/identityRuntime.js';
import { performance } from 'node:perf_hooks';

export const passwordHashPolicy = Object.freeze({
  minimumCodePoints: 15, maximumCodePoints: 128,
  memoryCost: 65536, timeCost: 3, parallelism: 1,
  hashLength: 32, saltLength: 16, version: 19,
  maximumConcurrentJobs: 2, timeoutMs: 5000,
});

const slotKey = Symbol.for('ModelPromptForge.Identity.passwordNativeSlots.v1');
const slots = globalThis[slotKey] ??= { active: 0 };
const reject = (code = 'IDENTITY_PASSWORD_UNAVAILABLE') => {
  throw Object.assign(new Error('Password operation unavailable.'), { code });
};

function validSecret(value, creation) {
  if (typeof value !== 'string' || value.length > 256 || !value.isWellFormed()) return false;
  const length = [...value].length;
  return length >= (creation ? 15 : 1) && length <= 128;
}

// Never pass arbitrary stored PHC parameters to the native library. There is
// currently no approved legacy credential inventory; add an explicitly reviewed
// policy before accepting a different version/cost rather than silently weakening.
function approvedHash(value) {
  if (typeof value !== 'string' || value.length > 160) return false;
  const match = /^\$argon2id\$v=19\$m=65536,(?:t=3,p=1|p=1,t=3)\$([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/.exec(value);
  if (!match) return false;
  return Buffer.from(match[1], 'base64').toString('base64').replace(/=+$/, '') === match[1]
    && Buffer.from(match[2], 'base64').toString('base64').replace(/=+$/, '') === match[2];
}

async function boundedJob(work) {
  if (slots.active >= passwordHashPolicy.maximumConcurrentJobs) reject('IDENTITY_PASSWORD_BUSY');
  slots.active += 1;
  const deadline = performance.now() + passwordHashPolicy.timeoutMs;
  const check = () => { if (performance.now() >= deadline) reject(); };
  const actual = Promise.resolve().then(() => work(check));
  // Timeout cannot cancel Argon2 or a screening adapter. Capacity is released
  // only when the actual work settles, including across adapter instances.
  actual.then(() => { slots.active -= 1; }, () => { slots.active -= 1; });
  let timer;
  const timeout = new Promise((_, fail) => {
    timer = setTimeout(() => fail(Object.assign(new Error('Password operation unavailable.'), {
      code: 'IDENTITY_PASSWORD_UNAVAILABLE',
    })), passwordHashPolicy.timeoutMs);
  });
  try { return await Promise.race([actual, timeout]); }
  finally { clearTimeout(timer); }
}

export class IdentityPasswordAdapter {
  #implementation;
  #screening;
  #dummyHash;
  #preparing;

  constructor({ screening, fixtureOnly = false, implementation, runtime } = {}) {
    // This source qualification does not activate runtime password authentication
    // or claim that a fixture screening callback is a vetted production corpus.
    this.available = false;
    if (fixtureOnly !== true && !identityRuntimeQualified(runtime, 'password')) reject();
    this.#screening = screening;
    this.#implementation = implementation;
  }

  async prepare() {
    if (this.#dummyHash) return;
    if (this.#preparing) return this.#preparing;
    this.#preparing = boundedJob(async check => {
      try {
        const library = this.#implementation ?? await import('argon2');
        if (library.argon2id !== 2 || typeof library.hash !== 'function' || typeof library.verify !== 'function') reject();
        check();
        const hash = await library.hash(randomBytes(32).toString('base64url'), {
          ...passwordHashPolicy, type: library.argon2id, salt: randomBytes(16),
        });
        check();
        if (!approvedHash(hash)) reject();
        this.#implementation = library;
        this.#dummyHash = hash;
      } catch { reject(); }
    });
    try { await this.#preparing; }
    finally { this.#preparing = undefined; }
  }

  async hash(password) {
    if (!validSecret(password, true)) reject('IDENTITY_PASSWORD_POLICY_REJECTED');
    if (!this.#dummyHash || this.#screening?.available !== true || typeof this.#screening.check !== 'function') reject();
    return boundedJob(async check => {
      try {
        const result = await this.#screening.check(password);
        check();
        if (!result || Object.getPrototypeOf(result) !== Object.prototype
          || Object.keys(result).length !== 1 || result.compromised !== false) reject('IDENTITY_PASSWORD_POLICY_REJECTED');
        const hash = await this.#implementation.hash(password, {
          ...passwordHashPolicy, type: this.#implementation.argon2id, salt: randomBytes(16),
        });
        check();
        if (!approvedHash(hash)) reject();
        return hash;
      } catch (error) {
        if (error?.code === 'IDENTITY_PASSWORD_POLICY_REJECTED') reject(error.code);
        reject();
      }
    });
  }

  async verify(encodedHash, password) {
    if (!this.#dummyHash) reject();
    const valid = approvedHash(encodedHash) && validSecret(password, false);
    return boundedJob(async check => {
      try {
        const match = await this.#implementation.verify(valid ? encodedHash : this.#dummyHash,
          valid ? password : 'invalid submitted credential');
        check();
        return valid && match === true;
      } catch { reject(); }
    });
  }

  needsRehash(encodedHash) {
    if (!approvedHash(encodedHash)) reject();
    return false;
  }
}
