import assert from 'node:assert/strict';
import test from 'node:test';

// Replicate or mock state context for pure tests
const mockState = { language: 'en' };

function resolveSceneDisplayMode(mode) {
  const norm = mode === "normal" || mode === "story" ? "normal" : mode;
  if (norm === "normal") {
    return {
      id: "scene-builder",
      label: "Scene Builder",
      legacyMode: "normal"
    };
  }
  if (norm === "headshot") {
    return {
      id: "headshot",
      label: "Headshot Grid",
      legacyMode: "headshot"
    };
  }
  if (norm === "character-sheet") {
    return {
      id: "character-sheet",
      label: "Character Sheet Builder",
      legacyMode: "character-sheet"
    };
  }
  return {
    id: norm,
    label: norm,
    legacyMode: norm
  };
}

function isSceneBuilderMode(mode) {
  return mode === "normal" || mode === "story" || mode === "scene-builder";
}

function normalizeLegacySceneMode(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const copied = { ...payload };

  if (copied.mode === "story" || copied.mode === "scene-builder") {
    copied.mode = "normal";
  }

  if (!copied.sceneBuilder) {
    copied.sceneBuilder = {
      authoringMode: "guided",
      manualPromptText: "",
      lastGuidedPromptSnapshot: "",
      templateDraft: null
    };
  }

  return copied;
}

test('resolveSceneDisplayMode maps normal/story to Scene Builder', () => {
  const res1 = resolveSceneDisplayMode('normal');
  assert.equal(res1.id, 'scene-builder');
  assert.equal(res1.legacyMode, 'normal');

  const res2 = resolveSceneDisplayMode('story');
  assert.equal(res2.id, 'scene-builder');
  assert.equal(res2.legacyMode, 'normal');

  const resHeadshot = resolveSceneDisplayMode('headshot');
  assert.equal(resHeadshot.id, 'headshot');
  assert.equal(resHeadshot.legacyMode, 'headshot');
});

test('isSceneBuilderMode checks valid names correctly', () => {
  assert.ok(isSceneBuilderMode('normal'));
  assert.ok(isSceneBuilderMode('story'));
  assert.ok(isSceneBuilderMode('scene-builder'));
  assert.ok(!isSceneBuilderMode('headshot'));
});

test('normalizeLegacySceneMode migrates mode keys and injects sceneBuilder namespace', () => {
  const legacy = {
    mode: 'story',
    selections: { Gender: 'female' }
  };

  const normalized = normalizeLegacySceneMode(legacy);
  assert.equal(normalized.mode, 'normal');
  assert.ok(normalized.sceneBuilder);
  assert.equal(normalized.sceneBuilder.authoringMode, 'guided');
});
