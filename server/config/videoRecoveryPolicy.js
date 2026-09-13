// Operational review budgets, not provider failure or billing deadlines.
export const videoRecoveryPolicy = Object.freeze({
  version: 'video-recovery-v1',
  batchSize: 24,
  maxConcurrent: 4,
  explicitMaxChecks: 3,
  explicitCooldownMs: 60_000,
  stages: {
    submission: { maxElapsedMs: 15 * 60_000, maxErrors: 0, baseDelayMs: 5_000, maxDelayMs: 60_000 },
    provider: { maxElapsedMs: 24 * 60 * 60_000, maxErrors: 8, baseDelayMs: 5_000, maxDelayMs: 300_000 },
    media: { maxElapsedMs: 60 * 60_000, maxErrors: 6, baseDelayMs: 10_000, maxDelayMs: 300_000 }
  },
  providers: {}
});
