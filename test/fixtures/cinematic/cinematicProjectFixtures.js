const FIXED_TIME = '2026-01-01T00:00:00.000Z';

export function createSingleCharacterCinematicProject() {
  const look = approvedLook('look_nara_cafe', 'cast_nara', 'Quiet Resolve');
  const shot = cinematicShot({
    id: 'shot_cafe_opening',
    title: 'After closing',
    castAssignmentIds: ['cast_nara'],
    wardrobeLookIds: [look.id]
  });
  shot.storyboardStatus = 'approved';
  shot.approvedStoryboardAttemptId = 'attempt_storyboard_single';
  shot.approvedStoryboardSource = {
    assetId: 'asset_storyboard_single',
    assetVersionId: 'asset_storyboard_single_v1',
    sourceJobId: 'job_storyboard_single',
    imageUrl: '/api/fixtures/storyboard-single',
    thumbnailUrl: '/api/fixtures/storyboard-single-thumbnail',
    contentHash: 'hash_storyboard_single',
    sourceFingerprint: 'fingerprint_storyboard_single',
    approvedAt: FIXED_TIME
  };
  shot.approvedVideoAttemptId = 'attempt_video_single';
  shot.approvedVideoSourceFingerprint = 'fingerprint_storyboard_single';
  const scene = cinematicScene({
    id: 'scene_cafe_closing',
    beatId: 'beat_choice',
    title: 'The closed cafe',
    castAssignmentIds: ['cast_nara'],
    wardrobeLookIds: [look.id],
    shots: [shot]
  });
  const plan = storyPlan({
    id: 'plan_cafe_v1',
    storySourceVersionId: 'source_cafe_v1',
    sceneIds: [scene.id],
    beats: [{
      id: 'beat_choice', orderKey: 1, type: 'development', title: 'Choice',
      purpose: 'Make the private decision visible.',
      storyChange: 'Hesitation becomes a deliberate choice.',
      cause: 'The character confronts the final closing moment.',
      consequence: 'She chooses to act.',
      emotionalStart: 'uncertain', emotionalEnd: 'quietly resolved',
      targetDurationMs: 6000, sceneIds: [scene.id]
    }]
  });
  const value = project({
    id: 'cineproj_fixture_single',
    title: 'Single Character Fixture',
    storySourceId: 'source_cafe_v1',
    storyBrief: 'A woman makes one visible choice after closing the family cafe.',
    storyRoleSlots: [roleSlot('role_lead', 'Lead')],
    castAssignments: [castAssignment({ id: 'cast_nara', roleSlotId: 'role_lead', displayName: 'Nara', looks: [look] })],
    storyPlanVersions: [plan],
    activeStoryPlanVersionId: plan.id,
    scenes: [scene]
  });
  value.activeStage = 'finish';
  value.status = 'review';
  value.generationAttempts = [
    {
      id: 'attempt_storyboard_single', operation: 'cinematic_storyboard_still',
      sceneId: scene.id, shotId: shot.id, generationJobId: 'job_storyboard_single',
      status: 'approved', reviewDecision: 'approved', sourceFingerprint: 'fingerprint_storyboard_single',
      outputAssetIds: ['asset_storyboard_single'], createdAt: FIXED_TIME
    },
    {
      id: 'attempt_video_single', operation: 'cinematic_draft_clip',
      sceneId: scene.id, shotId: shot.id, generationJobId: 'job_video_single',
      providerTaskId: 'task_video_single', status: 'approved', reviewDecision: 'approved',
      sourceFingerprint: 'fingerprint_storyboard_single', downstreamSourceStatus: 'current',
      outputAssetIds: ['asset_video_single'], createdAt: FIXED_TIME
    }
  ];
  value.timelineVersions = [{
    id: 'timeline_single_v1', version: 1, parentVersionId: null, status: 'active',
    entries: [{
      id: 'clip_single', orderKey: 1, sceneId: scene.id, shotId: shot.id,
      approvedVideoAttemptId: 'attempt_video_single', sourceFingerprint: 'fingerprint_storyboard_single',
      trimInMs: 0, trimOutMs: shot.durationMs, durationMs: shot.durationMs,
      transition: 'cut', downstreamSourceStatus: 'current'
    }],
    durationMs: shot.durationMs, exportEligible: true, createdAt: FIXED_TIME
  }];
  value.activeTimelineVersionId = 'timeline_single_v1';
  return value;
}

