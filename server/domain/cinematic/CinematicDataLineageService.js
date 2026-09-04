import crypto from 'node:crypto';

export class CinematicDataLineageService {
  build(project, { sceneId = null, shotId = null } = {}) {
    if (!project || typeof project !== 'object') throw new TypeError('Cinematic Project is required for lineage.');
    const findings = [];
    const activeSource = (project.storySourceVersions || []).find(item => item.id === project.activeStorySourceVersionId) || null;
    if (!activeSource) addFinding(findings, 'cinematic_lineage_story_source_missing', 'blocking', 'setup', 'project', project.id, 'activeStorySourceVersionId', 'setup');

    const roles = (project.setup?.storyRoleSlots || []).map(role => {
      const assignments = (project.castAssignments || []).filter(item => item.active !== false && item.storyRoleSlotId === role.id);
      if (role.importance === 'required' && assignments.length !== 1) {
        addFinding(
          findings,
          assignments.length ? 'cinematic_lineage_role_assignment_duplicate' : 'cinematic_lineage_role_assignment_missing',
          'blocking', 'cast', 'storyRole', role.id, 'setup.storyRoleSlots', 'cast', role.id
        );
      }
      return {
        id: role.id, importance: role.importance, assignmentIds: assignments.map(item => item.id),
        status: role.importance !== 'required' || assignments.length === 1 ? 'current' : 'missing'
      };
    });

    const castAssignments = (project.castAssignments || []).filter(item => item.active !== false).map(assignment => {
      if (!assignment.characterProfileVersionId) addFinding(findings, 'cinematic_lineage_character_version_missing', 'blocking', 'cast', 'castAssignment', assignment.id, 'cast.characterProfileVersionId', 'cast', assignment.id);
      if (assignment.identityReady !== true) addFinding(findings, 'cinematic_lineage_character_identity_not_ready', 'blocking', 'cast', 'castAssignment', assignment.id, 'cast.identityReady', 'cast', assignment.id);
      const approvedLooks = (assignment.looks || []).filter(isApprovedLook);
      if (!approvedLooks.length) addFinding(findings, 'cinematic_lineage_approved_look_missing', 'blocking', 'cast', 'castAssignment', assignment.id, 'cast.looks', 'cast', assignment.id);
      return {
        id: assignment.id,
        storyRoleSlotId: assignment.storyRoleSlotId || null,
        characterProfileId: assignment.characterProfileId || null,
        characterProfileVersionId: assignment.characterProfileVersionId || null,
        identityReady: assignment.identityReady === true,
        approvedLookIds: approvedLooks.map(look => look.id),
        active: true
      };
    });
    const activeCastIds = new Set(castAssignments.map(item => item.id));
    const lookBindings = (project.castAssignments || []).flatMap(assignment => (assignment.looks || []).map(look => ({
      id: look.id,
      assignmentId: assignment.id,
      characterLookVersionId: look.characterLookVersionId || null,
      assetIds: [...new Set(look.assetIds || look.sourceAssetIds || [])],
      approved: isApprovedLook(look),
      locked: look.locked === true
    })));
    const lookById = new Map(lookBindings.map(look => [look.id, look]));

    const activePlan = (project.storyPlanVersions || []).find(item => item.id === project.activeStoryPlanVersionId) || null;
    if (!activePlan) addFinding(findings, 'cinematic_lineage_story_plan_missing', 'blocking', 'story-plan', 'project', project.id, 'activeStoryPlanVersionId', 'story-plan');
    if (activePlan && activePlan.storySourceVersionId !== project.activeStorySourceVersionId) {
      addFinding(findings, 'cinematic_lineage_story_plan_source_stale', 'blocking', 'story-plan', 'storyPlan', activePlan.id, 'storySourceVersionId', 'story-plan', activePlan.id);
    }

    const allScenes = (project.scenes || []).filter(scene => !sceneId || scene.id === sceneId);
    const scopedScenes = shotId
      ? allScenes.filter(scene => (scene.shots || []).some(shot => shot.id === shotId))
      : allScenes;
    const sceneById = new Map((project.scenes || []).map(scene => [scene.id, scene]));
    const beatById = new Map((activePlan?.beats || []).map(beat => [beat.id, beat]));

    const beats = (activePlan?.beats || []).map(beat => {
      for (const linkedSceneId of beat.sceneIds || []) {
        if (!sceneById.has(linkedSceneId)) addFinding(findings, 'cinematic_lineage_beat_scene_missing', 'blocking', 'story-plan', 'beat', beat.id, 'beat.sceneIds', 'story-plan', beat.id);
      }
      if (!meaningful(beat.storyChange)) addFinding(findings, 'cinematic_lineage_beat_change_missing', 'blocking', 'story-plan', 'beat', beat.id, 'beat.storyChange', 'story-plan', beat.id);
      return {
        id: beat.id,
        sceneIds: [...(beat.sceneIds || [])],
        targetDurationMs: Number(beat.targetDurationMs || 0),
        status: meaningful(beat.storyChange) ? 'current' : 'missing'
      };
    });

    const scenes = scopedScenes.map(scene => {
      if (!beatById.has(scene.beatId)) addFinding(findings, 'cinematic_lineage_scene_beat_missing', 'blocking', 'story-plan', 'scene', scene.id, 'scene.beatId', 'story-plan', scene.id);
      validateCastAndLooks(findings, scene, activeCastIds, lookById, 'scene', scene.id);
      const calculatedDurationMs = (scene.shots || []).reduce((total, shot) => total + Number(shot.durationMs || 0), 0);
      if (calculatedDurationMs !== Number(scene.durationMs || 0)) addFinding(findings, 'cinematic_lineage_scene_duration_mismatch', 'blocking', 'scene', 'scene', scene.id, 'scene.durationMs', 'story-plan', scene.id);
      return {
        id: scene.id, version: Number(scene.version || 1), beatId: scene.beatId || null,
        castAssignmentIds: [...(scene.castAssignmentIds || [])], wardrobeLookIds: [...(scene.wardrobeLookIds || [])],
        shotIds: [...(scene.shotOrder || [])], durationMs: Number(scene.durationMs || 0),
        status: calculatedDurationMs === Number(scene.durationMs || 0) ? 'current' : 'conflict'
      };
    });

    const shots = scopedScenes.flatMap(scene => orderedShots(scene).filter(shot => !shotId || shot.id === shotId).map(shot => {
      validateCastAndLooks(findings, shot, new Set(scene.castAssignmentIds || []), lookById, 'shot', shot.id, scene.id);
      if (!meaningful(shot.visibleMoment)) addFinding(findings, 'cinematic_lineage_shot_visible_moment_missing', 'blocking', 'shot', 'shot', shot.id, 'shot.visibleMoment', 'story-plan', scene.id);
      if (!meaningful(shot.subjectAction)) addFinding(findings, 'cinematic_lineage_shot_action_missing', 'blocking', 'shot', 'shot', shot.id, 'shot.subjectAction', 'story-plan', scene.id);
      if (!meaningful(shot.emotionalTarget)) addFinding(findings, 'cinematic_lineage_shot_emotion_missing', 'blocking', 'shot', 'shot', shot.id, 'shot.emotionalTarget', 'story-plan', scene.id);
      if (Number(shot.estimatedActionDurationMs || 0) > Number(shot.durationMs || 0)) addFinding(findings, 'cinematic_lineage_shot_action_overflow', 'blocking', 'shot', 'shot', shot.id, 'shot.estimatedActionDurationMs', 'story-plan', scene.id);
      return {
        id: shot.id, sceneId: scene.id, version: Number(shot.version || 1),
        castAssignmentIds: [...(shot.castAssignmentIds || [])], wardrobeLookIds: [...(shot.wardrobeLookIds || [])],
        durationMs: Number(shot.durationMs || 0), storyboardStatus: shot.storyboardStatus || 'draft',
        approvedStoryboardAttemptId: shot.approvedStoryboardAttemptId || null,
        approvedVideoAttemptId: shot.approvedVideoAttemptId || null
      };
    }));
    const scopedShotIds = new Set(shots.map(shot => shot.id));

    const approvedStoryboardSources = shots.flatMap(shot => {
      const located = findShot(project, shot.id);
      const source = located?.shot.approvedStoryboardSource;
      if (!source) {
        addFinding(findings, 'cinematic_lineage_storyboard_source_missing', 'blocking', 'storyboard', 'shot', shot.id, 'approvedStoryboardSource', 'storyboard', shot.id);
        return [];
      }
      return [{
        shotId: shot.id,
        attemptId: located.shot.approvedStoryboardAttemptId || null,
        assetId: source.assetId || null,
        assetVersionId: source.assetVersionId || null,
        sourceJobId: source.sourceJobId || null,
        sourceFingerprint: source.sourceFingerprint || null,
        status: 'current'
      }];
    });

    const attempts = (project.generationAttempts || []).filter(attempt => !scopedShotIds.size || scopedShotIds.has(attempt.shotId));
    const storyboardContracts = attempts.filter(attempt => attempt.operation === 'cinematic_storyboard_still').map(attempt => ({
      attemptId: attempt.id, sceneId: attempt.sceneId || null, shotId: attempt.shotId,
      generationJobId: attempt.generationJobId || null,
      keyframeContractFingerprint: attempt.keyframeContractFingerprint || null,
      sourceFingerprint: attempt.sourceFingerprint || null,
      status: attempt.status, downstreamSourceStatus: attempt.downstreamSourceStatus || 'current'
    }));
    const videoPackets = attempts.filter(isVideoAttempt).map(attempt => ({
      attemptId: attempt.id, sceneId: attempt.sceneId || null, shotId: attempt.shotId,
      providerId: attempt.providerId || null, modelId: attempt.modelId || null,
      providerTaskId: attempt.providerTaskId || null,
      keyframeContractFingerprint: attempt.keyframeContractFingerprint || null,
      videoPacketFingerprint: attempt.videoPacketFingerprint || null,
      sourceFingerprint: attempt.sourceFingerprint || null,
      status: attempt.status, downstreamSourceStatus: attempt.downstreamSourceStatus || 'current'
    }));
    const approvedVideoSources = shots.flatMap(shot => {
      if (!shot.approvedVideoAttemptId) {
        addFinding(findings, 'cinematic_lineage_video_source_missing', 'blocking', 'produce', 'shot', shot.id, 'approvedVideoAttemptId', 'produce', shot.id);
        return [];
      }
      const attempt = attempts.find(item => item.id === shot.approvedVideoAttemptId && isVideoAttempt(item));
      const current = attempt && attempt.status === 'approved' && attempt.downstreamSourceStatus !== 'source_changed';
      if (!current) addFinding(findings, 'cinematic_lineage_video_source_stale', 'blocking', 'produce', 'shot', shot.id, 'approvedVideoAttemptId', 'produce', shot.id);
      return [{
        shotId: shot.id, attemptId: shot.approvedVideoAttemptId,
        sourceFingerprint: attempt?.sourceFingerprint || null,
        videoSourceFingerprint: attempt?.videoSourceFingerprint || null,
        outputAssetIds: [...(attempt?.outputAssetIds || [])], status: current ? 'current' : 'stale'
      }];
    });

    const activeTimeline = (project.timelineVersions || []).find(item => item.id === project.activeTimelineVersionId) || null;
    const timelineEntries = (activeTimeline?.entries || []).filter(entry => !scopedShotIds.size || scopedShotIds.has(entry.shotId)).map(entry => {
      if (entry.downstreamSourceStatus !== 'current') addFinding(findings, 'cinematic_lineage_timeline_source_stale', 'blocking', 'finish', 'timelineEntry', entry.id, 'downstreamSourceStatus', 'finish', entry.shotId);
      return {
        id: entry.id, timelineVersionId: activeTimeline.id, sceneId: entry.sceneId,
        shotId: entry.shotId, approvedVideoAttemptId: entry.approvedVideoAttemptId || null,
        sourceFingerprint: entry.sourceFingerprint || null,
        videoSourceFingerprint: entry.videoSourceFingerprint || null,
        orderKey: entry.orderKey,
        trimInMs: entry.trimInMs, trimOutMs: entry.trimOutMs, durationMs: entry.durationMs,
        transition: entry.transition, transitionDurationMs: entry.transitionDurationMs || 0,
        status: entry.downstreamSourceStatus || 'source_unavailable'
      };
    });
    if (project.activeStage === 'finish' && !activeTimeline) addFinding(findings, 'cinematic_lineage_timeline_missing', 'blocking', 'finish', 'project', project.id, 'activeTimelineVersionId', 'finish');

    const report = {
      schemaVersion: 1,
      reportVersion: 'cinematic-lineage-v1',
      project: {
        id: project.id, version: project.version, activeStage: project.activeStage,
        status: project.status, aspectRatio: project.aspectRatio, durationTargetMs: project.durationTargetMs
      },
      setup: {
        activeStorySourceVersionId: project.activeStorySourceVersionId || null,
        storySourceVersion: activeSource?.version || null,
        status: activeSource ? 'current' : 'missing'
      },
      storyRoles: roles,
      castAssignments,
      lookBindings,
      storyPlan: activePlan ? {
        id: activePlan.id, version: activePlan.version, storySourceVersionId: activePlan.storySourceVersionId,
        status: activePlan.status, sceneIds: [...(activePlan.sceneIds || [])]
      } : null,
      beats,
      scenes,
      shots,
      storyboardContracts,
      approvedStoryboardSources,
      videoPackets,
      approvedVideoSources,
      timelineEntries,
      exports: activeTimeline ? [{
        timelineVersionId: activeTimeline.id,
        timelineVersion: activeTimeline.version,
        timelineFingerprint: activeTimeline.timelineFingerprint || null,
        durationMs: activeTimeline.durationMs,
        exportEligible: activeTimeline.exportEligible === true,
        status: activeTimeline.exportEligible === true ? 'eligible' : 'blocked'
      }] : [],
      findings
    };
    return { ...report, fingerprint: stableFingerprint(report) };
  }
}

