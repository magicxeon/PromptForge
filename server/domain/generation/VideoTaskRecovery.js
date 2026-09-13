import { videoRecoveryPolicy } from '../../config/videoRecoveryPolicy.js';

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'expired', 'reconciliation_required']);
const ACTIVE = new Set(['accepted', 'provider_submitting', 'provider_queued', 'provider_processing', 'provider_succeeded', 'media_copying', 'media_retry_pending']);
export function recoveryStage(task) {
  if (task.recovery?.stage === 'media' || ['provider_succeeded', 'media_copying', 'media_retry_pending'].includes(task.status)) return 'media';
  return task.providerTaskId ? 'provider' : 'submission';
}

export function recoveryState(task, now, policy = videoRecoveryPolicy) {
  const stage = recoveryStage(task);
  if (task.recovery?.stage === stage) return structuredClone(task.recovery);
  const budget = policy.providers[task.providerId]?.[stage] || policy.stages[stage];
  // Legacy records must not gain time from updatedAt, a browser read or restart.
  const start = Date.parse(stage === 'media'
    ? task.mediaStartedAt || task.providerSucceededAt || task.submittedAt || task.acceptedAt || task.createdAt
    : stage === 'provider' ? task.submittedAt || task.acceptedAt || task.createdAt
      : task.acceptedAt || task.createdAt);
  const valid = Number.isFinite(start) && start <= now;
  return {
    ...task.recovery,
    policyVersion: policy.version, stage, budget: { ...budget },
    startedAt: valid ? new Date(start).toISOString() : null,
    deadlineAt: valid ? new Date(start + budget.maxElapsedMs).toISOString() : null,
    errorCount: 0, nextCheckAt: null,
    explicitMaxChecks: task.recovery?.explicitMaxChecks ?? policy.explicitMaxChecks,
    explicitCooldownMs: task.recovery?.explicitCooldownMs ?? policy.explicitCooldownMs,
    explicitCheckCount: task.recovery?.explicitCheckCount || 0
  };
}

export function recoveryCutoff(state, now) {
  if (state.stoppedReason) return state.stoppedReason;
  if (!state.budget || !Number.isFinite(state.budget.maxElapsedMs)
    || !Number.isFinite(state.budget.maxErrors) || !Number.isFinite(state.budget.baseDelayMs)
    || !Number.isFinite(state.budget.maxDelayMs) || !Number.isInteger(state.errorCount)
    || state.errorCount < 0) return 'video_recovery_evidence_invalid';
  const start = Date.parse(state.startedAt);
  const deadline = Date.parse(state.deadlineAt);
  if (!Number.isFinite(start) || !Number.isFinite(deadline) || start > now || deadline < start) return 'video_recovery_evidence_invalid';
  if (now >= deadline) return 'video_recovery_deadline_elapsed';
  if (state.errorCount >= state.budget.maxErrors && state.errorCount > 0) return 'video_recovery_retry_exhausted';
  return null;
}

export function projectVideoRecovery(task, now = Date.now(), policy = videoRecoveryPolicy) {
  const recovery = recoveryState(task, now, policy);
  const reason = TERMINAL.has(task.status) ? null : !ACTIVE.has(task.status)
    ? 'video_recovery_state_unknown' : recoveryCutoff(recovery, now);
  const status = reason ? 'reconciliation_required' : task.status;
  const reviewRequired = status === 'reconciliation_required';
  const eligibleReason = recovery.stoppedReason || reason || task.providerError?.retryable;
  const recheckAllowed = Boolean(reviewRequired && eligibleReason && task.providerTaskId
    && task.providerError?.category !== 'credits'
    && recovery.explicitCheckCount < recovery.explicitMaxChecks
    && !(Date.parse(recovery.explicitNextCheckAt) > now));
  return {
    ...task, status, recovery,
    automaticMonitoring: !TERMINAL.has(status), reviewRequired, recheckAllowed,
    ...(reason ? { providerError: { code: reason, category: 'recovery', retryable: false, providerBillableState: 'unknown' } } : {})
  };
}
