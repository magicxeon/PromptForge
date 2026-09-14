import crypto from 'node:crypto';
import { validateGenerationPrompt } from '../generation/GenerationPromptBudget.js';
import {
  matchesStoryboardKeyframeFingerprint,
  storyboardKeyframeContractCompiler
} from './StoryboardKeyframeContractCompiler.js';
import { cinematicVideoPacketConfigurationService } from './CinematicVideoPacketConfigurationService.js';
import { cinematicVideoReferenceMode } from './CinematicVideoReferencePlanService.js';
import { normalizeStoryboardRenderStyle } from './CinematicStoryboardRenderStyle.js';

const LEGACY_SECTION_LABELS = Object.freeze({
  startAuthority: 'APPROVED START FRAME',
  temporalAction: 'TEMPORAL ACTION',
  camera: 'CAMERA MOTION',
  performance: 'PERFORMANCE',
  environment: 'LIGHT AND ENVIRONMENT',
  continuity: 'END STATE AND CONTINUITY',
  audio: 'AUDIO INTENT',
  prohibitions: 'PROHIBITIONS',
  authorDirection: 'AUTHOR DIRECTION'
});

export class CinematicVideoPacketCompiler {
  constructor({
    keyframeCompiler = storyboardKeyframeContractCompiler,
    configurationService = cinematicVideoPacketConfigurationService
  } = {}) {
    this.keyframeCompiler = keyframeCompiler;
    this.configurationService = configurationService;
  }

