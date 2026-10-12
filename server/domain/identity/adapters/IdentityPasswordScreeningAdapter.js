import { createHash } from 'node:crypto';
import { assertIdentityRuntime } from '../../../config/identityRuntime.js';

const fail = () => { throw Object.assign(new Error('Password screening unavailable.'), { code: 'IDENTITY_PASSWORD_UNAVAILABLE' }); };

// Pwned Passwords range protocol: only five SHA-1 prefix characters leave this
// adapter. No password, complete hash, response cache or logging is exposed.
export class IdentityPasswordScreeningAdapter {
  constructor({ runtime, fetch }) {
    assertIdentityRuntime(runtime, 'password');
    if (typeof fetch !== 'function') fail();
    this.fetch = fetch;
    this.available = true;
  }
  async check(password) {
    if (typeof password !== 'string' || [...password].length < 15 || [...password].length > 128) fail();
    const digest = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const url = `https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`;
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Screening timeout.')); }, 5000); });
    try {
      return await Promise.race([timeout, (async () => {
        const response = await this.fetch(url, { redirect: 'error', signal: controller.signal,
          headers: { 'Add-Padding': 'true', 'User-Agent': 'ModelPromptForge-Identity' } });
        if (!response?.ok || response.redirected || response.url && response.url !== url || Number(response.headers?.get('content-length') ?? 0) > 1048576 || !response.body?.getReader) fail();
        const reader = response.body.getReader(), chunks = [];
        let length = 0;
        try { for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength;
          if (length > 1048576 || controller.signal.aborted) fail(); chunks.push(Buffer.from(value)); } }
        catch (error) { await reader.cancel().catch(() => {}); throw error; }
        const lines = Buffer.concat(chunks).toString('utf8').split(/\r?\n/).filter(Boolean);
        if (!lines.length || lines.length > 30000 || lines.some(line => !/^[A-F0-9]{35}:[0-9]{1,12}$/.test(line))) fail();
        const suffix = digest.slice(5);
        return { compromised: lines.some(line => line.slice(0, 35) === suffix && Number(line.slice(36)) > 0) };
      })()]);
    } catch { fail(); }
    finally { clearTimeout(timer); }
  }
}
