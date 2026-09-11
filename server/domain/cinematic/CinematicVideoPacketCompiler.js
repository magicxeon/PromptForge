import crypto from 'node:crypto';
import {
  matchesStoryboardKeyframeFingerprint,
  storyboardKeyframeContractCompiler
} from './StoryboardKeyframeContractCompiler.js';
import { cinematicVideoPacketConfigurationService } from './CinematicVideoPacketConfigurationService.js';
import { cinematicVideoReferenceMode } from './CinematicVideoReferencePlanService.js';

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
    const looksOnly = cinematicVideoReferenceMode(referenceMode) === 'looks_only';
    if (looksOnly && !policy.looksOnlyMode) throw new TypeError('The Looks-only prompt policy is not configured.');
    const source = looksOnly ? null : approvedStoryboardSource || shot.approvedStoryboardSource || null;
    const approvedContractFingerprint = looksOnly ? null : compact(storyboardAttempt?.keyframeContractFingerprint) || null;
    const keyframeCandidates = looksOnly ? [this.keyframeCompiler.compile({ project, scene, shot })]
      : compileKeyframeCandidates(this.keyframeCompiler, project, scene, shot);
    const matchingKeyframeContract = approvedContractFingerprint
      ? keyframeCandidates.find(candidate => (
          matchesStoryboardKeyframeFingerprint(candidate, approvedContractFingerprint)
        )) || null
      : null;
    const keyframeContract = matchingKeyframeContract || keyframeCandidates[0];
    const findings = [];
    if (looksOnly) {
      findings.push(...keyframeContract.findings.filter(item => item.severity === 'blocking'));
      if (!keyframeContract.characterAuthority.length) {
        findings.push(finding('blocking', 'cinematic_video_reference_cast_missing', 'shot.castAssignmentIds'));
      }
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
    if (!compact(shot.subjectAction)) {
      findings.push(finding('blocking', 'cinematic_video_action_required', 'shot.subjectAction'));
    }
    if (Number(shot.estimatedActionDurationMs || 0) > Number(shot.durationMs || 0)) {
      findings.push(finding('blocking', 'cinematic_video_action_overflow', 'shot.estimatedActionDurationMs'));
    }

    const packet = {
      ...(looksOnly ? { referenceMode: 'looks_only', composition: keyframeContract.composition } : {}),
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
        plannedDurationMs: Number(shot.durationMs || 0),
        estimatedActionDurationMs: Number(shot.estimatedActionDurationMs || shot.durationMs || 0)
      },
      referenceStrategy: {
        mode: looksOnly ? 'looks_only' : source ? 'first_frame' : 'unavailable',
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
        visibleStart: compact(shot.visibleMoment),
        primaryAction: compact(shot.subjectAction),
        additionalDirection: compact(shot.additionalMotionDirection),
        visibleEnd: compact(shot.continuityExit || scene.exitState),
        cameraMovement: compact(shot.cameraMovement),
        blocking: compact(shot.blocking || scene.blocking),
        screenDirection: compact(scene.screenDirection)
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
        propContinuity: compact(scene.propContinuity)
      },
      continuity: {
        entry: compact(shot.continuityEntry),
        exit: compact(shot.continuityExit),
        transitionToNext: compact(shot.transitionToNext || scene.transitionIntent),
        notes: unique([...(scene.continuityNotes || []), ...(shot.continuityNotes || [])])
      },
      audio: {
        intent: compact(shot.audioIntent || scene.audioIntent),
        dialogueCues: normalizeDialogueCues(shot.dialogueCues),
        audioCues: normalizeAudioCues(shot.audioCues)
      },
      authorDirection: keyframeContract.authorDirection,
      prohibitions: unique(policy.globalProhibitions),
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

  renderForProvider(packet, { providerId = '', referencePlan = null } = {}) {
    if (!packet?.contractVersion || !packet?.packetFingerprint) {
      throw new TypeError('A compiled Cinematic video packet is required.');
    }
    const policy = this.configurationService.getPolicy();
    const strategy = this.configurationService.getPromptStrategy(providerId);
    const prompt = renderPrompt(packet, policy, strategy, referencePlan);
    return {
      prompt,
      promptFingerprint: fingerprint(prompt),
      strategyId: strategy.id,
      strategyVersion: strategy.version,
      policyId: policy.id,
      policyVersion: policy.version
    };
  }
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
  const looksOnly = packet.referenceMode === 'looks_only' || referencePlan?.mode === 'looks_only';
  const referenceMode = looksOnly ? policy.looksOnlyMode
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
    temporalAction: sentences([
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
      packet.motion.cameraMovement || phrase('stableCamera', 'Keep the camera restrained and stable.'),
      phrase('cameraImperfection', 'Use subtle natural handheld or optical imperfection only when compatible with the authored camera direction.')
    ]),
    performance: packet.authority.characters.length ? sentences([
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
      packet.environment.propContinuity ? phrase('propContinuity', 'Prop continuity: {value}.', { value: packet.environment.propContinuity }) : ''
    ]),
    continuity: sentences([
      looksOnly && packet.continuity.entry ? `Entry state: ${packet.continuity.entry}.` : '',
      packet.motion.visibleEnd ? phrase('endState', 'End state: {value}.', { value: packet.motion.visibleEnd }) : '',
      packet.continuity.exit ? phrase('exitAnchor', 'Exit anchor: {value}.', { value: packet.continuity.exit }) : '',
      packet.continuity.transitionToNext ? phrase('prepareFor', 'Prepare for: {value}.', { value: packet.continuity.transitionToNext }) : '',
      packet.continuity.notes.length ? phrase('keep', 'Keep {value}.', { value: packet.continuity.notes.join('; ') }) : ''
    ]),
    audio: sentences([
      packet.audio.intent,
      ...packet.audio.dialogueCues.map(cue => phrase('dialogueCue', '{speaker}: {text} at {startOffsetMs}ms.', cue)),
      ...packet.audio.audioCues.map(cue => phrase('audioCue', '{kind}: {description} at {startOffsetMs}ms.', cue))
    ]),
    prohibitions: packet.prohibitions.join(' '),
    authorDirection: packet.authorDirection
  };
  const omittedSections = new Set(strategy?.omitSections || []);
  if (looksOnly) omittedSections.delete('authorDirection');
  if (referenceMode) {
    sections.startAuthority = sentences([referenceMode.startAuthority, packet.motion.visibleStart,
      ...(referencePlan?.references || []).slice(looksOnly ? 0 : 1).map((reference, index) => template(referenceMode.characterMapping, {
        imageNumber: index + (looksOnly ? 1 : 2), roleName: reference.roleName, lookName: reference.lookName
      })), referenceMode.prohibitions]);
  }
  const prompt = [
    ...(compact(referenceMode?.promptPrefix || strategy?.promptPrefix) ? [compact(referenceMode?.promptPrefix || strategy.promptPrefix)] : []),
    `CINEMATIC VIDEO EXECUTION PACKET ${packet.contractVersion}`,
    ...policy.promptSectionOrder.flatMap(section => {
      if (omittedSections.has(section)) return [];
      const value = compact(sections[section]);
      return value ? [`${section === 'startAuthority' && referenceMode ? referenceMode.sectionLabel : labels[section]}:\n${value}`] : [];
    }),
    ...(compact(strategy?.promptSuffix) ? [compact(strategy.promptSuffix)] : [])
  ].join('\n\n');
  if (referenceMode) {
    if (prompt.length > referenceMode.maximumPromptCharacters) {
      throw Object.assign(new Error('The video direction and Character mappings exceed the prompt limit. Shorten this Shot direction before generating.'), {
        code: 'cinematic_video_reference_prompt_too_long', statusCode: 409
      });
    }
    return prompt;
  }
  return truncate(prompt, policy.maximumPromptCharacters);
}

function template(value, variables) {
  return String(value || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => String(variables[key] ?? ''));
}

function normalizeDialogueCues(values) {
  return (values || []).map(value => ({
    speaker: compact(value.speakerCastAssignmentId || value.offscreenVoiceRole || 'speaker'),
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

function truncate(value, maximum) {
  if (value.length <= maximum) return value;
  const sliced = value.slice(0, maximum - 3);
  const boundary = sliced.lastIndexOf(' ');
  return `${sliced.slice(0, boundary > maximum * 0.7 ? boundary : sliced.length).trim()}...`;
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(sortValue(value))).digest('hex');
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]));
}

export const cinematicVideoPacketCompiler = new CinematicVideoPacketCompiler();
