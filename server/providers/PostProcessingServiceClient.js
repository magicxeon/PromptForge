import crypto from 'node:crypto';

export class PostProcessingServiceClient {
  constructor({
    endpoint = process.env.POST_PROCESSING_URL || 'http://127.0.0.1:6501',
    token = process.env.POST_PROCESSING_INTERNAL_TOKEN,
    fetchImpl = fetch
  } = {}) {
    this.endpoint = endpoint;
    this.token = token;
    this.fetchImpl = fetchImpl;
  }

  async capabilities() {
    if (!this.token) return { available: false, reason: 'service_not_configured' };
    try {
      const response = await this.fetchImpl(this.endpoint + '/v1/capabilities', {
        headers: { 'x-post-processing-token': this.token },
        signal: AbortSignal.timeout(3000)
      });
      const body = await response.json();
      if (!response.ok || !body?.operations?.faceless_previs) throw new Error('invalid_capabilities');
      return body.operations.faceless_previs;
    } catch {
      return { available: false, reason: 'service_unavailable' };
    }
  }

  async createFacelessPrevis(bytes, expectedFaces) {
    if (!this.token) throw serviceError('faceless_service_unavailable', 'Faceless service is not configured.', 503);
    let response;
    try {
      response = await this.fetchImpl(this.endpoint + '/v1/faceless-previs', {
        method: 'POST',
        headers: {
          'content-type': 'application/octet-stream',
          'x-post-processing-token': this.token,
          'x-input-sha256': crypto.createHash('sha256').update(bytes).digest('hex'),
          'x-expected-faces': String(expectedFaces)
        },
        body: bytes,
        signal: AbortSignal.timeout(35_000)
      });
    } catch {
      throw serviceError('faceless_service_unavailable', 'Faceless service could not be reached.', 503);
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const code = String(body?.error?.code || 'faceless_processing_failed');
      const message = String(body?.error?.message || 'Faceless processing failed.');
      throw serviceError(code, message, response.status);
    }
    if (response.headers.get('content-type') !== 'image/png'
      || Number(response.headers.get('content-length')) > 75 * 1024 * 1024) {
      throw serviceError('faceless_output_invalid', 'Faceless output is invalid.', 502);
    }
    const output = Buffer.from(await response.arrayBuffer());
    if (!output.length || output.length > 75 * 1024 * 1024
      || crypto.createHash('sha256').update(output).digest('hex')
        !== response.headers.get('x-output-sha256')) {
      throw serviceError('faceless_output_invalid', 'Faceless output checksum did not match.', 502);
    }
    return {
      bytes: output,
      outputHash: response.headers.get('x-output-sha256'),
      faceCount: Number(response.headers.get('x-face-count')),
      modelHash: response.headers.get('x-model-sha256'),
      policyVersion: response.headers.get('x-mask-policy-version')
    };
  }
}

function serviceError(code, message, statusCode) {
  return Object.assign(new Error(message), { code, statusCode });
}

export const postProcessingServiceClient = new PostProcessingServiceClient();