  compile({ project, scene, shot, approvedStoryboardSource, storyboardAttempt = null, referenceMode = shot?.videoReferenceMode }) {
    if (!project?.id || !scene?.id || !shot?.id) {
      throw new TypeError('Project, Scene and Shot are required to compile a Cinematic video packet.');
    }
    const policy = this.configurationService.getPolicy();
    const promptStrategy = this.configurationService.getPromptStrategy();
    const manualStoryboard = shot.manualStoryboard === true;
    const timeline = manualStoryboard ? normalizeTimeline(shot.videoActionTimeline) : null;
    const mode = cinematicVideoReferenceMode(referenceMode);
    const textOnly = mode === 'text_only';
    const looksOnly = ['looks_only', 'text_only'].includes(mode);
    if (looksOnly && !policy.looksOnlyMode) throw new TypeError('The Looks-only prompt policy is not configured.');
    const source = looksOnly ? null : approvedStoryboardSource || shot.approvedStoryboardSource || null;
    const leadInMs = source?.storyboardRenderStyle === 'white_previs_v1'
      ? Math.max(0, Math.min(2000, Number(policy.whitePrevisLeadInMs) || 0)) : 0;
    const compositionReference = mode === 'storyboard_and_looks' && normalizeStoryboardRenderStyle(source?.storyboardRenderStyle);
    const approvedContractFingerprint = looksOnly ? null : compact(storyboardAttempt?.keyframeContractFingerprint) || null;
    const keyframeCandidates = looksOnly ? [this.keyframeCompiler.compile({ project, scene, shot })]
      : compileKeyframeCandidates(this.keyframeCompiler, project, scene, shot);
    const historicalPlanIds = (project.storyPlanVersions || [])
      .filter(plan => plan.sceneIds?.includes(scene.id))
      .slice(-64).map(plan => plan.id);
    const matchingKeyframeContract = approvedContractFingerprint
      ? keyframeCandidates.find(candidate => (
          matchesStoryboardKeyframeFingerprint(candidate, approvedContractFingerprint, historicalPlanIds)
        )) || null
      : null;
    const keyframeContract = matchingKeyframeContract || keyframeCandidates[0];
    const findings = [];
    if (looksOnly) {
      // Manual events replace legacy direction requirements, never source authority checks.
      findings.push(...keyframeContract.findings.filter(item => item.severity === 'blocking'
        && !(manualStoryboard && item.code === 'missing_shot_authority'
          && ['shot.visibleMoment', 'shot.subjectAction', 'shot.emotionalTarget'].includes(item.fieldPath))));
      if (!textOnly && !keyframeContract.characterAuthority.length) {
        findings.push(finding('blocking', 'cinematic_video_reference_cast_missing', 'shot.castAssignmentIds'));
      }
      if (textOnly && keyframeContract.characterAuthority.length) findings.push(finding('blocking', 'cinematic_video_text_only_cast', 'shot.castAssignmentIds'));
    }
    if (!looksOnly && (!source?.sourceFingerprint || !source?.imageUrl)) {
      findings.push(finding('blocking', 'cinematic_storyboard_source_required', 'shot.approvedStoryboardSource'));
    }
    if (approvedContractFingerprint && !matchingKeyframeContract) {
      findings.push(finding('blocking', 'cinematic_video_keyframe_contract_stale', 'shot.approvedStoryboardAttemptId'));
    }
    if (!approvedContractFingerprint && source) {
      findings.push(finding('warning', 'cinematic_video_legacy_keyframe_authority', 'shot.approvedStoryboardAttemptId'));
    }
    if (manualStoryboard && !timeline.length) {
      findings.push(finding('blocking', 'cinematic_video_timeline_required', 'shot.videoActionTimeline'));
    }
    if (!manualStoryboard && !compact(shot.subjectAction)) {
      findings.push(finding('blocking', 'cinematic_video_action_required', 'shot.subjectAction'));
    }
    if (!manualStoryboard && Number(shot.estimatedActionDurationMs || 0) > Number(shot.durationMs || 0)) {
      findings.push(finding('warning', 'cinematic_video_action_overflow', 'shot.estimatedActionDurationMs'));
    }

    const packet = {
      ...(compositionReference ? { storyboardRenderStyle: source.storyboardRenderStyle } : {}),
      ...(looksOnly ? { referenceMode: mode, composition: keyframeContract.composition } : {}),
      contractVersion: policy.contractVersion,
      projectId: project.id,
      projectVersion: Number(project.version || 1),
      sceneId: scene.id,
      sceneVersion: Number(scene.version || 1),
      shotId: shot.id,
      shotVersion: Number(shot.version || 1),
      keyframeContractFingerprint: keyframeContract.sourceFingerprint,
      approvedKeyframeContractFingerprint: approvedContractFingerprint,
      approvedStoryboardSourceFingerprint: source?.sourceFingerprint || null,
      timing: {
        ...(leadInMs ? { leadInMs } : {}),
        plannedDurationMs: Number(shot.durationMs || 0),
        estimatedActionDurationMs: Number((manualStoryboard ? shot.durationMs : shot.estimatedActionDurationMs || shot.durationMs) || 0)
      },
      referenceStrategy: {
        mode: looksOnly ? mode : compositionReference ? 'composition_reference' : source ? 'first_frame' : 'unavailable',
        firstFrameAssetVersionId: source?.assetVersionId || null,
        firstFrameSourceFingerprint: source?.sourceFingerprint || null,
        lastFrameAssetVersionId: null,
        additionalReferenceAssetIds: []
      },
      authority: {
        characters: keyframeContract.characterAuthority,
        looks: keyframeContract.lookAuthority
      },
      motion: {
        ...(manualStoryboard ? { timeline } : {}),
        visibleStart: manualStoryboard ? '' : compact(shot.visibleMoment),
        primaryAction: manualStoryboard ? '' : compact(shot.subjectAction),
        additionalDirection: manualStoryboard ? '' : compact(shot.additionalMotionDirection),
        visibleEnd: manualStoryboard ? '' : compact(shot.continuityExit),
        cameraMovement: compact(shot.cameraMovement),
        blocking: compact(shot.blocking),
        screenDirection: ''
      },
      performance: {
        emotionalTarget: compact(shot.emotionalTarget),
        direction: compact(shot.performance || scene.performance),
        observableCue: compact(shot.performanceCue),
        gaze: compact(shot.gaze)
      },
      environment: {
        ...(scene.artDirection ? { artDirection: compact(scene.artDirection) } : {}),
        location: compact(scene.location),
        time: compact(scene.time),
        lighting: compact(shot.lighting || scene.lighting),
        environment: compact(shot.environment),
        propContinuity: compact(shot.continuityEntry)
      },
      continuity: {
        entry: compact(shot.continuityEntry),
        exit: compact(shot.continuityExit),
        transitionToNext: compact(shot.transitionToNext),
        notes: unique(shot.continuityNotes || [])
      },
      audio: {
        ...(shot.audioDirectionVersion === 1 ? { directionVersion: 1 } : {}),
        intent: compact(shot.audioIntent || scene.audioIntent),
        dialogueCues: normalizeDialogueCues(shot.dialogueCues, shot.audioDirectionVersion === 1 ? project.castAssignments : []),
        audioCues: normalizeAudioCues(shot.audioCues)
      },
      authorDirection: manualStoryboard ? '' : keyframeContract.authorDirection,
      prohibitions: unique(policy.globalProhibitions.map(value => template(value, {
        actionScope: policy.actionScopes?.[manualStoryboard ? 'manualTimeline' : 'singleAction']
      }))),
      provenance: {
        policyId: policy.id,
        policyVersion: policy.version,
        promptStrategyId: promptStrategy.id,
        promptStrategyVersion: promptStrategy.version
      },
      findings
    };
    const providerIndependentPrompt = renderPrompt(packet, policy, promptStrategy);
    const renderedPromptFingerprint = fingerprint(providerIndependentPrompt);
    const fingerprintInput = { ...packet, providerIndependentPrompt };
    delete fingerprintInput.projectVersion;
    if (looksOnly) {
      delete fingerprintInput.shotVersion;
      delete fingerprintInput.sceneVersion;
    }
    return {
      ...packet,
      packetFingerprint: fingerprint(fingerprintInput),
      renderedPromptFingerprint,
      providerIndependentPrompt
    };
  }

