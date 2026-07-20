import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { compilePromptOnServer } from "../server/domain/generation/promptCompiler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const attributesDir = path.join(repoRoot, "attributes");
const casesPath = path.join(repoRoot, "tests", "prompt-cleanup", "headshot-cleanup.cases.json");
const snapshotsPath = path.join(repoRoot, "tests", "prompt-cleanup", "headshot-cleanup.snapshots.json");

const fieldGroupFallback = {
  Gender: "Character",
  Age: "Character",
  Ethnicity: "Character",
  Beauty: "Character",
  "Face Shape": "Face",
  Eyes: "Face",
  Eyebrows: "Face",
  Nose: "Face",
  Lips: "Face",
  Smile: "Face",
  Expression: "Face",
  Length: "Hair",
  Style: "Hair",
  "Cut / Style": "Hair",
  "Parting / Fringe": "Hair",
  Texture: "Hair",
  Color: "Hair",
  Finish: "Hair",
  Tone: "Skin",
  "Skin Texture": "Skin",
  Makeup: "Skin",
  Freckles: "Skin"
};

function flattenAttributes(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.entries)) return data.entries;
  return [];
}

function loadAttributeLibrary() {
  const library = new Map();
  const files = fs.readdirSync(attributesDir).filter(file => file.endsWith(".json"));
  files.forEach(file => {
    const raw = fs.readFileSync(path.join(attributesDir, file), "utf8");
    const entries = flattenAttributes(JSON.parse(raw));
    entries.forEach(entry => {
      if (entry?.id) library.set(entry.id, entry);
    });
  });
  return library;
}

function resolvePromptValue(attribute) {
  return attribute.prompt?.["gpt-image"]
    || attribute.prompt?.default
    || attribute.value
    || (typeof attribute.label === "string" ? attribute.label : attribute.label?.en)
    || attribute.id;
}

function buildSelection(fieldName, attributeId, library) {
  const attribute = library.get(attributeId);
  if (!attribute) {
    throw new Error(`Unknown attribute id "${attributeId}" for field "${fieldName}"`);
  }
  return {
    id: attribute.id,
    value: resolvePromptValue(attribute),
    isCustom: false,
    group: attribute.ui?.group || fieldGroupFallback[fieldName] || "Character",
    category: attribute.category,
    tags: attribute.tags || [],
    gptPositiveWords: String(attribute.prompt?.["gpt-image-positive"] || "")
      .split(",")
      .map(word => word.trim())
      .filter(Boolean)
  };
}

function buildSelections(caseDef, library) {
  return Object.fromEntries(
    Object.entries(caseDef.selections || {}).map(([fieldName, attributeId]) => [
      fieldName,
      buildSelection(fieldName, attributeId, library)
    ])
  );
}

function normalizeForSearch(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function getDuplicatePromptPhrases(prompt) {
  const body = String(prompt || "").replace(/\s*\(Image aspect ratio .*?\)\s*$/i, "");
  const seen = new Set();
  const duplicates = new Set();
  body.split(",").forEach(part => {
    const key = normalizeForSearch(part);
    if (!key) return;
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  });
  return [...duplicates];
}

function getSelectedHairColor(caseDef, library) {
  const colorId = caseDef.selections?.Color;
  if (!colorId) return "";
  return resolvePromptValue(library.get(colorId)).replace(/\s*hair\b/i, "").trim();
}

function runCase(caseDef, library, snapshots) {
  const selections = buildSelections(caseDef, library);
  const prompt = compilePromptOnServer(
    selections,
    caseDef.aspectRatio || "6:8",
    {},
    caseDef.mode || "headshot",
    "portrait",
    false,
    {}
  );

  const failures = [];
  const normalizedPrompt = normalizeForSearch(prompt);

  (caseDef.mustInclude || []).forEach(phrase => {
    if (!normalizedPrompt.includes(normalizeForSearch(phrase))) {
      failures.push(`missing "${phrase}"`);
    }
  });

  (caseDef.mustNotInclude || []).forEach(phrase => {
    if (normalizedPrompt.includes(normalizeForSearch(phrase))) {
      failures.push(`unexpected "${phrase}"`);
    }
  });

  const forbiddenGaze = ["off-camera", "something off-camera", "looking away"];
  forbiddenGaze.forEach(phrase => {
    if (normalizedPrompt.includes(phrase)) failures.push(`forbidden gaze phrase "${phrase}"`);
  });

  const duplicates = getDuplicatePromptPhrases(prompt);
  if (duplicates.length) {
    failures.push(`duplicate prompt phrases: ${duplicates.join("; ")}`);
  }

  if (/natural bare-face look/i.test(prompt)) {
    const repeatedNatural = [
      "no makeup, clean skin bare face",
      "completely natural face with zero or minimal makeup"
    ].filter(phrase => normalizedPrompt.includes(normalizeForSearch(phrase)));
    if (repeatedNatural.length) {
      failures.push(`repeated natural/no-makeup phrases: ${repeatedNatural.join("; ")}`);
    }
  }

  const selectedColor = getSelectedHairColor(caseDef, library);
  if (selectedColor && !normalizedPrompt.includes(normalizeForSearch(selectedColor))) {
    failures.push(`selected hair color "${selectedColor}" missing`);
  }

  const snapshot = snapshots?.[caseDef.id];
  if (snapshot && normalizeForSearch(snapshot) !== normalizedPrompt) {
    failures.push("snapshot mismatch");
  }

  return { id: caseDef.id, prompt, failures };
}

const library = loadAttributeLibrary();
const cases = JSON.parse(fs.readFileSync(casesPath, "utf8"));
const snapshots = fs.existsSync(snapshotsPath)
  ? JSON.parse(fs.readFileSync(snapshotsPath, "utf8"))
  : {};

const results = cases.map(caseDef => runCase(caseDef, library, snapshots));
const failed = results.filter(result => result.failures.length > 0);

results.forEach(result => {
  if (result.failures.length) {
    console.error(`FAIL ${result.id}`);
    result.failures.forEach(failure => console.error(`  - ${failure}`));
    console.error(`  prompt: ${result.prompt}`);
  } else {
    console.log(`PASS ${result.id}`);
  }
});

if (failed.length) {
  console.error(`\n${failed.length}/${results.length} prompt cleanup cases failed.`);
  process.exit(1);
}

console.log(`\n${results.length} prompt cleanup cases passed.`);
