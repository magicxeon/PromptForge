const DEFAULT_CAPACITY = 500;

function roundMilliseconds(value) {
  return Math.round(Number(value) * 100) / 100;
}

export class PerformanceTelemetry {
  constructor({ capacity = DEFAULT_CAPACITY, clock = () => performance.now() } = {}) {
    this.capacity = Math.max(10, Number(capacity) || DEFAULT_CAPACITY);
    this.clock = clock;
    this.samples = [];
  }

  start(operation, context = {}) {
    const startedAt = this.clock();
    let completed = false;
    return (status = 'ok', extra = {}) => {
      if (completed) return null;
      completed = true;
      return this.record({
        operation,
        status,
        durationMs: this.clock() - startedAt,
        ...context,
        ...extra
      });
    };
  }

  record(sample) {
    const bounded = {
      operation: String(sample.operation || 'unknown').slice(0, 120),
      status: String(sample.status || 'ok').slice(0, 32),
      durationMs: roundMilliseconds(sample.durationMs || 0),
      requestId: sample.requestId ? String(sample.requestId).slice(0, 120) : null,
      correlationId: sample.correlationId ? String(sample.correlationId).slice(0, 120) : null,
      jobId: sample.jobId ? String(sample.jobId).slice(0, 120) : null,
      recordedAt: new Date().toISOString()
    };
    this.samples.push(bounded);
    if (this.samples.length > this.capacity) {
      this.samples.splice(0, this.samples.length - this.capacity);
    }
    return bounded;
  }

  snapshot({ operation = null, limit = 100 } = {}) {
    const filtered = operation
      ? this.samples.filter(sample => sample.operation === operation)
      : this.samples;
    return filtered.slice(-Math.max(1, Math.min(Number(limit) || 100, this.capacity)));
  }
}

export const performanceTelemetry = new PerformanceTelemetry({
  capacity: Number(process.env.PERFORMANCE_SAMPLE_CAPACITY) || DEFAULT_CAPACITY
});