  renderForProvider(packet, { providerId = '', modelId = '', referencePlan = null, takeDurationSeconds } = {}) {
    if (!packet?.contractVersion || !packet?.packetFingerprint) {
      throw new TypeError('A compiled Cinematic video packet is required.');
    }
    const policy = this.configurationService.getPolicy();
    const strategy = this.configurationService.getPromptStrategy(providerId);
    const executionPacket = takeDurationSeconds === undefined ? packet : {
      ...packet, timing: { ...packet.timing, plannedDurationMs: selectedTakeDurationMs(takeDurationSeconds) }
    };
    const prompt = renderPrompt(executionPacket, policy, strategy, referencePlan);
    return {
      prompt,
      promptBudget: validateGenerationPrompt(prompt, { providerId, modelId, operation: 'video' }),
      promptFingerprint: fingerprint(prompt),
      strategyId: strategy.id,
      strategyVersion: strategy.version,
      policyId: policy.id,
      policyVersion: policy.version
    };
  }
}

function selectedTakeDurationMs(value) {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) throw new TypeError('Take duration must be positive.');
  return Math.round(duration * 1000);
}

function compileKeyframeCandidates(compiler, project, scene, shot) {
  const orderedShots = (scene.shotOrder?.length
    ? scene.shotOrder.map(id => scene.shots?.find(item => item.id === id)).filter(Boolean)
    : scene.shots || []);
  const shotIndex = orderedShots.findIndex(item => item.id === shot.id);
  const previousShot = shotIndex > 0 ? orderedShots[shotIndex - 1] : null;
  const previousSource = previousShot?.approvedStoryboardSource || null;
  const continuityContract = compiler.compile({
    project,
    scene,
    shot,
    referencePlan: previousSource ? {
      previousApprovedShotId: previousShot.id,
      previousApprovedSourceFingerprint: previousSource.sourceFingerprint
    } : null
  });
  if (!previousSource) return [continuityContract];
  const noPriorReferenceContract = compiler.compile({ project, scene, shot });
  return continuityContract.sourceFingerprint === noPriorReferenceContract.sourceFingerprint
    ? [continuityContract]
    : [continuityContract, noPriorReferenceContract];
}

