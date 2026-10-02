function boundedInterval(value, fallback = 15_000) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 5_000 && parsed <= 300_000
    ? parsed
    : fallback;
}

function boundedSubmissionConcurrency(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 256 ? parsed : 32;
}

// Operational review budgets, not provider failure or billing deadlines.
export const videoRecoveryPolicy = Object.freeze({
  version: 'video-recovery-v1',
  batchSize: 24,
  maxConcurrent: 4,
  maxConcurrentSubmissions: boundedSubmissionConcurrency(process.env.VIDEO_SUBMISSION_MAX_CONCURRENT),
  sweepIntervalMs: boundedInterval(process.env.VIDEO_RECOVERY_SWEEP_INTERVAL_MS),
  explicitMaxChecks: 3,
  explicitCooldownMs: 60_000,
  stages: {
    submission: { maxElapsedMs: 15 * 60_000, maxErrors: 0, baseDelayMs: 5_000, maxDelayMs: 60_000 },
    provider: { maxElapsedMs: 24 * 60 * 60_000, maxErrors: 8, baseDelayMs: 5_000, maxDelayMs: 300_000 },
    media: { maxElapsedMs: 60 * 60_000, maxErrors: 6, baseDelayMs: 10_000, maxDelayMs: 300_000 }
  },
  providers: {}
});
