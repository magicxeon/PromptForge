import fs from 'node:fs';

const policy = JSON.parse(fs.readFileSync(new URL('../../config/cinematic/dialogue-timing.v1.json', import.meta.url), 'utf8'));
export const dialogueTimingPolicyVersion = policy.version;
export const dialogueTimingMaximumRepairRounds = policy.maximumRepairRounds;

export function normalizeDialogueReview(review, plan) {
  if (review?.contractVersion !== dialogueTimingPolicyVersion) return undefined;
  const history = Object.fromEntries(['before', 'proposal', 'afterAllocation', 'rounds']
    .filter(key => review[key] && typeof review[key] === 'object'
      && (key === 'rounds' ? Array.isArray(review[key]) : !Array.isArray(review[key])))
    .map(key => [key, key === 'rounds' && Array.isArray(review[key])
      ? review[key].filter(item => item && typeof item === 'object' && !Array.isArray(item))
        .slice(0, dialogueTimingMaximumRepairRounds) : review[key]]));
  const historyOmitted = JSON.stringify(history).length > policy.limits.reviewHistoryCharacters;
  return {
    contractVersion: dialogueTimingPolicyVersion,
    assessmentKind: 'deterministic_estimate_and_model_self_review', advisory: true,
    historySource: 'submitted_review', historyOmitted,
    ...(!historyOmitted ? structuredClone(history) : {}),
    // Approval always uses current normalized content, not submitted review claims.
    final: assessDialoguePlan(plan), additionalBillableCalls: 0
  };
}

