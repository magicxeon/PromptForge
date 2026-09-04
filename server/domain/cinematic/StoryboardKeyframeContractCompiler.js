import crypto from 'node:crypto';
import { cinematicKeyframeConfigurationService } from './CinematicKeyframeConfigurationService.js';

const SECTION_LABELS = Object.freeze({
  keyframeMoment: 'KEYFRAME MOMENT',
  subjectAuthority: 'SUBJECT AUTHORITY',
  composition: 'CAMERA AND COMPOSITION',
  performance: 'VISIBLE PERFORMANCE',
  lightingEnvironment: 'LIGHTING AND ENVIRONMENT',
  continuity: 'CONTINUITY',
  prohibitions: 'PROHIBITIONS',
  authorDirection: 'AUTHOR DIRECTION'
});

export class StoryboardKeyframeContractCompiler {
  constructor({ configurationService = cinematicKeyframeConfigurationService } = {}) {
    this.configurationService = configurationService;
  }

  compile({ project, scene, shot, referencePlan = null }) {
    if (!project?.id || !scene?.id || !shot?.id) {
      throw new TypeError('Project, Scene and Shot are required to compile a Storyboard keyframe.');
    }
    const configuration = this.configurationService.getCompilerConfiguration();
    const plan = resolvePlan(project, scene.id);
    const beat = plan?.beats?.find(item => item.id === scene.beatId) || null;
    const cast = resolveCast(project, scene, shot);
    const looks = resolveLooks(cast, scene, shot);
    const shotPosition = resolveShotPosition(scene, shot);
    const emotionalTarget = resolveEmotionalTarget(scene, shot, shotPosition);
    const stillFramePosition = resolveStillFramePosition(shot, shotPosition, configuration.policy);
    const coverageRole = resolveCoverageRole(shot, shotPosition);
    const findings = compileFindings({
      project, scene, shot, cast, looks, emotionalTarget, shotPosition, coverageRole
    });
    const normalizedReferencePlan = normalizeReferencePlan(referencePlan, cast, looks);
    const authorDirection = extractAuthorDirection(shot.prompt);

    const contract = {
      contractVersion: configuration.policy.contractVersion,
      projectId: project.id,
      projectVersion: Number(project.version || 1),
      storyPlanVersionId: plan?.id || null,
      beatId: beat?.id || scene.beatId || null,
      sceneId: scene.id,
      sceneVersion: Number(scene.version || 1),
      shotId: shot.id,
      shotVersion: Number(shot.version || 1),
      currentState: {
        projectIntent: compactText(project.setup?.storyBrief),
        planObjective: compactText(plan?.objective),
        beatPurpose: compactText(beat?.purpose),
        beatVisibleChange: compactText(beat?.storyChange),
        sceneEntryState: compactText(scene.entryState),
        sceneExitState: compactText(scene.exitState),
        exactVisibleMoment: compactText(shot.visibleMoment),
        primaryPhysicalAction: compactText(shot.subjectAction),
        coverageRole
      },
      characterAuthority: cast.map(assignment => ({
        assignmentId: assignment.id,
        characterProfileId: assignment.characterProfileId || null,
        characterProfileVersionId: assignment.characterProfileVersionId || null,
        displayName: compactText(assignment.displayName),
        storyRole: compactText(assignment.storyRole),
        identityReady: assignment.identityReady === true
      })),
      lookAuthority: looks.map(look => ({
        lookId: look.id,
        assignmentId: look.assignmentId,
        name: compactText(look.name),
        garmentSummary: compactText(look.garmentSummary),
        accessorySummary: compactText(look.accessorySummary),
        locked: look.locked === true,
        assetIds: [...new Set(look.assetIds || [])]
      })),
      composition: {
        aspectRatio: project.aspectRatio || project.setup?.aspectRatio || null,
        framing: compactText(shot.framing),
        cameraAngle: compactText(shot.cameraAngle),
        lensIntent: compactText(shot.lensIntent),
        authoredMovement: compactText(shot.cameraMovement),
        stillFramePosition,
        blocking: compactText(shot.blocking || scene.blocking),
        screenDirection: compactText(scene.screenDirection)
      },
      performance: {
        emotionalTarget,
        direction: compactText(shot.performance || scene.performance),
        observableCue: compactText(shot.performanceCue),
        gaze: compactText(shot.gaze)
      },
      lightingEnvironment: {
        location: compactText(scene.location),
        time: compactText(scene.time),
        lighting: compactText(shot.lighting || scene.lighting),
        environment: compactText(shot.environment),
        propContinuity: compactText(scene.propContinuity)
      },
      continuity: {
        entryAnchor: compactText(shot.continuityEntry),
        exitAnchor: compactText(shot.continuityExit),
        outgoingTransition: compactText(shot.transitionToNext || scene.transitionIntent),
        notes: uniqueText([...(scene.continuityNotes || []), ...(shot.continuityNotes || [])]),
        previousApprovedSourceFingerprint: normalizedReferencePlan.previousApprovedSourceFingerprint
      },
      prohibitions: uniqueText(configuration.policy.globalProhibitions),
      referencePlan: normalizedReferencePlan,
      provenance: {
        policyId: configuration.policy.id,
        policyVersion: configuration.policy.version,
        promptBudgetId: configuration.budget.id,
        promptBudgetVersion: configuration.budget.version,
        captureProfileId: configuration.captureProfile.id,
        captureProfileVersion: configuration.captureProfile.version,
        configurationFingerprint: configuration.fingerprint
      },
      authorDirection,
      findings
    };
    contract.visualSpec = buildVisualSpec(contract);
    const sections = buildPromptSections(contract);
    const providerIndependentPrompt = renderPrompt(sections, configuration);
    const sourceFingerprint = fingerprint(buildSemanticFingerprintPayload(contract, providerIndependentPrompt));
    return {
      ...contract,
      sourceFingerprint,
      providerIndependentPrompt
    };
  }
}

