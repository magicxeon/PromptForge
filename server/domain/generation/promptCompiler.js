import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compileClothingPromptParts } from '../../clothing/clothingPromptParts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TAG_CONFLICT_RULES = [
  ["indoor", "outdoor"],
  ["day", "night"],
  ["summer", "winter"],
  ["modern", "vintage"],
  ["cyberpunk", "traditional"],
  ["smile", "serious"],
  ["smile", "neutral"],
  ["direct gaze", "look away"]
];

function isSceneExpressionSelection(fieldName, selection) {
  return fieldName === "Expression"
    && selection?.group === "Face"
    && selection?.category === "expression";
}

function requestsFullBodyScene(activeSelections, ...fallbackSegments) {
  const fullBodyPattern = /\b(?:full[- ]body|head[- ]to[- ]toe|head[- ]to[- ]feet|complete (?:full )?body)\b/i;
  const framingSelection = activeSelections?.Framing;
  if (framingSelection) {
    return fullBodyPattern.test([
      framingSelection.id,
      framingSelection.value,
      framingSelection.prompt,
      framingSelection.label
    ].filter(Boolean).join(" "));
  }
  return fullBodyPattern.test(fallbackSegments.filter(Boolean).join(" "));
}

function specifiesFootwear(clothingPrompt) {
  return /\b(?:footwear|shoes?|sneakers?|boots?|heels?|loafers?|sandals?|pumps?|flats?|mules?|oxfords?|slippers?|barefoot|bare feet|unshod)\b/i
    .test(clothingPrompt || "");
}

function selectionEvidence(selection) {
  return selection
    ? [selection.id, selection.value, selection.label, ...(selection.tags || [])]
      .join(" ")
      .toLowerCase()
    : "";
}

function isAdultMaleFacialHairSelectionAllowed(selections, presentationOverride = null) {
  const gender = normalizePresentationOverride(presentationOverride)
    || presentationGender(selections);
  if (gender !== "male") {
    return false;
  }
  const age = selectionEvidence(selections?.Age);
  if (!age) return true;
  if (/\b(child|minor|underage)\b/.test(age)) return false;
  const numericAge = age.match(/\b(\d{1,2})\b/)?.[1];
  return !numericAge || Number(numericAge) >= 18;
}

function isAdultPresentation(selections) {
  const age = selections?.Age
    ? [selections.Age.id, selections.Age.value, selections.Age.label, ...(selections.Age.tags || [])]
      .join(" ").toLowerCase()
    : "";
  if (!age) return true;
  if (/\b(child|minor|underage)\b/.test(age)) return false;
  const numericAge = age.match(/\b(\d{1,2})\b/)?.[1];
  return !numericAge || Number(numericAge) >= 18;
}

function presentationGender(selections) {
  const gender = selections?.Gender
    ? [selections.Gender.id, selections.Gender.value, selections.Gender.label, ...(selections.Gender.tags || [])]
      .join(" ").toLowerCase()
    : "";
  if (/\b(female|woman|women)\b/.test(gender)) return "female";
  if (/\b(male|man|men)\b/.test(gender)) return "male";
  return null;
}

function isEarlyTwentiesPresentation(selections) {
  const age = selectionEvidence(selections?.Age);
  return /character\.004_e20|early twenties|20-23|21-year-old|21 years old/.test(age);
}

function normalizeAgeSensitiveBeauty(value, selections) {
  const normalized = String(value || "");
  if (!isEarlyTwentiesPresentation(selections)) return normalized;
  return normalized
    .replace(/mature face exhibiting sophisticated elegance/gi, "refined sophisticated elegance appropriate to an early-twenties adult")
    .replace(/mature sophisticated elegance/gi, "refined sophisticated elegance appropriate to an early-twenties adult");
}

function removeInapplicableSelections(selections, presentationOverride = null) {
  const gender = normalizePresentationOverride(presentationOverride)
    || presentationGender(selections);
  const adult = isAdultPresentation(selections);
  Object.keys(selections).forEach(fieldName => {
    const tags = (selections[fieldName]?.tags || []).map(tag => String(tag).toLowerCase());
    const maleOnly = tags.some(tag => PRESENTATION_TAGS.male.has(tag));
    const femaleOnly = tags.some(tag => PRESENTATION_TAGS.female.has(tag));
    if (
      (maleOnly && (!adult || gender !== "male"))
      || (femaleOnly && (!adult || gender !== "female"))
    ) {
      delete selections[fieldName];
    }
  });
}