// These ranges are directing heuristics, never measured audio or provider limits.
export function estimateDialogueSpeech(text, { spokenLanguage = '', delivery = '' } = {}) {
  const source = String(text || '');
  const value = source.slice(0, policy.limits.textCharacters);
  const thai = value.match(/[\u0e01-\u0e2e\u0e30\u0e32\u0e33\u0e40-\u0e45]/gu)?.length || 0;
  const cjk = value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length || 0;
  const remaining = value.replace(/[\p{Script=Thai}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, '');
  const words = remaining.match(/[\p{L}\p{N}]+(?:['\u2019][\p{L}\p{N}]+)*/gu) || [];
  const knownSpaced = /^(en|fr|de|es|it|pt|ru)(-|$)|english|french|german|spanish|italian|portuguese|russian/i.test(spokenLanguage);
  const units = { thai, cjk, spaced: knownSpaced ? words.length : 0,
    fallback: knownSpaced ? 0 : words.join('').replace(/\p{M}/gu, '').length };
  const hasText = Object.values(units).some(Boolean);
  const punctuationPauses = value.match(/[,;:.!?\u2026\u3002\uff0c]+/gu)?.length || 0;
  const pauses = punctuationPauses + (includesTerm(delivery, policy.pauseTerms) ? 1 : 0);
  const multiplier = includesTerm(delivery, policy.slowDeliveryTerms) ? policy.slowDeliveryMultiplier : 1;
  let minimumMs = 0;
  let maximumMs = 0;
  for (const [kind, count] of Object.entries(units)) {
    minimumMs += count / policy.rates[kind].fast * 1000 * multiplier;
    maximumMs += count / policy.rates[kind].slow * 1000 * multiplier;
  }
  if (hasText) {
    minimumMs += pauses * policy.pauseMs.minimum;
    maximumMs += pauses * policy.pauseMs.maximum;
  }
  return {
    policyVersion: policy.version, method: policy.method, measured: false,
    confidence: units.fallback || source.length > value.length ? 'low' : 'medium',
    language: String(spokenLanguage).slice(0, 80), units,
    minimumMs: Math.ceil(minimumMs), maximumMs: Math.ceil(maximumMs),
    truncated: source.length > value.length
  };
}

// durationMs is usable editorial time, not the generated clip plus a previs buffer.
export function assessDialogueShot(shot, { spokenLanguage = '' } = {}) {
  const durationMs = finiteMs(shot?.durationMs);
  const findings = [];
  const cues = (shot?.dialogueCues || []).slice(0, policy.limits.cues);
  const estimates = cues.map((cue, cueIndex) => {
    const estimate = estimateDialogueSpeech(cue.text, { spokenLanguage, delivery: cue.delivery });
    const startOffsetMs = finiteMs(cue.startOffsetMs);
    const preparationMs = Math.max(0, policy.preparationMs - startOffsetMs);
    const minimumEndMs = startOffsetMs + preparationMs + estimate.minimumMs + policy.reactionMs;
    const maximumEndMs = startOffsetMs + preparationMs + estimate.maximumMs + policy.reactionMs;
    const context = { cueIndex, minimumEndMs, maximumEndMs, confidence: estimate.confidence };
    if (estimate.minimumMs && minimumEndMs > durationMs + policy.toleranceMs) {
      findings.push(note('film_dialogue_estimated_overload', 'script',
        'Independent speech, pause and response estimate exceeds the editorial Shot interval.',
        'Extend unlocked coverage, redistribute genuinely spare time, split coverage, or explicitly revise dialogue. Do not accelerate or truncate speech.',
        ['shot.durationMs', 'shot.dialogueCues'], context));
    } else if (estimate.minimumMs && maximumEndMs > durationMs + policy.toleranceMs) {
      findings.push(note('film_dialogue_estimated_tight', 'script',
        'Dialogue may leave insufficient room for natural delivery and listener response.',
        'Read through at the intended pace; the estimate is advisory, not measured speech.', [], context));
    }
    if (estimate.truncated || estimate.confidence === 'low') findings.push(note(
      'film_dialogue_estimate_uncertain', 'script', 'Speech timing uses an uncalibrated fallback range.',
      'Confirm with a language-appropriate read-through before judging delivery.', [], context));
    return { cueIndex, startOffsetMs, aiEstimatedDurationMs: finiteMs(cue.estimatedDurationMs),
      ...estimate, minimumEndMs, maximumEndMs };
  });
  for (let index = 0; index < cues.length; index += 1) {
    for (let other = index + 1; other < cues.length; other += 1) {
      const [earlier, later] = [estimates[index], estimates[other]].sort((a, b) => a.startOffsetMs - b.startOffsetMs);
      const explicitOverlap = [cues[index], cues[other]].some(cue =>
        cue.overlapAllowed === true || includesTerm(cue.delivery, policy.overlapTerms));
      if (!explicitOverlap && later.startOffsetMs + policy.toleranceMs < earlier.startOffsetMs + earlier.minimumMs + policy.turnGapMs) {
        findings.push(note('film_dialogue_turn_overlap', 'script', 'Estimated dialogue turns overlap without authored overlap intent.',
          'Separate the turns or explicitly direct the interruption; speech must still fit this Shot.', ['shot.dialogueCues'], { cueIndex: later.cueIndex }));
      }
    }
  }
  if (cues.length) {
    const performance = [shot.performanceCue, shot.performance, shot.subjectAction, shot.blocking].filter(Boolean).join(' ');
    const insert = /hand[- ]only|hands? insert|phone insert|object[- ]only|detail of (?:the )?(?:hands?|phone)/i.test(`${shot.framing || ''} ${shot.visibleMoment || ''}`);
    const face = /mouth|lip|eyes?|smile|jaw|face|\u0e1b\u0e32\u0e01|\u0e2a\u0e32\u0e22\u0e15\u0e32/i.test(performance);
    if (insert && (cues.some(cue => cue.speakerVisible === true) || face)) findings.push(note(
      'film_dialogue_framing_conflict', 'performance', 'Insert framing cannot expose the requested visible speaker or facial acting.',
      'Motivate off-screen delivery with a visible listener payoff, or propose coverage that exposes the performance.',
      ['shot.framing', 'shot.performanceCue', 'shot.performance', 'shot.gaze', 'shot.blocking']));
    if (!insert && cues.some(cue => cue.speakerVisible === true)
      && (!/mouth|lip|\u0e1b\u0e32\u0e01/i.test(performance) || !String(shot.gaze || '').trim()
        || !/head|shoulder|body|posture|\u0e28\u0e35\u0e23\u0e29\u0e30|\u0e44\u0e2b\u0e25\u0e48/i.test(performance))) findings.push(note(
      'film_dialogue_visible_performance', 'performance', 'Visible dialogue lacks explicit mouth, gaze or body/head direction.',
      'Direct observable speech and motivated gaze shifts, posture and pauses; mutual eye contact is optional.',
      ['shot.performanceCue', 'shot.performance', 'shot.gaze', 'shot.blocking']));
    const coverage = [performance, shot.continuityExit, shot.transitionToNext, shot.audioIntent].filter(Boolean).join(' ');
    if (!/listen|react|response|payoff|off[- ]screen|voice[- ]over|\u0e1f\u0e31\u0e07|\u0e15\u0e2d\u0e1a\u0e2a\u0e19\u0e2d\u0e07/i.test(coverage)) findings.push(note(
      'film_dialogue_listener_coverage', 'performance', 'The dialogue has no explicit listener response or motivated off-screen coverage.',
      'Direct a listener response, held-insert payoff or intentional voice-over without changing character or genre.',
      ['shot.performanceCue', 'shot.performance', 'shot.gaze', 'shot.blocking']));
  }
  // Action may run concurrently with speech; do not add its duration to every cue.
  if (cues.length && finiteMs(shot.estimatedActionDurationMs) > durationMs + policy.toleranceMs) findings.push(note(
    'film_dialogue_action_overload', 'editorial', 'The proposed action alone exceeds the editorial interval.',
    'Review simultaneous action versus sequential beats without speeding up the exact dialogue.', ['shot.durationMs']));
  return { contractVersion: policy.version, advisory: true, measured: false,
    status: findings.length ? 'needs_review' : 'no_detected_conflict', durationMs,
    estimates, findings, repairableCount: findings.filter(item => item.repairable).length };
}

export function assessDialoguePlan(plan) {
  const shots = (plan?.scenes || []).slice(0, policy.limits.scenes).flatMap((scene, sceneIndex) =>
    (scene.shots || []).slice(0, policy.limits.shots).map((shot, shotIndex) => ({
      sceneId: scene.id, shotId: shot.id, sceneIndex, shotIndex,
      ...assessDialogueShot(shot, { spokenLanguage: plan.spokenLanguage })
    })));
  const findings = shots.flatMap(shot => shot.findings.map(item => ({ ...item,
    sceneId: shot.sceneId, shotId: shot.shotId, sceneIndex: shot.sceneIndex, shotIndex: shot.shotIndex })));
  return { contractVersion: policy.version, advisory: true, measured: false,
    status: findings.length ? 'needs_review' : 'no_detected_conflict', shots, findings,
    repairableCount: findings.filter(item => item.repairable).length,
    alternatives: findings.some(item => /overload/.test(item.code))
      ? ['extend_project_runtime', 'redistribute_unlocked_spare_time', 'split_coverage', 'explicitly_revise_dialogue'] : [] };
}

function note(code, dimension, summary, recommendation, fieldPaths, context = {}) {
  return { code, dimension, severity: 'info', advisory: true, summary, recommendation,
    repairable: fieldPaths.length > 0, fieldPaths, ...context };
}

function includesTerm(value, terms) {
  const text = String(value || '').toLowerCase();
  return terms.some(term => text.includes(term));
}

function finiteMs(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : 0;
}