export function matchesStoryboardKeyframeFingerprint(contract, candidateFingerprint) {
  const candidate = compactText(candidateFingerprint);
  if (!candidate || !contract) return false;
  if (candidate === contract.sourceFingerprint) return true;

  const currentShotVersion = Math.max(1, Number(contract.shotVersion || 1));
  const firstCandidate = Math.max(1, currentShotVersion - 255);
  const historicalVersions = new Set([1]);
  for (let shotVersion = firstCandidate; shotVersion <= currentShotVersion; shotVersion += 1) {
    historicalVersions.add(shotVersion);
  }
  for (const shotVersion of historicalVersions) {
    if (candidate === fingerprint(buildLegacyVersionedFingerprintPayload(contract, shotVersion))) {
      return true;
    }
  }
  return false;
}

function buildVisualSpec(contract) {
  return {
    moment: {
      description: contract.currentState.exactVisibleMoment,
      action: resolveSingleFrameAction(
        contract.currentState.primaryPhysicalAction,
        contract.currentState.exactVisibleMoment
      ),
      coverageRole: contract.currentState.coverageRole,
      framePosition: contract.composition.stillFramePosition
    },
    subject: {
      characters: contract.characterAuthority.map(character => ({
        assignmentId: character.assignmentId,
        displayName: character.displayName,
        storyRole: character.storyRole
      })),
      approvedLooks: contract.lookAuthority.map(look => ({
        lookId: look.lookId,
        assignmentId: look.assignmentId,
        name: look.name,
        garmentSummary: look.garmentSummary,
        accessorySummary: look.accessorySummary
      }))
    },
    performance: {
      emotion: contract.performance.emotionalTarget,
      expressionAndPosture: contract.performance.direction,
      observableCue: resolveSingleVisiblePhase(contract.performance.observableCue),
      gaze: contract.performance.gaze
    },
    environment: {
      location: contract.lightingEnvironment.location,
      time: contract.lightingEnvironment.time,
      requiredElements: uniqueText([contract.lightingEnvironment.environment]),
      propState: contract.lightingEnvironment.propContinuity
    },
    composition: {
      aspectRatio: contract.composition.aspectRatio,
      framing: contract.composition.framing,
      cameraAngle: contract.composition.cameraAngle,
      lensIntent: contract.composition.lensIntent,
      blocking: contract.composition.blocking,
      screenDirection: contract.composition.screenDirection
    },
    lighting: {
      sourceAndMotivation: contract.lightingEnvironment.lighting,
      contrastAndFalloff: ''
    },
    continuity: {
      requiredVisibleConstraints: contract.continuity.notes,
      previousApprovedSourceFingerprint: contract.continuity.previousApprovedSourceFingerprint
    }
  };
}