const CATEGORY_PRIORITIES = {
  "environment": 100,
  "lighting": 90,
  "camera": 80,
  "clothing": 70,
  "expression": 65,
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
  "Gender": "character", "Age": "character", "Ethnicity": "character", "Beauty": "character", "Fashion Direction": "fashion_direction",
  "Face Shape": "face", "Eyes": "eyes", "Eyebrows": "eyebrows", "Nose": "nose", "Lips": "lips", "Facial Hair": "facial_hair", "Smile": "lips", "Expression": "expression",
  "Length": "hair", "Style": "hair", "Texture": "hair", "Color": "hair", "Bangs": "hair", "Cut / Style": "hair", "Parting / Fringe": "hair", "Finish": "hair",
  "Tone": "skin", "Skin Texture": "skin", "Makeup": "skin", "Freckles": "skin",
  "Height": "body", "Body Shape": "body", "Build": "body", "Hands": "body", "Legs": "body", "Height Impression": "body", "Model Build": "body", "Body Silhouette": "body", "Sheet Layout": "body",
  "Top": "clothing", "Bottom": "clothing", "Dress": "clothing", "Shoes": "clothing", "Accessories": "clothing", "Outfit Base": "clothing", "Outfit Preset": "clothing", "Primary Color": "clothing", "Secondary Color": "clothing", "Pattern": "clothing", "Material": "clothing", "Product Type": "clothing", "Garment Silhouette": "clothing", "Material / Surface": "clothing", "Construction / Detail": "clothing", "Styling": "clothing",
  "Standing": "pose", "Sitting": "pose", "Walking": "pose", "Hand Position": "pose", "Eye Contact": "pose", "Pose Intent": "pose", "Fashion Hand Position": "pose", "Fashion Gaze": "pose",
  "Location": "environment", "Architecture": "environment", "Props": "environment", "Weather": "environment", "Time of Day": "environment", "Season": "environment", "Fashion Venue": "environment", "Set Design": "environment", "Atmosphere": "environment",
  "Key Light": "lighting", "Fill Light": "lighting", "Back Light": "lighting", "Flash": "lighting", "Neon": "lighting", "Ambient": "lighting", "Golden Hour": "lighting", "Lighting Setup": "lighting", "Contrast": "lighting", "Color Temperature": "lighting", "Shadow Character": "lighting", "Lighting Accent": "lighting",
  "Brand": "camera", "Lens": "camera", "Focal Length": "camera", "Aperture": "camera", "Framing": "camera_framing", "ISO": "camera", "White Balance": "camera", "Perspective": "camera", "Composition": "camera", "Motion Blur": "camera",
  "Resolution": "quality", "Sharpness": "quality", "Photorealism": "quality", "Color Grading": "quality", "Film Look": "quality", "Output Frame": "quality",
  "Nudity Level": "nsfw", "Sensual Pose": "nsfw",
  "Context Type": "photo_context", "Story Event": "scene_story", "Fashion Photography Context": "photo_context", "Fashion Story": "scene_story",
  "Foreground Layer": "foreground_layer", "Background Activity": "background_activity", "Camera Imperfections": "camera_imperfections"
};

const FIELD_TO_PROMPT_CATEGORY_MAP = {
  ...FIELD_TO_CATEGORY_MAP,
  "Face Shape": "face_shape"
};

// Load templates and order specs from client directory at runtime
let templates = {};
let promptOrder = [];

