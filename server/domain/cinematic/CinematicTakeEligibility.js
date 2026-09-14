import { fingerprintVideoPacketAuthority } from './CinematicVideoPacketCompiler.js';

const SETTLED = new Set(['captured', 'qualification_no_charge']);

export function assessCinematicTake({ project, scene, shot, attempt, task, currentPacket, approvedStoryboardAttempt }) {
  if (!task) return !attempt?.generationJobId && ['pending', 'preparing', 'accepted'].includes(attempt?.status)
    ? 'processing' : 'task_unavailable';
  if (task.status === 'failed' || task.status === 'cancelled' || task.status === 'expired'
    || task.status === 'reconciliation_required') return 'task_failed';
  if (task.status !== 'completed') return 'processing';
  if (!SETTLED.has(task.billingStatus)) return 'settlement_pending';
  if (!task.outputAsset?.id) return 'media_unavailable';
  if (task.outputAsset.technicalProbe?.status !== 'passed') return 'probe_failed';
  return assessCinematicTakeCompatibility({ project, scene, shot, attempt, currentPacket, approvedStoryboardAttempt });
}

export function assessCinematicTakeCompatibility({ project, scene, shot, attempt, currentPacket, approvedStoryboardAttempt }) {
  if (!attempt || attempt.shotId !== shot.id || attempt.sceneId !== scene.id) return 'shot_changed';
  if (attempt.referenceMode !== shot.videoReferenceMode) return 'reference_changed';
  if (attempt.downstreamSourceStatus === 'source_changed') return 'source_changed';
  if (!['looks_only', 'text_only'].includes(attempt.referenceMode)
    && (!attempt.sourceFingerprint || attempt.sourceFingerprint !== shot.approvedStoryboardSource?.sourceFingerprint)) return 'source_changed';
  if (approvedStoryboardAttempt?.keyframeContractFingerprint && attempt.keyframeContractFingerprint
    && attempt.keyframeContractFingerprint !== approvedStoryboardAttempt.keyframeContractFingerprint) return 'keyframe_changed';
  if (attempt.videoPacketFingerprint === currentPacket.packetFingerprint) return 'ready';

  const authorityFingerprint = fingerprintVideoPacketAuthority(currentPacket);
  if (attempt.videoPacketAuthorityFingerprint) {
    if (attempt.videoPacketAuthorityFingerprint === authorityFingerprint) return 'ready';
  }
  const receipt = findSubmittedPacketReceipt(project, shot, attempt);
  if (!receipt) return attempt.videoPacketAuthorityFingerprint ? 'shot_changed' : 'authority_unverified';
  if (fingerprintVideoPacketAuthority(receipt.result.videoPacket) === authorityFingerprint) return 'ready';
  const durationOverride = describeCinematicDurationOverride({ project, shot, attempt, currentPacket });
  if (!durationOverride) return 'shot_changed';
  const approved = attempt.approvalOverride;
  if (shot.approvedVideoAttemptId === attempt.id && attempt.status === 'approved'
    && approved?.kind === durationOverride.kind
    && approved.submittedPacketFingerprint === durationOverride.submittedPacketFingerprint
    && approved.submittedDurationMs === durationOverride.submittedDurationMs
    && approved.currentDurationMs === durationOverride.currentDurationMs) return 'ready';
  return 'duration_override_available';
}

export function describeCinematicDurationOverride({ project, shot, attempt, currentPacket }) {
  const receipt = findSubmittedPacketReceipt(project, shot, attempt);
  const oldPacket = receipt?.result?.videoPacket;
  const submittedDurationMs = Number(oldPacket?.timing?.plannedDurationMs);
  const currentDurationMs = Number(currentPacket?.timing?.plannedDurationMs);
  if (!Number.isInteger(submittedDurationMs) || submittedDurationMs <= 0
    || !Number.isInteger(currentDurationMs) || currentDurationMs <= 0
    || submittedDurationMs === currentDurationMs
    || fingerprintVideoPacketAuthority(oldPacket, { omitPlannedDuration: true })
      !== fingerprintVideoPacketAuthority(currentPacket, { omitPlannedDuration: true })) return null;
  return { kind: 'planned_duration', submittedDurationMs, currentDurationMs,
    submittedPacketFingerprint: attempt.videoPacketFingerprint,
    receiptCreatedAt: receipt.createdAt };
}

function findSubmittedPacketReceipt(project, shot, attempt) {
  return (project.commandReceipts || []).find(item => (
    item.operation === 'approve_storyboard_source'
    && item.result?.shotId === shot.id
    && item.result?.referenceMode === attempt.referenceMode
    && item.result?.approvedStoryboardSource?.sourceFingerprint === attempt.sourceFingerprint
    && item.result?.videoPacket?.packetFingerprint === attempt.videoPacketFingerprint
    && Date.parse(item.createdAt || '') <= Date.parse(attempt.createdAt || '')
  ));
}