function buildPromptSections(contract) {
  const spec = contract.visualSpec;
  const names = spec.subject.characters.map(character => [
    character.displayName || character.assignmentId,
    character.storyRole ? `as ${character.storyRole}` : '',
    'preserve authorized identity'
  ].filter(Boolean).join(' '));
  const looks = spec.subject.approvedLooks.map(look => [
    look.name || look.lookId, look.garmentSummary, look.accessorySummary
  ].filter(Boolean).join(', '));
  return {
    keyframeMoment: sentences([
      `${capitalize(spec.moment.coverageRole)} keyframe.`,
      labeledSentence('Exact moment', spec.moment.description),
      labeledSentence('One visible action', spec.moment.action)
    ]),
    subjectAuthority: sentences([
      names.length ? `Characters: ${names.join('; ')}.` : 'Environment-only Shot; do not add a person.',
      looks.length ? `Approved wardrobe: ${looks.join('; ')}.` : ''
    ]),
    composition: sentences([
      spec.composition.aspectRatio ? `Aspect ratio ${spec.composition.aspectRatio}.` : '',
      [spec.composition.framing, spec.composition.cameraAngle, spec.composition.lensIntent]
        .filter(Boolean).length
        ? `Camera: ${[spec.composition.framing, spec.composition.cameraAngle, spec.composition.lensIntent].filter(Boolean).join(', ')}.`
        : '',
      labeledSentence('Placement', spec.composition.blocking),
      labeledSentence('Screen direction', spec.composition.screenDirection)
    ]),
    performance: sentences([
      spec.performance.emotion
        ? `${labeledSentence('Visible emotion', spec.performance.emotion)} Show only this state.`
        : '',
      labeledSentence('Expression and posture', spec.performance.expressionAndPosture),
      labeledSentence('Observable cue', spec.performance.observableCue),
      labeledSentence('Gaze', spec.performance.gaze)
    ]),
    lightingEnvironment: sentences([
      spec.environment.location || spec.environment.time
        ? labeledSentence('Setting', [spec.environment.location, spec.environment.time].filter(Boolean).join(', '))
        : '',
      labeledSentence('Motivated light', spec.lighting.sourceAndMotivation),
      spec.environment.requiredElements.length
        ? labeledSentence('Required environment', spec.environment.requiredElements.join('; '))
        : '',
      labeledSentence('Visible prop state', spec.environment.propState)
    ]),
    continuity: sentences([
      spec.continuity.requiredVisibleConstraints.length
        ? labeledSentence('Keep visible continuity', spec.continuity.requiredVisibleConstraints.join('; '))
        : '',
      spec.continuity.previousApprovedSourceFingerprint
        ? 'Match the authorized previous keyframe for identity, wardrobe and environment continuity.'
        : ''
    ]),
    prohibitions: contract.prohibitions.join(' '),
    authorDirection: contract.authorDirection
  };
}

function renderPrompt(sections, configuration) {
  const rendered = configuration.policy.promptSectionOrder.flatMap(section => {
    const value = truncate(sections[section], configuration.budget.sectionCharacterLimits[section]);
    return value ? [`${SECTION_LABELS[section]}:\n${value}`] : [];
  });
  return truncatePrompt(
    [`STORYBOARD KEYFRAME CONTRACT ${configuration.policy.contractVersion}`, ...rendered].join('\n\n'),
    configuration.budget.maximumPromptCharacters
  );
}

function compileFindings({ scene, shot, cast, looks, emotionalTarget, shotPosition, coverageRole }) {
  const findings = [];
  for (const field of ['visibleMoment', 'subjectAction']) {
    if (!compactText(shot[field])) findings.push(finding('blocking', 'missing_shot_authority', `shot.${field}`));
  }
  if (!emotionalTarget) findings.push(finding('blocking', 'missing_shot_authority', 'shot.emotionalTarget'));
  const selectedCastIds = new Set(shot.castAssignmentIds?.length ? shot.castAssignmentIds : scene.castAssignmentIds || []);
  if (cast.length !== selectedCastIds.size) findings.push(finding('blocking', 'cast_authority_missing', 'shot.castAssignmentIds'));
  if (cast.some(item => item.identityReady !== true)) findings.push(finding('blocking', 'character_identity_not_ready', 'cast.characterProfileVersionId'));
  if (looks.some(item => item.locked !== true)) findings.push(finding('blocking', 'look_authority_not_ready', 'scene.wardrobeLookIds'));
  if (containsMultipleActions(shot.subjectAction)) findings.push(finding('warning', 'multiple_visible_actions', 'shot.subjectAction'));
  if (containsMultipleActions(shot.performanceCue)) findings.push(finding('warning', 'multiple_visible_performance_cues', 'shot.performanceCue'));
  if (shotPosition === 'first' && ['action', 'transition', 'payoff'].includes(coverageRole)) {
    findings.push(finding('warning', 'first_shot_non_establishing', 'shot.coverageRole'));
  }
  if (shotPosition === 'first' && compactText(scene.emotionalStart)
    && compactText(scene.emotionalEnd) && normalized(emotionalTarget) === normalized(scene.emotionalEnd)
    && normalized(scene.emotionalStart) !== normalized(scene.emotionalEnd)) {
    findings.push(finding('warning', 'future_emotional_state_leakage', 'shot.emotionalTarget'));
  }
  if (hasUnexplainedInteriorWetness(scene, shot)) {
    findings.push(finding('warning', 'unexplained_interior_weather', 'shot.environment'));
  }
  return findings;
}

