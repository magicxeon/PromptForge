import { createHmac, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';

export const reject = (code = 'IDENTITY_OPERATION_REJECTED') => {
  throw Object.assign(new Error('Identity operation rejected.'), { code });
};
export const opaque = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
export const digest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function keyFor(ring, version = ring?.current) {
  const key = ring?.keys?.[version];
  if (!Number.isSafeInteger(version) || version < 1 || !Buffer.isBuffer(key) || key.length !== 32)
    reject('IDENTITY_KEY_UNAVAILABLE');
  return key;
}
export function canonical(value, depth = 0, budget = { nodes: 0, bytes: 0 }) {
  if (depth > 12 || ++budget.nodes > 1024) reject();
  if (typeof value === 'string') {
    if (Buffer.byteLength(value) > 32768) reject();
    const encoded = JSON.stringify(value);
    budget.bytes += Buffer.byteLength(encoded);
    if (budget.bytes > 32768) reject();
    return encoded;
  }
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    // Array.map skips holes: accepting sparse arrays would make Array(1)
    // collide with [] and could allocate an unbounded intermediate array.
    if (value.length > 1024) reject();
    const items = [];
    for (let index = 0; index < value.length; index++) {
      if (!Object.hasOwn(value, index)) reject();
      items.push(canonical(value[index], depth + 1, budget));
    }
    return `[${items.join(',')}]`;
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    const keys = Object.keys(value);
    if (keys.length > 1024) reject();
    return `{${keys
      .sort()
      .map((key) => `${canonical(key, depth + 1, budget)}:${canonical(value[key], depth + 1, budget)}`)
      .join(',')}}`;
  }
  reject();
}
export function separatedKeys(rings) {
  const values = rings.map((ring) =>
    Object.keys(ring?.keys ?? {}).map((version) => keyFor(ring, Number(version)))
  );
  for (let i = 0; i < values.length; i++)
    for (let j = i + 1; j < values.length; j++) {
      if (values[i].some((a) => values[j].some((b) => a.equals(b))))
        reject('IDENTITY_KEY_SEPARATION_REQUIRED');
    }
}
export function fingerprint(ring, version, action, payload) {
  const body = canonical(payload);
  if (Buffer.byteLength(body) > 32768) reject();
  return createHmac('sha256', keyFor(ring, version))
    .update(`identity:operation:v1:${version}:${action}\0`)
    .update(body)
    .digest('hex');
}
export const newSecret = () => randomBytes(32).toString('base64url');
export function receiptDigest(ring, version, secret) {
  if (typeof secret !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(secret))
    reject('IDENTITY_RECEIPT_UNAVAILABLE');
  return createHmac('sha256', keyFor(ring, version))
    .update(`identity:receipt:v1:${version}\0`)
    .update(secret)
    .digest('hex');
}
export function equalDigest(a, b) {
  return digest(a) && digest(b) && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
const aad = (item) =>
  Buffer.from(
    JSON.stringify([
      item.id,
      item.operationId,
      item.purpose,
      item.keyVersion,
      new Date(item.expiresAt).toISOString(),
    ])
  );
export function sealDelivery(ring, item, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  if (!body.length || body.length > 2048) reject('IDENTITY_DELIVERY_REJECTED');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(ring, item.keyVersion), iv);
  cipher.setAAD(aad(item));
  const encrypted = Buffer.concat([cipher.update(body), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
export function openDelivery(ring, item) {
  try {
    const bytes = Buffer.from(item.protectedPayload, 'base64');
    if (bytes.length < 29 || bytes.length > 2076) reject();
    const decipher = createDecipheriv('aes-256-gcm', keyFor(ring, item.keyVersion), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    decipher.setAAD(aad(item));
    return JSON.parse(
      Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')
    );
  } catch {
    reject('IDENTITY_DELIVERY_REJECTED');
  }
}