function renderPrompt(packet, policy, strategy = null, referencePlan = null) {
  const leadInMs = Number(packet.timing.leadInMs || 0);
  const manualTimeline = Array.isArray(packet.motion.timeline);
  const textOnly = packet.referenceMode === 'text_only' || referencePlan?.mode === 'text_only';
  const looksOnly = textOnly || packet.referenceMode === 'looks_only' || referencePlan?.mode === 'looks_only';
  const sketchComposition = referencePlan?.storyboardRenderStyle === 'concept_sketch_v1' || packet.storyboardRenderStyle === 'concept_sketch_v1';
  const photorealComposition = !sketchComposition && normalizeStoryboardRenderStyle(referencePlan?.storyboardRenderStyle || packet.storyboardRenderStyle);
  const referenceMode = sketchComposition ? strategy?.sketchReferenceMode || policy.sketchReferenceMode
    : photorealComposition ? policy.compositionReferenceMode
    : textOnly ? policy.textOnlyMode : looksOnly ? policy.looksOnlyMode
    : referencePlan?.inputMode === 'multimodal_reference' ? strategy?.lookReferenceMode : null;
  if (referencePlan?.inputMode === 'multimodal_reference' && !referenceMode) {
    throw new TypeError('The provider has no configured Look reference prompt strategy.');
  }
  const labels = policy.sectionLabels || LEGACY_SECTION_LABELS;
  const phrase = (key, fallback, variables = {}) => template(policy.phrasing?.[key] || fallback, variables);
  const sections = {
    startAuthority: sentences([
      phrase('startFrame', 'Begin from the approved Storyboard image as the immutable first frame.'),
      packet.motion.visibleStart,
      packet.referenceStrategy.mode === 'first_frame'
        ? phrase('preserveStartFrame', 'Preserve every visible identity, garment, prop, spatial relation and light source from that frame.')
        : ''
    ]),
    temporalAction: manualTimeline ? sentences([
      packet.motion.timeline.some(event => event.endMs > packet.timing.plannedDurationMs)
        ? phrase('manualTakeWindow', 'Authored timeline below is unchanged. This Take stops at {seconds}s of action time. Execute only the portion within that window; later events are continuity notes, not actions for this Take. Do not accelerate, compress, or move later events earlier.', { seconds: (packet.timing.plannedDurationMs / 1000).toFixed(3) })
        : phrase('manualTimeline', 'Manual timeline, local to this clip starting at 0:00; execute only these events in order at their exact intervals.'),
      ...packet.motion.timeline.map(event => `${timelineClock(event.startMs + leadInMs)}-${timelineClock(event.endMs + leadInMs)}: ${event.description}`),
      phrase('manualDuration', 'Clip duration: {seconds}s. No automatic extra events.', {
        seconds: ((packet.timing.plannedDurationMs + leadInMs) / 1000).toFixed(3)
      })
    ]) : sentences([
      packet.motion.primaryAction ? phrase('primaryAction', 'One primary action: {value}.', { value: packet.motion.primaryAction }) : '',
      packet.motion.additionalDirection
        ? phrase('additionalMotionDirection', 'Creator motion correction: {value}.', { value: packet.motion.additionalDirection })
        : '',
      packet.timing.plannedDurationMs ? phrase('duration', 'Complete the action within {seconds} seconds.', { seconds: (packet.timing.plannedDurationMs / 1000).toFixed(3) }) : '',
      packet.motion.blocking ? phrase('blocking', 'Blocking: {value}.', { value: packet.motion.blocking }) : '',
      packet.motion.screenDirection ? phrase('screenDirection', 'Maintain screen direction: {value}.', { value: packet.motion.screenDirection }) : ''
    ]),
    camera: sentences([
      ...(looksOnly ? [packet.composition?.framing, packet.composition?.cameraAngle, packet.composition?.lensIntent] : []),
      ...(manualTimeline ? [phrase('manualCamera', 'Preserve opening framing unless the timeline directs a camera move.')] : [
        packet.motion.cameraMovement || phrase('stableCamera', 'Keep the camera restrained and stable.'),
        phrase('cameraImperfection', 'Use subtle natural handheld or optical imperfection only when compatible with the authored camera direction.')
      ])
    ]),
    performance: !manualTimeline && packet.authority.characters.length ? sentences([
      packet.performance.emotionalTarget ? phrase('emotionalTarget', 'Visible emotional target: {value}.', { value: packet.performance.emotionalTarget }) : '',
      packet.performance.direction,
      packet.performance.observableCue ? phrase('observableCue', 'Observable cue: {value}.', { value: packet.performance.observableCue }) : '',
      packet.performance.gaze ? phrase('gaze', 'Gaze: {value}.', { value: packet.performance.gaze }) : ''
    ]) : '',
    environment: sentences([
      packet.environment.artDirection ? `Art direction: ${packet.environment.artDirection}.` : '',
      [packet.environment.location, packet.environment.time].filter(Boolean).join(', '),
      packet.environment.lighting ? phrase('lighting', 'Lighting: {value}.', { value: packet.environment.lighting }) : '',
      packet.environment.environment,
      packet.environment.propContinuity && compact(packet.environment.propContinuity) !== compact(packet.continuity.entry)
        ? phrase('propContinuity', 'Prop continuity: {value}.', { value: packet.environment.propContinuity }) : ''
    ]),
    continuity: manualTimeline ? '' : sentences([
      looksOnly && packet.continuity.entry && compact(packet.continuity.entry) !== compact(packet.motion.visibleStart)
        ? `Entry state: ${packet.continuity.entry}.` : '',
      packet.motion.visibleEnd ? phrase('endState', 'End state: {value}.', { value: packet.motion.visibleEnd }) : '',
      packet.continuity.exit && compact(packet.continuity.exit) !== compact(packet.motion.visibleEnd)
        ? phrase('exitAnchor', 'Exit anchor: {value}.', { value: packet.continuity.exit }) : '',
      packet.continuity.transitionToNext ? phrase('prepareFor', 'Prepare for: {value}.', { value: packet.continuity.transitionToNext }) : '',
      packet.continuity.notes.length ? phrase('keep', 'Keep {value}.', { value: packet.continuity.notes.join('; ') }) : ''
    ]),
    audio: sentences([
      packet.audio.intent,
      ...packet.audio.dialogueCues.map(cue => phrase('dialogueCue', '{speaker}: {text} at {startOffsetMs}ms.', { ...cue, startOffsetMs: cue.startOffsetMs + leadInMs })),
      ...(packet.audio.directionVersion === 1 ? packet.audio.dialogueCues.filter(cue => cue.delivery).map(cue => `${cue.speaker} delivery: ${cue.delivery}.`) : []),
      ...packet.audio.audioCues.map(cue => phrase('audioCue', '{kind}: {description} at {startOffsetMs}ms.', { ...cue, startOffsetMs: cue.startOffsetMs + leadInMs }))
    ]),
    prohibitions: packet.prohibitions.join(' '),
    authorDirection: manualTimeline ? '' : packet.authorDirection
  };
  const omittedSections = new Set(strategy?.omitSections || []);
  if (leadInMs) {
    sections.temporalAction = `${template(policy.whitePrevisLeadInInstruction, { start: timelineClock(leadInMs), duration: (packet.timing.plannedDurationMs / 1000).toFixed(3) })} ${sections.temporalAction}`;
  }
  if (looksOnly) omittedSections.delete('authorDirection');
  if (referenceMode) {
    const lookReferences = textOnly ? [] : (referencePlan?.references || []).slice(looksOnly ? 0 : 1);
    const hasLooks = !textOnly && (referencePlan ? lookReferences.length
      : packet.authority.characters.length && packet.authority.looks.length);
    sections.startAuthority = sentences([referenceMode.startAuthority, packet.motion.visibleStart,
      ...lookReferences.map((reference, index) => template(referenceMode.characterMapping, {
        imageNumber: index + (looksOnly ? 1 : 2), roleName: reference.roleName, lookName: reference.lookName
      })), hasLooks ? policy.lookFacialIdentityInstruction : '', referenceMode.prohibitions]);
  }
  const promptSuffix = manualTimeline ? policy.phrasing?.manualPromptSuffix : strategy?.promptSuffix;
  const promptParts = [
    ...(compact(referenceMode?.promptPrefix || strategy?.promptPrefix) ? [compact(referenceMode?.promptPrefix || strategy.promptPrefix)] : []),
    ...policy.promptSectionOrder.flatMap(section => {
      if (omittedSections.has(section)) return [];
      const value = compact(sections[section]);
      return value ? [`${section === 'startAuthority' && referenceMode ? referenceMode.sectionLabel : labels[section]}:\n${value}`] : [];
    }),
    ...(compact(promptSuffix) ? [compact(promptSuffix)] : [])
  ];
  const prompt = [
    `CINEMATIC VIDEO EXECUTION PACKET ${packet.contractVersion}`, ...promptParts
  ].join('\n\n');
  const maximum = referenceMode?.maximumPromptCharacters || policy.maximumPromptCharacters;
  if (prompt.length <= maximum) return prompt;
  const compositionAuthority = referencePlan?.mode === 'storyboard_and_looks'
    && ['storyboard_composition', 'sketch_composition'].includes(referencePlan.references?.[0]?.purpose)
    && packet.referenceStrategy.firstFrameSourceFingerprint;
  if (compositionAuthority && policy.compactCompositionEnvironment) {
    sections.environment = sentences([
      policy.compactCompositionEnvironment,
      packet.environment.time,
      packet.environment.lighting,
      packet.environment.environment,
      packet.environment.propContinuity
    ]);
  }
  // Only remove presentation overhead. Authored content and image mappings stay intact.
  let optimized = promptParts.map(compact).filter(Boolean).join('\n');
  if (optimized.length > maximum && policy.compactSectionLabels) {
    optimized = [
      compact(referenceMode?.promptPrefix || strategy?.promptPrefix),
      ...policy.promptSectionOrder.flatMap(section => {
        if (omittedSections.has(section)) return [];
        const value = compact(sections[section]);
        return value ? [`${policy.compactSectionLabels[section]}: ${value}`] : [];
      }),
      compact(promptSuffix)
    ].filter(Boolean).join('\n');
  }
  // This legacy budget is a recommendation, not a verified provider API limit.
  validateGenerationPrompt(optimized, { operation: 'video', recommendedCharacters: maximum });
  return optimized;
}