function resolvePlan(project, sceneId) {
  const versions = project.storyPlanVersions || [];
  return [...versions].reverse().find(version => version.sceneIds?.includes(sceneId))
    || versions.find(version => version.id === project.activeStoryPlanVersionId)
    || null;
}

function resolveCast(project, scene, shot) {
  const ids = shot.castAssignmentIds?.length ? shot.castAssignmentIds : scene.castAssignmentIds || [];
  return ids.flatMap(id => {
    const assignment = project.castAssignments?.find(item => item.id === id && item.active !== false);
    return assignment ? [assignment] : [];
  });
}

function resolveLooks(assignments, scene, shot) {
  const selectedIds = new Set(shot.wardrobeLookIds?.length ? shot.wardrobeLookIds : scene.wardrobeLookIds || []);
  return assignments.flatMap(assignment => (assignment.looks || []).flatMap(look => (
    look && selectedIds.has(look.id) ? [{ ...look, assignmentId: assignment.id }] : []
  )));
}

function resolveShotPosition(scene, shot) {
  const order = scene.shotOrder?.length ? scene.shotOrder : (scene.shots || []).map(item => item.id);
  const index = Math.max(0, order.indexOf(shot.id));
  if (index === 0) return 'first';
  if (index === order.length - 1) return 'last';
  return 'middle';
}

function resolveEmotionalTarget(scene, shot, position) {
  const explicit = compactText(shot.emotionalTarget);
  if (explicit) return explicit;
  const start = compactText(scene.emotionalStart);
  const end = compactText(scene.emotionalEnd);
  if (position === 'first') return start || end;
  if (position === 'last') return end || start;
  if (start && end) return `restrained transition away from ${start}, not yet fully ${end}`;
  return start || end;
}

function resolveStillFramePosition(shot, position, policy) {
  const authored = compactText(shot.stillFramePosition);
  return authored || policy.stillFramePositions[position] || policy.stillFramePositions.middle;
}

function resolveCoverageRole(shot, position) {
  const role = compactText(shot.coverageRole).toLowerCase();
  if (['establishing', 'action', 'reaction', 'insert', 'transition', 'payoff'].includes(role)) return role;
  const framingEvidence = normalized(`${shot.framing || ''} ${shot.cameraAngle || ''} ${shot.title || ''}`);
  if (position === 'first' && /(insert|detail|macro|close[- ]?up|extreme close|\u0e42\u0e04\u0e25\u0e2a\u0e2d\u0e31\u0e1b|\u0e2d\u0e34\u0e19\u0e40\u0e2a\u0e34\u0e23\u0e4c\u0e15)/u.test(framingEvidence)) {
    return 'insert';
  }
  return position === 'first' ? 'establishing' : 'action';
}

function normalizeReferencePlan(referencePlan, cast, looks) {
  const lookAssetIds = uniqueText(referencePlan?.lookAssetIds || looks.flatMap(look => look.assetIds || []));
  return {
    characterProfileVersionIds: uniqueText(referencePlan?.characterProfileVersionIds
      || cast.map(item => item.characterProfileVersionId)),
    lookAssetIds,
    previousApprovedShotId: compactText(referencePlan?.previousApprovedShotId) || null,
    previousApprovedSourceFingerprint: compactText(referencePlan?.previousApprovedSourceFingerprint) || null
  };
}

function extractAuthorDirection(value) {
  const prompt = String(value || '').trim();
  if (!prompt) return '';
  if (prompt.startsWith('STORYBOARD STILL CONTRACT')) {
    return compactText(prompt.match(/(?:^|\n\n)Shot prompt:\n([\s\S]*?)(?=\n\n[^\n:]+:\n|$)/)?.[1]);
  }
  if (prompt.startsWith('STORYBOARD KEYFRAME CONTRACT')) {
    return compactText(prompt.match(/(?:^|\n\n)AUTHOR DIRECTION:\n([\s\S]*?)(?=\n\n[A-Z][A-Z ]+:\n|$)/)?.[1]);
  }
  return compactText(prompt);
}