export function createMultiCharacterCinematicProject() {
  const leadLook = approvedLook('look_lead_day', 'cast_lead', 'Lead Day Look');
  const supportLook = approvedLook('look_support_day', 'cast_support', 'Support Day Look');
  const sharedShot = cinematicShot({
    id: 'shot_shared_choice',
    title: 'The shared decision',
    castAssignmentIds: ['cast_lead', 'cast_support'],
    wardrobeLookIds: [leadLook.id, supportLook.id]
  });
  const scene = cinematicScene({
    id: 'scene_shared_room',
    beatId: 'beat_shared_choice',
    title: 'Two people decide',
    castAssignmentIds: ['cast_lead', 'cast_support'],
    wardrobeLookIds: [leadLook.id, supportLook.id],
    shots: [sharedShot]
  });
  const plan = storyPlan({
    id: 'plan_multi_v1',
    storySourceVersionId: 'source_multi_v1',
    sceneIds: [scene.id],
    beats: [{
      id: 'beat_shared_choice', orderKey: 1, type: 'development', title: 'Shared choice',
      purpose: 'Resolve two opposing objectives.', storyChange: 'Disagreement becomes consent.',
      cause: 'Both characters see the same evidence.', consequence: 'They act together.',
      emotionalStart: 'guarded', emotionalEnd: 'aligned', targetDurationMs: 6000,
      sceneIds: [scene.id]
    }]
  });
  return project({
    id: 'cineproj_fixture_multi',
    title: 'Multi Character Fixture',
    storySourceId: 'source_multi_v1',
    storyBrief: 'Two people with different objectives make one shared decision.',
    storyRoleSlots: [roleSlot('role_lead', 'Lead'), roleSlot('role_support', 'Support')],
    castAssignments: [
      castAssignment({ id: 'cast_lead', roleSlotId: 'role_lead', displayName: 'Lead', looks: [leadLook] }),
      castAssignment({ id: 'cast_support', roleSlotId: 'role_support', displayName: 'Support', looks: [supportLook] })
    ],
    storyPlanVersions: [plan],
    activeStoryPlanVersionId: plan.id,
    scenes: [scene]
  });
}

export function createLegacyCinematicProject() {
  const value = createSingleCharacterCinematicProject();
  value.id = 'cineproj_fixture_legacy';
  value.projectId = value.id;
  value.title = 'Legacy Fixture Without Authoring Metadata';
  delete value.authoringContractVersion;
  delete value.authoringState;
  value.storyPlanVersions[0].contractVersion = 'legacy';
  return value;
}

function project({
  id, title, storySourceId, storyBrief, storyRoleSlots, castAssignments,
  storyPlanVersions, activeStoryPlanVersionId, scenes
}) {
  return {
    id,
    projectId: id,
    schemaVersion: 1,
    version: 1,
    ownerUserId: 'usr_fixture_owner',
    ownerUsername: 'fixture_owner',
    title,
    format: 'short-film',
    platformTargets: ['youtube-shorts'],
    aspectRatio: '9:16',
    durationTargetMs: scenes.reduce((total, scene) => total + scene.durationMs, 0),
    activeStage: 'story-plan',
    status: 'planned',
    setup: {
      projectName: title,
      platform: 'youtube-shorts',
      durationSeconds: scenes.reduce((total, scene) => total + scene.durationMs, 0) / 1000,
      storyBrief,
      creativeDirection: 'Photorealistic restrained drama with observable performance.',
      genre: 'drama', audienceFeeling: 'moved', pacing: 'balanced', endingIntent: 'resolved',
      mode: 'simple', castPlanningMode: storyRoleSlots.length > 1 ? 'ensemble' : 'solo', storyRoleSlots
    },
    storySourceVersions: [{
      id: storySourceId, version: 1, storyBrief,
      creativeDirection: 'Photorealistic restrained drama with observable performance.',
      status: 'applied', source: 'manual', createdAt: FIXED_TIME
    }],
    activeStorySourceVersionId: storySourceId,
    castAssignments,
    storyPlanVersions,
    scenes,
    generationAttempts: [],
    timelineVersions: [],
    commandReceipts: [],
    activeStoryPlanVersionId,
    activeTimelineVersionId: null,
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
    archivedAt: null
  };
}

