import crypto from 'node:crypto';

const DEFAULT_BASE_URL = 'https://ark.ap-southeast-1.byteplusapi.com';
const API_VERSION = '2024-01-01';
const SERVICE = 'ark';
const REGION = 'ap-southeast-1';

export class ModelArkAssetLibraryClient {
  constructor({
    environment = process.env,
    fetchImpl = globalThis.fetch,
    clock = () => new Date()
  } = {}) {
    this.environment = environment;
    this.fetchImpl = fetchImpl;
    this.clock = clock;
    this.enabled = environment.MODEL_ARK_ASSET_LIBRARY_ENABLED === 'true';
    this.accessKey = normalizeSecret(environment.MODEL_ARK_ASSET_ACCESS_KEY || environment.BYTEPLUS_ACCESS_KEY);
    this.secretKey = normalizeSecret(environment.MODEL_ARK_ASSET_SECRET_KEY || environment.BYTEPLUS_SECRET_KEY);
    this.baseUrl = String(environment.MODEL_ARK_ASSET_LIBRARY_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.projectName = boundedName(environment.MODEL_ARK_ASSET_PROJECT_NAME || 'default', 'default');
    this.groupId = boundedId(environment.MODEL_ARK_ASSET_GROUP_ID);
    this.groupName = boundedName(environment.MODEL_ARK_ASSET_GROUP_NAME || 'momelo-cinematic-aigc', 'momelo-cinematic-aigc');
    this.timeoutMs = boundedInteger(environment.MODEL_ARK_ASSET_API_TIMEOUT_MS, 5_000, 120_000, 30_000);
  }

  assertConfigured() {
    if (!this.enabled) {
      throw assetLibraryError(
        'video_provider_asset_library_not_enabled',
        'Enable the ModelArk private AIGC Asset Library transport before using Seedance with this Character frame.',
        503
      );
    }
    if (!this.accessKey || !this.secretKey) {
      throw assetLibraryError(
        'video_provider_asset_library_credentials_missing',
        'Configure server-side ModelArk Asset Library AK/SK credentials before using this Character frame.',
        503
      );
    }
    let endpoint;
    try {
      endpoint = new URL(this.baseUrl);
    } catch {
      throw assetLibraryError('video_provider_asset_library_endpoint_invalid', 'The ModelArk Asset Library endpoint is invalid.', 500);
    }
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) {
      throw assetLibraryError('video_provider_asset_library_endpoint_invalid', 'The ModelArk Asset Library endpoint must use HTTPS.', 500);
    }
  }

  async resolveAigcGroup() {
    this.assertConfigured();
    if (this.groupId) return this.groupId;
    const result = await this.#request('ListAssetGroups', {
      Filter: { Name: this.groupName, GroupType: 'AIGC' },
      PageNumber: 1,
      PageSize: 100,
      SortBy: 'CreateTime',
      SortOrder: 'Desc',
      ProjectName: this.projectName
    });
    const exact = (Array.isArray(result.Items) ? result.Items : []).find(item => (
      item?.Name === this.groupName
      && item?.GroupType === 'AIGC'
      && String(item?.ProjectName || 'default') === this.projectName
      && boundedId(item?.Id)
    ));
    if (exact) return String(exact.Id);
    const created = await this.#request('CreateAssetGroup', {
      Name: this.groupName,
      Description: 'Momelo Cinematic approved AI Character keyframes',
      GroupType: 'AIGC',
      ProjectName: this.projectName
    }, { mutationMayExistOnTransportFailure: true });
    const id = boundedId(created.Id);
    if (!id) throw assetLibraryError('video_provider_asset_group_response_invalid', 'ModelArk did not return an AIGC Asset Group ID.', 502);
    return id;
  }

  async createImageAsset({ groupId, sourceUrl, name }) {
    this.assertConfigured();
    const normalizedGroupId = boundedId(groupId);
    if (!normalizedGroupId || !/^https:\/\//i.test(String(sourceUrl || ''))) {
      throw assetLibraryError('video_provider_asset_registration_invalid', 'ModelArk Asset registration input is incomplete.', 400);
    }
    const result = await this.#request('CreateAsset', {
      GroupId: normalizedGroupId,
      URL: String(sourceUrl),
      Name: boundedName(name || 'momelo-keyframe', 'momelo-keyframe'),
      AssetType: 'Image',
      Moderation: { Strategy: 'Default' },
      ProjectName: this.projectName
    }, { mutationMayExistOnTransportFailure: true });
    const id = boundedId(result.Id);
    if (!id) throw assetLibraryError('video_provider_asset_response_invalid', 'ModelArk did not return an Asset ID.', 502);
    return { id, requestId: result.__requestId || null };
  }

  async getAsset(assetId) {
    this.assertConfigured();
    const id = boundedId(assetId);
    if (!id) throw assetLibraryError('video_provider_asset_id_invalid', 'The ModelArk Asset ID is invalid.', 400);
    const result = await this.#request('GetAsset', { Id: id, ProjectName: this.projectName });
    return {
      id: boundedId(result.Id) || id,
      groupId: boundedId(result.GroupId),
      status: normalizeAssetStatus(result.Status),
      errorCode: boundedText(result.Error?.Code, 160),
      requestId: result.__requestId || null
    };
  }

  async #request(action, body, { mutationMayExistOnTransportFailure = false } = {}) {
    const signed = signModelArkAssetLibraryRequest({
      action,
      body,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
      baseUrl: this.baseUrl,
      now: this.clock()
    });
    let response;
    try {
      response = await this.fetchImpl(signed.url, {
        method: 'POST',
        headers: signed.headers,
        body: signed.body,
        redirect: 'error',
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (cause) {
      const error = assetLibraryError(
        'video_provider_asset_library_unreachable',
        'ModelArk Asset Library could not be reached.',
        502,
        { retryable: true, deliveryState: mutationMayExistOnTransportFailure ? 'unknown' : 'not_sent' },
        cause
      );
      throw error;
    }
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // The stable application error below intentionally omits the raw body.
    }
    const providerError = payload?.ResponseMetadata?.Error || payload?.error;
    if (!response.ok || providerError) {
      throw assetLibraryError(
        'video_provider_asset_library_request_failed',
        'ModelArk Asset Library rejected the provider Asset operation.',
        response.status >= 400 && response.status < 500 ? 409 : 502,
        {
          providerCode: boundedText(providerError?.Code || providerError?.code, 160),
          providerRequestId: boundedText(payload?.ResponseMetadata?.RequestId, 200),
          retryable: response.status >= 500,
          deliveryState: mutationMayExistOnTransportFailure && response.status >= 500
            ? 'unknown'
            : 'confirmed'
        }
      );
    }
    const result = payload?.Result;
    if (!result || typeof result !== 'object') {
      throw assetLibraryError(
        'video_provider_asset_library_response_invalid',
        'ModelArk Asset Library returned an invalid response.',
        502,
        {
          retryable: true,
          deliveryState: mutationMayExistOnTransportFailure ? 'unknown' : 'confirmed'
        }
      );
    }
    return { ...result, __requestId: boundedText(payload?.ResponseMetadata?.RequestId, 200) };
  }
}