function containsMultipleActions(value) {
  const textValue = compactText(value).toLowerCase();
  if (!textValue) return false;
  return /\b(?:and then|then|before|after)\b/.test(textValue)
    || /(?:แล้ว|จากนั้น|ก่อนจะ|หลังจาก)/.test(textValue)
    || /\b(?:tighten|tightens|clench|clenches|grip|grips|raise|raises|open|opens|turn|turns)\b.*\band\b.*\b(?:release|releases|relax|relaxes|lower|lowers|close|closes|walk|walks|turn|turns)\b/.test(textValue)
    || /(?:เกร็ง|กำ|ยก|เปิด|หัน).*(?:และ).*(?:คลาย|ปล่อย|ลด|ปิด|เดิน|หัน)/.test(textValue);
}

function resolveSingleFrameAction(action, exactVisibleMoment) {
  const normalizedAction = compactText(action);
  if (!containsMultipleActions(normalizedAction)) return normalizedAction;
  const heldMoment = compactText(exactVisibleMoment);
  if (heldMoment) return heldMoment;
  return resolveSingleVisiblePhase(normalizedAction);
}

function resolveSingleVisiblePhase(value) {
  const normalizedValue = compactText(value);
  if (!containsMultipleActions(normalizedValue)) return normalizedValue;
  return normalizedValue.split(
    /\s+(?:and then|then|before|after|and)\s+|(?:แล้ว|จากนั้น|ก่อนจะ|หลังจาก|และ)/iu
  ).map(compactText).find(Boolean) || normalizedValue;
}

function hasUnexplainedInteriorWetness(scene, shot) {
  const location = normalized(scene.location);
  const environment = normalized(`${shot.environment || ''} ${shot.lighting || ''}`);
  const interior = /(interior|inside|indoor|cafe|restaurant|shop|store|ภายใน|ในร้าน|ร้านกาแฟ)/.test(location);
  const wetInterior = /(wet floor|puddles? inside|flooded floor|พื้นเปียก|น้ำขัง)/.test(environment);
  const explanation = /(leak|open door|tracked rain|รั่ว|ประตูเปิด|รองเท้าเปียก)/.test(environment);
  return interior && wetInterior && !explanation;
}

function finding(severity, code, fieldPath) {
  return { severity, code, fieldPath };
}

function sentences(values) {
  return values.map(compactText).filter(Boolean).join(' ');
}

function labeledSentence(label, value) {
  const textValue = compactText(value);
  if (!textValue) return '';
  return `${label}: ${textValue}${/[.!?]$/u.test(textValue) ? '' : '.'}`;
}

function uniqueText(values) {
  return [...new Set((values || []).map(compactText).filter(Boolean))];
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalized(value) {
  return compactText(value).toLocaleLowerCase('en-US');
}

function capitalize(value) {
  const textValue = compactText(value);
  return textValue ? `${textValue[0].toUpperCase()}${textValue.slice(1)}` : '';
}

function truncate(value, maximum) {
  const textValue = compactText(value);
  if (textValue.length <= maximum) return textValue;
  const slice = textValue.slice(0, maximum - 1);
  const boundary = slice.lastIndexOf(' ');
  return `${slice.slice(0, boundary > maximum * 0.7 ? boundary : slice.length).trim()}...`;
}

function truncatePrompt(value, maximum) {
  const textValue = String(value || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (textValue.length <= maximum) return textValue;
  const slice = textValue.slice(0, maximum - 1);
  const boundary = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('\n'));
  return `${slice.slice(0, boundary > maximum * 0.7 ? boundary : slice.length).trim()}...`;
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function buildSemanticFingerprintPayload(contract, providerIndependentPrompt) {
  const {
    projectVersion: _projectVersion,
    sceneVersion: _sceneVersion,
    shotVersion: _shotVersion,
    sourceFingerprint: _sourceFingerprint,
    providerIndependentPrompt: _storedPrompt,
    ...semanticContract
  } = contract;
  return { ...semanticContract, providerIndependentPrompt };
}

function buildLegacyVersionedFingerprintPayload(contract, shotVersion) {
  const {
    projectVersion: _projectVersion,
    sourceFingerprint: _sourceFingerprint,
    providerIndependentPrompt,
    ...legacyContract
  } = contract;
  return { ...legacyContract, shotVersion, providerIndependentPrompt };
}

export const storyboardKeyframeContractCompiler = new StoryboardKeyframeContractCompiler();
