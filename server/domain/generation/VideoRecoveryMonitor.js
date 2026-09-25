import { videoRecoveryPolicy } from '../../config/videoRecoveryPolicy.js';

export class VideoRecoveryMonitor {
  constructor({
    recover,
    intervalMs = videoRecoveryPolicy.sweepIntervalMs,
    schedule = setInterval,
    cancel = clearInterval,
    onError = error => console.warn('[VideoRecovery] Background recovery failed:', error.message)
  } = {}) {
    if (typeof recover !== 'function') throw new TypeError('Video recovery monitor requires a recover function.');
    this.recover = recover;
    this.intervalMs = intervalMs;
    this.schedule = schedule;
    this.cancel = cancel;
    this.onError = onError;
    this.timer = null;
    this.inFlight = null;
  }

  runOnce() {
    if (this.inFlight) return this.inFlight;
    this.inFlight = Promise.resolve()
      .then(() => this.recover())
      .catch(error => {
        this.onError(error);
        return [];
      })
      .finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  start() {
    if (this.timer) return this.timer;
    this.timer = this.schedule(() => { void this.runOnce(); }, this.intervalMs);
    this.timer?.unref?.();
    return this.timer;
  }

  stop() {
    if (!this.timer) return;
    this.cancel(this.timer);
    this.timer = null;
  }
}
