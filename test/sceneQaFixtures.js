/**
 * ModelPromptForge - Shared Scene Builder QA Fixture Builders
 */

export function createMockGuidedSceneState() {
  return {
    mode: 'normal',
    sceneBuilder: {
      authoringMode: 'guided',
      manualPromptText: '',
      lastGuidedPromptSnapshot: 'A structured guided mode scene output',
      templateDraft: null
    }
  };
}

export function createMockManualSceneState() {
  return {
    mode: 'normal',
    sceneBuilder: {
      authoringMode: 'manual',
      manualPromptText: 'A manual freestyle prompt text details',
      lastGuidedPromptSnapshot: '',
      templateDraft: null
    }
  };
}

export function createMockSceneTemplateSnapshot(overrides = {}) {
  return {
    sceneTemplateVersion: 1,
    title: 'Mock Template',
    description: 'Mock template description',
    authoringMode: 'guided',
    finalPromptSnapshot: 'A compiled prompt snapshot details',
    replaceableVariables: [
      { id: 'gender', type: 'select_option', defaultValue: 'female', required: false },
      { id: 'face_ref', type: 'reference_image', required: true }
    ],
    referenceSlotMapping: {
      face_ref: { required: true, sharePolicy: 'required_user_replacement' }
    },
    ...overrides
  };
}

export function createMockPrivateReferenceSlots() {
  return {
    face_ref: { required: true, sharePolicy: 'required_user_replacement' },
    character_ref: { required: true, sharePolicy: 'required_user_replacement' }
  };
}

export function createMockPreviewOnlyReferenceSlot() {
  return {
    outfit_ref: { required: false, sharePolicy: 'shared_preview_only' }
  };
}

export function createMockReusableStyleReference() {
  return {
    style_ref: { required: false, sharePolicy: 'shared_as_reusable_reference' }
  };
}

export function createLegacyNormalHistoryItem() {
  return {
    id: 'job_legacy999',
    username: 'user_demo',
    mode: 'normal',
    prompt: 'portrait of a man with sunglasses',
    imageUrl: '/outputs/job_legacy999.png',
    timestamp: 1784366600000
  };
}

export function createMockLocalCommunityPost(overrides = {}) {
  return {
    id: 'post_mock123',
    title: 'Mock Community Post',
    description: 'Mock community template share post',
    promptVisibility: 'full',
    imageUrl: '/outputs/job_guided123.png',
    thumbnailUrl: '/outputs/job_guided123_thumb.png',
    ownerUsername: 'user_alice',
    sceneTemplateSnapshot: createMockSceneTemplateSnapshot(),
    createdAt: Date.now(),
    ...overrides
  };
}
