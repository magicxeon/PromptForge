import crypto from 'node:crypto';

export class PostProcessingServiceClient {
  constructor({
    endpoint = process.env.POST_PROCESSING_URL || 'http://127.0.0.1:6501',
    token = process.env.POST_PROCESSING_INTERNAL_TOKEN,
    fetchImpl = fetch,
    circuitBreakerOptions = {}
  } = {}) {
    this.endpoint = endpoint;
    this.token = token;
    this.fetchImpl = fetchImpl;

    // Circuit Breaker State
    this.circuitState = 'CLOSED'; // 'CLOSED', 'OPEN', 'HALF_OPEN'
    this.failureCount = 0;
    this.failureThreshold = circuitBreakerOptions.failureThreshold || 5;
    this.resetTimeoutMs = circuitBreakerOptions.resetTimeoutMs || 30_000;
    this.nextAttemptTime = 0;
  }

  _checkCircuit() {
    const now = Date.now();
    if (this.circuitState === 'OPEN') {
      if (now >= this.nextAttemptTime) {
        this.circuitState = 'HALF_OPEN';
      } else {
        throw serviceError('faceless_service_unavailable', 'Post-Processing service Circuit Breaker is OPEN.', 503);
      }
    }
  }

  _recordSuccess() {
    this.failureCount = 0;
    this.circuitState = 'CLOSED';
  }

  _recordFailure(error) {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold || this.circuitState === 'HALF_OPEN') {
      this.circuitState = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeoutMs;
    }
  }

  async fetchWithRetry(url, options = {}, retries = 3, backoffMs = 200) {
    this._checkCircuit();
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchImpl(url, options);
        if (response.status >= 500) {
          throw serviceError('service_error', `HTTP ${response.status}`, response.status);
        }
        this._recordSuccess();
        return response;
      } catch (err) {
        lastError = err;
        // Do not retry 4xx validation errors
        if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
          throw err;
        }
        if (attempt < retries) {
          const delay = Math.min(2000, backoffMs * Math.pow(2, attempt - 1));
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    this._recordFailure(lastError);
    throw lastError || serviceError('faceless_service_unavailable', 'Service connection failed.', 503);
  }

  async capabilities() {
    if (!this.token) return { available: false, reason: 'service_not_configured' };
    try {
      const response = await this.fetchWithRetry(this.endpoint + '/v1/capabilities', {
        headers: { 'x-post-processing-token': this.token },
        signal: AbortSignal.timeout(3000)
      }, 2, 100);
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
      response = await this.fetchWithRetry(this.endpoint + '/v1/faceless-previs', {
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
    } catch (err) {
      if (err.code) throw err;
      throw serviceError('faceless_service_unavailable', 'Faceless service could not be reached.', 503);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const code = String(body?.error?.code || 'faceless_processing_failed');
      const message = String(body?.error?.message || 'Faceless processing failed.');
      throw serviceError(code, message, response.status);
    }

    const body = await response.json().catch(() => ({}));
    if (!body?.bytesBase64 || !body?.outputHash) {
      throw serviceError('faceless_output_invalid', 'Faceless output is invalid.', 502);
    }
    const output = Buffer.from(body.bytesBase64, 'base64');
    if (!output.length || output.length > 75 * 1024 * 1024
      || crypto.createHash('sha256').update(output).digest('hex') !== body.outputHash) {
      throw serviceError('faceless_output_invalid', 'Faceless output checksum did not match.', 502);
    }
    return {
      bytes: output,
      outputHash: body.outputHash,
      faceCount: Number(body.faceCount),
      modelHash: body.modelHash,
      policyVersion: body.policyVersion
    };
  }

  // --- Async Job Protocol Methods ---

  async createJob({ operation, inputBase64, options = {}, idempotencyKey, traceId }) {
    if (!this.token) throw serviceError('faceless_service_unavailable', 'Service is not configured.', 503);
    const headers = {
      'content-type': 'application/json',
      'x-post-processing-token': this.token
    };
    if (idempotencyKey) headers['x-idempotency-key'] = idempotencyKey;
    if (traceId) headers['x-trace-id'] = traceId;

    const response = await this.fetchWithRetry(this.endpoint + '/v1/jobs', {
      method: 'POST',
      headers,
      body: JSON.stringify({ operation, inputBase64, options, idempotencyKey, traceId }),
      signal: AbortSignal.timeout(10_000)
    });

    return await response.json();
  }

  async getJobStatus(jobId) {
    if (!this.token) throw serviceError('faceless_service_unavailable', 'Service is not configured.', 503);
    const response = await this.fetchWithRetry(this.endpoint + `/v1/jobs/${jobId}`, {
      headers: { 'x-post-processing-token': this.token },
      signal: AbortSignal.timeout(5000)
    });
    return await response.json();
  }

  async getJobResult(jobId) {
    if (!this.token) throw serviceError('faceless_service_unavailable', 'Service is not configured.', 503);
    const response = await this.fetchWithRetry(this.endpoint + `/v1/jobs/${jobId}/result`, {
      headers: { 'x-post-processing-token': this.token },
      signal: AbortSignal.timeout(10_000)
    });
    return await response.json();
  }

  async cancelJob(jobId) {
    if (!this.token) throw serviceError('faceless_service_unavailable', 'Service is not configured.', 503);
    const response = await this.fetchWithRetry(this.endpoint + `/v1/jobs/${jobId}`, {
      method: 'DELETE',
      headers: { 'x-post-processing-token': this.token },
      signal: AbortSignal.timeout(5000)
    });
    return await response.json();
  }
}

function serviceError(code, message, statusCode) {
  return Object.assign(new Error(message), { code, statusCode });
}

export const postProcessingServiceClient = new PostProcessingServiceClient();
