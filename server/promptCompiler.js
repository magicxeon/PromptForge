import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants replicated from frontend for self-contained server compiling
const TAG_CONFLICT_RULES = [
  ["indoor", "outdoor"],
  ["day", "night"],
  ["summer", "winter"],
  ["modern", "vintage"],
  ["cyberpunk", "traditional"]
];

const CATEGORY_PRIORITIES = {
  "environment": 100,
  "lighting": 90,
  "camera": 80,
  "clothing": 70,
  "pose": 60,
  "quality": 50,
  "nsfw": 40,
  "body": 30,
  "skin": 20,
  "hair": 10,
  "face": 5,
  "character": 1
};

const FIELD_TO_CATEGORY_MAP = {
  "Gender": "character", "Age": "character", "Ethnicity": "character", "Beauty": "character", "Reference Image": "character",
  "Face Shape": "face", "Eyes": "eyes", "Eyebrows": "eyebrows", "Nose": "nose", "Lips": "lips", "Smile": "lips", "Expression": "expression",
  "Length": "hair", "Style": "hair", "Texture": "hair", "Color": "hair", "Bangs": "hair",
  "Tone": "skin", "Texture": "skin", "Makeup": "skin", "Freckles": "skin",
  "Height": "body", "Body Shape": "body", "Build": "body", "Hands": "body", "Legs": "body",
  "Top": "clothing", "Bottom": "clothing", "Dress": "clothing", "Shoes": "clothing", "Accessories": "clothing",
  "Standing": "pose", "Sitting": "pose", "Walking": "pose", "Hand Position": "pose", "Eye Contact": "pose",
  "Location": "environment", "Architecture": "environment", "Props": "environment", "Weather": "environment", "Time of Day": "environment", "Season": "environment",
  "Key Light": "lighting", "Fill Light": "lighting", "Back Light": "lighting", "Flash": "lighting", "Neon": "lighting", "Ambient": "lighting", "Golden Hour": "lighting",
  "Brand": "camera", "Lens": "camera", "Focal Length": "camera", "Aperture": "camera", "Framing": "camera_framing", "ISO": "camera", "White Balance": "camera", "Perspective": "camera", "Composition": "camera", "Motion Blur": "camera",
  "Resolution": "quality", "Sharpness": "quality", "Photorealism": "quality", "Color Grading": "quality", "Film Look": "quality", "Output Frame": "quality",
  "Nudity Level": "nsfw", "Sensual Pose": "nsfw",
  "Context Type": "photo_context", "Story Event": "scene_story",
  "Foreground Layer": "foreground_layer", "Background Activity": "background_activity", "Camera Imperfections": "camera_imperfections"
};

// Load templates and order specs from client directory at runtime
let templates = {};
let promptOrder = [];

try {
  let templatesPath = path.join(__dirname, '../client/attributes/spec/prompt-templates.json');
  let orderPath = path.join(__dirname, '../client/attributes/spec/prompt-order.json');
  
  if (!fs.existsSync(templatesPath)) {
    templatesPath = path.join(__dirname, '../attributes/spec/prompt-templates.json');
  }
  if (!fs.existsSync(orderPath)) {
    orderPath = path.join(__dirname, '../attributes/spec/prompt-order.json');
  }

  if (fs.existsSync(templatesPath)) {
    templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  }
  if (fs.existsSync(orderPath)) {
    promptOrder = JSON.parse(fs.readFileSync(orderPath, 'utf8')).order || [];
  }
} catch (err) {
  console.error("Failed to load prompt specs in compiler:", err);
}

function resolveTagConflicts(activeSelections) {
  const items = [];
  for (const fieldName in activeSelections) {
    const sel = activeSelections[fieldName];
    if (sel.isCustom) continue;
    if (sel.tags) {
      items.push({
        fieldName,
        category: sel.category || FIELD_TO_CATEGORY_MAP[fieldName] || "",
        tags: sel.tags.map(t => t.toLowerCase()),
        priority: CATEGORY_PRIORITIES[(sel.category || FIELD_TO_CATEGORY_MAP[fieldName] || "").toLowerCase()] || 0
      });
    }
  }

  TAG_CONFLICT_RULES.forEach(rulePair => {
    const [tagA, tagB] = rulePair;
    const itemsA = items.filter(i => i.tags.includes(tagA) && !activeSelections[i.fieldName].isDropped);
    const itemsB = items.filter(i => i.tags.includes(tagB) && !activeSelections[i.fieldName].isDropped);

    if (itemsA.length > 0 && itemsB.length > 0) {
      const maxPriA = Math.max(...itemsA.map(i => i.priority));
      const maxPriB = Math.max(...itemsB.map(i => i.priority));

      if (maxPriA >= maxPriB) {
        itemsB.forEach(i => {
          activeSelections[i.fieldName].isDropped = true;
          activeSelections[i.fieldName].droppedReason = `Dropped: conflicts with '${tagA}'`;
        });
      } else {
        itemsA.forEach(i => {
          activeSelections[i.fieldName].isDropped = true;
          activeSelections[i.fieldName].droppedReason = `Dropped: conflicts with '${tagB}'`;
        });
      }
    }
  });
}