export function signModelArkAssetLibraryRequest({
  action,
  body,
  accessKey,
  secretKey,
  baseUrl = DEFAULT_BASE_URL,
  now = new Date()
}) {
  const endpoint = new URL(baseUrl);
  const requestBody = JSON.stringify(body || {});
  const payloadHash = sha256(requestBody);
  const xDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const shortDate = xDate.slice(0, 8);
  const query = `Action=${encodeURIComponent(String(action))}&Version=${encodeURIComponent(API_VERSION)}`;
  const signedHeaders = 'content-type;host;x-content-sha256;x-date';
  const canonicalHeaders = [
    'content-type:application/json',
    `host:${endpoint.host.toLowerCase()}`,
    `x-content-sha256:${payloadHash}`,
    `x-date:${xDate}`,
    ''
  ].join('\n');
  const canonicalRequest = ['POST', endpoint.pathname || '/', query, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${shortDate}/${REGION}/${SERVICE}/request`;
  const stringToSign = ['HMAC-SHA256', xDate, credentialScope, sha256(canonicalRequest)].join('\n');
  const dateKey = hmac(secretKey, shortDate);
  const regionKey = hmac(dateKey, REGION);
  const serviceKey = hmac(regionKey, SERVICE);
  const signingKey = hmac(serviceKey, 'request');
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return {
    url: `${endpoint.origin}${endpoint.pathname || '/'}?${query}`,
    body: requestBody,
    headers: {
      'Content-Type': 'application/json',
      Host: endpoint.host,
      'X-Content-Sha256': payloadHash,
      'X-Date': xDate,
      Authorization: `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    }
  };
}

function hmac(key, value) {
  return crypto.createHmac('sha256', key).update(value).digest();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeAssetStatus(value) {
  const status = String(value || '').toLowerCase();
  return ['active', 'processing', 'failed'].includes(status) ? status : 'unknown';
}

function normalizeSecret(value) {
  const secret = String(value || '').trim();
  return secret && !/your_|placeholder|replace/i.test(secret) ? secret : null;
}

function boundedName(value, fallback) {
  const name = String(value || '').trim().slice(0, 64);
  return name || fallback;
}

function boundedId(value) {
  const id = String(value || '').trim();
  return /^[a-zA-Z][a-zA-Z0-9_-]{5,199}$/.test(id) ? id : null;
}

function boundedText(value, maximum) {
  const text = String(value || '').trim();
  return text ? text.slice(0, maximum) : null;
}

function boundedInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : fallback;
}

function assetLibraryError(code, message, statusCode, details = null, cause = null) {
  return Object.assign(new Error(message, cause ? { cause } : undefined), {
    code,
    statusCode,
    details,
    retryable: details?.retryable === true,
    deliveryState: details?.deliveryState || null
  });
}

export const modelArkAssetLibraryClient = new ModelArkAssetLibraryClient();