function validateCastAndLooks(findings, value, allowedCastIds, lookById, entityType, entityId, sceneId = entityId) {
  for (const assignmentId of value.castAssignmentIds || []) {
    if (!allowedCastIds.has(assignmentId)) addFinding(findings, 'cinematic_lineage_cast_reference_invalid', 'blocking', entityType, entityType, entityId, `${entityType}.castAssignmentIds`, 'story-plan', sceneId);
  }
  for (const lookId of value.wardrobeLookIds || []) {
    const look = lookById.get(lookId);
    if (!look || !look.approved || !look.locked || !(value.castAssignmentIds || []).includes(look.assignmentId)) {
      addFinding(findings, 'cinematic_lineage_look_reference_invalid', 'blocking', entityType, entityType, entityId, `${entityType}.wardrobeLookIds`, 'cast', look?.assignmentId || null);
    }
  }
}

function addFinding(findings, code, severity, stage, entityType, entityId, fieldPath, recoveryStage, recoveryTargetId = null) {
  findings.push({
    code, severity, stage, entityType, entityId: entityId || null, fieldPath,
    sourceId: entityId || null, sourceVersion: null, consumerId: null, consumerVersion: null,
    summaryKey: code, recoveryStage, recoveryTargetId
  });
}

function orderedShots(scene) {
  const byId = new Map((scene.shots || []).map(shot => [shot.id, shot]));
  const ordered = (scene.shotOrder || []).map(id => byId.get(id)).filter(Boolean);
  return ordered.length === (scene.shots || []).length ? ordered : [...(scene.shots || [])].sort((a, b) => a.orderKey - b.orderKey);
}

function findShot(project, shotId) {
  for (const scene of project.scenes || []) {
    const shot = (scene.shots || []).find(item => item.id === shotId);
    if (shot) return { scene, shot };
  }
  return null;
}

function isApprovedLook(look) {
  return look?.locked === true && (look.approved === true || look.status === 'approved' || Boolean(look.characterLookVersionId));
}

function isVideoAttempt(attempt) {
  return ['cinematic_motion_preview', 'cinematic_draft_clip', 'cinematic_final_clip'].includes(attempt.operation);
}

function meaningful(value) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
}

function stableFingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(sortValue(value))).digest('hex').slice(0, 16);
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]));
}

export const cinematicDataLineageService = new CinematicDataLineageService();
