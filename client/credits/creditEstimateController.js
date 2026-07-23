/**
 * Client Credit Estimate Controller
 * Handles estimate calculation requests, caching, and UI binding near Generate button
 */
(function() {
  class CreditEstimateController {
    constructor() {
      this.currentEstimate = null;
      this.currentFingerprint = null;
      this.isLoading = false;
      this.lastError = null;
      this.subscribers = new Set();
    }

    subscribe(listener) {
      this.subscribers.add(listener);
      return () => this.subscribers.delete(listener);
    }

    notify() {
      this.subscribers.forEach(fn => fn(this.getState()));
    }

    getState() {
      return {
        estimate: this.currentEstimate,
        isLoading: this.isLoading,
        error: this.lastError
      };
    }

    fingerprint(params) {
      return JSON.stringify({
        routingMode: params?.routingMode || 'advanced', qualityTier: params?.qualityTier || 'standard',
        generationMode: params?.generationMode || 'scene', requestedProviderId: params?.requestedProviderId || null,
        requestedModelId: params?.requestedModelId || null, resolution: String(params?.resolution || '1K').toUpperCase(),
        quality: params?.quality || null, referenceCount: Number(params?.referenceCount || 0), outputCount: Number(params?.outputCount || 1)
      });
    }

    isCurrent(params) {
      return Boolean(this.currentEstimate)
        && this.currentFingerprint === this.fingerprint(params)
        && new Date(this.currentEstimate.expiresAt).getTime() > Date.now();
    }

    async ensureEstimate(params) {
      return this.isCurrent(params) ? this.currentEstimate : this.updateEstimate(params);
    }

    async updateEstimate(params) {
      if (!params || !params.requestedProviderId || !params.requestedModelId) {
        this.currentEstimate = null;
        this.lastError = null;
        this.notify();
        return null;
      }

      const requestFingerprint = this.fingerprint(params);
      this.isLoading = true;
      this.lastError = null;
      this.notify();

      try {
        const result = await window.CreditApi.requestEstimate(params);
        this.currentEstimate = result.estimate;
        this.currentFingerprint = requestFingerprint;
        this.isLoading = false;
        this.notify();
        return result.estimate;
      } catch (err) {
        this.currentEstimate = null;
        this.currentFingerprint = null;
        this.isLoading = false;
        this.lastError = err;
        this.notify();
        return null;
      }
    }

    invalidate() {
      this.currentEstimate = null;
      this.currentFingerprint = null;
      this.lastError = null;
      this.notify();
    }
  }

  window.creditEstimateController = new CreditEstimateController();
})();
