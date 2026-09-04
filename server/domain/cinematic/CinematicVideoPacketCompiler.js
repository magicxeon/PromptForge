import crypto from 'node:crypto';
import { storyboardKeyframeContractCompiler } from './StoryboardKeyframeContractCompiler.js';
import { cinematicVideoPacketConfigurationService } from './CinematicVideoPacketConfigurationService.js';

const SECTION_LABELS = Object.freeze({
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

  compile({ project, scene, shot, approvedStoryboardSource, storyboardAttempt = null }) {
    if (!project?.id || !scene?.id || !shot?.id) {
      throw new TypeError('Project, Scene and Shot are required to compile a Cinematic video packet.');
    }
    const policy = this.configurationService.getPolicy();
    const keyframeContract = this.keyframeCompiler.compile({ project, scene, shot });
    const source = approvedStoryboardSource || shot.approvedStoryboardSource || null;
    const approvedContractFingerprint = compact(storyboardAttempt?.keyframeContractFingerprint) || null;
    const findings = [];
    if (!source?.sourceFingerprint || !source?.imageUrl) {
      findings.push(finding('blocking', 'cinematic_storyboard_source_required', 'shot.approvedStoryboardSource'));
    }
    if (approvedContractFingerprint && approvedContractFingerprint !== keyframeContract.sourceFingerprint) {
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
        mode: source ? 'first_frame' : 'unavailable',
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
        policyVersion: policy.version
      },
      findings
    };
    const providerIndependentPrompt = renderPrompt(packet, policy);
    const fingerprintInput = { ...packet, providerIndependentPrompt };
    delete fingerprintInput.projectVersion;
    return {
      ...packet,
      packetFingerprint: fingerprint(fingerprintInput),
      providerIndependentPrompt
    };
  }
}

function renderPrompt(packet, policy) {
  const sections = {
    startAuthority: sentences([
      'Begin from the approved Storyboard image as the immutable first frame.',
      packet.motion.visibleStart,
      packet.referenceStrategy.mode === 'first_frame'
        ? 'Preserve every visible identity, garment, prop, spatial relation and light source from that frame.'
        : ''
    ]),
    temporalAction: sentences([
      packet.motion.primaryAction ? `One primary action: ${packet.motion.primaryAction}.` : '',
      packet.timing.plannedDurationMs ? `Complete the action within ${(packet.timing.plannedDurationMs / 1000).toFixed(3)} seconds.` : '',
      packet.motion.blocking ? `Blocking: ${packet.motion.blocking}.` : '',
      packet.motion.screenDirection ? `Maintain screen direction: ${packet.motion.screenDirection}.` : ''
    ]),
    camera: sentences([
      packet.motion.cameraMovement || 'Keep the camera restrained and stable.',
      'Use subtle natural handheld or optical imperfection only when compatible with the authored camera direction.'
    ]),
    performance: sentences([
      packet.performance.emotionalTarget ? `Visible emotional target: ${packet.performance.emotionalTarget}.` : '',
      packet.performance.direction,
      packet.performance.observableCue ? `Observable cue: ${packet.performance.observableCue}.` : '',
      packet.performance.gaze ? `Gaze: ${packet.performance.gaze}.` : ''
    ]),
    environment: sentences([
      [packet.environment.location, packet.environment.time].filter(Boolean).join(', '),
      packet.environment.lighting ? `Lighting: ${packet.environment.lighting}.` : '',
      packet.environment.environment,
      packet.environment.propContinuity ? `Prop continuity: ${packet.environment.propContinuity}.` : ''
    ]),
    continuity: sentences([
      packet.motion.visibleEnd ? `End state: ${packet.motion.visibleEnd}.` : '',
      packet.continuity.exit ? `Exit anchor: ${packet.continuity.exit}.` : '',
      packet.continuity.transitionToNext ? `Prepare for: ${packet.continuity.transitionToNext}.` : '',
      packet.continuity.notes.length ? `Keep ${packet.continuity.notes.join('; ')}.` : ''
    ]),
    audio: sentences([
      packet.audio.intent,
      ...packet.audio.dialogueCues.map(cue => `${cue.speaker}: ${cue.text} at ${cue.startOffsetMs}ms.`),
      ...packet.audio.audioCues.map(cue => `${cue.kind}: ${cue.description} at ${cue.startOffsetMs}ms.`)
    ]),
    prohibitions: packet.prohibitions.join(' '),
    authorDirection: packet.authorDirection
  };
  const prompt = [
    `CINEMATIC VIDEO EXECUTION PACKET ${packet.contractVersion}`,
    ...policy.promptSectionOrder.flatMap(section => {
      const value = compact(sections[section]);
      return value ? [`${SECTION_LABELS[section]}:\n${value}`] : [];
    })
  ].join('\n\n');
  return truncate(prompt, policy.maximumPromptCharacters);
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
