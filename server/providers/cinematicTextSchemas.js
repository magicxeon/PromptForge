const CINEMATIC_DIALOGUE_CUE_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'speakerCastAssignmentId', 'offscreenVoiceRole', 'text', 'delivery',
    'startOffsetSeconds', 'estimatedDurationSeconds', 'speakerVisible'
  ],
  properties: {
    speakerCastAssignmentId: { type: 'string' },
    offscreenVoiceRole: { type: 'string' },
    text: { type: 'string' },
    delivery: { type: 'string' },
    startOffsetSeconds: { type: 'number' },
    estimatedDurationSeconds: { type: 'number' },
    speakerVisible: { type: 'boolean' }
  }
});

const CINEMATIC_AUDIO_CUE_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'source', 'description', 'startOffsetSeconds', 'durationSeconds'],
  properties: {
    kind: { type: 'string' },
    source: { type: 'string' },
    description: { type: 'string' },
    startOffsetSeconds: { type: 'number' },
    durationSeconds: { type: 'number' }
  }
});

const CINEMATIC_DIRECTOR_FINDING_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['code', 'dimension', 'severity', 'summary', 'recommendation', 'beatKey', 'sceneKey', 'shotIndex'],
  properties: {
    code: { type: 'string' },
    dimension: {
      type: 'string',
      enum: ['story', 'script', 'performance', 'visual', 'editorial', 'audio', 'continuity', 'production']
    },
    severity: { type: 'string', enum: ['warning', 'info'] },
    summary: { type: 'string' },
    recommendation: { type: 'string' },
    beatKey: { type: 'string' },
    sceneKey: { type: 'string' },
    shotIndex: { type: 'integer' }
  }
});

const CINEMATIC_STORY_PLAN_SHOT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'title', 'purpose', 'coverageRole', 'durationSeconds', 'visibleMoment', 'subjectAction',
    'emotionalTarget', 'performanceCue', 'framing', 'cameraAngle',
    'cameraMovement', 'lensIntent', 'blocking', 'performance', 'gaze', 'lighting', 'environment',
    'audioIntent', 'prompt', 'continuityEntry', 'continuityExit',
    'transitionToNext', 'estimatedActionDurationSeconds', 'dialogueCues',
    'audioCues', 'castAssignmentIds', 'wardrobeLookIds', 'continuityNotes'
  ],
  properties: {
    title: { type: 'string' },
    purpose: { type: 'string' },
    durationSeconds: { type: 'number' },
    coverageRole: {
      type: 'string',
      enum: ['establishing', 'action', 'reaction', 'insert', 'transition', 'payoff']
    },
    visibleMoment: { type: 'string' },
    subjectAction: { type: 'string' },
    emotionalTarget: { type: 'string' },
    performanceCue: { type: 'string' },
    framing: { type: 'string' },
    cameraAngle: { type: 'string' },
    cameraMovement: { type: 'string' },
    lensIntent: { type: 'string' },
    blocking: { type: 'string' },
    performance: { type: 'string' },
    gaze: { type: 'string' },
    lighting: { type: 'string' },
    environment: { type: 'string' },
    audioIntent: { type: 'string' },
    prompt: { type: 'string' },
    continuityEntry: { type: 'string' },
    continuityExit: { type: 'string' },
    transitionToNext: { type: 'string' },
    estimatedActionDurationSeconds: { type: 'number' },
    dialogueCues: { type: 'array', maxItems: 12, items: CINEMATIC_DIALOGUE_CUE_SCHEMA },
    audioCues: { type: 'array', maxItems: 12, items: CINEMATIC_AUDIO_CUE_SCHEMA },
    castAssignmentIds: { type: 'array', maxItems: 6, items: { type: 'string' } },
    wardrobeLookIds: { type: 'array', maxItems: 12, items: { type: 'string' } },
    continuityNotes: { type: 'array', maxItems: 12, items: { type: 'string' } }
  }
});