function template(value, variables) {
  return String(value || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => String(variables[key] ?? ''));
}

function normalizeTimeline(values) {
  // The owning Shot command validates bounds and overlap; do not sort or truncate events here.
  return (Array.isArray(values) ? values : []).map(value => ({
    startMs: Number(value.startMs),
    endMs: Number(value.endMs),
    description: compact(value.description)
  }));
}

function timelineClock(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const remainder = milliseconds % 1000;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}${remainder ? `.${String(remainder).padStart(3, '0')}` : ''}`;
}

function normalizeDialogueCues(values, cast = []) {
  return (values || []).map(value => ({
    speaker: compact(cast.find(item => item.id === value.speakerCastAssignmentId)?.displayName || value.speakerCastAssignmentId || value.offscreenVoiceRole || 'speaker'),
    text: compact(value.text),
    delivery: compact(value.delivery),
    startOffsetMs: Number(value.startOffsetMs || 0),
    estimatedDurationMs: Number(value.estimatedDurationMs || 0),
    speakerVisible: value.speakerVisible === true
  })).filter(value => value.text);
}

function normalizeAudioCues(values) {
  return (values || []).map(value => ({
    kind: compact(value.kind || 'audio'),
    source: compact(value.source),
    description: compact(value.description),
    startOffsetMs: Number(value.startOffsetMs || 0),
    durationMs: Number(value.durationMs || 0)
  })).filter(value => value.description || value.source);
}

function finding(severity, code, fieldPath) {
  return { severity, code, fieldPath };
}

function sentences(values) {
  return values.map(compact).filter(Boolean).join(' ');
}

function unique(values) {
  return [...new Set((values || []).map(compact).filter(Boolean))];
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(sortValue(value))).digest('hex');
}

export function fingerprintVideoPacketAuthority(packet, { omitPlannedDuration = false } = {}) {
  if (!packet) return null;
  // Approved keyframe identity is checked separately; prompt-policy wording is not authored Shot state.
  const authority = { ...packet };
  if (omitPlannedDuration) {
    authority.timing = { ...packet.timing };
    delete authority.timing.plannedDurationMs;
  }
  for (const key of ['projectVersion', 'sceneVersion', 'shotVersion', 'keyframeContractFingerprint', 'provenance',
    'findings', 'packetFingerprint', 'renderedPromptFingerprint',
    'providerIndependentPrompt', 'prohibitions']) delete authority[key];
  return fingerprint(authority);
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]));
}

export const cinematicVideoPacketCompiler = new CinematicVideoPacketCompiler();