try {
  let templatesPath = path.join(__dirname, '../../../client/attributes/spec/prompt-templates.json');
  let orderPath = path.join(__dirname, '../../../client/attributes/spec/prompt-order.json');
  
  if (!fs.existsSync(templatesPath)) {
    templatesPath = path.join(__dirname, '../../attributes/spec/prompt-templates.json');
  }
  if (!fs.existsSync(orderPath)) {
    orderPath = path.join(__dirname, '../../attributes/spec/prompt-order.json');
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

function uniquePromptParts(parts) {
  const seen = new Set();
  return parts.filter(part => {
    const key = String(part || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeIdentityPhrase(value, fieldName) {
  let normalized = String(value || "").trim();
  if (fieldName === "Gender") {
    normalized = normalized
      .replace(/\bfemale woman\b/gi, "female")
      .replace(/\bmale man\b/gi, "male");
  }
  if (fieldName === "Age") {
    normalized = normalized.replace(/,\s*\d{1,3}\s*years?\s*old\b/gi, "");
  }
  return normalized;
}

function normalizeHairPhrase(value) {
  return String(value || "")
    .replace(/long loose waves,\s*beach waves hair,\s*flowing naturally/gi, "long loose wavy hair")
    .replace(/perfectly groomed strands with soft healthy highlights and natural flow/gi, "polished natural hair flow")
    .replace(/soft glossy hair waves,\s*displaying brilliant specular light reflections off healthy luminous waves/gi, "soft glossy waves")
    .replace(/soft glossy texture waves,\s*displaying brilliant specular light reflections off healthy luminous waves/gi, "soft glossy waves")
    .replace(/coarse and thick hair texture,\s*highly detailed individual strands with strong volume and organic feel/gi, "coarse thick texture")
    .replace(/frizzy and voluminous hair texture,\s*with soft flyaways and highly detailed organic curl structures/gi, "frizzy voluminous texture")
    .replace(/\bsilky smooth hair\b/gi, "silky smooth texture")
    .replace(/\bglossy healthy hair\b/gi, "glossy healthy finish")
    .trim();
}

function getHairAdjective(value) {
  return String(value || "").replace(/\s*hair\b/i, "").trim();
}

function compactHairSegment(valuesByField) {
  const length = normalizeHairPhrase(valuesByField["Length"]);
  const legacyStyle = normalizeHairPhrase(valuesByField["Style"]);
  const cutStyle = normalizeHairPhrase(valuesByField["Cut / Style"]);
  const parting = normalizeHairPhrase(valuesByField["Parting / Fringe"]);
  const color = normalizeHairPhrase(valuesByField["Color"]);
  const texture = normalizeHairPhrase(valuesByField["Texture"]);
  const finish = normalizeHairPhrase(valuesByField["Finish"]);
  const lengthAdjective = getHairAdjective(length);
  const colorAdjective = getHairAdjective(color);
  const hasCustomColorDirective =
    /\bbase hair color\b|\bdimensional hair highlights\b/i.test(color);

  let base = cutStyle || legacyStyle || length || "";
  if (length && base && lengthAdjective && !base.toLowerCase().includes(lengthAdjective.toLowerCase())) {
    base = `${length}, ${base}`;
  }
  if (color && base) {
    if (hasCustomColorDirective) {
      base = `${base}, ${color}`;
    } else if (colorAdjective && !base.toLowerCase().includes(colorAdjective.toLowerCase())) {
      if (/\bcrew cut hairstyle\b/i.test(base)) {
        base = base.replace(/\bcrew cut hairstyle\b/i, `${colorAdjective} crew cut hairstyle`);
      } else if (/\bhairstyle\b/i.test(base)) {
        base = base.replace(/\bhairstyle\b/i, `${colorAdjective} hairstyle`);
      } else if (/\bhair\b/i.test(base)) {
        base = base.replace(/\bhair\b/i, `${colorAdjective} hair`);
      } else {
        base = `${base}, ${color}`;
      }
    }
  } else if (color && !base) {
    base = color;
  }

  const textureDetail = texture
    ? texture.replace(/\s*hair\b/i, " texture").replace(/\s*texture\s*texture\b/i, " texture")
    : "";
  const finishDetail = finish
    ? finish.replace(/\s*hair\b/i, " finish").replace(/\s*finish\s*finish\b/i, " finish")
    : "";

  return uniquePromptParts([base, parting, textureDetail, finishDetail].filter(Boolean)).join(", ");
}

function sanitizeHeadshotExpression(value) {
  return String(value || "")
    .replace(/soft daydreaming look,\s*eyes looking slightly away from the camera,\s*/gi, "soft daydreaming look with ")
    .replace(/eyes intently focused on something off-camera with relaxed features/gi, "focused eyes with relaxed facial features")
    .replace(/eyes looking slightly away from the camera/gi, "soft relaxed eyes")
    .replace(/head tilted slightly,\s*/gi, "")
    .replace(/\bsomething off-camera\b/gi, "the camera")
    .replace(/\boff-camera\b/gi, "direct-camera")
    .replace(/\blooking away\b/gi, "looking directly")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .trim();
}

function compactExpressionSegment(valuesByField) {
  const smile = valuesByField["Smile"] || "";
  const expression = sanitizeHeadshotExpression(valuesByField["Expression"] || "");
  const smileLower = smile.toLowerCase();
  const expressionLower = expression.toLowerCase();

  if (expressionLower.includes("subtle warm friendly smile")) {
    return smile && !smileLower.includes("neutral expression")
      ? "subtle friendly expression with soft smile"
      : "subtle friendly expression with relaxed lips";
  }
  if (expression) return expression;
  return sanitizeHeadshotExpression(smile);
}

function compactSkinSegment(valuesByField) {
  const tone = valuesByField["Tone"] || "";
  const texture = valuesByField["Skin Texture"] || "";
  const makeup = valuesByField["Makeup"] || "";
  const freckles = valuesByField["Freckles"] || "";
  const beauty = valuesByField["Beauty"] || "";

  const hasNaturalBeauty = /natural face|natural look|minimal makeup|zero or minimal makeup/i.test(beauty);
  const hasNoMakeup = /no makeup|bare face|natural look/i.test(makeup);
  const hasNaturalTexture = /natural skin texture|visible.*pores|skin pores|fine details/i.test(texture);
  const hasHealthyTexture = /healthy skin complexion|healthy complexion|organic skin details/i.test(texture);

  const parts = [];
  if (tone) parts.push(tone);
  if (hasNoMakeup || hasNaturalBeauty) {
    if (hasNaturalTexture) {
      parts.push("natural bare-face look with realistic skin texture and visible fine pores");
    } else if (hasHealthyTexture) {
      parts.push("natural bare-face look with healthy organic skin details");
    } else {
      parts.push("natural bare-face look with authentic facial details");
    }
  } else if (texture) {
    parts.push(texture);
  }
  if (!hasNoMakeup && makeup) parts.push(makeup);
  if (freckles && !/^even skin with no freckles$/i.test(freckles)) parts.push(freckles);
  return uniquePromptParts(parts).join(", ");
}

function buildCleanPromptSegments(activeSelections, getValue) {
  const valuesByField = {};
  Object.entries(activeSelections).forEach(([fieldName, selection]) => {
    if (selection.isDropped) return;
    const value = getValue(selection, fieldName);
    if (value && value.trim()) valuesByField[fieldName] = value.trim();
  });

  const identity = uniquePromptParts([
    normalizeIdentityPhrase(valuesByField["Gender"], "Gender"),
    normalizeIdentityPhrase(valuesByField["Age"], "Age"),
    normalizeIdentityPhrase(valuesByField["Ethnicity"], "Ethnicity"),
    /natural face|natural look|minimal makeup|zero or minimal makeup/i.test(valuesByField["Beauty"] || "")
      ? ""
      : normalizeAgeSensitiveBeauty(valuesByField["Beauty"], activeSelections),
    isEarlyTwentiesPresentation(activeSelections)
      ? "unmistakably early-twenties adult facial maturity with a smooth youthful forehead, fresh firm skin, minimal natural under-eye definition, and no age-related lines or hollow cheeks"
      : ""
  ].filter(Boolean)).join(", ");

  const faceStructure = valuesByField["Face Shape"] || "";
  const facialFeatures = uniquePromptParts([
    valuesByField["Eyes"],
    valuesByField["Eyebrows"],
    valuesByField["Nose"],
    valuesByField["Lips"],
    valuesByField["Facial Hair"],
    isAdultMaleFacialHairSelectionAllowed(activeSelections) && !valuesByField["Facial Hair"]
      ? "clean-shaven face with no moustache, beard, or stubble"
      : ""
  ].filter(Boolean)).join(", ");

  return {
    identity,
    appearance: uniquePromptParts([
      faceStructure,
      facialFeatures,
      compactExpressionSegment(valuesByField)
    ].filter(Boolean)).join(", "),
    hair: compactHairSegment(valuesByField),
    skin: compactSkinSegment(valuesByField)
  };
}

export function compilePromptOnServer(
  selections,
  aspectRatio,
  imageReferences,
  mode,
  templateName = "portrait",
  isGptSafe = false,
  customColors = null,
  outfitReferenceOverrides = null,
  options = {}
) {
  const templateStr = templates[templateName] || templates["portrait"] || "{subject}, {appearance}, {clothing}, {pose}, {environment}, {lighting}, {camera}, {quality}";
  const additionalDirection = typeof options.additionalDirection === "string"
    && options.additionalDirection.trim()
    ? `Additional creator direction, apply only where compatible with all locked mode, reference, safety, and provider constraints: ${options.additionalDirection.trim()}`
    : "";

  // Clone selections
  const activeSelections = JSON.parse(JSON.stringify(selections));
  delete activeSelections["Reference Image"];
  removeInapplicableSelections(activeSelections, options.presentationGender);
  if (!isAdultMaleFacialHairSelectionAllowed(activeSelections, options.presentationGender)) {
    delete activeSelections["Facial Hair"];
  }
  const referenceOwnsAppearance = mode === "normal"
    && imageReferences?.characterReference
    && !imageReferences?.characterOverrides;
  const characterClothingIsReplaceable = referenceOwnsAppearance
    && options.characterReferenceOutfitBehavior === "replaceable"
    && imageReferences?.outfitReference !== true;
  if (referenceOwnsAppearance) {
    const referenceOwnedGroups = new Set(["Character", "Face", "Hair", "Skin", "Body"]);
    if (!characterClothingIsReplaceable) {
      referenceOwnedGroups.add("Clothing");
    }
    Object.keys(activeSelections).forEach(fieldName => {
      const selection = activeSelections[fieldName];

      if (isSceneExpressionSelection(fieldName, selection)) return;

      if (referenceOwnedGroups.has(selection?.group)) {
        delete activeSelections[fieldName];
      }
    });
  }

  // Dynamically inject selections for active custom color pickers if empty (Step 11)
  if (!referenceOwnsAppearance && customColors && customColors["Color"] && (customColors["Color"].enabled || customColors["Color"].highlightEnabled)) {
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
  ["Top", "Bottom", "Dress", "Shoes", "Product Type", "Primary Color", "Secondary Color"].forEach(field => {
    if ((!referenceOwnsAppearance || characterClothingIsReplaceable) && customColors && customColors[field] && customColors[field].enabled) {
      if (!activeSelections[field]) {
        const isModularColor = field === "Primary Color" || field === "Secondary Color";
        activeSelections[field] = {
          id: isModularColor ? `custom.${field.toLowerCase().replace(/\s+/g, "-")}` : "",
          value: isModularColor ? customColors[field].color : field.toLowerCase(),
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
          if (cfg.enabled && cfg.base) {
            parts.push(`base hair color ${cfg.base}`);
          } else if (baseVal && baseVal.trim() !== "") {
            parts.push(baseVal);
          } else {
            parts.push("hair");
          }
          if (cfg.highlightEnabled && cfg.highlight) {
            parts.push(
              `dimensional hair highlights in ${cfg.highlight}, blended naturally through the hair strands`
            );
          }
          return parts.join(", ");
        }
      } else if (fieldName === "Primary Color" || fieldName === "Secondary Color") {
        if (cfg.enabled && cfg.color) {
          return fieldName === "Primary Color"
            ? `dominant garment tone ${cfg.color}`
            : `coordinating accent garment tone ${cfg.color}, harmonized naturally with the dominant garment tone`;
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
        const expressionSelection = activeSelections["Expression"];
        const expression = isSceneExpressionSelection("Expression", expressionSelection)
          ? getPromptValueWithColor(expressionSelection, "Expression")
          : "";
        return [
          "Preserve the identity of the uploaded person with high consistency while maintaining a completely natural appearance. Keep the same recognizable facial proportions, eye shape, nose, lips, eyebrows, hairstyle, skin tone, facial maturity, and apparent age while allowing only subtle natural variations from expression, camera perspective, lighting, and lens characteristics. Those variations must not invent age-related facial features absent from the reference. Prioritize identity preservation over exact geometric matching.",
          expression
        ].filter(Boolean).join(", ");
      }
    }
    if (groupName.toLowerCase() === "clothing") {
      if (mode === "character-sheet" && imageReferences?.outfitReference) {
        if (imageReferences?.outfitReferenceBack) {
          return "matching the clothing outfit from the uploaded front and back outfit references, preserving garment silhouette, colors, and visible details across all sheet views";
        }
        return "matching the clothing outfit, garment silhouette, colors, and styling from the uploaded front outfit reference, inferring unseen back details naturally";
      }
      if (mode === "normal" && imageReferences?.outfitReference) {
        return "matching the clothing outfit from the uploaded outfit reference, preserving garment silhouette, colors, fabric texture, and visible styling details";
      }
    }
    if (groupName.toLowerCase() === "pose") {
      if (imageReferences && imageReferences.poseMatch) {
        return "preserve the pose and composition intent while adapting naturally to the character's anatomy, outfit, and environment";
      }
    }

    let segmentValues = [];

    // Get order mappings for attributes within this segment
    promptOrder.forEach(fieldId => {
      Object.entries(activeSelections).forEach(([fieldName, selection]) => {
        if (groupName === "Body" && fieldName === "Sheet Layout") return;
        const category = FIELD_TO_PROMPT_CATEGORY_MAP[fieldName] || selection.category || selection.group.toLowerCase();
        const matchesOrder = category.replaceAll("_", "") === fieldId.replaceAll("_", "");
        if (matchesOrder && selection.group.toLowerCase() === groupName.toLowerCase()) {
        const val = getPromptValueWithColor(selection, fieldName);
        if (val && val.trim() !== "" && !selection.isDropped) {
          segmentValues.push(val);
        }
        }
      });
    });

    // Fallback if order rule didn't catch it
    if (segmentValues.length === 0) {
      segmentValues = Object.keys(activeSelections)
        .filter(key => activeSelections[key].group.toLowerCase() === groupName.toLowerCase())
        .filter(key => !(groupName === "Body" && key === "Sheet Layout"))
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

  const getCharacterSheetLayoutSegment = () => {
    if (typeof options.characterSheetLayoutOverride === "string"
      && options.characterSheetLayoutOverride.trim()) {
      return options.characterSheetLayoutOverride.trim();
    }
    const canonicalLayout = [
      "professional full-body character model sheet showing exactly three clearly separated equal views of the same character in one horizontal row",
      "ordered left to right: front view facing directly toward the camera, exact side profile facing toward the viewer right, and back view facing directly away from the camera",
      "in the side profile the face, nose, chest, hips, knees, and toes all point toward the viewer right; keep the head aligned with the torso and never turn it toward the camera or opposite the body",
      "complete head-to-feet figure in every view at the same scale with generous clear margins above the hair and below the feet",
      "unlabeled image only with no text, captions, words, letters, panel titles, arrows, numbers, borders, dividers, logos, or watermark"
    ].join(", ");
    const selectedLayout = getPromptValueWithColor(activeSelections["Sheet Layout"], "Sheet Layout");
    return selectedLayout && selectedLayout.trim() !== ""
      ? `${canonicalLayout}, apply this additional sheet presentation direction: ${selectedLayout}`
      : canonicalLayout;
  };

  // Compile individual templates
  const shouldUsePromptCleanup = mode === "headshot" || mode === "character-sheet";
  const cleanedPromptSegments = shouldUsePromptCleanup
    ? buildCleanPromptSegments(activeSelections, getPromptValueWithColor)
    : null;

  let subject = cleanedPromptSegments ? cleanedPromptSegments.identity : compileGroupSegment("Character");
  let appearance = cleanedPromptSegments
    ? (imageReferences?.faceMatch ? compileGroupSegment("Face") : cleanedPromptSegments.appearance)
    : compileGroupSegment("Face");

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
  let hair = cleanedPromptSegments
    ? cleanedPromptSegments.hair
    : (hairList.length > 0 ? hairList.join(", ") : "");

  let skinList = getSelectionsForGroup("Skin");
  let skin = cleanedPromptSegments
    ? cleanedPromptSegments.skin
    : (skinList.length > 0 ? skinList.join(", ") : "");

  let fullAppearance = [appearance, hair, skin].filter(s => s !== "").join(", ");
  let clothing = mode === "character-sheet"
    ? (options.omitCharacterSheetClothing
      ? ""
      : compileClothingPromptParts(
        activeSelections,
        imageReferences,
        mode,
        outfitReferenceOverrides,
        customColors
      ))
    : compileGroupSegment("Clothing");
  let pose = compileGroupSegment("Pose");
  let fashionDirection = compileGroupSegment("Fashion Direction");
  let photoContext = compileGroupSegment("Photographic Context");
  let sceneStory = compileGroupSegment("Scene Story");
  let sceneContext = [fashionDirection, photoContext, sceneStory].filter(s => s !== "").join(", ");
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
      additionalDirection,
      "showing head to shoulders, straight front-facing portrait, looking directly into the camera with zero head tilting, perfectly level head",
      "on a solid pure white background",
      "photorealistic photography",
      "realistic camera imperfections",
      camera,
      quality
    ].filter(s => s && s.toString().trim() !== "");
    prompt = elements.join(", ");
  } else if (mode === "character-sheet") {
    let sheetLayout = getCharacterSheetLayoutSegment();
    const completeCastingPolicy = typeof options.characterSheetLayoutOverride === "string"
      && options.characterSheetLayoutOverride.trim() !== ""
      && options.omitCharacterSheetClothing === true;
    let elements = (completeCastingPolicy
      ? [
        sheetLayout,
        fullSubject,
        appearance,
        hair,
        skin,
        additionalDirection,
        camera,
        quality
      ]
      : [
        sheetLayout,
        fullSubject,
        appearance,
        hair,
        skin,
        clothing,
        additionalDirection,
        "on a solid pure white background",
        "unlabeled image only, no text, captions, words, letters, panel titles, arrows, numbers, borders, dividers, logos, or watermark",
        "photorealistic photography",
        "realistic camera imperfections",
        camera,
        quality
      ]).filter(s => s && s.toString().trim() !== "");
    prompt = elements.join(", ");
  } else {
    const characterReferenceText = imageReferences?.characterReference
      ? (imageReferences?.characterOverrides
        ? "Preserve the recognizable character identity from the uploaded reference while applying the explicitly selected character styling overrides"
        : (imageReferences?.outfitReference
          ? "Preserve the character identity, skin tone, body proportions, and hairstyle from the uploaded character reference while replacing its clothing with the uploaded outfit reference"
          : options.characterReferenceOutfitBehavior === "replaceable"
            ? "Preserve the character identity, skin tone, body proportions, and hairstyle from the uploaded reusable character reference while replacing any casting uniform visible in that reference with the selected clothing direction"
            : "Preserve the character identity, skin tone, body proportions, hairstyle, and clothing details from the uploaded character reference while adapting only the pose and scene"))
      : "";
    const styleReferenceText = imageReferences?.styleMatch
      ? "Use the style reference only for lighting, palette, contrast, texture, camera or rendering treatment, and visual mood; do not copy its identity, body, pose, garment design, or scene content"
      : "";
    const fullBodyScene = requestsFullBodyScene(activeSelections, pose, camera);
    const fullBodyFramingDirective = fullBodyScene
      ? "For this full-body photograph, keep the complete subject visible from the top of the hair through both feet without cropping the head, hair, hands, arms, legs, ankles, footwear, or any other body part; leave a clear safety margin around the complete silhouette with visible space above the hair, below the feet, and at both sides"
      : "";
    const footwearDirective = fullBodyScene && !specifiesFootwear(clothing)
      ? "If footwear is not otherwise specified by the clothing direction or visibly supplied by an outfit reference, select simple coherent footwear appropriate to the outfit, environment, and action; keep both shoes fully visible and do not add unrelated accessories"
      : "";
    const scenePrompt = templateStr
      .replace("{subject}", fullSubject)
      .replace("{appearance}", fullAppearance)
      .replace("{clothing}", clothing)
      .replace("{nsfw}", nsfw)
      .replace("{pose}", [pose, sceneContext].filter(s => s !== "").join(", "))
      .replace("{environment}", environment)
      .replace("{lighting}", lighting)
      .replace("{camera}", camera)
      .replace("{quality}", quality);
    prompt = [
      characterReferenceText,
      styleReferenceText,
      scenePrompt,
      fullBodyFramingDirective,
      footwearDirective,
      additionalDirection
    ]
      .filter(s => s !== "")
      .join(", ");
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

const PRESENTATION_TAGS = Object.freeze({
  male: new Set(["adult-male", "male-body-silhouette", "outfit-base-male"]),
  female: new Set(["adult-female", "female-body-silhouette", "outfit-base-female"])
});

function normalizePresentationOverride(value) {
  if (value === "female" || value === "male") return value;
  if (value && typeof value === "object"
    && (value.value === "female" || value.value === "male")) {
    return value.value;
  }
  return null;
}