function roleSlot(id, label) {
  return {
    id, label, importance: 'required',
    storyFunction: `${label} advances the visible decision.`, relationshipHint: ''
  };
}

function castAssignment({ id, roleSlotId, displayName, looks }) {
  return {
    id,
    characterProfileId: `charprof_${id}`,
    characterProfileVersionId: `charver_${id}_v1`,
    portraitUrl: `/api/fixtures/${id}/portrait`,
    displayName,
    storyRole: displayName,
    storyRoleSlotId: roleSlotId,
    storyImportance: roleSlotId === 'role_lead' ? 'protagonist' : 'supporting',
    objective: 'Complete the visible story decision.',
    motivation: 'Protect what matters.', pressure: 'Time is limited.',
    personalityTraits: ['restrained', 'observant'],
    emotionalBaseline: 'guarded toward resolved',
    dialogueStyle: 'sparse', performanceDirection: 'Use restrained physical cues.',
    identityReady: true,
    identityReadinessSnapshot: { status: 'identity_pack_ready' },
    apparentAgeRange: { min: 25, max: 34 },
    looks,
    active: true,
    updatedAt: FIXED_TIME
  };
}

function approvedLook(id, assignmentId, name) {
  return {
    id, assignmentId, name, status: 'approved', approved: true, locked: true,
    characterLookVersionId: `${id}_v1`, garmentSummary: `${name} full outfit`,
    accessorySummary: 'No added accessories', assetIds: [`asset_${id}_sheet`],
    boundAt: FIXED_TIME
  };
}

function storyPlan({ id, storySourceVersionId, sceneIds, beats }) {
  return {
    id, version: 1, parentVersionId: null, storySourceVersionId,
    objective: 'Turn one internal decision into an observable action.',
    logline: 'A restrained character makes one consequential choice.',
    beats, emotionalArc: 'guarded toward resolved', sceneIds,
    estimatedDurationMs: beats.reduce((total, beat) => total + beat.targetDurationMs, 0),
    estimatedShotCount: sceneIds.length, warnings: [], source: 'manual',
    status: 'approved', contractVersion: 'story-plan-v3', createdAt: FIXED_TIME
  };
}

function cinematicScene({ id, beatId, title, castAssignmentIds, wardrobeLookIds, shots }) {
  return {
    id, version: 1, orderKey: 1, beatId, title,
    purpose: 'Make one decision visible.', storyChange: 'Hesitation becomes action.',
    entryState: 'The characters have not acted.', exitState: 'The decision is visible.',
    objective: 'Choose whether to act.', pressure: 'The opportunity is closing.',
    location: 'Interior practical location', time: 'Evening',
    emotionalStart: 'guarded', emotionalEnd: 'quietly resolved', transitionIntent: 'cut',
    castAssignmentIds, wardrobeLookIds,
    blocking: 'Keep a stable screen axis.', lighting: 'Natural practical light.',
    performance: 'Restrained eye and hand movement.', audioIntent: 'Quiet room tone.',
    propContinuity: '', screenDirection: 'camera-left to camera-right', continuityNotes: [],
    shots, shotOrder: shots.map(shot => shot.id),
    durationMs: shots.reduce((total, shot) => total + shot.durationMs, 0)
  };
}

function cinematicShot({ id, title, castAssignmentIds, wardrobeLookIds }) {
  return {
    id, version: 1, orderKey: 1, title,
    purpose: 'Establish the decision moment.', visibleMoment: 'The character pauses before acting.',
    subjectAction: 'The character takes one deliberate step.', emotionalTarget: 'restrained resolve',
    performanceCue: 'A small release in the jaw and one steady breath.',
    durationMs: 6000, framing: 'medium wide', cameraAngle: 'eye level',
    cameraMovement: 'locked camera', lensIntent: 'natural perspective',
    blocking: 'Subject remains on the established axis.', performance: 'internal and restrained',
    gaze: 'toward the decision point', lighting: 'natural practical light',
    environment: 'dry interior with weather visible only outside', audioIntent: 'room tone',
    prompt: 'A restrained cinematic decision moment.',
    continuityEntry: 'The character is still.', continuityExit: 'The first step is complete.',
    transitionToNext: 'cut', estimatedActionDurationMs: 3000,
    dialogueCues: [], audioCues: [], castAssignmentIds, wardrobeLookIds,
    continuityNotes: [], storyboardStatus: 'draft'
  };
}
