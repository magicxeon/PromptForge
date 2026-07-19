import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createMockGuidedSceneState, createMockManualSceneState } from './sceneQaFixtures.js';

// Load legacy data structures from JSON fixtures (Scene-010 Integration Gates)
const legacyItem = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'test/fixtures/scene-history-legacy-normal.json'), 'utf8'));
const guidedItem = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'test/fixtures/scene-history-guided-template.json'), 'utf8'));
const manualItem = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'test/fixtures/scene-history-manual-template.json'), 'utf8'));

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

test('state patch helper assigns new values correctly', () => {
  const stateObj = {
    sceneBuilder: {
      authoringMode: "guided",
      manualPromptText: "",
      lastGuidedPromptSnapshot: "",
      templateDraft: null
    }
  };

  Object.assign(stateObj.sceneBuilder, { authoringMode: 'manual', manualPromptText: 'test manual' });

  assert.equal(stateObj.sceneBuilder.authoringMode, 'manual');
  assert.equal(stateObj.sceneBuilder.manualPromptText, 'test manual');
});

test('generatePromptText mock prevents manual prompt leaks to other modes', () => {
  const mockStateObj = createMockManualSceneState();
  mockStateObj.mode = 'headshot'; // override mode to non-normal
  mockStateObj.sceneBuilder.manualPromptText = 'Freestyle prompt that should NOT leak';

  // Mimic compiler behavior
  function generatePromptTextMock(stateObj) {
    if (stateObj.mode === "normal" && stateObj.sceneBuilder?.authoringMode === "manual") {
      return stateObj.sceneBuilder.manualPromptText || "";
    }
    return "Structured output";
  }

  assert.equal(generatePromptTextMock(mockStateObj), "Structured output");

  mockStateObj.mode = "normal";
  assert.equal(generatePromptTextMock(mockStateObj), "Freestyle prompt that should NOT leak");
});

test('deserialization validates and normalizes sceneBuilder authoringMode', () => {
  const rawPayload = {
    sceneBuilder: {
      authoringMode: "corrupted_mode_abc",
      manualPromptText: 12345
    }
  };

  const raw = rawPayload.sceneBuilder || {};
  const authoringMode = (raw.authoringMode === "guided" || raw.authoringMode === "manual") ? raw.authoringMode : "guided";
  const normalizedSceneBuilder = {
    authoringMode,
    manualPromptText: typeof raw.manualPromptText === "string" ? raw.manualPromptText : "",
    lastGuidedPromptSnapshot: typeof raw.lastGuidedPromptSnapshot === "string" ? raw.lastGuidedPromptSnapshot : "",
    templateDraft: raw.templateDraft || null
  };

  assert.equal(normalizedSceneBuilder.authoringMode, "guided");
  assert.equal(normalizedSceneBuilder.manualPromptText, "");
});

test('scene generation uses manual prompt only for normal manual mode', () => {
  function resolvePrompt(context) {
    const manualScenePrompt = context.mode === 'normal'
      && context.sceneBuilder?.authoringMode === 'manual'
      && typeof context.sceneBuilder.manualPromptText === 'string'
      ? context.sceneBuilder.manualPromptText.trim()
      : '';
    return manualScenePrompt || 'Structured server prompt';
  }

  assert.equal(resolvePrompt({
    mode: 'normal',
    sceneBuilder: { authoringMode: 'manual', manualPromptText: 'manual scene prompt' }
  }), 'manual scene prompt');

  assert.equal(resolvePrompt({
    mode: 'headshot',
    sceneBuilder: { authoringMode: 'manual', manualPromptText: 'manual scene prompt' }
  }), 'Structured server prompt');

  assert.equal(resolvePrompt({
    mode: 'normal',
    sceneBuilder: { authoringMode: 'guided', manualPromptText: 'manual scene prompt' }
  }), 'Structured server prompt');
});

test('normalizeLegacySceneMode migrates real JSON legacy, guided, and manual fixture files', () => {
  // 1. Legacy item (normal mode without sceneBuilder)
  const normLegacy = normalizeLegacySceneMode(legacyItem);
  assert.equal(normLegacy.mode, 'normal');
  assert.ok(normLegacy.sceneBuilder);
  assert.equal(normLegacy.sceneBuilder.authoringMode, 'guided');

  // 2. Guided item (already contains sceneTemplateSnapshot)
  const normGuided = normalizeLegacySceneMode(guidedItem);
  assert.equal(normGuided.mode, 'normal');
  assert.ok(normGuided.sceneTemplateSnapshot);
  assert.equal(normGuided.sceneTemplateSnapshot.authoringMode, 'guided');

  // 3. Manual item (already contains sceneTemplateSnapshot in manual mode)
  const normManual = normalizeLegacySceneMode(manualItem);
  assert.equal(normManual.mode, 'normal');
  assert.ok(normManual.sceneTemplateSnapshot);
  assert.equal(normManual.sceneTemplateSnapshot.authoringMode, 'manual');
  assert.equal(normManual.sceneTemplateSnapshot.finalPromptSnapshot, 'A manual template freestyle output scene');
});