export const CINEMATIC_STORY_PLAN_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'objective', 'logline', 'emotionalArc', 'centralDramaticQuestion',
    'storyPromise', 'finalPayoff', 'spokenLanguage', 'onScreenTextPolicy',
    'dialoguePolicy', 'characterAliases', 'beats', 'scenes', 'directorReview', 'warnings'
  ],
  properties: {
    objective: { type: 'string' },
    logline: { type: 'string' },
    emotionalArc: { type: 'string' },
    centralDramaticQuestion: { type: 'string' },
    storyPromise: { type: 'string' },
    finalPayoff: { type: 'string' },
    spokenLanguage: { type: 'string' },
    onScreenTextPolicy: { type: 'string' },
    dialoguePolicy: { type: 'string', enum: ['none', 'sparse', 'normal', 'dialogue-led'] },
    characterAliases: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['castAssignmentId', 'storyCharacterName'],
        properties: {
          castAssignmentId: { type: 'string' },
          storyCharacterName: { type: 'string' }
        }
      }
    },
    beats: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'key', 'type', 'title', 'purpose', 'storyChange', 'cause', 'consequence',
          'emotionalStart', 'emotionalTurn', 'emotionalEnd', 'requiredElements',
          'targetDurationSeconds'
        ],
        properties: {
          key: { type: 'string' },
          type: { type: 'string' },
          title: { type: 'string' },
          purpose: { type: 'string' },
          storyChange: { type: 'string' },
          cause: { type: 'string' },
          consequence: { type: 'string' },
          emotionalStart: { type: 'string' },
          emotionalTurn: { type: 'string' },
          emotionalEnd: { type: 'string' },
          requiredElements: { type: 'array', maxItems: 8, items: { type: 'string' } },
          targetDurationSeconds: { type: 'number' }
        }
      }
    },
    scenes: {
      type: 'array',
      minItems: 1,
      maxItems: 24,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'key', 'beatKey', 'title', 'purpose', 'storyChange', 'entryState',
          'exitState', 'objective', 'pressure', 'location', 'time',
          'emotionalStart', 'emotionalEnd', 'transitionIntent',
          'castAssignmentIds', 'wardrobeLookIds', 'blocking', 'lighting', 'artDirection',
          'performance', 'audioIntent', 'propContinuity', 'screenDirection',
          'continuityNotes', 'shots'
        ],
        properties: {
          key: { type: 'string' },
          beatKey: { type: 'string' },
          title: { type: 'string' },
          purpose: { type: 'string' },
          storyChange: { type: 'string' },
          location: { type: 'string' },
          time: { type: 'string' },
          entryState: { type: 'string' },
          exitState: { type: 'string' },
          objective: { type: 'string' },
          pressure: { type: 'string' },
          emotionalStart: { type: 'string' },
          emotionalEnd: { type: 'string' },
          transitionIntent: { type: 'string' },
          castAssignmentIds: { type: 'array', maxItems: 6, items: { type: 'string' } },
          wardrobeLookIds: { type: 'array', maxItems: 12, items: { type: 'string' } },
          blocking: { type: 'string' },
          lighting: { type: 'string' },
          artDirection: { type: 'string' },
          performance: { type: 'string' },
          audioIntent: { type: 'string' },
          propContinuity: { type: 'string' },
          screenDirection: { type: 'string' },
          continuityNotes: { type: 'array', maxItems: 12, items: { type: 'string' } },
          shots: {
            type: 'array',
            minItems: 1,
            maxItems: 20,
            items: CINEMATIC_STORY_PLAN_SHOT_SCHEMA
          }
        }
      }
    },
    directorReview: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'findings'],
      properties: {
        summary: { type: 'string' },
        findings: { type: 'array', maxItems: 24, items: CINEMATIC_DIRECTOR_FINDING_SCHEMA }
      }
    },
    warnings: { type: 'array', maxItems: 20, items: { type: 'string' } }
  }
});

export const CINEMATIC_SCENE_DIRECTION_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'key', 'title', 'purpose', 'storyChange', 'entryState', 'exitState',
    'objective', 'pressure', 'location', 'time', 'emotionalStart',
    'emotionalEnd', 'transitionIntent', 'castAssignmentIds', 'wardrobeLookIds',
    'blocking', 'lighting', 'artDirection', 'performance', 'audioIntent', 'continuityNotes',
    'propContinuity', 'screenDirection', 'shots', 'warnings'
  ],
  properties: {
    key: { type: 'string' },
    title: { type: 'string' },
    purpose: { type: 'string' },
    storyChange: { type: 'string' },
    entryState: { type: 'string' },
    exitState: { type: 'string' },
    objective: { type: 'string' },
    pressure: { type: 'string' },
    location: { type: 'string' },
    time: { type: 'string' },
    emotionalStart: { type: 'string' },
    emotionalEnd: { type: 'string' },
    transitionIntent: { type: 'string' },
    castAssignmentIds: { type: 'array', maxItems: 6, items: { type: 'string' } },
    wardrobeLookIds: { type: 'array', maxItems: 12, items: { type: 'string' } },
    blocking: { type: 'string' },
    lighting: { type: 'string' },
    performance: { type: 'string' },
    audioIntent: { type: 'string' },
    propContinuity: { type: 'string' },
    artDirection: { type: 'string' },
    screenDirection: { type: 'string' },
    continuityNotes: { type: 'array', maxItems: 12, items: { type: 'string' } },
    shots: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: CINEMATIC_STORY_PLAN_SHOT_SCHEMA
    },
    warnings: { type: 'array', maxItems: 12, items: { type: 'string' } }
  }
});