export function compilePromptOnServer(selections, aspectRatio, imageReferences, mode, templateName = "portrait", isGptSafe = false, customColors = null) {
  const templateStr = templates[templateName] || templates["portrait"] || "{subject}, {appearance}, {clothing}, {pose}, {environment}, {lighting}, {camera}, {quality}";

  // Clone selections
  const activeSelections = JSON.parse(JSON.stringify(selections));

  // Dynamically inject selections for active custom color pickers if empty (Step 11)
  if (customColors && customColors["Color"] && (customColors["Color"].enabled || customColors["Color"].highlightEnabled)) {
    if (!activeSelections["Color"]) {
      activeSelections["Color"] = {
        id: "",
        value: "",
        isCustom: false,
        group: "Hair",
        category: "hair",
        tags: []
      };
    }
  }
  ["Top", "Bottom", "Dress", "Shoes"].forEach(field => {
    if (customColors && customColors[field] && customColors[field].enabled) {
      if (!activeSelections[field]) {
        activeSelections[field] = {
          id: "",
          value: field.toLowerCase(),
          isCustom: false,
          group: "Clothing",
          category: "clothing",
          tags: []
        };
      }
    }
  });

  resolveTagConflicts(activeSelections);

  const getPromptValueWithColor = (selection, fieldName) => {
    if (!selection) return "";
    const baseVal = selection.value || "";
    if (customColors && customColors[fieldName]) {
      const cfg = customColors[fieldName];
      if (fieldName === "Color") {
        if (cfg.enabled || cfg.highlightEnabled) {
          let parts = [];
          if (baseVal && baseVal.trim() !== "") {
            parts.push(baseVal);
          } else {
            parts.push("hair");
          }
          if (cfg.enabled) {
            parts.push(`colored in ${cfg.base}`);
          }
          if (cfg.highlightEnabled) {
            parts.push(`accented with custom highlights in ${cfg.highlight}`);
          }
          return parts.join(", ");
        }
      } else {
        if (cfg.enabled && baseVal && baseVal.trim() !== "") {
          return `${baseVal} colored in ${cfg.color}`;
        }
      }
    }
    return baseVal;
  };

  const compileGroupSegment = (groupName) => {
    // Check if overridden by Image Reference Options
    if (groupName.toLowerCase() === "face") {
      if (imageReferences && imageReferences.faceMatch) {
        return "Preserve the identity of the uploaded person with high consistency while maintaining a completely natural appearance. Keep the same recognizable facial proportions, eye shape, nose, lips, eyebrows, hairstyle, and skin tone while allowing subtle natural variations from facial expression, camera perspective, lighting, and lens characteristics. Prioritize identity preservation over exact geometric matching.";
      }
    }
    if (groupName.toLowerCase() === "clothing") {
      if (imageReferences && imageReferences.styleMatch) {
        return "matching the style, colors, and clothing outfit from the original uploaded image";
      }
    }
    if (groupName.toLowerCase() === "pose") {
      if (imageReferences && imageReferences.poseMatch) {
        return "with the identical posing and image composition as the original uploaded file";
      }
    }

    let segmentValues = [];

    // Get order mappings for attributes within this segment
    promptOrder.forEach(fieldId => {
      const selection = Object.values(activeSelections).find(s => {
        const category = FIELD_TO_CATEGORY_MAP[s.group] || s.group.toLowerCase();
        return category.replace("_", "") === fieldId.replace("_", "") || s.group.toLowerCase() === fieldId.toLowerCase();
      });

      if (selection && selection.group.toLowerCase() === groupName.toLowerCase()) {
        const fieldName = Object.keys(activeSelections).find(k => activeSelections[k] === selection);
        const val = getPromptValueWithColor(selection, fieldName);
        if (val && val.trim() !== "" && !selection.isDropped) {
          segmentValues.push(val);
        }
      }
    });

    // Fallback if order rule didn't catch it
    if (segmentValues.length === 0) {
      segmentValues = Object.keys(activeSelections)
        .filter(key => activeSelections[key].group.toLowerCase() === groupName.toLowerCase())
        .map(key => {
          const s = activeSelections[key];
          if (s.isDropped) return null;
          return getPromptValueWithColor(s, key);
        })
        .filter(val => val && val.trim() !== "");
    }

    // Deduplicate
    segmentValues = [...new Set(segmentValues)];
    return segmentValues.join(", ");
  };

  // Compile individual templates
  let subject = compileGroupSegment("Character");
  let appearance = compileGroupSegment("Face");

  const getSelectionsForGroup = (grp) => {
    return Object.keys(activeSelections)
      .filter(key => activeSelections[key].group.toLowerCase() === grp.toLowerCase())
      .map(key => {
        const s = activeSelections[key];
        if (s.isDropped) return null;
        return getPromptValueWithColor(s, key);
      })
      .filter(val => val && val.trim() !== "");
  };

  let hairList = getSelectionsForGroup("Hair");
  let hair = hairList.length > 0 ? hairList.join(", ") : "";

  let skinList = getSelectionsForGroup("Skin");
  let skin = skinList.length > 0 ? skinList.join(", ") : "";

  let fullAppearance = [appearance, hair, skin].filter(s => s !== "").join(", ");
  let clothing = compileGroupSegment("Clothing");
  let pose = compileGroupSegment("Pose");
  let body = compileGroupSegment("Body");
  let fullSubject = [subject, body].filter(s => s !== "").join(", ");

  let environment = compileGroupSegment("Environment");
  let lighting = compileGroupSegment("Lighting");
  let camera = compileGroupSegment("Camera");
  let quality = compileGroupSegment("Quality");
  let nsfw = compileGroupSegment("NSFW");

  let prompt = "";
  if (mode === "headshot") {
    let headshotLayout = `headshot portrait`;
    let elements = [
      headshotLayout,
      fullSubject,
      appearance,
      hair,
      skin,
      "showing head to shoulders, straight front-facing portrait, looking directly into the camera with zero head tilting, perfectly level head",
      "on a solid pure white background",
      "photorealistic photography",
      "realistic camera imperfections",
      camera,
      quality
    ].filter(s => s && s.toString().trim() !== "");
    prompt = elements.join(", ");
  } else if (mode === "character-sheet") {
    let referenceText = "";
    if (imageReferences && imageReferences.useReferenceImage) {
      referenceText = `[Reference uploaded image]`;
    }
    let sheetLayout = `character model sheet, character design sheet, showing front view, side view, and back view of the same character, full-body view, standing straight in a neutral pose`;
    let elements = [
      referenceText,
      sheetLayout,
      fullSubject,
      appearance,
      hair,
      clothing,
      "on a solid pure white background",
      "photorealistic photography",
      "realistic camera imperfections",
      camera,
      quality
    ].filter(s => s && s.toString().trim() !== "");
    prompt = elements.join(", ");
  } else {
    prompt = templateStr
      .replace("{subject}", fullSubject)
      .replace("{appearance}", fullAppearance)
      .replace("{clothing}", clothing)
      .replace("{nsfw}", nsfw)
      .replace("{pose}", pose)
      .replace("{environment}", environment)
      .replace("{lighting}", lighting)
      .replace("{camera}", camera)
      .replace("{quality}", quality);
  }

  // Clean double commas and spaces
  prompt = prompt.replace(/,(\s*,)+/g, ",");
  prompt = prompt.replace(/^\s*,\s*/, "");
  prompt = prompt.replace(/\s*,\s*$/, "");
  prompt = prompt.trim();

  // GPT-Safe Positive Words
  if (isGptSafe && prompt !== "") {
    let positiveWordsList = [];
    Object.values(activeSelections).forEach(selection => {
      if (selection.gptPositiveWords) {
        positiveWordsList.push(...selection.gptPositiveWords);
      }
    });
    positiveWordsList = [...new Set(positiveWordsList)];
    if (positiveWordsList.length > 0) {
      prompt += `, ${positiveWordsList.join(", ")}`;
    }
  }

  // Postfix Aspect Ratio
  if (aspectRatio && prompt !== "") {
    prompt += ` (Image aspect ratio ${aspectRatio})`;
  }

  return prompt;
}
