import crypto from 'node:crypto';

export class SandboxVideoProvider {
  constructor({ scripts = new Map() } = {}) {
    this.scripts = scripts;
    this.positions = new Map();
  }

  async submit(request) {
    const providerTaskId = `sandbox_${crypto.createHash('sha256').update(request.submittedFingerprint).digest('hex').slice(0, 16)}`;
    if (!this.scripts.has(providerTaskId)) {
      this.scripts.set(providerTaskId, [{ providerStatus: 'provider_queued' }]);
    }
    this.positions.set(providerTaskId, 0);
    return { providerTaskId, providerOperationId: providerTaskId, providerStatus: 'provider_queued' };
  }

  async poll(providerTaskId) {
    const script = this.scripts.get(providerTaskId);
    if (!script) return { providerStatus: 'failed', providerError: { code: 'sandbox_task_missing', category: 'internal', retryable: false, providerBillableState: 'not_billable' } };
    const position = this.positions.get(providerTaskId) || 0;
    const result = script[Math.min(position, script.length - 1)];
    this.positions.set(providerTaskId, position + 1);
    return structuredClone(result);
  }
}
