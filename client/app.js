/**
 * ModelPromptForge - Core Application Script (Redesigned)
 * Dynamically loads schemas, builds the interactive UI, manages selections,
 * compiles prompts in real-time, and handles configuration imports/exports.
 */

const ATTRIBUTE_FILES = [
  '001-character.json',
  '002-face.json',
  '003-eyes.json',
  '004-eyebrows.json',
  '005-nose.json',
  '006-lips.json',
  '007-skin.json',
  '008-hair.json',
  '009-body.json',
  '010-clothing.json',
  '011-pose.json',
  '012-environment.json',
  '013-lighting.json',
  '014-camera.json',
  '015-quality.json',
  '016-nsfw.json',
  '017-photographic-context.json',
  '018-scene-story.json',
  '019-expression.json',
  '020-camera-framing.json',
  '021-accessories.json',
  '022-hair-extra.json',
  '023-architecture.json',
  '024-fashion-commerce.json'
];

// Mapping ui-schema fields to attribute categories
const FIELD_TO_CATEGORY_MAP = {
  "Gender": "character",
  "Age": "character",
  "Ethnicity": "character",
  "Beauty": "character",
  "Fashion Direction": "fashion_direction",
  "Face Shape": "face",
  "Eyes": "eyes",
  "Eyebrows": "eyebrows",
  "Nose": "nose",
  "Lips": "lips",
  "Smile": "lips",
  "Expression": "expression",
  "Length": "hair",
  "Style": "hair",
  "Hair Texture": "hair",
  "Color": "hair",
  "Bangs": "",
  "Cut / Style": "hair",
  "Texture": "hair",
  "Parting / Fringe": "hair",
  "Finish": "hair",
  "Tone": "skin",
  "Skin Texture": "skin",
  "Makeup": "skin",
  "Freckles": "skin",
  "Height": "body",
  "Body Shape": "body",
  "Build": "body",
  "Hands": "body",
  "Legs": "body",
  "Height Impression": "body",
  "Model Build": "body",
  "Body Silhouette": "body",
  "Top": "clothing",
  "Bottom": "clothing",
  "Dress": "clothing",
  "Shoes": "clothing",
  "Accessories": "clothing",
  "Product Type": "clothing",
  "Garment Silhouette": "clothing",
  "Material / Surface": "clothing",
  "Construction / Detail": "clothing",
  "Styling": "clothing",
  "Standing": "pose",
  "Sitting": "pose",
  "Walking": "pose",
  "Hand Position": "pose",
  "Eye Contact": "pose",
  "Pose Intent": "pose",
  "Fashion Hand Position": "pose",
  "Fashion Gaze": "pose",
  "Location": "environment",
  "Architecture": "environment",
  "Props": "environment",
  "Weather": "environment",
  "Time of Day": "environment",
  "Season": "environment",
  "Fashion Venue": "environment",
  "Set Design": "environment",
  "Atmosphere": "environment",
  "Key Light": "lighting",
  "Fill Light": "lighting",
  "Back Light": "lighting",
  "Flash": "lighting",
  "Neon": "lighting",
  "Ambient": "lighting",
  "Golden Hour": "lighting",
  "Lighting Setup": "lighting",
  "Contrast": "lighting",
  "Color Temperature": "lighting",
  "Shadow Character": "lighting",
  "Lighting Accent": "lighting",
  "Brand": "camera",
  "Lens": "camera",
  "Focal Length": "camera",
  "Aperture": "camera",
  "Framing": "camera_framing",
  "ISO": "camera",
  "White Balance": "camera",
  "Perspective": "camera",
  "Composition": "camera",
  "Motion Blur": "camera",
  "Resolution": "quality",
  "Sharpness": "quality",
  "Photorealism": "quality",
  "Color Grading": "quality",
  "Film Look": "quality",
  "Output Frame": "quality",
  "Nudity Level": "nsfw",
  "Sensual Pose": "nsfw",
  "Context Type": "photo_context",
  "Story Event": "scene_story",
  "Fashion Photography Context": "photo_context",
  "Fashion Story": "scene_story",
  "Foreground Layer": "foreground_layer",
  "Background Activity": "background_activity",
  "Camera Imperfections": "camera_imperfections"
};

const FIELD_TO_PROMPT_CATEGORY_MAP = {
  ...FIELD_TO_CATEGORY_MAP,
  "Face Shape": "face_shape"
};

const GENDER_TO_HAIR_PRESENTATION = {
  "character.001": "feminine",
  "character.002": "masculine"
};

const HAIR_CUT_STYLE_PRESENTATION_OPTIONS = {
  feminine: new Set([
    "hair_008",
    "hair_009",
    "hair_010",
    "hair_022",
    "hair_023",
    "hair_024",
    "hair_025",
    "hair_026"
  ]),
  masculine: new Set([
    "hair_029",
    "hair_030",
    "hair_031",
    "hair_032",
    "hair_033",
    "hair_034",
    "hair_035",
    "hair_036"
  ])
};

// Presets are loaded dynamically from server bundle via state.presets

// Unified exclusions declaration
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

const MODE_CATEGORY_POLICY = {
  normal: null,
  headshot: new Set(["Character", "Face", "Hair", "Skin", "Camera", "Lighting", "Quality"]),
  "character-sheet": new Set(["Character", "Face", "Hair", "Skin", "Body", "Clothing", "Camera", "Quality"])
};

// Global App State
const state = {
  schema: null,
  templates: null,
  order: null,
  library: [],
  selections: {},
  lockedFields: new Set(),
  imageReferences: {
    faceMatch: false,
    styleMatch: false,
    poseMatch: false,
    characterReference: false
  },
  faceReferenceImageA: null,
  faceReferenceImageB: null,
  faceReferenceJobIds: [], // array of up to 2 referenced parent job IDs
  styleReferenceImageA: null,
  styleReferenceImageB: null,
  styleReferenceJobIds: [], // array of up to 2 referenced parent job IDs
  characterReferenceImageA: null,
  characterReferenceImageB: null,
  characterReferenceJobIds: [], // same character only; up to 2 source images
  characterReferenceOverrides: false,
  hasInitializedHistoryCollapse: false,
  language: "th",
  aspectRatio: "6:8",
  mode: "normal",
  userRole: "user",
  username: "user_demo",
  activeJobId: null,
  presets: null,
  history: [],
  historyCursor: null,
  historyHasMore: false,
  historyLoading: false,
  historyError: null,
  historyWindowed: false,
  historyAbortController: null,
  collections: [],
  defaultCollectionId: null,
  providerCatalog: null,
  visualAssetManifests: {},
  visualControlFields: {},
  selectedCollectionId: "all",
  lightboxBrowseContext: null,
  lightboxReturnFocus: null,
  collectionMembershipJobId: null,
  pendingCollectionJobId: null,
  customColors: {
    "Color": { enabled: false, base: "#4a3728", highlightEnabled: false, highlight: "#ff00a0" },
    "Top": { enabled: false, color: "#ffffff" },
    "Bottom": { enabled: false, color: "#ffffff" },
    "Dress": { enabled: false, color: "#ffffff" },
    "Shoes": { enabled: false, color: "#ffffff" },
    "Product Type": { enabled: false, color: "#ffffff" }
  }
};

// Retrieve localized label with backward compatibility fallback
function getLocalizedLabel(labelObj) {
  if (typeof labelObj === 'object' && labelObj !== null) {
    return labelObj[state.language] || labelObj['en'] || '';
  }
  return labelObj || '';
}

// Restore selections to the active DOM inputs (Step 8)
function restoreSelectionsToUI() {
  Object.keys(state.selections).forEach(fieldName => {
    const selection = state.selections[fieldName];
    const selectEl = document.querySelector(`.custom-select[data-field="${fieldName}"]`);
    if (selectEl) {
      if (selection.isCustom) {
        selectEl.value = "__custom__";
        const formField = selectEl.closest(".form-field");
        const customInput = formField ? formField.querySelector(".custom-writein-input") : null;
        if (customInput) {
          customInput.value = selection.value;
          customInput.style.display = "block";
        }
      } else {
        const hasMatchingOption = Array.from(selectEl.options).some(option => option.value === selection.id);
        if (!hasMatchingOption) {
          delete state.selections[fieldName];
          const fieldHelp = selectEl.closest(".form-field")?.querySelector(".field-option-help");
          if (fieldHelp) fieldHelp.textContent = "";
          return;
        }
        selectEl.value = selection.id;
      }
      const selectedItem = state.library.find(item => item.id === selection.id);
      const fieldHelp = selectEl.closest(".form-field")?.querySelector(".field-option-help");
      if (fieldHelp) fieldHelp.textContent = getLocalizedLabel(selectedItem?.description);
      updateAccordionSummaryBadges(selection.group);
    }
  });
  syncVisualPickers();
}

// Validate mandatory required fields (Step 8)
function validateForm() {
  // Validate Engine Selectors (Step 12)
  const apiProviderSelect = document.getElementById("api-provider-select");
  const apiSubmodelSelect = document.getElementById("api-submodel-select");

  if (apiProviderSelect && (!apiProviderSelect.value || apiProviderSelect.value.trim() === "")) {
    apiProviderSelect.scrollIntoView({ behavior: "smooth", block: "center" });
    const formField = apiProviderSelect.closest(".form-field");
    if (formField) {
      formField.classList.remove("required-flash");
      void formField.offsetWidth;
      formField.classList.add("required-flash");
      setTimeout(() => {
        formField.classList.remove("required-flash");
      }, 3000);
    }
    apiProviderSelect.focus();
    void AppDialog.alert("Please select both a Provider Engine and a Submodel Version before generating an image.", { title: "Model Required" });
    return false;
  }

  if (apiSubmodelSelect && (!apiSubmodelSelect.value || apiSubmodelSelect.value.trim() === "")) {
    apiSubmodelSelect.scrollIntoView({ behavior: "smooth", block: "center" });
    const formField = apiSubmodelSelect.closest(".form-field");
    if (formField) {
      formField.classList.remove("required-flash");
      void formField.offsetWidth;
      formField.classList.add("required-flash");
      setTimeout(() => {
        formField.classList.remove("required-flash");
      }, 3000);
    }
    apiSubmodelSelect.focus();
    void AppDialog.alert("Please select both a Provider Engine and a Submodel Version before generating an image.", { title: "Model Required" });
    return false;
  }

  const activeModel = getActiveModelConfig();
  if (activeModel) {
    const capabilities = activeModel.capabilities || {};
    const activeReferences = [
      ...(state.imageReferences.faceMatch ? [state.faceReferenceImageA, state.faceReferenceImageB] : []),
      ...((state.mode === "normal" && (state.imageReferences.styleMatch || state.imageReferences.poseMatch))
        ? [state.styleReferenceImageA, state.styleReferenceImageB]
        : []),
      ...(isStoryCharacterReferenceActive() ? [state.characterReferenceImageA, state.characterReferenceImageB] : [])
    ].filter(Boolean);
    const uniqueReferenceCount = new Set(activeReferences).size;
    const maxReferences = Number(capabilities.maxReferenceImages || 0);
    if (uniqueReferenceCount > maxReferences) {
      apiSubmodelSelect.scrollIntoView({ behavior: "smooth", block: "center" });
      void AppDialog.alert(`${getLocalizedLabel(activeModel.displayName)} supports up to ${maxReferences} unique reference images. Please remove ${uniqueReferenceCount - maxReferences} reference image(s).`, { title: "Reference Limit" });
      return false;
    }
    if (Array.isArray(capabilities.aspectRatios) && !capabilities.aspectRatios.includes(state.aspectRatio)) {
      void AppDialog.alert(`${getLocalizedLabel(activeModel.displayName)} does not support aspect ratio ${state.aspectRatio}. Please select another ratio or model.`, { title: "Unsupported Aspect Ratio" });
      return false;
    }
  }

  const required = [
    { field: "Ethnicity", group: "Character" },
    { field: "Gender", group: "Character" }
  ];
  const characterReferenceOwnsIdentity = isStoryCharacterReferenceActive()
    && !state.characterReferenceOverrides;

  for (const req of required) {
    const id = `select-${req.group.toLowerCase()}-${req.field.toLowerCase().replace(/\s+/g, "-")}`;
    const selectEl = document.getElementById(id);
    const isReferenceOwned = req.group === "Character" && characterReferenceOwnsIdentity;

    // A reference-owned or otherwise disabled field is not user-actionable and
    // must never block generation validation.
    if (isReferenceOwned || selectEl?.disabled) continue;

    const isSelected = state.selections[req.field] && state.selections[req.field].value && state.selections[req.field].value.trim() !== "";
    if (!isSelected) {
      if (selectEl) {
        // Expand the accordion parent
        const accordion = selectEl.closest(".accordion");
        if (accordion && !accordion.classList.contains("active")) {
          // Open it
          accordion.classList.add("active");
          const content = accordion.querySelector(".accordion-content");
          if (content) {
            content.style.maxHeight = content.scrollHeight + "px";
          }
        }

        // Smooth scroll to it
        selectEl.scrollIntoView({ behavior: "smooth", block: "center" });

        // Highlight the select wrapper with flashing neon red
        const formField = selectEl.closest(".form-field");
        if (formField) {
          formField.classList.remove("required-flash");
          void formField.offsetWidth; // trigger reflow
          formField.classList.add("required-flash");
          setTimeout(() => {
            formField.classList.remove("required-flash");
          }, 3000);
        }

        // Focus the select input
        selectEl.focus();
      }
      return false; // Validation failed
    }
  }
  return true; // Validation passed
}

// Render Slot Thumbnail Previews in the Docks (Step 9)
function clearFaceReferenceState({ updateUI = true } = {}) {
  state.faceReferenceImageA = null;
  state.faceReferenceImageB = null;
  state.faceReferenceJobIds = [];
  const faceFileInput = document.getElementById("face-match-file");
  if (faceFileInput) faceFileInput.value = "";
  if (updateUI) updateReferencePreviewsUI();
}

function clearCharacterReferenceState({ updateUI = true } = {}) {
  state.characterReferenceImageA = null;
  state.characterReferenceImageB = null;
  state.characterReferenceJobIds = [];
  state.imageReferences.characterReference = false;
  state.characterReferenceOverrides = false;
  const checkbox = document.getElementById("story-use-character-reference");
  const fileInput = document.getElementById("character-reference-file");
  if (checkbox) checkbox.checked = false;
  if (fileInput) fileInput.value = "";
  if (updateUI) {
    updateReferencePreviewsUI();
    refreshReferenceAuthorityUI();
  }
}

function isStoryCharacterReferenceActive() {
  return state.mode === "normal"
    && state.imageReferences.characterReference === true
    && Boolean(state.characterReferenceImageA || state.characterReferenceImageB);
}

function getCharacterSheetSourceOwnership() {
  const selections = getModeCompatibleSelections(state.selections, "character-sheet");
  const hasBodySelection = Object.values(selections).some(selection => selection?.group === "Body");
  const hasClothingSelection = Object.values(selections).some(selection => selection?.group === "Clothing");
  return {
    mode: "character-sheet",
    identity: {
      source: "visual-character-selections",
      label: "Current visual character selections",
      owns: ["gender", "age", "visual heritage", "face", "hair", "skin"]
    },
    body: {
      source: hasBodySelection ? "body-visual-attributes" : "not-selected",
      label: hasBodySelection ? "Body visual attributes" : "Not selected yet",
      owns: ["body silhouette", "proportion"]
    },
    outfit: {
      source: hasClothingSelection ? "outfit-preset-selections" : "character-sheet-baseline",
      label: hasClothingSelection ? "Outfit preset selections" : "Character Sheet Baseline",
      owns: ["outfit"]
    },
    layout: {
      source: "default-front-side-back",
      label: "Front / Side / Back",
      owns: ["sheet layout"]
    }
  };
}

function updateCharacterSheetSourceStatus() {
  const panel = document.getElementById("character-sheet-source-status");
  const summary = document.getElementById("character-sheet-source-summary");
  if (!panel || !summary) return;
  const isActive = state.mode === "character-sheet";
  panel.style.display = isActive ? "block" : "none";
  if (!isActive) return;

  const ownership = getCharacterSheetSourceOwnership();
  summary.textContent = [
    `Identity source: ${ownership.identity.label}`,
    `Body source: ${ownership.body.label}`,
    `Outfit source: ${ownership.outfit.label}`,
    `Sheet layout: ${ownership.layout.label}`
  ].join(" • ");
}

const REFERENCE_OWNED_GROUPS = new Set(["Character", "Face", "Hair", "Skin", "Body", "Clothing"]);
const FACE_MATCH_OWNED_FIELDS = new Set(["Face Shape", "Eyes", "Eyebrows", "Nose", "Lips", "Smile"]);

function applyReferenceAuthorityToSelections(activeSelections) {
  delete activeSelections["Reference Image"];
  if (!isStoryCharacterReferenceActive() || state.characterReferenceOverrides) return;

  Object.keys(activeSelections).forEach(fieldName => {
    if (REFERENCE_OWNED_GROUPS.has(activeSelections[fieldName]?.group)) {
      delete activeSelections[fieldName];
    }
  });
}

function applyCharacterReferenceAuthority() {
  const isReferenceOwned = isStoryCharacterReferenceActive() && !state.characterReferenceOverrides;
  document.querySelectorAll("#form-container .custom-select").forEach(select => {
    const groupName = select.getAttribute("data-group");
    if (!REFERENCE_OWNED_GROUPS.has(groupName)) return;
    const fieldName = select.getAttribute("data-field");
    const formField = select.closest(".form-field");
    select.disabled = isReferenceOwned
      || (state.imageReferences.faceMatch && FACE_MATCH_OWNED_FIELDS.has(fieldName));
    if (formField) formField.classList.toggle("reference-owned", isReferenceOwned);
  });

  const panel = document.getElementById("character-reference-authority");
  const title = document.getElementById("character-reference-authority-title");
  const summary = document.getElementById("character-reference-authority-summary");
  const override = document.getElementById("character-reference-override");
  const overrideLabel = document.getElementById("character-reference-override-label");
  if (panel) panel.classList.toggle("active", isStoryCharacterReferenceActive());
  if (title) title.textContent = state.language === "th" ? "สิทธิ์ควบคุมจากภาพอ้างอิงตัวละคร" : "Character Reference Authority";
  if (summary) {
    summary.textContent = state.language === "th"
      ? (isStoryCharacterReferenceActive()
        ? (state.characterReferenceOverrides
          ? "เปิดการปรับแต่งขั้นสูงอยู่ ความต่อเนื่องของตัวละครอาจลดลง"
          : "กำลังใช้เอกลักษณ์ ทรงผม รูปร่าง และเสื้อผ้าจากภาพอ้างอิงตัวละคร")
        : "ตัวเลือก Character ทำงานตามปกติเนื่องจากยังไม่ได้เลือกภาพอ้างอิงตัวละครใน Story Mode")
      : (isStoryCharacterReferenceActive()
        ? (state.characterReferenceOverrides
          ? "Advanced overrides are active. Identity consistency may be reduced."
          : "Using identity, hair, body, and clothing from Character Reference.")
        : "Character attributes are active because no Story Character Reference is selected.");
  }
  if (overrideLabel) overrideLabel.textContent = state.language === "th" ? "เปิดการปรับ Character ขั้นสูง" : "Enable advanced character overrides";
  if (override) override.checked = state.characterReferenceOverrides;
}

function refreshReferenceAuthorityUI() {
  applyFaceMatchLockout();
  applyCharacterReferenceAuthority();
  syncVisualPickers();
}

function applyFashionDirectionDefaults(directionItem) {
  if (!directionItem?.defaults) return;
  Object.entries(directionItem.defaults).forEach(([fieldName, optionId]) => {
    if (state.selections[fieldName]) return;
    const item = state.library.find(entry => entry.id === optionId && entry.enabled !== false);
    const select = document.querySelector(`.custom-select[data-field="${fieldName}"]`);
    if (!item || !select) return;
    select.value = optionId;
    state.selections[fieldName] = {
      id: item.id,
      value: item.prompt?.["gpt-image"] || item.prompt?.default || getLocalizedLabel(item.label),
      isCustom: false,
      group: select.getAttribute("data-group"),
      category: item.category,
      tags: item.tags || []
    };
    updateAccordionSummaryBadges(select.getAttribute("data-group"));
  });
}

const LEGACY_FASHION_SELECTION_REPLACEMENTS = {
  "scene_story.001": "scene_story.fashion.outfit-reveal",
  "scene_story.002": "scene_story.fashion.lookbook-pause",
  "scene_story.003": "scene_story.fashion.outfit-reveal",
  "scene_story.004": "scene_story.fashion.lookbook-pause",
  "scene_story.005": "scene_story.fashion.lookbook-pause",
  "scene_story.006": "scene_story.fashion.detail-demo",
  "scene_story.007": "scene_story.fashion.outfit-reveal",
  "scene_story.008": "scene_story.fashion.collection-walk",
  "scene_story.009": "scene_story.fashion.lookbook-pause",
  "scene_story.0010": "scene_story.fashion.lookbook-pause",
  "photo_context.001": "photo_context.fashion.creator",
  "photo_context.002": "photo_context.fashion.street-style",
  "photo_context.003": "photo_context.fashion.creator",
  "photo_context.004": "photo_context.fashion.creator",
  "photo_context.005": "photo_context.fashion.creator",
  "photo_context.006": "photo_context.fashion.creator",
  "photo_context.007": "photo_context.fashion.street-style"
};

function migrateFashionSelection(selection, group) {
  if (!selection || selection.isCustom) return selection ? { ...selection, group } : selection;
  const replacementId = LEGACY_FASHION_SELECTION_REPLACEMENTS[selection.id];
  if (!replacementId) return { ...selection, group };
  const replacement = state.library.find(item => item.id === replacementId);
  if (!replacement) return { ...selection, group };
  return {
    ...selection,
    id: replacement.id,
    value: replacement.prompt?.["gpt-image"] || replacement.prompt?.default || getLocalizedLabel(replacement.label),
    group,
    category: replacement.category,
    tags: replacement.tags || []
  };
}

function migrateLegacySelections(selections) {
  const migrated = { ...(selections || {}) };
  delete migrated["Reference Image"];
  if (migrated["Story Event"] && !migrated["Fashion Story"]) {
    migrated["Fashion Story"] = migrateFashionSelection(migrated["Story Event"], "Scene Story");
  }
  if (migrated["Context Type"] && !migrated["Fashion Photography Context"]) {
    migrated["Fashion Photography Context"] = migrateFashionSelection(
      migrated["Context Type"],
      "Photographic Context"
    );
  }
  if (migrated["Fashion Story"]) {
    migrated["Fashion Story"] = migrateFashionSelection(migrated["Fashion Story"], "Scene Story");
  }
  if (migrated["Fashion Photography Context"]) {
    migrated["Fashion Photography Context"] = migrateFashionSelection(
      migrated["Fashion Photography Context"],
      "Photographic Context"
    );
  }
  delete migrated["Story Event"];
  delete migrated["Context Type"];
  return migrated;
}

function enforceModeReferencePolicy({ updateUI = true } = {}) {
  if (state.mode !== "normal") {
    clearCharacterReferenceState({ updateUI });
    state.imageReferences.styleMatch = false;
    state.imageReferences.poseMatch = false;
    const styleCheckbox = document.getElementById("ref-style-match");
    const poseCheckbox = document.getElementById("ref-pose-match");
    if (styleCheckbox) styleCheckbox.checked = false;
    if (poseCheckbox) poseCheckbox.checked = false;
  }
}

function enforceFaceMatchInvariant({ updateUI = true } = {}) {
  const refFace = document.getElementById("ref-face-match");
  const enabled = state.imageReferences.faceMatch === true && refFace?.checked === true;
  if (!enabled) clearFaceReferenceState({ updateUI });
}

function updateReferencePreviewsUI() {
  const faceSlotACard = document.getElementById("face-slot-a-card");
  const faceSlotAImg = document.getElementById("face-slot-a-img");
  const faceSlotBCard = document.getElementById("face-slot-b-card");
  const faceSlotBImg = document.getElementById("face-slot-b-img");

  if (faceSlotACard && faceSlotAImg) {
    if (state.faceReferenceImageA) {
      faceSlotAImg.src = state.faceReferenceImageA.startsWith("data:") ? state.faceReferenceImageA : (state.faceReferenceImageA.startsWith("/outputs/") ? state.faceReferenceImageA : `data:image/png;base64,${state.faceReferenceImageA}`);
      faceSlotACard.style.display = "flex";
    } else {
      faceSlotACard.style.display = "none";
      faceSlotAImg.src = "";
    }
  }

  if (faceSlotBCard && faceSlotBImg) {
    if (state.faceReferenceImageB) {
      faceSlotBImg.src = state.faceReferenceImageB.startsWith("data:") ? state.faceReferenceImageB : (state.faceReferenceImageB.startsWith("/outputs/") ? state.faceReferenceImageB : `data:image/png;base64,${state.faceReferenceImageB}`);
      faceSlotBCard.style.display = "flex";
    } else {
      faceSlotBCard.style.display = "none";
      faceSlotBImg.src = "";
    }
  }

  const characterSlotACard = document.getElementById("character-slot-a-card");
  const characterSlotAImg = document.getElementById("character-slot-a-img");
  const characterSlotBCard = document.getElementById("character-slot-b-card");
  const characterSlotBImg = document.getElementById("character-slot-b-img");

  if (characterSlotACard && characterSlotAImg) {
    if (state.characterReferenceImageA) {
      characterSlotAImg.src = state.characterReferenceImageA.startsWith("data:") ? state.characterReferenceImageA : (state.characterReferenceImageA.startsWith("/outputs/") ? state.characterReferenceImageA : `data:image/png;base64,${state.characterReferenceImageA}`);
      characterSlotACard.style.display = "flex";
    } else {
      characterSlotACard.style.display = "none";
      characterSlotAImg.src = "";
    }
  }

  if (characterSlotBCard && characterSlotBImg) {
    if (state.characterReferenceImageB) {
      characterSlotBImg.src = state.characterReferenceImageB.startsWith("data:") ? state.characterReferenceImageB : (state.characterReferenceImageB.startsWith("/outputs/") ? state.characterReferenceImageB : `data:image/png;base64,${state.characterReferenceImageB}`);
      characterSlotBCard.style.display = "flex";
    } else {
      characterSlotBCard.style.display = "none";
      characterSlotBImg.src = "";
    }
  }

  const styleSlotACard = document.getElementById("style-slot-a-card");
  const styleSlotAImg = document.getElementById("style-slot-a-img");
  const styleSlotBCard = document.getElementById("style-slot-b-card");
  const styleSlotBImg = document.getElementById("style-slot-b-img");

  if (styleSlotACard && styleSlotAImg) {
    if (state.styleReferenceImageA) {
      styleSlotAImg.src = state.styleReferenceImageA.startsWith("data:") ? state.styleReferenceImageA : (state.styleReferenceImageA.startsWith("/outputs/") ? state.styleReferenceImageA : `data:image/png;base64,${state.styleReferenceImageA}`);
      styleSlotACard.style.display = "flex";
    } else {
      styleSlotACard.style.display = "none";
      styleSlotAImg.src = "";
    }
  }

  if (styleSlotBCard && styleSlotBImg) {
    if (state.styleReferenceImageB) {
      styleSlotBImg.src = state.styleReferenceImageB.startsWith("data:") ? state.styleReferenceImageB : (state.styleReferenceImageB.startsWith("/outputs/") ? state.styleReferenceImageB : `data:image/png;base64,${state.styleReferenceImageB}`);
      styleSlotBCard.style.display = "flex";
    } else {
      styleSlotBCard.style.display = "none";
      styleSlotBImg.src = "";
    }
  }
}

// Clean reference image source, resolving full URLs to relative path /outputs/ (Step 9)
function cleanReferenceImageSrc(src) {
  if (!src) return "";
  const idx = src.indexOf("/outputs/");
  if (idx !== -1) {
    return src.substring(idx);
  }
  return src;
}

function uniqueReferenceJobIds(ids) {
  return [...new Set((Array.isArray(ids) ? ids : []).filter(Boolean))].slice(0, 2);
}

// Set reference image slot allocation logic
function assignFaceReference(imageSrc, jobId = null) {
  const cleanedSrc = cleanReferenceImageSrc(imageSrc);
  if (!state.faceReferenceImageA) {
    state.faceReferenceImageA = cleanedSrc;
    if (jobId) state.faceReferenceJobIds[0] = jobId;
  } else if (!state.faceReferenceImageB) {
    state.faceReferenceImageB = cleanedSrc;
    if (jobId) state.faceReferenceJobIds[1] = jobId;
  } else {
    state.faceReferenceImageB = cleanedSrc;
    if (jobId) state.faceReferenceJobIds[1] = jobId;
  }

  const refFaceCheckbox = document.getElementById("ref-face-match");
  if (refFaceCheckbox) {
    refFaceCheckbox.checked = true;
    refFaceCheckbox.dispatchEvent(new Event("change"));
  }
  updateReferencePreviewsUI();
}

function assignStyleReference(imageSrc, jobId = null) {
  const cleanedSrc = cleanReferenceImageSrc(imageSrc);
  if (!state.styleReferenceImageA) {
    state.styleReferenceImageA = cleanedSrc;
    if (jobId) state.styleReferenceJobIds[0] = jobId;
  } else if (!state.styleReferenceImageB) {
    state.styleReferenceImageB = cleanedSrc;
    if (jobId) state.styleReferenceJobIds[1] = jobId;
  } else {
    state.styleReferenceImageB = cleanedSrc;
    if (jobId) state.styleReferenceJobIds[1] = jobId;
  }

  const styleCheckbox = document.getElementById("ref-style-match");
  if (styleCheckbox) {
    styleCheckbox.checked = true;
    styleCheckbox.dispatchEvent(new Event("change"));
  }
  updateReferencePreviewsUI();
}

function assignCharacterReference(imageSrc, jobId = null) {
  if (state.mode !== "normal") return;
  const cleanedSrc = cleanReferenceImageSrc(imageSrc);
  if (!state.characterReferenceImageA) {
    state.characterReferenceImageA = cleanedSrc;
    if (jobId) state.characterReferenceJobIds[0] = jobId;
  } else if (!state.characterReferenceImageB) {
    state.characterReferenceImageB = cleanedSrc;
    if (jobId) state.characterReferenceJobIds[1] = jobId;
  } else {
    state.characterReferenceImageB = cleanedSrc;
    if (jobId) state.characterReferenceJobIds[1] = jobId;
  }
  state.imageReferences.characterReference = true;
  const checkbox = document.getElementById("story-use-character-reference");
  if (checkbox) checkbox.checked = true;
  updateReferencePreviewsUI();
  refreshReferenceAuthorityUI();
  updatePromptPreview();
}

function getActiveProviderConfig() {
  const providerId = document.getElementById("api-provider-select")?.value;
  return state.providerCatalog?.providers?.find(provider => provider.id === providerId) || null;
}

function getActiveModelConfig() {
  const modelId = document.getElementById("api-submodel-select")?.value;
  return getActiveProviderConfig()?.models?.find(model => model.id === modelId) || null;
}

function getSelectedImageResolution() {
  const model = getActiveModelConfig();
  if (!model?.capabilities?.resolutions?.length) return null;
  return document.getElementById("image-resolution-select")?.value || model.defaults?.resolution || null;
}

function getEditablePromptText() {
  if (state.userRole === "admin") {
    const previewBox = document.getElementById("prompt-preview");
    if (previewBox && typeof previewBox.value === "string") {
      return previewBox.value.trim();
    }
  }
  return generatePromptText(true);
}

function getGenerationRequestPayload() {
  const sourceOwnership = state.mode === "character-sheet"
    ? getCharacterSheetSourceOwnership()
    : null;
  const submittedReferenceJobIds = {
    face: state.imageReferences.faceMatch ? uniqueReferenceJobIds(state.faceReferenceJobIds) : [],
    style: state.mode === "normal" && (state.imageReferences.styleMatch || state.imageReferences.poseMatch)
      ? uniqueReferenceJobIds(state.styleReferenceJobIds)
      : [],
    character: isStoryCharacterReferenceActive()
      ? uniqueReferenceJobIds(state.characterReferenceJobIds)
      : []
  };
  return {
    provider: document.getElementById("api-provider-select")?.value || null,
    submodel: document.getElementById("api-submodel-select")?.value || null,
    imageResolution: getSelectedImageResolution(),
    selections: state.selections,
    aspectRatio: state.aspectRatio,
    imageReferences: { ...state.imageReferences, characterOverrides: state.characterReferenceOverrides },
    sourceOwnership,
    mode: state.mode,
    template: document.getElementById("template-select")?.value || "portrait",
    isGptSafe: document.getElementById("toggle-gpt-safe")?.checked === true,
    username: state.username,
    faceReferenceImageA: state.imageReferences.faceMatch ? state.faceReferenceImageA : null,
    faceReferenceImageB: state.imageReferences.faceMatch ? state.faceReferenceImageB : null,
    faceReferenceJobIds: submittedReferenceJobIds.face,
    styleReferenceImageA: state.mode === "normal" && (state.imageReferences.styleMatch || state.imageReferences.poseMatch)
      ? state.styleReferenceImageA : null,
    styleReferenceImageB: state.mode === "normal" && (state.imageReferences.styleMatch || state.imageReferences.poseMatch)
      ? state.styleReferenceImageB : null,
    styleReferenceJobIds: submittedReferenceJobIds.style,
    characterReferenceImageA: isStoryCharacterReferenceActive() ? state.characterReferenceImageA : null,
    characterReferenceImageB: isStoryCharacterReferenceActive() ? state.characterReferenceImageB : null,
    characterReferenceJobIds: submittedReferenceJobIds.character,
    customColors: state.customColors,
    adminPromptOverride: state.userRole === "admin" ? getEditablePromptText() : null
  };
}

function populateProviderList(preferredProvider = null) {
  const providerSelect = document.getElementById("api-provider-select");
  if (!providerSelect) return;
  const previous = preferredProvider || providerSelect.value;
  providerSelect.innerHTML = "";
  (state.providerCatalog?.providers || []).forEach(provider => {
    const option = document.createElement("option");
    option.value = provider.id;
    option.textContent = getLocalizedLabel(provider.displayName);
    providerSelect.appendChild(option);
  });
  const fallback = state.providerCatalog?.defaultProvider || providerSelect.options[0]?.value || "";
  const hasPrevious = (state.providerCatalog?.providers || []).some(provider => provider.id === previous);
  providerSelect.value = hasPrevious ? previous : fallback;
  if (preferredProvider && !hasPrevious) {
    void AppDialog.alert(state.language === "th"
      ? `Provider ${preferredProvider} ไม่พร้อมใช้งาน ระบบเปลี่ยนเป็น Provider เริ่มต้นแล้ว`
      : `Provider ${preferredProvider} is unavailable. The default provider was selected.`, { title: state.language === "th" ? "Provider ไม่พร้อมใช้งาน" : "Provider Unavailable" });
  }
}

// Populate models from the server-owned provider catalog.
function updateSubmodelList(preferredModel = null) {
  const providerSelect = document.getElementById("api-provider-select");
  const submodelSelect = document.getElementById("api-submodel-select");
  if (!submodelSelect || !providerSelect) return;

  const previous = preferredModel || submodelSelect.value;
  submodelSelect.innerHTML = "";
  const provider = getActiveProviderConfig();
  (provider?.models || []).forEach(model => {
    const opt = document.createElement("option");
    opt.value = model.id;
    opt.textContent = getLocalizedLabel(model.displayName);
    submodelSelect.appendChild(opt);
  });

  const hasPrevious = (provider?.models || []).some(model => model.id === previous);
  submodelSelect.value = hasPrevious ? previous : (provider?.defaultModel || submodelSelect.options[0]?.value || "");
  if (preferredModel && !hasPrevious) {
    void AppDialog.alert(state.language === "th"
      ? `Model ${preferredModel} ไม่พร้อมใช้งาน ระบบเปลี่ยนเป็น Model เริ่มต้นแล้ว`
      : `Model ${preferredModel} is unavailable. The default model was selected.`, { title: state.language === "th" ? "Model ไม่พร้อมใช้งาน" : "Model Unavailable" });
  }

  applyModelCapabilityControls();
}

function isGroupAllowedForMode(groupName, mode = state.mode) {
  const policy = MODE_CATEGORY_POLICY[mode];
  if (!policy || !groupName) return true;
  return policy.has(groupName);
}

function pruneSelectionsForMode(selections = state.selections, mode = state.mode) {
  Object.keys(selections || {}).forEach(fieldName => {
    const groupName = selections[fieldName]?.group;
    if (groupName && !isGroupAllowedForMode(groupName, mode)) {
      delete selections[fieldName];
    }
  });
  return selections;
}

function getModeCompatibleSelections(source = state.selections, mode = state.mode) {
  return pruneSelectionsForMode(JSON.parse(JSON.stringify(source || {})), mode);
}

function usesProviderResolutionPreset(model = getActiveModelConfig()) {
  return Array.isArray(model?.capabilities?.resolutions) && model.capabilities.resolutions.length > 0;
}

// Disable or enable references from the selected model capability contract.
function applyModelCapabilityControls() {
  const providerSelect = document.getElementById("api-provider-select");
  const submodelSelect = document.getElementById("api-submodel-select");
  if (!providerSelect || !submodelSelect) return;

  const model = getActiveModelConfig();
  const referencesDisabled = model ? model.capabilities?.imageReferences !== true : true;
  const capabilitySummary = document.getElementById("model-capability-summary");
  if (capabilitySummary) {
    if (!model) {
      capabilitySummary.textContent = "";
    } else {
      const credits = Number(model.estimatedCredits || 1);
      const creditText = state.language === "th"
        ? `${credits} เครดิต`
        : `${credits} credit${credits === 1 ? "" : "s"}`;
      const referenceText = model.capabilities?.imageReferences
        ? (state.language === "th"
          ? `ภาพอ้างอิงสูงสุด ${model.capabilities.maxReferenceImages || 0} ภาพ`
          : `up to ${model.capabilities.maxReferenceImages || 0} references`)
        : (state.language === "th" ? "สร้างจากข้อความเท่านั้น" : "text-to-image only");
      capabilitySummary.textContent = `${creditText} • ${referenceText}`;
    }
  }
  updateAspectRatioCapabilityUI();
  updateImageResolutionControl();

  const refFace = document.getElementById("ref-face-match");
  const refStyle = document.getElementById("ref-style-match");
  const storyCharacterReference = document.getElementById("story-use-character-reference");

  if (referencesDisabled) {
    if (refFace) {
      refFace.checked = false;
      refFace.disabled = true;
      const lbl = refFace.closest(".checkbox-container");
      if (lbl) {
        lbl.style.opacity = "0.35";
        lbl.style.pointerEvents = "none";
      }
    }
    if (refStyle) {
      refStyle.checked = false;
      refStyle.disabled = true;
      const lbl = refStyle.closest(".checkbox-container");
      if (lbl) {
        lbl.style.opacity = "0.35";
        lbl.style.pointerEvents = "none";
      }
    }
    if (storyCharacterReference) {
      storyCharacterReference.checked = false;
      storyCharacterReference.disabled = true;
      const lbl = storyCharacterReference.closest(".checkbox-container");
      if (lbl) {
        lbl.style.opacity = "0.35";
        lbl.style.pointerEvents = "none";
      }
    }

    state.imageReferences.faceMatch = false;
    state.imageReferences.styleMatch = false;
    state.imageReferences.characterReference = false;
    state.characterReferenceOverrides = false;
    state.faceReferenceImageA = null;
    state.faceReferenceImageB = null;
    state.faceReferenceJobIds = [];
    state.styleReferenceImageA = null;
    state.styleReferenceImageB = null;
    state.styleReferenceJobIds = [];
    state.characterReferenceImageA = null;
    state.characterReferenceImageB = null;
    state.characterReferenceJobIds = [];

    const faceUploadContainer = document.getElementById("face-match-upload-container");
    if (faceUploadContainer) faceUploadContainer.style.display = "none";
    const styleUploadContainer = document.getElementById("image-upload-container");
    if (styleUploadContainer) styleUploadContainer.style.display = "none";

    const vpActions = document.getElementById("viewport-loopback-actions");
    if (vpActions) vpActions.style.display = "none";
    const lbActions = document.querySelector(".lightbox-action-row");
    if (lbActions) lbActions.style.display = "none";

    updateReferencePreviewsUI();
    refreshReferenceAuthorityUI();
  } else {
    if (refFace) {
      refFace.disabled = false;
      const lbl = refFace.closest(".checkbox-container");
      if (lbl) {
        lbl.style.opacity = "";
        lbl.style.pointerEvents = "";
      }
    }
    if (refStyle) {
      refStyle.disabled = false;
      const lbl = refStyle.closest(".checkbox-container");
      if (lbl) {
        lbl.style.opacity = "";
        lbl.style.pointerEvents = "";
      }
    }
    if (storyCharacterReference) {
      storyCharacterReference.disabled = false;
      const lbl = storyCharacterReference.closest(".checkbox-container");
      if (lbl) {
        lbl.style.opacity = "";
        lbl.style.pointerEvents = "";
      }
    }

    const vpActions = document.getElementById("viewport-loopback-actions");
    if (vpActions && state.activeJobId) vpActions.style.display = "flex";
    const lbActions = document.querySelector(".lightbox-action-row");
    if (lbActions) lbActions.style.display = "flex";
  }
  updatePromptPreview();
}

function updateImageResolutionControl(preferredResolution = null) {
  const field = document.getElementById("image-resolution-field");
  const select = document.getElementById("image-resolution-select");
  if (!field || !select) return;
  const model = getActiveModelConfig();
  const resolutions = model?.capabilities?.resolutions || [];
  updateDimensionControlsVisibility(model);
  if (resolutions.length === 0) {
    field.style.display = "none";
    select.innerHTML = "";
    return;
  }

  const previous = preferredResolution || select.value;
  select.innerHTML = "";
  resolutions.forEach(resolution => {
    const option = document.createElement("option");
    option.value = resolution;
    option.textContent = resolution.toUpperCase();
    select.appendChild(option);
  });
  select.value = resolutions.includes(previous)
    ? previous
    : (model.defaults?.resolution || resolutions[0]);
  field.style.display = "block";
}

function updateDimensionControlsVisibility(model = getActiveModelConfig()) {
  const hidePixelDimensions = usesProviderResolutionPreset(model);
  const dimensionsField = document.getElementById("pixel-dimensions-field");
  if (dimensionsField) {
    dimensionsField.style.display = hidePixelDimensions ? "none" : "";
    dimensionsField.setAttribute("aria-hidden", String(hidePixelDimensions));
  }
  ["input-width", "input-height"].forEach(id => {
    const field = document.getElementById(id)?.closest(".form-field");
    if (!field) return;
    field.style.display = "";
    field.setAttribute("aria-hidden", String(hidePixelDimensions));
  });
}

function updateAspectRatioCapabilityUI() {
  const supportedRatios = getActiveModelConfig()?.capabilities?.aspectRatios || [];
  document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
    const ratio = chip.getAttribute("data-ratio");
    const supported = supportedRatios.length === 0 || supportedRatios.includes(ratio);
    chip.classList.toggle("model-unsupported", !supported);
    chip.setAttribute("aria-disabled", String(!supported));
    chip.title = supported
      ? ""
      : (state.language === "th"
        ? `โมเดลที่เลือกไม่รองรับอัตราส่วน ${ratio}`
        : `The selected model does not support ${ratio}.`);
  });
}

// Fetch balance from the credits DB
async function updateCredits() {
  try {
    const res = await fetch(`/api/credits?user=${state.username}`);
    const data = await res.json();
    const creditsVal = document.getElementById("credits-value");
    if (creditsVal) creditsVal.textContent = data.credits;
    state.userRole = data.role;

    // Auto switch selector UI value if credentials fetched externally
    const activePill = document.querySelector(`#profile-pill-selector .pill-btn[data-value="${state.username}"]`);
    if (activePill) {
      document.querySelectorAll("#profile-pill-selector .pill-btn").forEach(b => b.classList.remove("active"));
      activePill.classList.add("active");
    }

    updatePromptPreview(); // refresh display
  } catch (err) {
    console.error("Failed to fetch credits:", err);
  }
}

// Helper to randomize presets
function randomizePresetSelections(preset, presetName = "") {
  const selections = JSON.parse(JSON.stringify(preset.selections));

  const expressions = state.library.filter(opt => opt.category === "expression" && opt.enabled !== false);
  if (expressions.length > 0) {
    const randExpr = expressions[Math.floor(Math.random() * expressions.length)];
    selections["Expression"] = { id: randExpr.id, value: randExpr.prompt ? (randExpr.prompt.default) : randExpr.label, isCustom: false, group: "Face" };
  }

  const handPositions = state.library.filter(opt => opt.category === "pose" && opt.subcategory === "Hand Position" && opt.enabled !== false);
  if (handPositions.length > 0) {
    const randHand = handPositions[Math.floor(Math.random() * handPositions.length)];
    selections["Hand Position"] = { id: randHand.id, value: randHand.prompt ? (randHand.prompt.default) : randHand.label, isCustom: false, group: "Pose" };
  }

  const isSittingPreset = !!selections["Sitting"];
  if (isSittingPreset) {
    delete selections["Standing"];
    delete selections["Walking"];
    const sittingPoses = state.library.filter(opt => opt.category === "pose" && opt.subcategory === "Sitting" && opt.enabled !== false);
    if (sittingPoses.length > 0) {
      const randSit = sittingPoses[Math.floor(Math.random() * sittingPoses.length)];
      selections["Sitting"] = { id: randSit.id, value: randSit.prompt ? (randSit.prompt.default) : randSit.label, isCustom: false, group: "Pose" };
    }
  } else {
    delete selections["Sitting"];
    const pickStanding = Math.random() > 0.5;
    if (pickStanding) {
      delete selections["Walking"];
      const standingPoses = state.library.filter(opt => opt.category === "pose" && opt.subcategory === "Standing" && opt.enabled !== false);
      if (standingPoses.length > 0) {
        const randStand = standingPoses[Math.floor(Math.random() * standingPoses.length)];
        selections["Standing"] = { id: randStand.id, value: randStand.prompt ? (randStand.prompt.default) : randStand.label, isCustom: false, group: "Pose" };
      }
    } else {
      delete selections["Standing"];
      const walkingPoses = state.library.filter(opt => opt.category === "pose" && opt.subcategory === "Walking" && opt.enabled !== false);
      if (walkingPoses.length > 0) {
        const randWalk = walkingPoses[Math.floor(Math.random() * walkingPoses.length)];
        selections["Walking"] = { id: randWalk.id, value: randWalk.prompt ? (randWalk.prompt.default) : randWalk.label, isCustom: false, group: "Pose" };
      }
    }
  }

  const framings = state.library.filter(opt => opt.category === "camera_framing" && opt.enabled !== false);
  if (framings.length > 0) {
    const randFraming = framings[Math.floor(Math.random() * framings.length)];
    selections["Framing"] = { id: randFraming.id, value: randFraming.prompt ? (randFraming.prompt.default) : randFraming.label, isCustom: false, group: "Camera" };
  }

  const diningKeywords = ["restaurant", "bar", "cafe", "dining", "mall", "eating", "drink"];
  const isDining = presetName && diningKeywords.some(keyword => presetName.toLowerCase().includes(keyword));
  let allowedForegroundIds = [];
  if (isDining) {
    allowedForegroundIds = ["foreground.001", "foreground.003", "foreground.004"];
  } else {
    allowedForegroundIds = ["foreground.002", "foreground.004"];
  }

  const foregrounds = state.library.filter(opt => opt.category === "foreground_layer" && allowedForegroundIds.includes(opt.id) && opt.enabled !== false);
  if (foregrounds.length > 0) {
    const randFore = foregrounds[Math.floor(Math.random() * foregrounds.length)];
    selections["Foreground Layer"] = { id: randFore.id, value: randFore.prompt ? (randFore.prompt.default) : randFore.label, isCustom: false, group: "Environment" };
  }

  return {
    ...preset,
    selections
  };
}

// Initializers
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  state.isRestoringState = true; // Block any auto-saving during initialization race conditions (Step 12)
  try {
    state.language = localStorage.getItem('model_prompt_forge_language') || state.language;
    const [response, providerResponse] = await Promise.all([
      fetch("/api/attributes/bundle"),
      fetch("/api/providers")
    ]);
    if (!response.ok || !providerResponse.ok) {
      throw new Error(`Server returned HTTP ${!response.ok ? response.status : providerResponse.status}`);
    }
    const bundle = await response.json();
    state.providerCatalog = await providerResponse.json();
    if (!state.providerCatalog?.providers?.length) {
      throw new Error("No configured image providers are available.");
    }

    state.schema = bundle.schema;
    state.templates = bundle.templates;
    state.order = bundle.order;
    state.library = bundle.library;
    state.presets = bundle.presets;
    await loadVisualAssetManifests();

    // Populate templates select
    const templateSelect = document.getElementById("template-select");
    templateSelect.innerHTML = "";
    Object.keys(state.templates).forEach((key, index) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key.charAt(0).toUpperCase() + key.slice(1) + " Layout";
      if (index === 0) option.selected = true;
      templateSelect.appendChild(option);
    });

    renderForm();
    populateProviderList();
    document.querySelectorAll('#language-pill-selector .pill-btn').forEach(button => {
      button.classList.toggle('active', button.getAttribute('data-value') === state.language);
    });
    updateSubmodelList();
    bindEvents();
    initializeCollectionsUI();
    initializeScrollToViewport();
    initializeAutoExpandConfigurator();

    // Restore active mode from localStorage (Step 12)
    const savedMode = localStorage.getItem("model_prompt_forge_active_mode") || "normal";
    state.mode = Object.prototype.hasOwnProperty.call(MODE_CATEGORY_POLICY, savedMode) ? savedMode : "normal";

    // Sync mode chips in DOM
    document.querySelectorAll(".mode-chip").forEach(chip => {
      chip.classList.remove("active");
      if (chip.getAttribute("data-mode") === state.mode) {
        chip.classList.add("active");
      }
    });

    // Restore persisted state for initial mode (Step 12)
    restoreCurrentModeState();

    enforceModeReferencePolicy({ updateUI: false });
    toggleUIForMode();
    updateReferencePreviewsUI();
    updateCredits();

    state.isRestoringState = false; // Safe to auto-save now

    updatePromptPreview();
    await loadCollections();
    loadHistory();
    window.ModelPromptForgeComparisonBridge = {
      getCatalog: () => state.providerCatalog,
      getLanguage: () => state.language,
      getUsername: () => state.username,
      getUserRole: () => state.userRole,
      getGenerationPayload: getGenerationRequestPayload,
      validateForm,
      openLightbox: item => openLightbox(item),
      openCollectionPicker: jobId => openMembershipModal(jobId),
      useAsFaceReference: (imageUrl, jobId) => assignFaceReference(imageUrl, jobId),
      useAsStyleReference: (imageUrl, jobId) => assignStyleReference(imageUrl, jobId),
      useAsCharacterReference: (imageUrl, jobId) => assignCharacterReference(imageUrl, jobId),
      refreshCredits: updateCredits,
      refreshHistory: loadHistory,
      refreshCollections: loadCollections,
      getCollections: () => state.collections,
      getHistory: () => state.history
    };
    window.dispatchEvent(new CustomEvent('modelpromptforge:ready'));

  } catch (error) {
    console.error("Initialization failed:", error);
    const container = document.getElementById("form-container");
    container.innerHTML = `
      <div style="color: var(--neon-pink); padding: 2rem; text-align: center;">
        <h3>Failed to load application data</h3>
        <p style="color: var(--text-muted); margin-top: 0.5rem; font-weight: bold;">Error: ${error.message}</p>
      </div>
    `;
  }
}

// Render Accordions on Left Panel
function renderForm() {
  const container = document.getElementById("form-container");
  container.innerHTML = "";

  state.schema.forEach((groupObj, groupIdx) => {
    const groupName = groupObj.group;
    const isNsfwGroup = groupName.toLowerCase() === "nsfw";

    const accordion = document.createElement("div");
    accordion.className = "accordion";
    accordion.id = `accordion-${groupName.toLowerCase().replace(/\s+/g, "-")}`;
    accordion.dataset.groupName = groupName;
    if (groupIdx === 0) accordion.classList.add("active");
    if (isNsfwGroup) {
      accordion.style.display = "none";
      accordion.setAttribute("data-nsfw-controlled", "true");
    }

    const header = document.createElement("div");
    header.className = "accordion-header";

    const titleArea = document.createElement("div");
    titleArea.className = "accordion-title";
    titleArea.innerHTML = `<span>${groupName}</span>`;

    const badge = document.createElement("span");
    badge.className = "accordion-badge";
    badge.style.display = "none";
    badge.id = `badge-${groupName.toLowerCase().replace(/\s+/g, "-")}`;
    titleArea.appendChild(badge);

    const arrow = document.createElement("span");
    arrow.className = "accordion-arrow";
    arrow.textContent = "▼";

    header.appendChild(titleArea);
    header.appendChild(arrow);
    accordion.appendChild(header);

    const content = document.createElement("div");
    content.className = "accordion-content";

    const inner = document.createElement("div");
    inner.className = "accordion-inner";

    groupObj.fields.forEach(field => {
      const fieldDiv = document.createElement("div");
      fieldDiv.className = "form-field";

      const label = document.createElement("label");
      label.textContent = field.name;
      fieldDiv.appendChild(label);

      const inputRow = document.createElement("div");
      inputRow.className = "field-input-row";

      const selectWrapper = document.createElement("div");
      selectWrapper.className = "select-wrapper";

      const select = document.createElement("select");
      select.className = "custom-select";
      select.id = `select-${groupName.toLowerCase()}-${field.name.toLowerCase().replace(/\s+/g, "-")}`;
      select.setAttribute("data-field", field.name);
      select.setAttribute("data-group", groupName);

      const category = FIELD_TO_CATEGORY_MAP[field.name] || groupName.toLowerCase();
      const filteredOptions = getOptionsForField(field.name, category, state.library);

      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = `-- Select ${field.name} --`;
      select.appendChild(defaultOpt);

      filteredOptions.forEach(opt => {
        if (opt.enabled === false) return;
        const optionNode = document.createElement("option");
        optionNode.value = opt.id;

        const resolvedLabel = getLocalizedLabel(opt.label);
        optionNode.setAttribute("data-prompt", opt.prompt ? (opt.prompt["gpt-image"] || opt.prompt.default) : resolvedLabel);

        const optLabel = resolvedLabel.toLowerCase();
        const optTags = (opt.tags || []).map(t => t.toLowerCase());
        // const isAsian = optTags.includes("asian") || optTags.includes("thai") || optTags.includes("korean") || optTags.includes("japanese") || optTags.includes("chinese") ||
        //   optLabel.includes("asian") || optLabel.includes("thai") || optLabel.includes("korean") || optLabel.includes("japanese") || optLabel.includes("chinese") ||
        //   optLabel.includes("qipao") || optLabel.includes("sabai") || optLabel.includes("yukata") || optLabel.includes("kimono");

        // if (isAsian) {
        //   optionNode.textContent = `🏮 ${resolvedLabel}`;
        //   optionNode.style.color = "#06b6d4";
        //   optionNode.style.fontWeight = "600";
        //   optionNode.className = "asian-option";
        // } else {
        optionNode.textContent = resolvedLabel;
        // }

        optionNode.setAttribute("data-original-text", optionNode.textContent);
        optionNode.setAttribute("data-description", getLocalizedLabel(opt.description));
        select.appendChild(optionNode);
      });

      const customOpt = document.createElement("option");
      customOpt.value = "__custom__";
      customOpt.textContent = "Custom (Write-in)...";
      select.appendChild(customOpt);

      selectWrapper.appendChild(select);

      const lockLabel = document.createElement("label");
      lockLabel.className = "lock-checkbox-btn";
      lockLabel.title = "Lock attribute on Randomize";

      const lockInput = document.createElement("input");
      lockInput.type = "checkbox";
      lockInput.className = "lock-input";
      lockInput.setAttribute("data-field", field.name);
      lockInput.addEventListener("change", (e) => {
        if (e.target.checked) {
          state.lockedFields.add(field.name);
          fieldDiv.classList.add("is-locked");
        } else {
          state.lockedFields.delete(field.name);
          fieldDiv.classList.remove("is-locked");
        }
      });

      const lockIcon = document.createElement("span");
      lockIcon.className = "lock-icon";
      lockIcon.textContent = "🔓";

      lockLabel.appendChild(lockInput);
      lockLabel.appendChild(lockIcon);

      inputRow.appendChild(selectWrapper);
      inputRow.appendChild(lockLabel);
      fieldDiv.appendChild(inputRow);

      const customInput = document.createElement("input");
      customInput.type = "text";
      customInput.className = "custom-writein-input";
      customInput.placeholder = `Type custom ${field.name.toLowerCase()} here...`;
      customInput.style.display = "none";
      customInput.id = `custom-input-${groupName.toLowerCase()}-${field.name.toLowerCase().replace(/\s+/g, "-")}`;
      fieldDiv.appendChild(customInput);

      const fieldHelp = document.createElement("small");
      fieldHelp.className = "field-option-help";
      fieldHelp.setAttribute("aria-live", "polite");
      fieldDiv.appendChild(fieldHelp);

      const visualPicker = createVisualOptionPicker(groupName, field.name, select, filteredOptions);
      if (visualPicker) {
        fieldDiv.classList.add("has-visual-options");
        selectWrapper.classList.add("visual-option-select-fallback");
        fieldDiv.appendChild(visualPicker);
      }

      // Render color pickers for specified fields (Step 11)
      const colorPickerFields = ["Color", "Top", "Bottom", "Dress", "Shoes", "Product Type"];
      if (colorPickerFields.includes(field.name) && (field.name !== "Color" || groupName === "Hair")) {
        const pickerRow = document.createElement("div");
        pickerRow.className = "custom-color-picker-row";
        pickerRow.id = `color-picker-row-${groupName.toLowerCase()}-${field.name.toLowerCase().replace(/\s+/g, "-")}`;

        if (field.name === "Color" && groupName === "Hair") {
          // Base Hair Color Picker Container
          const baseContainer = document.createElement("div");
          baseContainer.className = "custom-color-picker-container";

          const baseToggle = document.createElement("input");
          baseToggle.type = "checkbox";
          baseToggle.id = `hair-base-toggle`;
          baseToggle.checked = state.customColors["Color"].enabled;

          const baseLabel = document.createElement("label");
          baseLabel.htmlFor = `hair-base-toggle`;
          baseLabel.textContent = "🎨 Custom Base:";

          const baseInput = document.createElement("input");
          baseInput.type = "color";
          baseInput.id = `hair-base-input`;
          baseInput.value = state.customColors["Color"].base;
          baseInput.disabled = !baseToggle.checked;

          baseToggle.addEventListener("change", (e) => {
            state.customColors["Color"].enabled = e.target.checked;
            baseInput.disabled = !e.target.checked;
            updatePromptPreview();
          });

          baseInput.addEventListener("input", (e) => {
            state.customColors["Color"].base = e.target.value;
            updatePromptPreview();
          });

          baseContainer.appendChild(baseToggle);
          baseContainer.appendChild(baseLabel);
          baseContainer.appendChild(baseInput);
          pickerRow.appendChild(baseContainer);

          // Highlight Hair Color Picker Container
          const highlightContainer = document.createElement("div");
          highlightContainer.className = "custom-color-picker-container";
          highlightContainer.style.marginLeft = "1rem";

          const highlightToggle = document.createElement("input");
          highlightToggle.type = "checkbox";
          highlightToggle.id = `hair-highlight-toggle`;
          highlightToggle.checked = state.customColors["Color"].highlightEnabled;

          const highlightLabel = document.createElement("label");
          highlightLabel.htmlFor = `hair-highlight-toggle`;
          highlightLabel.textContent = "✨ Highlight Accent:";

          const highlightInput = document.createElement("input");
          highlightInput.type = "color";
          highlightInput.id = `hair-highlight-input`;
          highlightInput.value = state.customColors["Color"].highlight;
          highlightInput.disabled = !highlightToggle.checked;

          highlightToggle.addEventListener("change", (e) => {
            state.customColors["Color"].highlightEnabled = e.target.checked;
            highlightInput.disabled = !e.target.checked;
            updatePromptPreview();
          });

          highlightInput.addEventListener("input", (e) => {
            state.customColors["Color"].highlight = e.target.value;
            updatePromptPreview();
          });

          highlightContainer.appendChild(highlightToggle);
          highlightContainer.appendChild(highlightLabel);
          highlightContainer.appendChild(highlightInput);
          pickerRow.appendChild(highlightContainer);
        } else {
          // Clothing Color Picker (Top, Bottom, Dress, Shoes)
          const clothingContainer = document.createElement("div");
          clothingContainer.className = "custom-color-picker-container";

          const clothingToggle = document.createElement("input");
          clothingToggle.type = "checkbox";
          const clothingFieldSlug = field.name.toLowerCase().replace(/\s+/g, "-");
          clothingToggle.id = `clothing-toggle-${clothingFieldSlug}`;
          clothingToggle.checked = state.customColors[field.name].enabled;

          const clothingLabel = document.createElement("label");
          clothingLabel.htmlFor = `clothing-toggle-${clothingFieldSlug}`;
          clothingLabel.textContent = `🎨 Custom ${field.name} Color:`;

          const clothingInput = document.createElement("input");
          clothingInput.type = "color";
          clothingInput.id = `clothing-input-${clothingFieldSlug}`;
          clothingInput.value = state.customColors[field.name].color;
          clothingInput.disabled = !clothingToggle.checked;

          clothingToggle.addEventListener("change", (e) => {
            state.customColors[field.name].enabled = e.target.checked;
            clothingInput.disabled = !e.target.checked;
            updatePromptPreview();
          });

          clothingInput.addEventListener("input", (e) => {
            state.customColors[field.name].color = e.target.value;
            updatePromptPreview();
          });

          clothingContainer.appendChild(clothingToggle);
          clothingContainer.appendChild(clothingLabel);
          clothingContainer.appendChild(clothingInput);
          pickerRow.appendChild(clothingContainer);
        }

        fieldDiv.appendChild(pickerRow);
      }

      inner.appendChild(fieldDiv);
    });

    if (groupName === "Character") {
      const authorityPanel = document.createElement("div");
      authorityPanel.id = "character-reference-authority";
      authorityPanel.className = "reference-authority-panel";
      authorityPanel.innerHTML = `
        <strong id="character-reference-authority-title">Character Reference Authority</strong>
        <span id="character-reference-authority-summary">Character attributes are active because no Story Character Reference is selected.</span>
        <label class="reference-override-control">
          <input type="checkbox" id="character-reference-override">
          <span id="character-reference-override-label">Enable advanced character overrides</span>
        </label>
      `;
      inner.appendChild(authorityPanel);
    }

    content.appendChild(inner);
    accordion.appendChild(content);
    container.appendChild(accordion);
  });
}

// Logic Helper: Filter attributes
function getSelectedHairPresentation() {
  const selectedGenderId = state.selections?.Gender?.id;
  return GENDER_TO_HAIR_PRESENTATION[selectedGenderId] || null;
}

function filterHairCutStyleByPresentation(options) {
  const presentation = getSelectedHairPresentation();
  const allowed = HAIR_CUT_STYLE_PRESENTATION_OPTIONS[presentation];
  if (!allowed) return options;

  return options.filter(item => allowed.has(item.id));
}

function clearInvalidHairCutStyleSelection() {
  const current = state.selections["Cut / Style"];
  if (!current?.id) return;

  const validHairStyles = getOptionsForField("Cut / Style", "hair", state.library);
  if (!validHairStyles.some(item => item.id === current.id)) {
    delete state.selections["Cut / Style"];
  }
}

function getOptionsForField(fieldName, category, allItems) {
  const items = allItems.filter(item => {
    if (item.category === "nsfw" && category !== "nsfw") return false;
    return item.category === category;
  });
  const lowerField = fieldName.toLowerCase();
  const subcategoryAliases = {
    "cut / style": "style",
    "texture": "hair texture",
    "parting / fringe": "bangs"
  };
  const matchedSubcategory = subcategoryAliases[lowerField] || lowerField;

  const itemsWithSubcat = items.filter(item => item.subcategory);
  const hasSubcategory = itemsWithSubcat.length > 0 && (itemsWithSubcat.length / items.length) > 0.5;
  if (hasSubcategory) {
    const matched = items.filter(item => item.subcategory && item.subcategory.toLowerCase() === matchedSubcategory);
    if (matched.length > 0) {
      if (category === "hair" && lowerField === "cut / style") {
        return filterHairCutStyleByPresentation(matched);
      }
      return matched;
    }
  }

  const getEngLabel = (item) => {
    const label = item.label;
    if (typeof label === 'object' && label !== null) {
      return (label.en || label.th || '').toLowerCase();
    }
    return (label || '').toLowerCase();
  };

  if (category === "face") {
    if (lowerField === "face shape") {
      return items.filter(item => {
        const lbl = getEngLabel(item);
        return !lbl.includes("expression") && !lbl.includes("details") && !lbl.includes("match");
      });
    }
    if (lowerField === "expression") {
      return items.filter(item => {
        const lbl = getEngLabel(item);
        return lbl.includes("expression") || lbl.includes("details") || lbl.includes("gaze");
      });
    }
    return items;
  }

  if (category === "lips") {
    if (lowerField === "smile") {
      return items.filter(item => {
        const lbl = getEngLabel(item);
        return lbl.includes("smile") || lbl.includes("expression");
      });
    }
    return items.filter(item => {
      const lbl = getEngLabel(item);
      return !lbl.includes("smile");
    });
  }

  return items;
}

async function loadVisualAssetManifests() {
  const controls = window.ModelPromptForgeVisualOptionControls;
  if (!controls) {
    console.warn("Visual option controls module is not loaded.");
    state.visualControlFields = {};
    state.visualAssetManifests = {};
    return;
  }
  const result = await controls.loadManifests();
  state.visualControlFields = result.fieldsByKey;
  state.visualAssetManifests = result.manifestsByKey;
}

function createVisualOptionPicker(groupName, fieldName, select, filteredOptions) {
  return window.ModelPromptForgeVisualOptionControls?.createVisualOptionPicker({
    groupName,
    fieldName,
    select,
    filteredOptions,
    manifestsByKey: state.visualAssetManifests,
    fieldsByKey: state.visualControlFields,
    language: state.language,
    getLocalizedLabel
  }) || null;
}

function syncVisualPickers() {
  window.ModelPromptForgeVisualOptionControls?.syncVisualPickers(document);
}

function rerenderDynamicForm({ preserveOpenAccordions = true } = {}) {
  const openAccordionIds = preserveOpenAccordions
    ? [...document.querySelectorAll("#form-container .accordion.active")]
      .map(accordion => accordion.id)
      .filter(Boolean)
    : [];

  renderForm();
  bindDynamicFormEvents();
  restoreSelectionsToUI();
  openAccordionIds.forEach(id => document.getElementById(id)?.classList.add("active"));
  updateColorPickerUI();
  enforceModeReferencePolicy({ updateUI: false });
  toggleUIForMode();
  refreshReferenceAuthorityUI();
  updateReferencePreviewsUI();
}

function bindDynamicFormEvents() {
  // Accordion Toggle Headers
  document.querySelectorAll(".accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      const accordion = header.parentElement;
      const isActive = accordion.classList.contains("active");
      document.querySelectorAll(".accordion").forEach(acc => acc.classList.remove("active"));
      if (!isActive) {
        accordion.classList.add("active");
        requestAnimationFrame(() => {
          accordion.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
        });
      }
    });
  });

  // Dropdown Select Inputs
  document.querySelectorAll("#form-container .custom-select").forEach(select => {
    const fieldName = select.getAttribute("data-field");
    const groupName = select.getAttribute("data-group");
    const customInput = select.closest(".form-field").querySelector(".custom-writein-input");

    select.addEventListener("change", (e) => {
      const val = e.target.value;

      if (val === "__custom__") {
        customInput.style.display = "block";
        customInput.focus();
        state.selections[fieldName] = {
          id: "__custom__",
          value: customInput.value,
          isCustom: true,
          group: groupName,
          category: FIELD_TO_CATEGORY_MAP[fieldName] || groupName.toLowerCase(),
          tags: []
        };
      } else {
        customInput.style.display = "none";
        if (val === "") {
          delete state.selections[fieldName];
          const fieldHelp = select.closest(".form-field")?.querySelector(".field-option-help");
          if (fieldHelp) fieldHelp.textContent = "";
        } else {
          const selectedOption = e.target.options[e.target.selectedIndex];
          const promptVal = selectedOption.getAttribute("data-prompt");
          const libItem = state.library.find(item => item.id === val);

          state.selections[fieldName] = {
            id: val,
            value: promptVal,
            isCustom: false,
            group: groupName,
            category: libItem ? libItem.category : (FIELD_TO_CATEGORY_MAP[fieldName] || groupName.toLowerCase()),
            tags: libItem ? (libItem.tags || []) : [],
            gptPositiveWords: libItem && libItem.prompt && libItem.prompt["gpt-image-positive"] ? libItem.prompt["gpt-image-positive"].split(",").map(w => w.trim()) : []
          };
          const fieldHelp = select.closest(".form-field")?.querySelector(".field-option-help");
          if (fieldHelp) fieldHelp.textContent = getLocalizedLabel(libItem?.description);
          if (fieldName === "Fashion Direction") applyFashionDirectionDefaults(libItem);
          enforceExclusionRules(val);
        }
      }

      if (fieldName === "Gender") {
        clearInvalidHairCutStyleSelection();
      }
      updateAccordionSummaryBadges(groupName);
      updatePromptPreview();
      if (fieldName === "Gender") {
        rerenderDynamicForm();
        updatePromptPreview();
        return;
      }
      syncVisualPickers();
    });

    customInput.addEventListener("input", (e) => {
      if (select.value === "__custom__") {
        state.selections[fieldName] = {
          id: "__custom__",
          value: e.target.value,
          isCustom: true,
          group: groupName,
          category: FIELD_TO_CATEGORY_MAP[fieldName] || groupName.toLowerCase(),
          tags: []
        };
        updateAccordionSummaryBadges(groupName);
        updatePromptPreview();
      }
    });
  });

  const characterOverride = document.getElementById("character-reference-override");
  if (characterOverride) {
    characterOverride.addEventListener("change", event => {
      state.characterReferenceOverrides = event.target.checked;
      refreshReferenceAuthorityUI();
      updatePromptPreview();
    });
  }
}

// Bind event listeners
function bindEvents() {
  bindDynamicFormEvents();

  // Template select
  document.getElementById("template-select").addEventListener("change", () => {
    updatePromptPreview();
  });

  // Dynamic Submodels loading based on API Engine switch
  const apiProviderSelect = document.getElementById("api-provider-select");
  const apiSubmodelSelect = document.getElementById("api-submodel-select");
  if (apiProviderSelect) {
    apiProviderSelect.addEventListener("change", () => {
      updateSubmodelList();
    });
  }
  if (apiSubmodelSelect) {
    apiSubmodelSelect.addEventListener("change", () => {
      applyModelCapabilityControls();
    });
  }
  const imageResolutionSelect = document.getElementById("image-resolution-select");
  if (imageResolutionSelect) {
    imageResolutionSelect.addEventListener("change", updatePromptPreview);
  }

  // Aspect Ratio Chips & Linked Dimensions
  const aspectChips = document.querySelectorAll("#aspect-ratio-group .option-chip");
  const inputWidth = document.getElementById("input-width");
  const inputHeight = document.getElementById("input-height");

  const updateDimensionsForRatio = (ratio) => {
    if (!inputWidth || !inputHeight) return;
    const defaults = {
      "1:1": [1024, 1024],
      "16:9": [1920, 1080],
      "9:16": [1080, 1920],
      "6:8": [768, 1024],
      "4:5": [1024, 1280]
    };
    const dims = defaults[ratio] || [768, 1024];
    inputWidth.value = dims[0];
    inputHeight.value = dims[1];
  };

  aspectChips.forEach(chip => {
    chip.addEventListener("click", () => {
      if (chip.getAttribute("aria-disabled") === "true") {
        void AppDialog.alert(chip.title || "The selected model does not support this aspect ratio.", { title: "Unsupported Aspect Ratio" });
        return;
      }
      aspectChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.aspectRatio = chip.getAttribute("data-ratio");
      updateDimensionsForRatio(state.aspectRatio);
      updatePromptPreview();
    });
  });

  // Handle width/height linked input modifications
  const handleDimensionInput = (changedField) => {
    if (!inputWidth || !inputHeight) return;
    let width = parseInt(inputWidth.value, 10) || 768;
    let height = parseInt(inputHeight.value, 10) || 1024;

    const parts = state.aspectRatio.split(":").map(Number);
    const ratio = parts[0] / parts[1];

    if (changedField === "width") {
      height = Math.round(width / ratio);
      height = Math.round(height / 8) * 8;
      if (height < 720) height = 720;
      if (height > 4096) height = 4096;
      inputHeight.value = height;
    } else {
      width = Math.round(height * ratio);
      width = Math.round(width / 8) * 8;
      if (width < 720) width = 720;
      if (width > 4096) width = 4096;
      inputWidth.value = width;
    }
  };

  if (inputWidth) {
    inputWidth.addEventListener("input", () => handleDimensionInput("width"));
  }
  if (inputHeight) {
    inputHeight.addEventListener("input", () => handleDimensionInput("height"));
  }

  // Preset selector load button
  const btnLoadPreset = document.getElementById("btn-load-preset");
  if (btnLoadPreset) {
    btnLoadPreset.addEventListener("click", () => {
      const presetSelect = document.getElementById("preset-select");
      const presetName = presetSelect ? presetSelect.value : "";
      if (!presetName) return;
      // Presets are loaded dynamically from server bundle via state.presets ? state.presets[presetName] : null;
      const preset = state.presets ? state.presets[presetName] : null;
      if (preset) {
        const randomizedPreset = randomizePresetSelections(preset, presetName);
        importConfigJSON(JSON.stringify(randomizedPreset));
      }
    });
  }

  // Image Reference Checkboxes & File uploads (Step 9)
  const refFace = document.getElementById("ref-face-match");
  const refStyle = document.getElementById("ref-style-match");
  const refPose = document.getElementById("ref-pose-match");
  const faceUploadContainer = document.getElementById("face-match-upload-container");
  const faceFileInput = document.getElementById("face-match-file");
  const btnClearFace = document.getElementById("btn-clear-face-match");

  const updateRefState = () => {
    state.imageReferences.faceMatch = refFace.checked;
    state.imageReferences.styleMatch = refStyle.checked;
    state.imageReferences.poseMatch = refPose.checked;

    if (faceUploadContainer) {
      faceUploadContainer.style.display = refFace.checked ? "block" : "none";
    }
    if (!refFace.checked) {
      clearFaceReferenceState();
    }

    refreshReferenceAuthorityUI();
    updatePromptPreview();
  };

  refFace.addEventListener("change", updateRefState);
  refStyle.addEventListener("change", updateRefState);
  refPose.addEventListener("change", updateRefState);

  const storyCharacterReference = document.getElementById("story-use-character-reference");
  const characterReferenceFile = document.getElementById("character-reference-file");
  const btnClearCharacterReference = document.getElementById("btn-clear-character-reference");
  if (storyCharacterReference) {
    storyCharacterReference.addEventListener("change", () => {
      state.imageReferences.characterReference = storyCharacterReference.checked && state.mode === "normal";
      if (!state.imageReferences.characterReference) {
        clearCharacterReferenceState();
      }
      refreshReferenceAuthorityUI();
      updatePromptPreview();
    });
  }

  if (characterReferenceFile) {
    characterReferenceFile.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file || state.mode !== "normal") return;
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const base64 = loadEvent.target.result.split(',')[1];
        if (!state.characterReferenceImageA) {
          state.characterReferenceImageA = base64;
          state.characterReferenceJobIds[0] = null;
        } else {
          state.characterReferenceImageB = base64;
          state.characterReferenceJobIds[1] = null;
        }
        storyCharacterReference.checked = true;
        state.imageReferences.characterReference = true;
        characterReferenceFile.value = "";
        updateReferencePreviewsUI();
        refreshReferenceAuthorityUI();
        updatePromptPreview();
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnClearCharacterReference) {
    btnClearCharacterReference.addEventListener("click", () => {
      clearCharacterReferenceState();
      updatePromptPreview();
    });
  }

  // Handle slot close/clear button clicks (Step 9)
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-clear-slot")) {
      const slot = e.target.getAttribute("data-slot");
      if (slot === "faceA") {
        state.faceReferenceImageA = null;
        state.faceReferenceJobIds[0] = null;
      } else if (slot === "faceB") {
        state.faceReferenceImageB = null;
        state.faceReferenceJobIds[1] = null;
      } else if (slot === "styleA") {
        state.styleReferenceImageA = null;
        state.styleReferenceJobIds[0] = null;
      } else if (slot === "styleB") {
        state.styleReferenceImageB = null;
        state.styleReferenceJobIds[1] = null;
      } else if (slot === "characterA") {
        state.characterReferenceImageA = null;
        state.characterReferenceJobIds[0] = null;
      } else if (slot === "characterB") {
        state.characterReferenceImageB = null;
        state.characterReferenceJobIds[1] = null;
      }
      if (!state.characterReferenceImageA && !state.characterReferenceImageB) {
        clearCharacterReferenceState({ updateUI: false });
      }
      updateReferencePreviewsUI();
      refreshReferenceAuthorityUI();
      updatePromptPreview();
    }
  });

  if (faceFileInput) {
    faceFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        // Uploaded file goes to Slot A
        refFace.checked = true;
        state.imageReferences.faceMatch = true;
        state.faceReferenceImageA = evt.target.result.split(',')[1];
        state.faceReferenceJobIds[0] = null;
        if (faceUploadContainer) faceUploadContainer.style.display = "block";
        updateReferencePreviewsUI();
        refreshReferenceAuthorityUI();
        updatePromptPreview();
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnClearFace) {
    btnClearFace.addEventListener("click", () => {
      if (faceFileInput) faceFileInput.value = "";
      state.faceReferenceImageA = null;
      state.faceReferenceImageB = null;
      state.faceReferenceJobIds = [];
      updateReferencePreviewsUI();
    });
  }

  // NSFW Toggle
  const toggleNsfw = document.getElementById("toggle-nsfw");
  const nsfwAccordion = document.getElementById("accordion-nsfw");

  const updateNsfwState = () => {
    const isNsfwEnabled = toggleNsfw.checked;
    if (nsfwAccordion) {
      nsfwAccordion.style.display = isNsfwEnabled ? "block" : "none";
    }

    if (!isNsfwEnabled) {
      const nsfwSelects = document.querySelectorAll("#accordion-nsfw .custom-select");
      nsfwSelects.forEach(select => {
        const fieldName = select.getAttribute("data-field");
        select.value = "";
        delete state.selections[fieldName];
        const customInput = select.closest(".form-field").querySelector(".custom-writein-input");
        if (customInput) {
          customInput.value = "";
          customInput.style.display = "none";
        }
      });
      updateAccordionSummaryBadges("NSFW");
    }
    updatePromptPreview();
  };

  toggleNsfw.addEventListener("change", updateNsfwState);

  // Language Selector Pill Toggles (Step 8)
  const languagePills = document.querySelectorAll("#language-pill-selector .pill-btn");
  languagePills.forEach(btn => {
    btn.addEventListener("click", () => {
      languagePills.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const newLang = btn.getAttribute("data-value");
      if (state.language !== newLang) {
        const openAccordionIds = [...document.querySelectorAll('#form-container .accordion.active')]
          .map(accordion => accordion.id)
          .filter(Boolean);
        state.language = newLang;
        localStorage.setItem('model_prompt_forge_language', newLang);
        const currentProvider = document.getElementById("api-provider-select")?.value;
        const currentModel = document.getElementById("api-submodel-select")?.value;
        populateProviderList(currentProvider);
        updateSubmodelList(currentModel);
        renderForm();
        bindDynamicFormEvents();
        restoreSelectionsToUI();
        openAccordionIds.forEach(id => document.getElementById(id)?.classList.add('active'));
        updateColorPickerUI();
        enforceModeReferencePolicy({ updateUI: false });
        toggleUIForMode();
        refreshReferenceAuthorityUI();
        updateReferencePreviewsUI();
        updateLightboxNavigationLabels();
        updatePromptPreview();
      }
    });
  });

  // Profile Selector Pill Toggles (Step 8)
  const profilePills = document.querySelectorAll("#profile-pill-selector .pill-btn");
  profilePills.forEach(btn => {
    btn.addEventListener("click", () => {
      profilePills.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const newUsername = btn.getAttribute("data-value");
      if (state.username !== newUsername) {
        state.username = newUsername;
        updateCredits();
      }
    });
  });

  // Simulated Credits Top-up
  const btnRecharge = document.getElementById("btn-recharge");
  if (btnRecharge) {
    btnRecharge.addEventListener("click", async () => {
      try {
        const response = await fetch('/api/credits/recharge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: state.username })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Recharge failed");

        // Update balance display
        document.getElementById("credits-value").textContent = data.credits;
        const balanceEl = document.getElementById("credits-value");
        balanceEl.style.color = "#10b981"; // green flash
        setTimeout(() => { balanceEl.style.color = ""; }, 1000);
      } catch (err) {
        void AppDialog.alert("Failed to recharge credits: " + err.message, { title: "Recharge Failed" });
      }
    });
  }

  // Download Generated Image Button
  const btnDownloadImage = document.getElementById("btn-download-image");
  if (btnDownloadImage) {
    btnDownloadImage.addEventListener("click", () => {
      const img = document.getElementById("generated-image");
      if (!img || !img.src) return;

      const a = document.createElement("a");
      a.href = img.src;
      a.download = `modelpromptforge-generation-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // Panel Collapsible Actions
  const btnToggleDashboard = document.getElementById("btn-toggle-dashboard");
  const visualDashboard = document.getElementById("visual-dashboard");
  if (btnToggleDashboard && visualDashboard) {
    btnToggleDashboard.addEventListener("click", () => {
      visualDashboard.classList.toggle("collapsed");
      const icon = btnToggleDashboard.querySelector(".toggle-icon");
      if (icon) {
        icon.textContent = visualDashboard.classList.contains("collapsed") ? "▲" : "▼";
      }
    });
  }

  const btnFloatingConfig = document.getElementById("btn-floating-config");
  const creativeConfigurator = document.getElementById("creative-configurator");
  if (btnFloatingConfig && creativeConfigurator) {
    btnFloatingConfig.addEventListener("click", () => {
      creativeConfigurator.classList.remove("collapsed");
      btnFloatingConfig.style.display = "none";
      setTimeout(() => {
        creativeConfigurator.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    });
  }

  // Lightbox close button
  const lightboxModal = document.getElementById("lightbox-modal");
  const lightboxClose = document.getElementById("lightbox-close");
  if (lightboxClose && lightboxModal) {
    lightboxClose.addEventListener("click", closeLightbox);
    lightboxModal.addEventListener("click", (e) => {
      if (e.target === lightboxModal) {
        closeLightbox();
      }
    });
    document.getElementById("lightbox-previous")?.addEventListener("click", () => navigateLightbox(-1));
    document.getElementById("lightbox-next")?.addEventListener("click", () => navigateLightbox(1));
    document.addEventListener("keydown", event => {
      if (lightboxModal.style.display === "none") return;
      if (document.querySelector('.collection-modal[style*="display: flex"]')) return;
      const target = event.target;
      if (target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === "Tab") {
        const focusable = [...lightboxModal.querySelectorAll('button:not([hidden]), a[href]')]
          .filter(element => !element.disabled && element.getClientRects().length > 0);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        if (navigateLightbox(-1)) event.preventDefault();
      } else if (event.key === "ArrowRight") {
        if (navigateLightbox(1)) event.preventDefault();
      }
    });
  }

  // Viewport Loopback action listeners (Step 9)
  const btnViewportUseFace = document.getElementById("btn-viewport-use-face");
  const btnViewportUseStyle = document.getElementById("btn-viewport-use-style");
  const btnViewportUseCharacter = document.getElementById("btn-viewport-use-character");

  if (btnViewportUseFace) {
    btnViewportUseFace.addEventListener("click", () => {
      const img = document.getElementById("generated-image");
      if (img && img.src && img.style.display !== "none") {
        assignFaceReference(img.src, state.activeJobId);

        // Flash visual feedback indicator on the button
        btnViewportUseFace.textContent = "👤 Face Locked!";
        setTimeout(() => { btnViewportUseFace.textContent = "👤 Use as Face Ref"; }, 1500);
      }
    });
  }

  if (btnViewportUseStyle) {
    btnViewportUseStyle.addEventListener("click", () => {
      const img = document.getElementById("generated-image");
      if (img && img.src && img.style.display !== "none") {
        assignStyleReference(img.src, state.activeJobId);

        btnViewportUseStyle.textContent = "🖼️ Style Locked!";
        setTimeout(() => { btnViewportUseStyle.textContent = "🖼️ Use as Style Ref"; }, 1500);
      }
    });
  }

  if (btnViewportUseCharacter) {
    btnViewportUseCharacter.addEventListener("click", () => {
      const img = document.getElementById("generated-image");
      if (img && img.src && img.style.display !== "none" && state.mode === "normal") {
        assignCharacterReference(img.src, state.activeJobId);
        btnViewportUseCharacter.textContent = "📋 Character Added!";
        setTimeout(() => { btnViewportUseCharacter.textContent = "📋 Use as Character Ref"; }, 1500);
      }
    });
  }

  // Lightbox Loopback action listeners (Step 9)
  const btnLightboxUseFace = document.getElementById("btn-lightbox-use-face");
  const btnLightboxUseStyle = document.getElementById("btn-lightbox-use-style");
  const btnLightboxUseCharacter = document.getElementById("btn-lightbox-use-character");

  if (btnLightboxUseFace) {
    btnLightboxUseFace.addEventListener("click", () => {
      const img = document.getElementById("lightbox-image");
      if (img && img.src && lightboxModal.style.display !== "none") {
        const activeItem = lightboxModal.activeItem;
        assignFaceReference(img.src, activeItem ? activeItem.id : null);
        closeLightbox();
      }
    });
  }

  if (btnLightboxUseStyle) {
    btnLightboxUseStyle.addEventListener("click", () => {
      const img = document.getElementById("lightbox-image");
      if (img && img.src && lightboxModal.style.display !== "none") {
        const activeItem = lightboxModal.activeItem;
        assignStyleReference(img.src, activeItem ? activeItem.id : null);
        closeLightbox();
      }
    });
  }

  if (btnLightboxUseCharacter) {
    btnLightboxUseCharacter.addEventListener("click", () => {
      const img = document.getElementById("lightbox-image");
      if (img && img.src && lightboxModal.style.display !== "none" && state.mode === "normal") {
        const activeItem = lightboxModal.activeItem;
        assignCharacterReference(img.src, activeItem ? activeItem.id : null);
        closeLightbox();
      }
    });
  }

  // Generate Image Button (Background Queue & SSE Streaming Integration)
  const btnGenerateImage = document.getElementById("btn-generate-image");
  if (btnGenerateImage) {
    btnGenerateImage.addEventListener("click", async () => {
      if (window.ModelPromptForgeComparison?.isActive()) {
        await window.ModelPromptForgeComparison.generate();
        return;
      }
      const provider = document.getElementById("api-provider-select").value;
      const submodel = document.getElementById("api-submodel-select").value;
      const loader = document.getElementById("image-loading-overlay");
      const img = document.getElementById("generated-image");
      const placeholder = document.getElementById("viewport-placeholder");
      const errBanner = document.getElementById("viewport-error");
      const telemetryBar = document.getElementById("telemetry-bar");
      const btnDownload = document.getElementById("btn-download-image");
      const queueList = document.getElementById("active-queue-list");

      if (!validateForm()) {
        return;
      }

      // Hide active image details, show loading pulse overlay
      errBanner.style.display = "none";
      const errorDetails = document.getElementById("error-details");
      const errorTechnicalMessage = document.getElementById("error-technical-message");
      if (errorDetails && errorTechnicalMessage) {
        errorDetails.open = false;
        errorDetails.style.display = "none";
        errorTechnicalMessage.textContent = "";
      }
      placeholder.style.display = "none";
      img.style.display = "none";
      btnDownload.style.display = "none";
      telemetryBar.style.display = "none";
      loader.style.display = "flex";

      // 1. Collapsing/Expanding Transition animations
      if (creativeConfigurator) {
        creativeConfigurator.classList.add("collapsed");
      }
      if (visualDashboard) {
        visualDashboard.classList.remove("collapsed");
      }
      if (btnFloatingConfig) {
        btnFloatingConfig.style.display = "block";
      }

      const startTime = performance.now();

      try {
        const generationPayload = getGenerationRequestPayload();
        const submittedReferenceJobIds = {
          face: generationPayload.faceReferenceJobIds,
          style: generationPayload.styleReferenceJobIds,
          character: generationPayload.characterReferenceJobIds
        };

        // 2. Call backend generator queue endpoint
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Role': state.userRole
          },
          body: JSON.stringify(generationPayload)
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Generation failed");
        }

        const jobId = data.jobId;

        // 3. Render dynamic Job Card in background Queue List
        const jobCard = document.createElement("div");
        jobCard.className = "queue-item";
        jobCard.id = `queue-${jobId}`;
        jobCard.innerHTML = `
          <div class="queue-item-left">
            <div class="queue-spinner"></div>
            <span>Job #${jobId.substring(4, 9)}: Processing...</span>
          </div>
          <span class="queue-badge-status processing">Processing</span>
        `;
        queueList.appendChild(jobCard);

        // Provider streaming uses SSE for partial images. Non-streaming jobs poll
        // authoritative job state and render only the completed output file.
        let pollTimer = null;
        let sseSource;
        if (data.providerStreaming === true) {
          sseSource = new EventSource(`/api/jobs/${jobId}/stream`);
        } else {
          sseSource = new EventTarget();
          sseSource.close = () => {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
          };

          const pollJobStatus = async () => {
            try {
              const statusResponse = await fetch(`/api/jobs/${jobId}`);
              if (!statusResponse.ok) return;
              const statusPayload = await statusResponse.json();

              if (statusPayload.status === 'completed') {
                sseSource.dispatchEvent(new MessageEvent('image_generation.completed', {
                  data: JSON.stringify({
                    type: 'image_generation.completed',
                    ...(statusPayload.result || {})
                  })
                }));
              } else if (statusPayload.status === 'failed') {
                sseSource.dispatchEvent(new MessageEvent('job.failed', {
                  data: JSON.stringify(statusPayload.error || {})
                }));
              } else {
                sseSource.dispatchEvent(new MessageEvent('status', {
                  data: JSON.stringify({ status: statusPayload.status })
                }));
              }
            } catch {
              // A transient polling failure must not remove the active job.
            }
          };

          pollTimer = setInterval(pollJobStatus, 1000);
          pollJobStatus();
        }

        sseSource.addEventListener('status', (e) => {
          const payload = JSON.parse(e.data);
          const label = jobCard.querySelector("span");
          if (label) {
            label.textContent = `Job #${jobId.substring(4, 9)}: ${payload.status}...`;
          }
        });

        // Progressive stream painting for generation and reference-image edits.
        const renderPartialImage = (e) => {
          const payload = JSON.parse(e.data);
          if (payload.b64_json) {
            // Hide loaders/placeholders and render incoming partial base64 slices
            loader.style.display = "none";
            img.src = `data:image/png;base64,${payload.b64_json}`;
            img.style.display = "block";
          }
        };

        if (data.providerStreaming === true) {
          sseSource.addEventListener('image_generation.partial_image', renderPartialImage);
          sseSource.addEventListener('image_edit.partial_image', renderPartialImage);
        }

        // Generation completion event handler
        sseSource.addEventListener('image_generation.completed', (e) => {
          const payload = JSON.parse(e.data);
          sseSource.close();
          jobCard.remove();

          const endTime = performance.now();
          const durationSec = ((endTime - startTime) / 1000).toFixed(1);

          // Track active render metadata (Step 9)
          state.activeJobId = jobId;
          const vpActions = document.getElementById("viewport-loopback-actions");
          if (vpActions) vpActions.style.display = "flex";

          // Render completed static image
          const finalImgSrc = payload.imageUrl || (payload.b64_json ? `data:image/png;base64,${payload.b64_json}` : '');
          img.src = finalImgSrc;
          img.style.display = "block";
          btnDownload.style.display = "block";
          loader.style.display = "none";

          const jobMeta = {
            id: jobId,
            prompt: getEditablePromptText(),
            imageUrl: finalImgSrc,
            timestamp: Date.now(),
            provider,
            submodel,
            referencedFaceJobIds: submittedReferenceJobIds.face,
            referencedStyleJobIds: submittedReferenceJobIds.style,
            referencedCharacterJobIds: submittedReferenceJobIds.character,
            generationDuration: durationSec
          };

          // Lightbox click handler
          img.onclick = () => openLightbox(jobMeta);

          // Update Telemetry
          document.getElementById("tel-model").textContent = submodel;
          document.getElementById("tel-time").textContent = `${durationSec}s`;
          document.getElementById("tel-aspect").textContent = state.aspectRatio;
          telemetryBar.style.display = "flex";

          // Update credits and history list
          updateCredits();
          loadCollections();
          loadHistory();
        });

        // Application job failure is separate from EventSource transport errors.
        sseSource.addEventListener('job.failed', (e) => {
          let errorMsg = "Generation failed";
          let technicalMessage = "";
          let creditRefunded = false;
          try {
            const payload = JSON.parse(e.data);
            const rawMessage = payload.message || payload.error || errorMsg;
            technicalMessage = [
              payload.code ? `Code: ${payload.code}` : '',
              payload.requestId ? `Request ID: ${payload.requestId}` : '',
              payload.safetyViolations?.length
                ? `Safety: ${payload.safetyViolations.join(', ')}`
                : '',
              rawMessage
            ].filter(Boolean).join(' | ');
            creditRefunded = payload.creditRefunded === true;
            errorMsg = payload.code === 'moderation_blocked'
              ? `This image did not pass the safety check. Please adjust the prompt or reference image.${creditRefunded ? ' Your credit was refunded.' : ''}`
              : rawMessage;
          } catch { }

          sseSource.close();
          jobCard.remove();
          loader.style.display = "none";
          img.removeAttribute("src");
          img.style.display = "none";
          btnDownload.style.display = "none";
          telemetryBar.style.display = "none";

          const vpActions = document.getElementById("viewport-loopback-actions");
          if (vpActions) vpActions.style.display = "none";

          errBanner.style.display = "flex";
          document.getElementById("error-message").textContent = errorMsg;
          const errorDetails = document.getElementById("error-details");
          const errorTechnicalMessage = document.getElementById("error-technical-message");
          if (errorDetails && errorTechnicalMessage) {
            errorDetails.open = false;
            errorDetails.style.display = technicalMessage ? "block" : "none";
            errorTechnicalMessage.textContent = technicalMessage;
          }
          placeholder.style.display = "flex";
          updateCredits();
        });

        if (data.providerStreaming === true) {
          sseSource.addEventListener('error', () => {
            // EventSource reconnects automatically. A temporary or normal SSE
            // disconnect is not a generation failure and must not clear output.
          });
        }

      } catch (err) {
        loader.style.display = "none";
        errBanner.style.display = "flex";
        document.getElementById("error-message").textContent = err.message;
        placeholder.style.display = "flex";
      }
    });
  }

  // GPT-Safe Toggle
  const toggleGptSafe = document.getElementById("toggle-gpt-safe");
  if (toggleGptSafe) {
    toggleGptSafe.addEventListener("change", () => {
      state.schema.forEach(groupObj => {
        updateAccordionSummaryBadges(groupObj.group);
      });
      updatePromptPreview();
    });
  }

  // Copy buttons
  document.getElementById("btn-copy").addEventListener("click", () => {
    copyPromptToClipboard();
  });

  document.getElementById("btn-copy-json").addEventListener("click", () => {
    copyPromptAsJSON();
  });

  // Random / Surprise Me Button
  document.getElementById("btn-random").addEventListener("click", () => {
    randomizeSelections();
  });

  // Reset Button
  document.getElementById("btn-reset").addEventListener("click", () => {
    resetForm();
  });

  // Export JSON Button
  document.getElementById("btn-export").addEventListener("click", () => {
    exportConfigJSON();
  });

  // Import JSON Button
  document.getElementById("btn-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      importConfigJSON(evt.target.result);
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // Mode Selection Chips
  document.querySelectorAll(".mode-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".mode-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");

      // Save current state first before switching mode (Step 12)
      saveCurrentModeState();

      state.mode = chip.getAttribute("data-mode");

      // Restore saved state or fallback to defaults (Step 12)
      state.isRestoringState = true;
      restoreCurrentModeState();
      state.isRestoringState = false;

      enforceModeReferencePolicy({ updateUI: false });
      toggleUIForMode();
      updateReferencePreviewsUI();
      updatePromptPreview();
    });
  });

}

// Dynamically filter UI accordions based on active mode
function toggleUIForMode() {
  const mode = state.mode;
  const imageUpload = document.getElementById("image-upload-container");
  pruneSelectionsForMode(state.selections, mode);
  updateCharacterSheetSourceStatus();

  if (imageUpload) {
    imageUpload.style.display = mode === "normal" ? "block" : "none";
  }
  document.querySelectorAll(".btn-use-character-ref").forEach(button => {
    button.style.display = mode === "normal" ? "inline-flex" : "none";
  });
  ["ref-style-match", "ref-pose-match"].forEach(id => {
    const checkbox = document.getElementById(id);
    const label = checkbox?.closest(".checkbox-container");
    if (label) label.style.display = mode === "normal" ? "inline-flex" : "none";
  });

  const presetsSection = document.querySelector(".presets-section");
  if (presetsSection) {
    presetsSection.style.display = mode === "normal" ? "block" : "none";
  }

  document.querySelectorAll(".accordion").forEach(accordion => {
    const groupName = accordion.dataset.groupName || accordion.id.replace("accordion-", "").replace(/-/g, " ");
    const isNsfwGroup = accordion.getAttribute("data-nsfw-controlled") === "true";
    const toggleNsfw = document.getElementById("toggle-nsfw");
    const isNsfwEnabled = toggleNsfw ? toggleNsfw.checked : false;
    const isVisibleForMode = isGroupAllowedForMode(groupName, mode);

    if (!isVisibleForMode) {
      accordion.style.display = "none";
      accordion.classList.add("hidden-accordion");
    } else if (isNsfwGroup) {
      accordion.style.display = isNsfwEnabled ? "block" : "none";
      accordion.classList.toggle("hidden-accordion", !isNsfwEnabled);
    } else {
      accordion.style.display = "block";
      accordion.classList.remove("hidden-accordion");
    }
  });

  const activeAccordion = document.querySelector(".accordion.active");
  if (activeAccordion && (activeAccordion.classList.contains("hidden-accordion") || activeAccordion.style.display === "none")) {
    activeAccordion.classList.remove("active");
    const firstVisible = Array.from(document.querySelectorAll(".accordion")).find(acc => !acc.classList.contains("hidden-accordion") && acc.style.display !== "none");
    if (firstVisible) {
      firstVisible.classList.add("active");
    }
  }
}

// Programmatically select Aspect Ratio in the UI
function setAspectInUI(ratio) {
  state.aspectRatio = ratio;
  document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
    if (chip.getAttribute("data-ratio") === ratio) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
}

// Resolves the active prompt value for a selection, checking for GPT-Safe Mode
function getPromptValueForSelection(selection, fieldName) {
  if (!selection) return "";
  let baseVal = "";
  if (selection.isCustom) {
    baseVal = selection.value;
  } else {
    const item = state.library.find(libItem => libItem.id === selection.id);
    if (!item || !item.prompt) {
      baseVal = selection.value;
    } else {
      const toggleGptSafe = document.getElementById("toggle-gpt-safe");
      const isGptSafe = toggleGptSafe ? toggleGptSafe.checked : false;

      if (isGptSafe) {
        baseVal = item.prompt["gpt-image-safe"] || item.prompt["gpt-image"] || item.prompt.default;
      } else {
        baseVal = item.prompt["gpt-image"] || item.prompt.default;
      }
    }
  }

  // Inject custom color picker info (Step 11)
  if (fieldName && state.customColors && state.customColors[fieldName]) {
    const cfg = state.customColors[fieldName];
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
}

function splitPromptPhrases(value) {
  return String(value || "")
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);
}

function uniquePromptParts(parts) {
  const seen = new Set();
  return parts.filter(part => {
    const key = part.toLowerCase().replace(/\s+/g, " ").trim();
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

  let base = cutStyle || legacyStyle || length || "";
  if (length && base && lengthAdjective && !base.toLowerCase().includes(lengthAdjective.toLowerCase())) {
    base = `${length}, ${base}`;
  }
  if (color && base) {
    if (colorAdjective && !base.toLowerCase().includes(colorAdjective.toLowerCase())) {
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
      : valuesByField["Beauty"]
  ].filter(Boolean)).join(", ");

  const faceStructure = valuesByField["Face Shape"] || "";
  const facialFeatures = uniquePromptParts([
    valuesByField["Eyes"],
    valuesByField["Eyebrows"],
    valuesByField["Nose"],
    valuesByField["Lips"]
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

function wrapPromptSegment(value, tokenClass, cleanTextOnly) {
  if (!value || !value.trim()) return "";
  return cleanTextOnly ? value : `<span class="${tokenClass}">${value}</span>`;
}

// Enforce mutual exclusion rules
function enforceExclusionRules(selectedId) {
  const idsToExclude = new Set();
  const selectedItem = state.library.find(item => item.id === selectedId);
  if (selectedItem && selectedItem.exclusions) {
    selectedItem.exclusions.forEach(id => idsToExclude.add(id));
  }

  state.library.forEach(libItem => {
    if (libItem.id !== selectedId && libItem.exclusions && libItem.exclusions.includes(selectedId)) {
      idsToExclude.add(libItem.id);
    }
  });

  if (idsToExclude.size === 0) return;

  idsToExclude.forEach(excludedId => {
    const conflictingField = Object.keys(state.selections).find(
      fieldName => state.selections[fieldName].id === excludedId
    );

    if (!conflictingField) return;

    const conflictingGroup = state.selections[conflictingField].group;
    delete state.selections[conflictingField];

    const conflictingSelect = document.querySelector(
      `#form-container .custom-select[data-field="${conflictingField}"]`
    );
    if (conflictingSelect) {
      conflictingSelect.value = "";
      const formField = conflictingSelect.closest(".form-field");
      if (formField) {
        const customInput = formField.querySelector(".custom-writein-input");
        if (customInput) {
          customInput.value = "";
          customInput.style.display = "none";
        }
        formField.classList.remove("conflict-cleared");
        void formField.offsetWidth;
        formField.classList.add("conflict-cleared");
        formField.addEventListener("animationend", () => {
          formField.classList.remove("conflict-cleared");
        }, { once: true });
      }
    }
    updateAccordionSummaryBadges(conflictingGroup);
  });
}

// Preventive UI: Disable/grey-out conflicting options
function updateDropdownExclusions() {
  const selectedIds = new Set();
  Object.values(state.selections).forEach(sel => {
    if (!sel.isCustom) selectedIds.add(sel.id);
  });

  const activeExclusions = new Set();
  selectedIds.forEach(selId => {
    const item = state.library.find(li => li.id === selId);
    if (item && item.exclusions) {
      item.exclusions.forEach(exId => activeExclusions.add(exId));
    }
  });

  state.library.forEach(libItem => {
    if (libItem.exclusions && libItem.exclusions.some(exId => selectedIds.has(exId))) {
      activeExclusions.add(libItem.id);
    }
  });

  selectedIds.forEach(id => activeExclusions.delete(id));

  document.querySelectorAll("#form-container .custom-select").forEach(select => {
    Array.from(select.options).forEach(option => {
      if (option.value === "" || option.value === "__custom__") return;
      const originalText = option.getAttribute("data-original-text") || option.textContent;

      if (activeExclusions.has(option.value)) {
        option.disabled = true;
        option.textContent = `🚫 ${originalText}`;
        option.classList.add("option-conflicted");
      } else {
        option.disabled = false;
        option.textContent = originalText;
        option.classList.remove("option-conflicted");
      }
    });
  });
}

// Update accordion header summary badges
function updateAccordionSummaryBadges(groupName) {
  const badgeId = `badge-${groupName.toLowerCase().replace(/\s+/g, "-")}`;
  const badge = document.getElementById(badgeId);
  if (!badge) return;

  const selectedInGroup = Object.keys(state.selections)
    .filter(key => state.selections[key].group === groupName)
    .map(key => getPromptValueForSelection(state.selections[key], key))
    .filter(val => val && val.trim() !== "");

  if (selectedInGroup.length > 0) {
    badge.textContent = selectedInGroup.join(", ");
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

// Resolve tag conflicts in compiled values
function resolveTagConflicts(activeSelections) {
  const items = [];
  for (const fieldName in activeSelections) {
    const sel = activeSelections[fieldName];
    if (sel.isCustom) continue;
    const libItem = state.library.find(li => li.id === sel.id);
    if (libItem && libItem.tags) {
      items.push({
        fieldName,
        category: libItem.category,
        tags: libItem.tags.map(t => t.toLowerCase()),
        priority: CATEGORY_PRIORITIES[libItem.category.toLowerCase()] || 0
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

// Live compilation of active selections into prompt structure
function generatePromptText(cleanTextOnly = false) {
  const currentTemplateName = document.getElementById("template-select").value || "portrait";
  const templateStr = state.templates[currentTemplateName];

  const activeSelections = getModeCompatibleSelections(state.selections, state.mode);
  applyReferenceAuthorityToSelections(activeSelections);
  const referenceOwnsAppearance = isStoryCharacterReferenceActive() && !state.characterReferenceOverrides;

  // Dynamically inject selections for active custom color pickers if empty (Step 11)
  if (!referenceOwnsAppearance && isGroupAllowedForMode("Hair") && state.customColors && state.customColors["Color"] && (state.customColors["Color"].enabled || state.customColors["Color"].highlightEnabled)) {
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
  ["Top", "Bottom", "Dress", "Shoes", "Product Type"].forEach(field => {
    if (!referenceOwnsAppearance && isGroupAllowedForMode("Clothing") && state.customColors && state.customColors[field] && state.customColors[field].enabled) {
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

  const compileGroupSegment = (groupName, tokenClass) => {
    if (groupName.toLowerCase() === "face") {
      if (state.imageReferences.faceMatch) {
        const txt = "Preserve the identity of the uploaded person with high consistency while maintaining a completely natural appearance. Keep the same recognizable facial proportions, eye shape, nose, lips, eyebrows, hairstyle, and skin tone while allowing subtle natural variations from facial expression, camera perspective, lighting, and lens characteristics. Prioritize identity preservation over exact geometric matching.";
        return cleanTextOnly ? txt : `<span class="token-reference">${txt}</span>`;
      }
    }
    if (groupName.toLowerCase() === "clothing") {
      if (state.imageReferences.styleMatch && !referenceOwnsAppearance) {
        const txt = "matching the style, colors, and clothing outfit from the original uploaded image";
        return cleanTextOnly ? txt : `<span class="token-reference">${txt}</span>`;
      }
    }
    if (groupName.toLowerCase() === "pose") {
      if (state.imageReferences.poseMatch) {
        const txt = "with the identical posing and image composition as the original uploaded file";
        return cleanTextOnly ? txt : `<span class="token-reference">${txt}</span>`;
      }
    }

    let segmentValues = [];

    state.order.forEach(fieldId => {
      Object.entries(activeSelections).forEach(([fieldName, selection]) => {
        const category = FIELD_TO_PROMPT_CATEGORY_MAP[fieldName] || selection.category || selection.group.toLowerCase();
        const matchesOrder = category.replaceAll("_", "") === fieldId.replaceAll("_", "");
        if (matchesOrder && selection.group.toLowerCase() === groupName.toLowerCase()) {
        const val = getPromptValueForSelection(selection, fieldName);
        if (val && val.trim() !== "") {
          if (selection.isDropped) {
            if (!cleanTextOnly) segmentValues.push(`<span class="token-dropped" title="${selection.droppedReason}">${val}</span>`);
          } else {
            segmentValues.push(val);
          }
        }
        }
      });
    });

    if (segmentValues.length === 0) {
      segmentValues = Object.keys(activeSelections)
        .filter(key => activeSelections[key].group.toLowerCase() === groupName.toLowerCase())
        .map(key => {
          const s = activeSelections[key];
          const val = getPromptValueForSelection(s, key);
          if (!val || val.trim() === "") return null;
          if (s.isDropped) return cleanTextOnly ? null : `<span class="token-dropped" title="${s.droppedReason}">${val}</span>`;
          return val;
        })
        .filter(val => val !== null);
    }

    segmentValues = [...new Set(segmentValues)];
    if (segmentValues.length === 0) return "";

    const combinedStr = segmentValues.join(", ");
    if (cleanTextOnly) return combinedStr;
    return `<span class="${tokenClass}">${combinedStr}</span>`;
  };

  const shouldUsePromptCleanup = state.mode === "headshot" || state.mode === "character-sheet";
  const cleanedPromptSegments = shouldUsePromptCleanup
    ? buildCleanPromptSegments(activeSelections, getPromptValueForSelection)
    : null;

  let subject = cleanedPromptSegments
    ? wrapPromptSegment(cleanedPromptSegments.identity, "token-subject", cleanTextOnly)
    : compileGroupSegment("Character", "token-subject");
  let appearance = cleanedPromptSegments
    ? (state.imageReferences.faceMatch
      ? compileGroupSegment("Face", "token-appearance")
      : wrapPromptSegment(cleanedPromptSegments.appearance, "token-appearance", cleanTextOnly))
    : compileGroupSegment("Face", "token-appearance");

  const getSelectionsForGroup = (grp) => {
    return Object.keys(activeSelections)
      .filter(key => activeSelections[key].group.toLowerCase() === grp.toLowerCase())
      .map(key => {
        const s = activeSelections[key];
        const val = getPromptValueForSelection(s, key);
        if (!val || val.trim() === "") return null;
        if (s.isDropped) return cleanTextOnly ? null : `<span class="token-dropped" title="${s.droppedReason}">${val}</span>`;
        return val;
      })
      .filter(val => val !== null);
  };

  let hairList = getSelectionsForGroup("Hair");
  let hair = cleanedPromptSegments
    ? wrapPromptSegment(cleanedPromptSegments.hair, "token-appearance", cleanTextOnly)
    : (hairList.length > 0 ? (cleanTextOnly ? hairList.join(", ") : `<span class="token-appearance">${hairList.join(", ")}</span>`) : "");

  let skinList = getSelectionsForGroup("Skin");
  let skin = cleanedPromptSegments
    ? wrapPromptSegment(cleanedPromptSegments.skin, "token-appearance", cleanTextOnly)
    : (skinList.length > 0 ? (cleanTextOnly ? skinList.join(", ") : `<span class="token-appearance">${skinList.join(", ")}</span>`) : "");

  let fullAppearance = [appearance, hair, skin].filter(s => s !== "").join(", ");

  let clothing = compileGroupSegment("Clothing", "token-clothing");

  // Baseline outfit fallback until visible Character Sheet outfit presets are implemented.
  if (state.mode === "character-sheet" && (!clothing || clothing.trim() === "")) {
    const clText = "wearing a plain white tank top and simple white shorts for clear character sheet visibility";
    clothing = cleanTextOnly ? clText : `<span class="token-clothing">${clText}</span>`;
  }

  let pose = compileGroupSegment("Pose", "token-pose");
  let fashionDirection = compileGroupSegment("Fashion Direction", "token-pose");
  let photoContext = compileGroupSegment("Photographic Context", "token-pose");
  let sceneStory = compileGroupSegment("Scene Story", "token-pose");
  let sceneContext = [fashionDirection, photoContext, sceneStory].filter(s => s !== "").join(", ");
  let body = compileGroupSegment("Body", "token-subject");
  let fullSubject = [subject, body].filter(s => s !== "").join(", ");

  let environment = compileGroupSegment("Environment", "token-pose");
  let lighting = compileGroupSegment("Lighting", "token-lighting");
  let camera = compileGroupSegment("Camera", "token-pose");
  let quality = compileGroupSegment("Quality", "token-lighting");
  let nsfw = compileGroupSegment("NSFW", "token-nsfw");

  let prompt = "";
  if (state.mode === "headshot") {
    let headshotLayout = `headshot portrait`;
    let elements = [
      cleanTextOnly ? headshotLayout : `<span class="token-pose">${headshotLayout}</span>`,
      fullSubject,
      appearance,
      hair,
      skin,
      cleanTextOnly ? "showing head to shoulders, straight front-facing portrait, looking directly into the camera with zero head tilting, perfectly level head" : `<span class="token-pose">showing head to shoulders, straight front-facing portrait, looking directly into the camera with zero head tilting, perfectly level head</span>`,
      cleanTextOnly ? "on a solid pure white background" : `<span class="token-pose">on a solid pure white background</span>`,
      cleanTextOnly ? "photorealistic photography" : `<span class="token-lighting">photorealistic photography</span>`,
      cleanTextOnly ? "realistic camera imperfections" : `<span class="token-lighting">realistic camera imperfections</span>`,
      camera,
      quality
    ].filter(s => s && s.toString().trim() !== "");
    prompt = elements.join(", ");
  } else if (state.mode === "character-sheet") {
    let sheetLayout = `character model sheet, character design sheet, showing front view, side view, and back view of the same character, full-body view, standing straight in a neutral pose`;
    let elements = [
      cleanTextOnly ? sheetLayout : `<span class="token-pose">${sheetLayout}</span>`,
      fullSubject,
      appearance,
      hair,
      clothing,
      cleanTextOnly ? "on a solid pure white background" : `<span class="token-pose">on a solid pure white background</span>`,
      cleanTextOnly ? "photorealistic photography" : `<span class="token-lighting">photorealistic photography</span>`,
      cleanTextOnly ? "realistic camera imperfections" : `<span class="token-lighting">realistic camera imperfections</span>`,
      camera,
      quality
    ].filter(s => s && s.toString().trim() !== "");
    prompt = elements.join(", ");
  } else {
    const characterReferenceText = isStoryCharacterReferenceActive()
      ? (cleanTextOnly
        ? (state.characterReferenceOverrides
          ? "Preserve the recognizable character identity from the uploaded reference while applying the explicitly selected character styling overrides"
          : "Preserve the character identity, body proportions, hairstyle, and clothing details from the uploaded character reference while adapting only the pose and scene")
        : `<span class="token-reference">${state.characterReferenceOverrides
          ? "Preserve the recognizable character identity from the uploaded reference while applying the explicitly selected character styling overrides"
          : "Preserve the character identity, body proportions, hairstyle, and clothing details from the uploaded character reference while adapting only the pose and scene"}</span>`)
      : "";
    prompt = templateStr
      .replace("{subject}", fullSubject)
      .replace("{appearance}", fullAppearance)
      .replace("{clothing}", clothing)
      .replace("{nsfw}", nsfw)
      .replace("{pose}", [characterReferenceText, pose, sceneContext].filter(s => s !== "").join(", "))
      .replace("{environment}", environment)
      .replace("{lighting}", lighting)
      .replace("{camera}", camera)
      .replace("{quality}", quality);
  }

  prompt = prompt.replace(/,(\s*,)+/g, ",");
  prompt = prompt.replace(/^\s*,\s*/, "");
  prompt = prompt.replace(/\s*,\s*$/, "");
  prompt = prompt.trim();

  const toggleGptSafeEl = document.getElementById("toggle-gpt-safe");
  const isGptSafeActive = toggleGptSafeEl ? toggleGptSafeEl.checked : false;
  if (isGptSafeActive && prompt !== "") {
    let positiveWordsList = [];
    Object.values(activeSelections).forEach(selection => {
      if (selection.isCustom) return;
      const libItem = state.library.find(li => li.id === selection.id);
      if (libItem && libItem.prompt && libItem.prompt["gpt-image-positive"]) {
        positiveWordsList.push(
          ...libItem.prompt["gpt-image-positive"].split(",").map(w => w.trim()).filter(w => w !== "")
        );
      }
    });
    positiveWordsList = [...new Set(positiveWordsList)];
    if (positiveWordsList.length > 0) {
      const posStr = positiveWordsList.join(", ");
      if (cleanTextOnly) {
        prompt += `, ${posStr}`;
      } else {
        prompt += `, <span class="token-positive">${posStr}</span>`;
      }
    }
  }

  if (state.aspectRatio && prompt !== "") {
    const arStr = `(Image aspect ratio ${state.aspectRatio})`;
    if (cleanTextOnly) {
      prompt += ` ${arStr}`;
    } else {
      prompt += ` <span class="token-lighting">${arStr}</span>`;
    }
  }

  return prompt;
}

// Update DOM Prompt Preview
function updatePromptPreview() {
  if (state.mode && !state.isRestoringState) {
    saveCurrentModeState();
  }
  updateCharacterSheetSourceStatus();

  const previewBox = document.getElementById("prompt-preview");
  const previewOuter = document.getElementById("preview-outer-container");
  const isUserAdmin = (state.userRole === 'admin');

  const copyBtn = document.getElementById("btn-copy");
  const copyJsonBtn = document.getElementById("btn-copy-json");
  if (copyBtn) copyBtn.disabled = !isUserAdmin;
  if (copyJsonBtn) copyJsonBtn.disabled = !isUserAdmin;

  if (!isUserAdmin) {
    if (previewOuter) previewOuter.style.display = "none";
    return;
  } else {
    if (previewOuter) previewOuter.style.display = "block";
  }

  const compiledPrompt = generatePromptText(true);
  if (previewBox) previewBox.value = compiledPrompt;

  const cleanPrompt = getEditablePromptText().toLowerCase();
  const BANNED_KEYWORDS = [
    { word: "masterpiece", type: "AI Buzzword", suggestion: "Describe specific photographic details instead." },
    { word: "best quality", type: "AI Buzzword", suggestion: "Specify camera brand, lens type, and lighting source." },
    { word: "ultra quality", type: "AI Buzzword", suggestion: "Let the resolution and lens parameters imply quality." },
    { word: "insane detail", type: "AI Buzzword", suggestion: "Explain what is detailed (e.g. skin pores, fabric weave)." },
    { word: "hyper realistic", type: "AI Buzzword", suggestion: "Rely on realistic lighting physics and camera properties." },
    { word: "16k", type: "AI Buzzword", suggestion: "Use standard focal lengths or camera brand names instead." },
    { word: "32k", type: "AI Buzzword", suggestion: "Use standard focal lengths or camera brand names instead." },
    { word: "flawless", type: "Unreal Beauty", suggestion: "Prefer natural textures like 'visible pores' or 'subtle blemishes'." },
    { word: "perfect face", type: "Unreal Beauty", suggestion: "Describe unique features or natural expression." },
    { word: "perfect skin", type: "Unreal Beauty", suggestion: "Use 'natural skin texture' or 'fine baby hairs'." },
    { word: "perfect anatomy", type: "Unreal Beauty", suggestion: "Focus on relaxed postures and candid movement." },
    { word: "perfect symmetry", type: "Unreal Beauty", suggestion: "Embrace 'natural asymmetry' for a photorealistic look." },
    { word: "identical", type: "Geometry Lock", suggestion: "Allow natural variations from perspective, lighting, and expressions." },
    { word: "must match", type: "Geometry Lock", suggestion: "Let the AI blend styling naturally with the environment." },
    { word: "pixel perfect", type: "Geometry Lock", suggestion: "Describe optics like 'creamy bokeh' or 'film grain' for realism." },
    { word: "without distortion", type: "Geometry Lock", suggestion: "Some lens distortion is natural; rely on camera/lens setup." }
  ];

  const detected = [];
  BANNED_KEYWORDS.forEach(rule => {
    const regex = new RegExp(`\\b${rule.word}\\b`, 'i');
    if (regex.test(cleanPrompt)) {
      detected.push(rule);
    }
  });

  const warningContainer = document.getElementById("buzzword-warnings");
  if (warningContainer) {
    if (detected.length > 0 && cleanPrompt !== "") {
      let warningHtml = `<div class="warning-title">⚠️ Photorealistic Warnings:</div>`;
      detected.forEach(rule => {
        warningHtml += `<div class="warning-item">Avoid <strong>"${rule.word}"</strong> (${rule.type}) — ${rule.suggestion}</div>`;
      });
      warningContainer.innerHTML = warningHtml;
      warningContainer.style.display = "flex";
    } else {
      warningContainer.style.display = "none";
    }
  }

  updateDropdownExclusions();
}

// Copy prompt
function copyPromptToClipboard() {
  const textVal = getEditablePromptText();
  if (textVal === "") return;

  navigator.clipboard.writeText(textVal).then(() => {
    const copyBtn = document.getElementById("btn-copy");
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    copyBtn.classList.add("neon-glow-pink");

    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove("neon-glow-pink");
    }, 1500);
  }).catch(err => {
    console.error("Clipboard copy failed:", err);
  });
}

// Save state to localStorage by mode (Step 12)
function saveCurrentModeState() {
  if (!state.mode) return;
  enforceFaceMatchInvariant({ updateUI: false });
  enforceModeReferencePolicy({ updateUI: false });
  pruneSelectionsForMode(state.selections, state.mode);
  const modeKey = `model_prompt_forge_state_${state.mode.replace("-", "_")}`;

  const payload = {
    selections: getModeCompatibleSelections(state.selections, state.mode),
    customColors: state.customColors,
    imageReferences: state.imageReferences,
    aspectRatio: state.aspectRatio,
    width: document.getElementById("input-width") ? document.getElementById("input-width").value : "768",
    height: document.getElementById("input-height") ? document.getElementById("input-height").value : "1024",
    template: document.getElementById("template-select") ? document.getElementById("template-select").value : "portrait",
    nsfwEnabled: document.getElementById("toggle-nsfw") ? document.getElementById("toggle-nsfw").checked : false,
    gptSafeEnabled: document.getElementById("toggle-gpt-safe") ? document.getElementById("toggle-gpt-safe").checked : false,
    provider: document.getElementById("api-provider-select")?.value || null,
    submodel: document.getElementById("api-submodel-select")?.value || null,
    imageResolution: getSelectedImageResolution(),
    faceReferenceImageA: state.faceReferenceImageA,
    faceReferenceImageB: state.faceReferenceImageB,
    faceReferenceJobIds: state.faceReferenceJobIds,
    styleReferenceImageA: state.styleReferenceImageA,
    styleReferenceImageB: state.styleReferenceImageB,
    styleReferenceJobIds: state.styleReferenceJobIds,
    characterReferenceImageA: state.characterReferenceImageA,
    characterReferenceImageB: state.characterReferenceImageB,
    characterReferenceJobIds: state.characterReferenceJobIds,
    characterReferenceOverrides: state.characterReferenceOverrides
  };

  localStorage.setItem(modeKey, JSON.stringify(payload));
  localStorage.setItem("model_prompt_forge_active_mode", state.mode);
}

// Restore state from localStorage by mode (Step 12)
function restoreCurrentModeState() {
  if (!state.mode) return;
  const modeKey = `model_prompt_forge_state_${state.mode.replace("-", "_")}`;
  const saved = localStorage.getItem(modeKey);
  if (!saved) {
    // If no saved state, reset form selections to default
    state.isRestoringState = true;
    resetForm();
    state.isRestoringState = false;
    return;
  }

  try {
    const payload = JSON.parse(saved);
    if (!payload || typeof payload !== "object") return;

    // 1. Restore core state objects
    state.selections = pruneSelectionsForMode(migrateLegacySelections(payload.selections), state.mode);
    state.customColors = {
      "Color": { enabled: false, base: "#4a3728", highlightEnabled: false, highlight: "#ff00a0" },
      "Top": { enabled: false, color: "#ffffff" },
      "Bottom": { enabled: false, color: "#ffffff" },
      "Dress": { enabled: false, color: "#ffffff" },
      "Shoes": { enabled: false, color: "#ffffff" },
      "Product Type": { enabled: false, color: "#ffffff" },
      ...(payload.customColors || {})
    };
    state.imageReferences = {
      faceMatch: false,
      styleMatch: false,
      poseMatch: false,
      characterReference: false,
      ...(payload.imageReferences || {})
    };
    state.aspectRatio = payload.aspectRatio || "6:8";
    state.faceReferenceImageA = payload.faceReferenceImageA || null;
    state.faceReferenceImageB = payload.faceReferenceImageB || null;
    state.faceReferenceJobIds = payload.faceReferenceJobIds || [];
    state.styleReferenceImageA = payload.styleReferenceImageA || null;
    state.styleReferenceImageB = payload.styleReferenceImageB || null;
    state.styleReferenceJobIds = payload.styleReferenceJobIds || [];
    state.characterReferenceImageA = payload.characterReferenceImageA || null;
    state.characterReferenceImageB = payload.characterReferenceImageB || null;
    state.characterReferenceJobIds = payload.characterReferenceJobIds || [];
    state.characterReferenceOverrides = payload.characterReferenceOverrides === true;
    if (payload.provider) {
      populateProviderList(payload.provider);
      updateSubmodelList(payload.submodel || null);
      updateImageResolutionControl(payload.imageResolution || null);
    }
    if (state.mode !== "normal") {
      clearCharacterReferenceState({ updateUI: false });
    }

    // 2. Restore DOM element values
    const inputWidth = document.getElementById("input-width");
    const inputHeight = document.getElementById("input-height");
    if (inputWidth && payload.width) inputWidth.value = payload.width;
    if (inputHeight && payload.height) inputHeight.value = payload.height;

    // Aspect ratio chips
    document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
      chip.classList.remove("active");
      if (chip.getAttribute("data-ratio") === state.aspectRatio) {
        chip.classList.add("active");
      }
    });

    // Image reference checks
    const refFaceMatch = document.getElementById("ref-face-match");
    const refStyleMatch = document.getElementById("ref-style-match");
    const refPoseMatch = document.getElementById("ref-pose-match");
    if (refFaceMatch) refFaceMatch.checked = state.imageReferences.faceMatch;
    if (refStyleMatch) refStyleMatch.checked = state.imageReferences.styleMatch;
    if (refPoseMatch) refPoseMatch.checked = state.imageReferences.poseMatch;
    const storyCharacterReference = document.getElementById("story-use-character-reference");
    if (storyCharacterReference) {
      storyCharacterReference.checked = isStoryCharacterReferenceActive();
    }
    enforceFaceMatchInvariant({ updateUI: false });

    // Toggle container display
    const faceMatchUploadContainer = document.getElementById("face-match-upload-container");
    if (faceMatchUploadContainer) {
      faceMatchUploadContainer.style.display = state.imageReferences.faceMatch ? "block" : "none";
    }

    // Toggle NSFW & GPT-Safe
    const toggleNsfw = document.getElementById("toggle-nsfw");
    if (toggleNsfw) {
      toggleNsfw.checked = !!payload.nsfwEnabled;
      const nsfwAccordion = document.getElementById("accordion-nsfw");
      if (nsfwAccordion) {
        nsfwAccordion.style.display = toggleNsfw.checked ? "block" : "none";
      }
    }
    const toggleGptSafe = document.getElementById("toggle-gpt-safe");
    if (toggleGptSafe) {
      toggleGptSafe.checked = !!payload.gptSafeEnabled;
    }

    // Template select
    const templateSelect = document.getElementById("template-select");
    if (templateSelect && payload.template) templateSelect.value = payload.template;

    // 3. Re-render attributes form fields (sync DOM selects with state.selections)
    document.querySelectorAll("#form-container .custom-select").forEach(select => {
      const fieldName = select.getAttribute("data-field");
      const customInput = select.closest(".form-field").querySelector(".custom-writein-input");

      if (state.selections[fieldName]) {
        const selection = state.selections[fieldName];
        if (selection.isCustom) {
          select.value = "__custom__";
          if (customInput) {
            customInput.value = selection.value;
            customInput.style.display = "block";
          }
        } else {
          select.value = selection.id;
          if (customInput) {
            customInput.value = "";
            customInput.style.display = "none";
          }
        }
      } else {
        select.value = "";
        if (customInput) {
          customInput.value = "";
          customInput.style.display = "none";
        }
      }
      updateAccordionSummaryBadges(select.getAttribute("data-group"));
    });
    syncVisualPickers();

    // 4. Sync Color Pickers UI
    updateColorPickerUI();

    // 5. Lockout and previews
    refreshReferenceAuthorityUI();
    updateReferencePreviewsUI();

    // 6. Recalculate preview
    updatePromptPreview();

  } catch (err) {
    console.error("Failed to restore mode state:", err);
  }
}

// Reset form
function resetForm() {
  document.querySelectorAll("#form-container .custom-select").forEach(select => {
    select.value = "";
    const formField = select.closest(".form-field");
    if (formField) {
      const customInput = formField.querySelector(".custom-writein-input");
      if (customInput) {
        customInput.value = "";
        customInput.style.display = "none";
      }
    }
  });

  document.getElementById("ref-face-match").checked = false;
  document.getElementById("ref-style-match").checked = false;
  document.getElementById("ref-pose-match").checked = false;

  const toggleNsfw = document.getElementById("toggle-nsfw");
  if (toggleNsfw) toggleNsfw.checked = false;
  const nsfwAccordion = document.getElementById("accordion-nsfw");
  if (nsfwAccordion) nsfwAccordion.style.display = "none";

  const toggleGptSafe = document.getElementById("toggle-gpt-safe");
  if (toggleGptSafe) toggleGptSafe.checked = false;

  state.selections = {};
  state.imageReferences = { faceMatch: false, styleMatch: false, poseMatch: false, characterReference: false };
  clearFaceReferenceState({ updateUI: false });
  clearCharacterReferenceState({ updateUI: false });
  state.aspectRatio = "6:8";
  state.customColors = {
    "Color": { enabled: false, base: "#4a3728", highlightEnabled: false, highlight: "#ff00a0" },
    "Top": { enabled: false, color: "#ffffff" },
    "Bottom": { enabled: false, color: "#ffffff" },
    "Dress": { enabled: false, color: "#ffffff" },
    "Shoes": { enabled: false, color: "#ffffff" },
    "Product Type": { enabled: false, color: "#ffffff" }
  };
  updateColorPickerUI();
  syncVisualPickers();

  // Hide Face Match container
  const faceUploadContainer = document.getElementById("face-match-upload-container");
  if (faceUploadContainer) faceUploadContainer.style.display = "none";
  const faceFileInput = document.getElementById("face-match-file");
  if (faceFileInput) faceFileInput.value = "";

  // Reset linked dimensions inputs
  const inputWidth = document.getElementById("input-width");
  const inputHeight = document.getElementById("input-height");
  if (inputWidth) inputWidth.value = "768";
  if (inputHeight) inputHeight.value = "1024";

  // Clear presets select
  const presetSelect = document.getElementById("preset-select");
  if (presetSelect) presetSelect.value = "";

  document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
    chip.classList.remove("active");
    if (chip.getAttribute("data-ratio") === "6:8") {
      chip.classList.add("active");
    }
  });

  document.querySelectorAll(".accordion-badge").forEach(badge => {
    badge.textContent = "";
    badge.style.display = "none";
  });

  const templateSelect = document.getElementById("template-select");
  if (templateSelect && templateSelect.options.length > 0) templateSelect.selectedIndex = 0;

  refreshReferenceAuthorityUI();
  updateReferencePreviewsUI();
  updatePromptPreview();
}

// Export state as JSON
function exportConfigJSON() {
  const exportSelections = getModeCompatibleSelections(state.selections, state.mode);
  const payload = {
    schemaVersion: 4,
    mode: state.mode,
    provider: document.getElementById("api-provider-select")?.value || null,
    submodel: document.getElementById("api-submodel-select")?.value || null,
    imageResolution: getSelectedImageResolution(),
    selections: {},
    imageReferences: {
      ...state.imageReferences,
      characterOverrides: state.characterReferenceOverrides
    },
    characterReferenceOverrides: state.characterReferenceOverrides,
    aspectRatio: state.aspectRatio,
    template: document.getElementById("template-select").value || "portrait",
    customColors: state.customColors
  };

  Object.keys(exportSelections).forEach(field => {
    payload.selections[field] = {
      id: exportSelections[field].id,
      value: getPromptValueForSelection(exportSelections[field], field),
      isCustom: exportSelections[field].isCustom
    };
  });

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "model-prompt-config.json";
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import JSON preset
function importConfigJSON(jsonString) {
  try {
    const payload = JSON.parse(jsonString);
    if (!payload || typeof payload !== "object") throw new Error("Invalid preset format");

    if (payload.mode && Object.prototype.hasOwnProperty.call(MODE_CATEGORY_POLICY, payload.mode)) {
      state.mode = payload.mode;
      localStorage.setItem("model_prompt_forge_active_mode", state.mode);
      document.querySelectorAll(".mode-chip").forEach(chip => {
        chip.classList.toggle("active", chip.getAttribute("data-mode") === state.mode);
      });
    }

    resetForm();

    if (payload.provider) {
      populateProviderList(payload.provider);
      updateSubmodelList(payload.submodel || null);
      updateImageResolutionControl(payload.imageResolution || null);
    }

    if (payload.template) {
      const templateSelect = document.getElementById("template-select");
      templateSelect.value = payload.template;
    }

    if (payload.aspectRatio) {
      state.aspectRatio = payload.aspectRatio;
      document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
        chip.classList.remove("active");
        if (chip.getAttribute("data-ratio") === payload.aspectRatio) {
          chip.classList.add("active");
        }
      });
    }

    if (payload.imageReferences) {
      state.imageReferences = {
        faceMatch: false,
        styleMatch: false,
        poseMatch: false,
        characterReference: false,
        ...payload.imageReferences
      };
      state.characterReferenceOverrides = payload.characterReferenceOverrides === true
        || payload.imageReferences.characterOverrides === true;
      if (state.mode !== "normal") state.imageReferences.characterReference = false;
      document.getElementById("ref-face-match").checked = !!payload.imageReferences.faceMatch;
      document.getElementById("ref-style-match").checked = !!payload.imageReferences.styleMatch;
      document.getElementById("ref-pose-match").checked = !!payload.imageReferences.poseMatch;
      const storyCharacterReference = document.getElementById("story-use-character-reference");
      if (storyCharacterReference) {
        storyCharacterReference.checked = isStoryCharacterReferenceActive();
      }
      enforceFaceMatchInvariant({ updateUI: false });
    }

    if (payload.customColors) {
      state.customColors = {
        "Color": { enabled: false, base: "#4a3728", highlightEnabled: false, highlight: "#ff00a0" },
        "Top": { enabled: false, color: "#ffffff" },
        "Bottom": { enabled: false, color: "#ffffff" },
        "Dress": { enabled: false, color: "#ffffff" },
        "Shoes": { enabled: false, color: "#ffffff" },
        "Product Type": { enabled: false, color: "#ffffff" },
        ...JSON.parse(JSON.stringify(payload.customColors))
      };
      updateColorPickerUI();
    }

    let hasNsfwSelection = false;
    const importedSelections = pruneSelectionsForMode(migrateLegacySelections(payload.selections), state.mode);
    if (Object.keys(importedSelections).length > 0) {
      Object.keys(importedSelections).forEach(field => {
        const item = importedSelections[field];
        const select = document.querySelector(`.custom-select[data-field="${field}"]`);
        if (!select) return;

        const groupName = select.getAttribute("data-group");
        if (groupName === "NSFW") {
          hasNsfwSelection = true;
        }

        const libItem = state.library.find(li => li.id === item.id);

        if (item.isCustom) {
          select.value = "__custom__";
          const formField = select.closest(".form-field");
          if (formField) {
            const customInput = formField.querySelector(".custom-writein-input");
            if (customInput) {
              customInput.value = item.value;
              customInput.style.display = "block";
            }
          }
          state.selections[field] = {
            id: "__custom__",
            value: item.value,
            isCustom: true,
            group: groupName,
            category: FIELD_TO_CATEGORY_MAP[field] || groupName.toLowerCase(),
            tags: []
          };
        } else {
          select.value = item.id;
          state.selections[field] = {
            id: item.id,
            value: item.value,
            isCustom: false,
            group: groupName,
            category: libItem ? libItem.category : (FIELD_TO_CATEGORY_MAP[field] || groupName.toLowerCase()),
            tags: libItem ? (libItem.tags || []) : [],
            gptPositiveWords: libItem && libItem.prompt && libItem.prompt["gpt-image-positive"] ? libItem.prompt["gpt-image-positive"].split(",").map(w => w.trim()) : []
          };
        }
        updateAccordionSummaryBadges(groupName);
      });
    }

    const toggleNsfw = document.getElementById("toggle-nsfw");
    if (toggleNsfw) {
      toggleNsfw.checked = hasNsfwSelection;
    }
    const nsfwAccordion = document.getElementById("accordion-nsfw");
    if (nsfwAccordion) {
      nsfwAccordion.style.display = hasNsfwSelection ? "block" : "none";
    }

        refreshReferenceAuthorityUI();
        updateLightboxNavigationLabels();
        updatePromptPreview();

  } catch (error) {
    void AppDialog.alert("Failed to load preset configuration: " + error.message, { title: "Preset Error" });
  }
}

// Update the interactive color picker states and inputs in DOM (Step 11)
function updateColorPickerUI() {
  // Hair Color Pickers
  const hairBaseToggle = document.getElementById("hair-base-toggle");
  const hairBaseInput = document.getElementById("hair-base-input");
  if (hairBaseToggle && hairBaseInput) {
    hairBaseToggle.checked = !!(state.customColors && state.customColors["Color"] && state.customColors["Color"].enabled);
    hairBaseInput.value = (state.customColors && state.customColors["Color"] && state.customColors["Color"].base) || "#4a3728";
    hairBaseInput.disabled = !hairBaseToggle.checked;
  }
  const hairHighlightToggle = document.getElementById("hair-highlight-toggle");
  const hairHighlightInput = document.getElementById("hair-highlight-input");
  if (hairHighlightToggle && hairHighlightInput) {
    hairHighlightToggle.checked = !!(state.customColors && state.customColors["Color"] && state.customColors["Color"].highlightEnabled);
    hairHighlightInput.value = (state.customColors && state.customColors["Color"] && state.customColors["Color"].highlight) || "#ff00a0";
    hairHighlightInput.disabled = !hairHighlightToggle.checked;
  }

  // Clothing Color Pickers
  ["Top", "Bottom", "Dress", "Shoes", "Product Type"].forEach(field => {
    const fieldSlug = field.toLowerCase().replace(/\s+/g, "-");
    const toggle = document.getElementById(`clothing-toggle-${fieldSlug}`);
    const input = document.getElementById(`clothing-input-${fieldSlug}`);
    if (toggle && input) {
      toggle.checked = !!(state.customColors && state.customColors[field] && state.customColors[field].enabled);
      input.value = (state.customColors && state.customColors[field] && state.customColors[field].color) || "#ffffff";
      input.disabled = !toggle.checked;
    }
  });
}

// Lockout facial features when Face Match is checked
function applyFaceMatchLockout() {
  const isLocked = state.imageReferences.faceMatch
    || (isStoryCharacterReferenceActive() && !state.characterReferenceOverrides);

  FACE_MATCH_OWNED_FIELDS.forEach(field => {
    const select = document.querySelector(`.custom-select[data-field="${field}"]`);
    if (!select) return;

    const formField = select.closest(".form-field");
    if (isLocked) {
      select.disabled = true;
      if (formField) formField.classList.add("disabled");
    } else {
      select.disabled = false;
      if (formField) formField.classList.remove("disabled");
    }
  });
  updateAccordionSummaryBadges("Face");
}

// Randomize selections
function randomizeSelections() {
  Object.keys(state.selections).forEach(field => {
    if (!state.lockedFields.has(field)) {
      delete state.selections[field];
    }
  });

  document.querySelectorAll("#form-container .custom-select").forEach(select => {
    const fieldName = select.getAttribute("data-field");
    if (!state.lockedFields.has(fieldName)) {
      select.value = "";
      const customInput = select.closest(".form-field").querySelector(".custom-writein-input");
      if (customInput) {
        customInput.value = "";
        customInput.style.display = "none";
      }
    }
  });

  document.querySelectorAll(".accordion-badge").forEach(badge => {
    badge.textContent = "";
    badge.style.display = "none";
  });

  const isFaceLocked = state.imageReferences.faceMatch;
  const faceFields = ["Face Shape", "Eyes", "Eyebrows", "Nose", "Lips", "Smile", "Expression"];

  document.querySelectorAll("#form-container .custom-select").forEach(select => {
    const fieldName = select.getAttribute("data-field");
    const groupName = select.getAttribute("data-group");

    if (select.disabled || (isFaceLocked && faceFields.includes(fieldName))) return;
    if (state.lockedFields.has(fieldName)) return;
    if (Math.random() > 0.65) return;

    let options = Array.from(select.options).filter(opt => opt.value !== "" && opt.value !== "__custom__");

    if (fieldName === "Ethnicity") {
      const asianIds = ["character.007", "character.008", "character.009", "character.010", "character.011"];
      options = options.filter(opt => asianIds.includes(opt.value));
    }

    if (options.length === 0) return;

    const randomOpt = options[Math.floor(Math.random() * options.length)];
    select.value = randomOpt.value;

    const promptVal = randomOpt.getAttribute("data-prompt");
    state.selections[fieldName] = { id: randomOpt.value, value: promptVal, isCustom: false, group: groupName };
    updateAccordionSummaryBadges(groupName);
  });

  updatePromptPreview();
}

// Copy prompt as JSON
function copyPromptAsJSON() {
  const textVal = getEditablePromptText();
  if (textVal === "") return;

  const currentTemplateName = document.getElementById("template-select").value || "portrait";
  const structuredAttrs = {};

  Object.keys(state.selections).forEach(fieldName => {
    const selection = state.selections[fieldName];
    const group = selection.group;

    if (!structuredAttrs[group]) {
      structuredAttrs[group] = {};
    }
    structuredAttrs[group][fieldName] = {
      id: selection.id,
      prompt_value: getPromptValueForSelection(selection)
    };
  });

  const refAttrs = {};
  if (state.imageReferences.faceMatch) refAttrs["Face Match"] = "100% Identity Lock Active";
  if (state.imageReferences.styleMatch) refAttrs["Style Match"] = "Style & Outfit Match Active";
  if (state.imageReferences.poseMatch) refAttrs["Pose Match"] = "Pose & Composition Match Active";
  if (isStoryCharacterReferenceActive()) refAttrs["Character Reference"] = "Character Sheet Design Reference Active";
  if (Object.keys(refAttrs).length > 0) {
    structuredAttrs["Image Reference Options"] = refAttrs;
  }

  const jsonPayload = JSON.stringify({
    template: currentTemplateName,
    aspect_ratio: state.aspectRatio,
    attributes: structuredAttrs
  }, null, 2);

  navigator.clipboard.writeText(jsonPayload).then(() => {
    const copyJsonBtn = document.getElementById("btn-copy-json");
    const originalText = copyJsonBtn.textContent;
    copyJsonBtn.textContent = "Copied JSON!";
    copyJsonBtn.classList.add("neon-glow-pink");

    setTimeout(() => {
      copyJsonBtn.textContent = originalText;
      copyJsonBtn.classList.remove("neon-glow-pink");
    }, 1500);
  }).catch(err => {
    console.error("JSON clipboard copy failed:", err);
  });
}

function getApiErrorMessage(payload, fallback) {
  return payload?.error?.message || payload?.error || payload?.message || fallback;
}

function getCollectionById(collectionId) {
  return state.collections.find(collection => collection.id === collectionId) || null;
}

function getCollectionsForJob(jobId) {
  return state.collections.filter(collection => collection.jobIds.includes(jobId));
}

async function loadCollections({ preserveSelection = true } = {}) {
  try {
    const response = await fetch('/api/collections');
    const payload = await response.json();
    if (!response.ok) throw new Error(getApiErrorMessage(payload, 'Failed to load collections.'));
    state.collections = payload.collections || [];
    state.defaultCollectionId = payload.defaultCollectionId || null;
    if (
      !preserveSelection ||
      (state.selectedCollectionId !== 'all' && !getCollectionById(state.selectedCollectionId))
    ) {
      state.selectedCollectionId = 'all';
    }
    renderCollectionToolbar();
    if (state.history) renderHistory(state.history);
    syncOpenLightboxContext();
  } catch (error) {
    console.error('Failed to load collections:', error);
  }
}

function renderCollectionToolbar() {
  const select = document.getElementById('collection-select');
  const editButton = document.getElementById('btn-edit-collection');
  const count = document.getElementById('collection-count');
  if (!select || !count) return;

  select.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = `All Images (${state.history?.length || 0}${state.historyHasMore ? '+' : ''} loaded)`;
  select.appendChild(allOption);

  state.collections.forEach(collection => {
    const option = document.createElement('option');
    option.value = collection.id;
    option.textContent = `${collection.isDefault ? '★ ' : ''}${collection.name} (${collection.imageCount})`;
    select.appendChild(option);
  });

  select.value = state.selectedCollectionId;
  const activeCollection = getCollectionById(state.selectedCollectionId);
  count.textContent = activeCollection
    ? `${activeCollection.imageCount} image${activeCollection.imageCount === 1 ? '' : 's'}${activeCollection.isDefault ? ' · Default' : ''}`
    : `${state.history?.length || 0}${state.historyHasMore ? '+' : ''} loaded`;
  if (editButton) editButton.disabled = !activeCollection;
}

function setCollectionModalVisibility(modal, visible) {
  if (!modal) return;
  modal.style.display = visible ? 'flex' : 'none';
  document.body.style.overflow = visible ? 'hidden' : '';
}

function updateCollectionCharacterCounts() {
  [
    ['collection-name', 'collection-name-count'],
    ['collection-description', 'collection-description-count'],
    ['collection-story', 'collection-story-count']
  ].forEach(([fieldId, countId]) => {
    const field = document.getElementById(fieldId);
    const count = document.getElementById(countId);
    if (field && count) count.textContent = field.value.length;
  });
}

function populateCollectionCoverOptions(collection) {
  const field = document.getElementById('collection-cover-field');
  const select = document.getElementById('collection-cover');
  if (!field || !select) return;
  select.innerHTML = '';
  if (!collection || collection.jobIds.length === 0) {
    field.style.display = 'none';
    return;
  }
  collection.jobIds.forEach((jobId, index) => {
    const historyItem = state.history.find(item => item.id === jobId);
    if (!historyItem) return;
    const option = document.createElement('option');
    option.value = jobId;
    option.textContent = `Image ${index + 1} · #${jobId.substring(4, 9)}`;
    select.appendChild(option);
  });
  select.value = collection.coverJobId || collection.jobIds[0];
  field.style.display = select.options.length ? 'block' : 'none';
}

function openCollectionEditor(collection = null, { pendingJobId = null } = {}) {
  const modal = document.getElementById('collection-editor-modal');
  const title = document.getElementById('collection-editor-title');
  const error = document.getElementById('collection-editor-error');
  const deleteButton = document.getElementById('btn-delete-collection');
  document.getElementById('collection-editor-id').value = collection?.id || '';
  document.getElementById('collection-name').value = collection?.name || '';
  document.getElementById('collection-description').value = collection?.description || '';
  document.getElementById('collection-story').value = collection?.story || '';
  document.getElementById('collection-set-default').checked = collection?.isDefault === true;
  title.textContent = collection ? 'Edit Collection' : 'New Collection';
  error.textContent = '';
  deleteButton.style.display = collection ? 'inline-flex' : 'none';
  state.pendingCollectionJobId = pendingJobId;
  populateCollectionCoverOptions(collection);
  updateCollectionCharacterCounts();
  setCollectionModalVisibility(modal, true);
  setTimeout(() => document.getElementById('collection-name').focus(), 0);
}

function closeCollectionEditor() {
  state.pendingCollectionJobId = null;
  setCollectionModalVisibility(document.getElementById('collection-editor-modal'), false);
}

async function saveCollectionFromEditor(event) {
  event.preventDefault();
  const id = document.getElementById('collection-editor-id').value;
  const setAsDefault = document.getElementById('collection-set-default').checked;
  const payload = {
    name: document.getElementById('collection-name').value,
    description: document.getElementById('collection-description').value,
    story: document.getElementById('collection-story').value
  };
  const coverSelect = document.getElementById('collection-cover');
  if (id && coverSelect?.value) payload.coverJobId = coverSelect.value;
  const error = document.getElementById('collection-editor-error');
  error.textContent = '';

  try {
    const response = await fetch(id ? `/api/collections/${id}` : '/api/collections', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? payload : { ...payload, setAsDefault })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(getApiErrorMessage(result, 'Could not save collection.'));
    const collectionId = result.id;
    if (!id) document.getElementById('collection-editor-id').value = collectionId;

    if (id) {
      if (setAsDefault && state.defaultCollectionId !== collectionId) {
        await fetch(`/api/collections/${collectionId}/default`, { method: 'PUT' });
      } else if (!setAsDefault && state.defaultCollectionId === collectionId) {
        await fetch('/api/collections/default', { method: 'DELETE' });
      }
    }

    if (state.pendingCollectionJobId) {
      const addResponse = await fetch(`/api/collections/${collectionId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: [state.pendingCollectionJobId] })
      });
      if (!addResponse.ok) {
        const addPayload = await addResponse.json();
        throw new Error(getApiErrorMessage(addPayload, 'Collection saved, but image could not be added.'));
      }
    }

    state.selectedCollectionId = collectionId;
    closeCollectionEditor();
    await loadCollections();
    await loadHistory({ reset: true });
  } catch (saveError) {
    error.textContent = saveError.message;
  }
}

async function deleteActiveCollection() {
  const id = document.getElementById('collection-editor-id').value;
  const collection = getCollectionById(id);
  if (!collection) return;
  const confirmed = await AppDialog.confirm(
    `Delete collection "${collection.name}"? Images and history will be kept.`,
    { title: "Delete Collection", confirmLabel: "Delete" }
  );
  if (!confirmed) return;
  const response = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
  const payload = await response.json();
  if (!response.ok) {
    document.getElementById('collection-editor-error').textContent =
      getApiErrorMessage(payload, 'Could not delete collection.');
    return;
  }
  state.selectedCollectionId = 'all';
  closeCollectionEditor();
  await loadCollections();
  await loadHistory({ reset: true });
}

function renderMembershipModal() {
  const list = document.getElementById('collection-membership-list');
  const error = document.getElementById('collection-membership-error');
  if (!list) return;
  list.innerHTML = '';
  error.textContent = '';

  if (state.collections.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'no-history-text';
    empty.textContent = 'No collections yet. Create one to organize this image.';
    list.appendChild(empty);
    return;
  }

  state.collections.forEach(collection => {
    const label = document.createElement('label');
    label.className = 'collection-membership-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = collection.jobIds.includes(state.collectionMembershipJobId);
    checkbox.addEventListener('change', async () => {
      checkbox.disabled = true;
      error.textContent = '';
      try {
        const response = await fetch(
          checkbox.checked
            ? `/api/collections/${collection.id}/images`
            : `/api/collections/${collection.id}/images/${state.collectionMembershipJobId}`,
          checkbox.checked
            ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jobIds: [state.collectionMembershipJobId] })
            }
            : { method: 'DELETE' }
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(getApiErrorMessage(payload, 'Could not update membership.'));
        await loadCollections();
        renderMembershipModal();
        if (document.getElementById('lightbox-modal')?.activeItem) {
          renderLightboxCollections(document.getElementById('lightbox-modal').activeItem.id);
        }
      } catch (membershipError) {
        checkbox.checked = !checkbox.checked;
        checkbox.disabled = false;
        error.textContent = membershipError.message;
      }
    });
    const copy = document.createElement('span');
    copy.className = 'collection-membership-copy';
    const name = document.createElement('strong');
    name.textContent = collection.name;
    const meta = document.createElement('small');
    meta.textContent = `${collection.imageCount} image${collection.imageCount === 1 ? '' : 's'}`;
    copy.append(name, meta);
    label.append(checkbox, copy);
    if (collection.isDefault) {
      const badge = document.createElement('span');
      badge.className = 'collection-default-badge';
      badge.textContent = 'DEFAULT';
      label.appendChild(badge);
    }
    list.appendChild(label);
  });
}

function openMembershipModal(jobId) {
  state.collectionMembershipJobId = jobId;
  renderMembershipModal();
  setCollectionModalVisibility(document.getElementById('collection-membership-modal'), true);
}

function closeMembershipModal() {
  state.collectionMembershipJobId = null;
  setCollectionModalVisibility(document.getElementById('collection-membership-modal'), false);
}

function renderLightboxCollections(jobId) {
  const list = document.getElementById('lightbox-collection-list');
  if (!list) return;
  list.innerHTML = '';
  const memberships = getCollectionsForJob(jobId);
  if (memberships.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'no-history-text';
    empty.textContent = 'Not in a collection';
    list.appendChild(empty);
    return;
  }
  memberships.forEach(collection => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'collection-chip';
    chip.textContent = `${collection.isDefault ? '★ ' : ''}${collection.name}`;
    chip.addEventListener('click', () => {
      state.selectedCollectionId = collection.id;
      renderCollectionToolbar();
      closeLightbox();
      loadHistory({ reset: true });
    });
    list.appendChild(chip);
  });
}

function initializeCollectionsUI() {
  const select = document.getElementById('collection-select');
  const editorModal = document.getElementById('collection-editor-modal');
  const membershipModal = document.getElementById('collection-membership-modal');
  select?.addEventListener('change', () => {
    closeLightbox({ restoreFocus: false });
    state.selectedCollectionId = select.value;
    renderCollectionToolbar();
    loadHistory({ reset: true });
  });
  document.getElementById('btn-history-load-more')?.addEventListener('click', () => loadHistory({ reset: false }));
  document.getElementById('btn-history-newer')?.addEventListener('click', () => loadHistory({ reset: true }));
  document.getElementById('btn-new-collection')?.addEventListener('click', () => openCollectionEditor());
  document.getElementById('btn-edit-collection')?.addEventListener('click', () => {
    const collection = getCollectionById(state.selectedCollectionId);
    if (collection) openCollectionEditor(collection);
  });
  document.getElementById('collection-editor-form')?.addEventListener('submit', saveCollectionFromEditor);
  document.getElementById('btn-delete-collection')?.addEventListener('click', deleteActiveCollection);
  ['btn-close-collection-editor', 'btn-cancel-collection'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', closeCollectionEditor)
  );
  ['collection-name', 'collection-description', 'collection-story'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', updateCollectionCharacterCounts)
  );
  editorModal?.addEventListener('click', event => {
    if (event.target === editorModal) closeCollectionEditor();
  });
  document.getElementById('btn-close-membership')?.addEventListener('click', closeMembershipModal);
  document.getElementById('btn-membership-done')?.addEventListener('click', closeMembershipModal);
  document.getElementById('btn-membership-new')?.addEventListener('click', () => {
    const jobId = state.collectionMembershipJobId;
    closeMembershipModal();
    openCollectionEditor(null, { pendingJobId: jobId });
  });
  membershipModal?.addEventListener('click', event => {
    if (event.target === membershipModal) closeMembershipModal();
  });
  document.getElementById('btn-lightbox-add-collection')?.addEventListener('click', () => {
    const item = document.getElementById('lightbox-modal')?.activeItem;
    if (item) openMembershipModal(item.id);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (editorModal?.style.display === 'flex') closeCollectionEditor();
    if (membershipModal?.style.display === 'flex') closeMembershipModal();
  });
}

function initializeScrollToViewport() {
  const button = document.getElementById('btn-scroll-viewport');
  const visualDashboard = document.getElementById('visual-dashboard');
  if (!button || !visualDashboard) return;

  button.addEventListener('click', () => {
    if (visualDashboard.classList.contains('collapsed')) {
      visualDashboard.classList.remove('collapsed');
      const icon = document.querySelector('#btn-toggle-dashboard .toggle-icon');
      if (icon) icon.textContent = '▼';
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    visualDashboard.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });
    const heading = visualDashboard.querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      setTimeout(() => heading.focus({ preventScroll: true }), reducedMotion ? 0 : 450);
    }
  });

}

function initializeAutoExpandConfigurator() {
  const creativeConfigurator = document.getElementById('creative-configurator');
  const btnFloatingConfig = document.getElementById('btn-floating-config');
  if (!creativeConfigurator || !btnFloatingConfig) return;

  let lastScrollY = window.scrollY;
  let scheduled = false;
  let expanding = false;

  const expandAtPageEnd = () => {
    scheduled = false;
    const currentScrollY = window.scrollY;
    const movingDown = currentScrollY > lastScrollY + 1;
    lastScrollY = currentScrollY;

    if (!movingDown || expanding || !creativeConfigurator.classList.contains('collapsed')) return;

    const documentHeight = document.documentElement.scrollHeight;
    const viewportBottom = currentScrollY + window.innerHeight;
    const threshold = Math.max(96, window.innerHeight * 0.08);
    const nearPageEnd = documentHeight - viewportBottom <= threshold;
    const modalOpen = document.querySelector(
      '.collection-modal[style*="display: flex"], #lightbox-modal[style*="display: flex"]'
    );

    if (!nearPageEnd || modalOpen) return;

    expanding = true;
    creativeConfigurator.classList.remove('collapsed');
    btnFloatingConfig.style.display = 'none';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      creativeConfigurator.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start'
      });
      window.setTimeout(() => {
        expanding = false;
        lastScrollY = window.scrollY;
      }, reducedMotion ? 0 : 450);
    });
  };

  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(expandAtPageEnd);
  }, { passive: true });
}

// Load generation history from backend
async function loadHistory({ reset = true } = {}) {
  if (state.historyLoading && !reset) return;
  if (reset) {
    state.historyAbortController?.abort();
    state.historyAbortController = new AbortController();
  }
  const controller = state.historyAbortController || new AbortController();
  state.historyAbortController = controller;
  state.historyLoading = true;
  state.historyError = null;
  renderHistoryPagination();
  try {
    const params = new URLSearchParams({
      limit: '24',
      collectionId: state.selectedCollectionId || 'all'
    });
    if (!reset && state.historyCursor) params.set('cursor', state.historyCursor);
    const res = await fetch(`/api/history?${params}`, { signal: controller.signal });
    const payload = await res.json();
    if (!res.ok && !reset && payload?.error?.code === 'invalid_history_cursor') {
      return loadHistory({ reset: true });
    }
    if (!res.ok) throw new Error(getApiErrorMessage(payload, 'Failed to load history.'));
    const incoming = Array.isArray(payload.items) ? payload.items : [];
    if (reset) {
      state.history = incoming;
      state.historyWindowed = false;
    } else {
      const byId = new Map(state.history.map(item => [item.id, item]));
      incoming.forEach(item => byId.set(item.id, item));
      state.history = [...byId.values()];
      if (state.history.length > 96) {
        state.history = state.history.slice(-96);
        state.historyWindowed = true;
      }
    }
    state.historyCursor = payload.nextCursor || null;
    state.historyHasMore = payload.hasMore === true;
    renderCollectionToolbar();
    renderHistory(state.history);
    syncOpenLightboxContext();

    // Auto-collapse on initial page load if history is empty (Step 7)
    if (state.history.length === 0 && !state.hasInitializedHistoryCollapse) {
      state.hasInitializedHistoryCollapse = true;
      const visualDashboard = document.getElementById("visual-dashboard");
      if (visualDashboard) {
        visualDashboard.classList.add("collapsed");
        const btnToggleDashboard = document.getElementById("btn-toggle-dashboard");
        const icon = btnToggleDashboard ? btnToggleDashboard.querySelector(".toggle-icon") : null;
        if (icon) icon.textContent = "▲";
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error("Failed to load history list:", err);
    state.historyError = err.message;
  } finally {
    if (state.historyAbortController === controller) {
      state.historyLoading = false;
      renderHistoryPagination();
    }
  }
}

function getVisibleHistoryItems(historyList = state.history) {
  return Array.isArray(historyList) ? historyList : [];
}

function renderHistoryPagination() {
  const container = document.getElementById('history-pagination');
  const loadMore = document.getElementById('btn-history-load-more');
  const newer = document.getElementById('btn-history-newer');
  const status = document.getElementById('history-page-status');
  if (!container || !loadMore || !newer || !status) return;
  container.hidden = state.history.length === 0 && !state.historyLoading && !state.historyError;
  loadMore.hidden = !state.historyHasMore;
  loadMore.disabled = state.historyLoading;
  newer.hidden = !state.historyWindowed && !state.historyError;
  newer.disabled = state.historyLoading;
  newer.textContent = state.historyError ? 'Retry' : 'Newer Images';
  status.textContent = state.historyLoading
    ? 'Loading previews...'
    : state.historyError || `${state.history.length}${state.historyHasMore ? '+' : ''} loaded`;
  status.classList.toggle('is-error', Boolean(state.historyError));
}

let historyImageObserver = null;

function observeHistoryImage(img) {
  const beginLoad = () => {
    if (img.src) return;
    img.src = img.dataset.src;
  };
  if (!('IntersectionObserver' in window)) {
    beginLoad();
    return;
  }
  historyImageObserver ||= new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      historyImageObserver.unobserve(entry.target);
      if (!entry.target.src) entry.target.src = entry.target.dataset.src;
    });
  }, { rootMargin: '160px 0px' });
  historyImageObserver.observe(img);
}

// Render history thumbnail grid
function renderHistory(historyList) {
  const grid = document.getElementById("history-grid");
  const placeholder = document.getElementById("no-history-placeholder");
  if (!grid) return;

  historyImageObserver?.disconnect();
  historyImageObserver = null;
  grid.innerHTML = "";

  const visibleHistory = getVisibleHistoryItems(historyList);

  if (visibleHistory.length === 0) {
    grid.innerHTML = `<p class="no-history-text" id="no-history-placeholder">No history found</p>`;
    return;
  }

  visibleHistory.forEach(item => {
    const card = document.createElement("div");
    card.className = "history-item is-image-loading";
    card.title = `Generate: ${(item.prompt || '').substring(0, 100)}...`;

    const loading = document.createElement('span');
    loading.className = 'history-image-loading';
    loading.setAttribute('aria-hidden', 'true');

    const img = document.createElement("img");
    img.dataset.src = item.thumbnailUrl || item.imageUrl;
    img.dataset.fallbackSrc = item.imageUrl;
    img.loading = 'lazy';
    img.decoding = 'async';
    if (item.thumbnailWidth && item.thumbnailHeight) {
      img.width = item.thumbnailWidth;
      img.height = item.thumbnailHeight;
    }
    img.alt = "Generated Character Output";
    img.addEventListener('load', async () => {
      try { await img.decode(); } catch { /* The load event already confirms a usable image. */ }
      img.classList.add('is-loaded');
      card.classList.remove('is-image-loading', 'is-image-error');
    });
    img.addEventListener('error', () => {
      if (!img.dataset.usedFallback && img.dataset.fallbackSrc && img.src !== img.dataset.fallbackSrc) {
        img.dataset.usedFallback = 'true';
        img.src = img.dataset.fallbackSrc;
        return;
      }
      card.classList.remove('is-image-loading');
      card.classList.add('is-image-error');
    });
    img.addEventListener("click", () => openLightbox(item, { triggerElement: img }));

    const btnDel = document.createElement("button");
    btnDel.className = "btn-delete-history";
    btnDel.innerHTML = "&times;";
    btnDel.title = "Delete image record";
    btnDel.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (await AppDialog.confirm("Are you sure you want to delete this generation history?", {
        title: "Delete Image History",
        confirmLabel: "Delete"
      })) {
        deleteHistory(item.id);
      }
    });

    const collectionButton = document.createElement('button');
    collectionButton.type = 'button';
    collectionButton.className = 'history-collection-action';
    collectionButton.textContent = '+';
    collectionButton.title = 'Add or remove from collections';
    collectionButton.setAttribute('aria-label', 'Add or remove image from collections');
    collectionButton.addEventListener('click', event => {
      event.stopPropagation();
      openMembershipModal(item.id);
    });

    const memberships = getCollectionsForJob(item.id);
    if (memberships.length > 0) {
      const badge = document.createElement('span');
      badge.className = 'history-collection-badge';
      badge.textContent = memberships.length === 1 ? memberships[0].name : `${memberships.length} Collections`;
      card.appendChild(badge);
    }

    if (item.comparisonSetId) {
      const comparisonBadge = document.createElement('button');
      comparisonBadge.type = 'button';
      comparisonBadge.className = 'history-comparison-badge';
      comparisonBadge.textContent = 'Compare';
      comparisonBadge.title = 'Open this AI Comparison Set';
      comparisonBadge.addEventListener('click', event => {
        event.stopPropagation();
        window.ModelPromptForgeComparison?.openSet(item.comparisonSetId);
      });
      card.appendChild(comparisonBadge);
    }

    card.appendChild(loading);
    card.appendChild(img);
    card.appendChild(btnDel);
    card.appendChild(collectionButton);
    grid.appendChild(card);
    observeHistoryImage(img);
  });
  renderHistoryPagination();
}

// Delete history record from disk
async function deleteHistory(jobId) {
  try {
    const res = await fetch(`/api/history/${jobId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      await loadCollections();
      loadHistory();
    } else {
      const data = await res.json();
      await AppDialog.alert("Failed to delete entry: " + data.error, { title: "Delete Failed" });
    }
  } catch (err) {
    await AppDialog.alert("Delete operation failed: " + err.message, { title: "Delete Failed" });
  }
}

let lightboxImageLoadToken = 0;

function createLightboxBrowseContext(item) {
  const visibleItems = getVisibleHistoryItems();
  const activeIndex = visibleItems.findIndex(entry => entry.id === item.id);
  if (activeIndex === -1) {
    return { source: "standalone", collectionId: null, itemIds: [item.id], activeIndex: 0 };
  }
  const activeCollection = getCollectionById(state.selectedCollectionId);
  return {
    source: activeCollection ? "collection" : "history",
    collectionId: activeCollection?.id || "all",
    itemIds: visibleItems.map(entry => entry.id),
    activeIndex
  };
}

function updateLightboxNavigationLabels() {
  const previous = document.getElementById("lightbox-previous");
  const next = document.getElementById("lightbox-next");
  const close = document.getElementById("lightbox-close");
  const status = document.getElementById("lightbox-position-status");
  const context = state.lightboxBrowseContext;
  const previousLabel = state.language === "th" ? "ภาพก่อนหน้า" : "Previous image";
  const nextLabel = state.language === "th" ? "ภาพถัดไป" : "Next image";
  const closeLabel = state.language === "th" ? "ปิดหน้าดูภาพ" : "Close image viewer";
  if (previous) {
    previous.setAttribute("aria-label", previousLabel);
    previous.title = previousLabel;
  }
  if (next) {
    next.setAttribute("aria-label", nextLabel);
    next.title = nextLabel;
  }
  if (close) close.setAttribute("aria-label", closeLabel);
  if (!status || !context || context.itemIds.length <= 1) {
    if (status) status.textContent = "";
    return;
  }
  status.textContent = state.language === "th"
    ? `ภาพ ${context.activeIndex + 1} จาก ${context.itemIds.length}`
    : `Image ${context.activeIndex + 1} of ${context.itemIds.length}`;
}

function renderLightboxNavigation() {
  const context = state.lightboxBrowseContext;
  const previous = document.getElementById("lightbox-previous");
  const next = document.getElementById("lightbox-next");
  const hasPrevious = Boolean(context && context.itemIds.length > 1 && context.activeIndex > 0);
  const hasNext = Boolean(context && context.itemIds.length > 1 && context.activeIndex < context.itemIds.length - 1);
  if (previous) previous.hidden = !hasPrevious;
  if (next) next.hidden = !hasNext;
  if (previous?.hidden && document.activeElement === previous) {
    (next?.hidden ? document.getElementById("lightbox-close") : next)?.focus({ preventScroll: true });
  }
  if (next?.hidden && document.activeElement === next) {
    (previous?.hidden ? document.getElementById("lightbox-close") : previous)?.focus({ preventScroll: true });
  }
  updateLightboxNavigationLabels();
}

function preloadLightboxNeighbors() {
  const context = state.lightboxBrowseContext;
  if (!context) return;
  [context.activeIndex - 1, context.activeIndex + 1].forEach(index => {
    const id = context.itemIds[index];
    const item = id ? state.history.find(entry => entry.id === id) : null;
    if (item?.imageUrl) {
      const preload = new Image();
      preload.src = item.imageUrl;
    }
  });
}

function setLightboxImage(item) {
  const img = document.getElementById("lightbox-image");
  const status = document.getElementById("lightbox-position-status");
  if (!img) return;
  const loadToken = ++lightboxImageLoadToken;
  img.classList.add("is-loading");
  img.alt = item.prompt
    ? `${state.language === "th" ? "ภาพที่สร้าง" : "Generated image"}: ${item.prompt.substring(0, 120)}`
    : (state.language === "th" ? "ภาพที่สร้างแบบเต็มขนาด" : "Full resolution generated image");
  img.onload = () => {
    if (loadToken !== lightboxImageLoadToken) return;
    img.classList.remove("is-loading");
    updateLightboxNavigationLabels();
  };
  img.onerror = () => {
    if (loadToken !== lightboxImageLoadToken) return;
    img.classList.remove("is-loading");
    if (status) status.textContent = state.language === "th" ? "โหลดภาพไม่สำเร็จ" : "Image failed to load";
  };
  img.src = item.imageUrl;
}

function openLightbox(item, { triggerElement = null, browseContext = null } = {}) {
  const modal = document.getElementById("lightbox-modal");
  if (!modal || !item) return;
  state.lightboxBrowseContext = browseContext || createLightboxBrowseContext(item);
  if (triggerElement) state.lightboxReturnFocus = triggerElement;
  modal.style.display = "flex";
  renderLightboxItem(item);
  requestAnimationFrame(() => document.getElementById("lightbox-close")?.focus({ preventScroll: true }));
}

function closeLightbox({ restoreFocus = true } = {}) {
  const modal = document.getElementById("lightbox-modal");
  if (!modal || modal.style.display === "none") return;
  modal.style.display = "none";
  modal.activeItem = null;
  state.lightboxBrowseContext = null;
  lightboxImageLoadToken += 1;
  const img = document.getElementById("lightbox-image");
  if (img) {
    img.onload = null;
    img.onerror = null;
    img.classList.remove("is-loading");
    img.removeAttribute("src");
  }
  renderLightboxNavigation();
  const returnFocus = state.lightboxReturnFocus;
  state.lightboxReturnFocus = null;
  if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
}

function navigateLightbox(direction) {
  const context = state.lightboxBrowseContext;
  if (!context || ![-1, 1].includes(direction)) return false;
  const nextIndex = context.activeIndex + direction;
  if (nextIndex < 0 || nextIndex >= context.itemIds.length) return false;
  const nextItem = state.history.find(entry => entry.id === context.itemIds[nextIndex]);
  if (!nextItem) {
    syncOpenLightboxContext();
    return false;
  }
  context.activeIndex = nextIndex;
  renderLightboxItem(nextItem);
  return true;
}

function openLineageLightboxItem(item) {
  const context = state.lightboxBrowseContext;
  const contextIndex = context?.itemIds.indexOf(item.id) ?? -1;
  if (contextIndex >= 0) {
    context.activeIndex = contextIndex;
    renderLightboxItem(item);
    return;
  }
  state.lightboxBrowseContext = {
    source: "standalone",
    collectionId: null,
    itemIds: [item.id],
    activeIndex: 0
  };
  renderLightboxItem(item);
}

function syncOpenLightboxContext() {
  const modal = document.getElementById("lightbox-modal");
  const context = state.lightboxBrowseContext;
  if (!modal || modal.style.display === "none" || !context) return;
  const activeId = modal.activeItem?.id;
  if (context.source === "standalone") {
    const activeItem = state.history.find(entry => entry.id === activeId);
    if (activeItem) renderLightboxItem(activeItem);
    else closeLightbox();
    return;
  }
  if (context.source === "collection" && !getCollectionById(context.collectionId)) {
    closeLightbox({ restoreFocus: false });
    return;
  }
  const visibleItems = getVisibleHistoryItems();
  if (visibleItems.length === 0) {
    closeLightbox();
    return;
  }
  const previousIndex = context.activeIndex;
  context.itemIds = visibleItems.map(item => item.id);
  const retainedIndex = context.itemIds.indexOf(activeId);
  context.activeIndex = retainedIndex >= 0
    ? retainedIndex
    : Math.min(previousIndex, context.itemIds.length - 1);
  renderLightboxItem(visibleItems[context.activeIndex]);
}

// Render one history item into the already-open full screen Lightbox modal.
function renderLightboxItem(item) {
  const modal = document.getElementById("lightbox-modal");
  const img = document.getElementById("lightbox-image");
  const title = document.getElementById("lightbox-meta-title");
  const promptTxt = document.getElementById("lightbox-meta-prompt");
  const engine = document.getElementById("lightbox-meta-engine");
  const model = document.getElementById("lightbox-meta-model");
  const time = document.getElementById("lightbox-meta-time");
  const duration = document.getElementById("lightbox-meta-duration");
  const dlLink = document.getElementById("lightbox-download-link");
  const lineageContainer = document.getElementById("lightbox-lineage-container");
  const lineageList = document.getElementById("lightbox-lineage-list");

  if (!modal || !img) return;

  // Save active item to modal so button event handlers can retrieve it (Step 9)
  modal.activeItem = item;

  setLightboxImage(item);
  title.textContent = `Generation Reference #${item.id.substring(4, 9)}`;
  promptTxt.textContent = item.prompt;
  engine.textContent = item.provider ? item.provider.toUpperCase() : "N/A";
  model.textContent = item.submodel || "N/A";
  const timestamp = Number(item.timestamp || item.createdAt || item.completedAt);
  time.textContent = Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp).toLocaleString()
    : "N/A";
  if (duration) duration.textContent = item.generationDuration ? `${item.generationDuration}s` : "N/A";
  dlLink.href = item.imageUrl;
  const outputExtension = item.imageUrl?.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] || "png";
  dlLink.download = `modelpromptforge-generation-${item.id}.${outputExtension}`;
  renderLightboxCollections(item.id);

  // Render lineage parent links (Step 9)
  if (lineageContainer && lineageList) {
    lineageList.innerHTML = "";
    const faceParents = item.referencedFaceJobIds || [];
    const styleParents = item.referencedStyleJobIds || [];
    const characterParents = item.referencedCharacterJobIds || [];
    const lineageEntries = [
      ...faceParents.map(id => ({ id, type: "Face" })),
      ...styleParents.map(id => ({ id, type: "Style" })),
      ...characterParents.map(id => ({ id, type: "Character" }))
    ].filter(p => p.id);
    const lineageById = new Map();
    lineageEntries.forEach(parent => {
      if (!lineageById.has(parent.id)) {
        lineageById.set(parent.id, { id: parent.id, types: [] });
      }
      const groupedParent = lineageById.get(parent.id);
      if (!groupedParent.types.includes(parent.type)) groupedParent.types.push(parent.type);
    });
    const allParents = [...lineageById.values()];

    if (allParents.length > 0) {
      allParents.forEach(p => {
        let parentItem = (state.history || []).find(h => h.id === p.id);
        const parentThumb = document.createElement("div");
        parentThumb.style.position = "relative";
        parentThumb.style.width = "42px";
        parentThumb.style.height = "42px";
        parentThumb.style.border = "1px solid rgba(255, 255, 255, 0.15)";
        parentThumb.style.borderRadius = "4px";
        parentThumb.style.cursor = "pointer";
        parentThumb.title = `${p.types.join(" + ")} Ref parent: #${p.id.substring(4, 9)}`;

        const thumbImg = document.createElement("img");
        thumbImg.src = parentItem ? (parentItem.thumbnailUrl || parentItem.imageUrl) : "";
        thumbImg.style.width = "100%";
        thumbImg.style.height = "100%";
        thumbImg.style.objectFit = "cover";
        thumbImg.style.borderRadius = "3px";

        const typeBadge = document.createElement("span");
        const typeCodes = { Face: "F", Style: "S", Character: "C" };
        typeBadge.textContent = p.types.map(type => typeCodes[type]).join("+");
        typeBadge.style.position = "absolute";
        typeBadge.style.bottom = "-2px";
        typeBadge.style.right = "-2px";
        typeBadge.style.background = p.types.length > 1
          ? "var(--neon-purple)"
          : (p.types[0] === "Face" ? "var(--neon-cyan)" : (p.types[0] === "Style" ? "var(--neon-pink)" : "var(--neon-gold)"));
        typeBadge.style.color = "#000";
        typeBadge.style.fontSize = "0.55rem";
        typeBadge.style.fontWeight = "900";
        typeBadge.style.padding = "0 3px";
        typeBadge.style.borderRadius = "2px";

        parentThumb.appendChild(thumbImg);
        parentThumb.appendChild(typeBadge);

        if (!parentItem) {
          fetch(`/api/history/${encodeURIComponent(p.id)}`)
            .then(response => response.ok ? response.json() : null)
            .then(loadedParent => {
              if (!loadedParent) return;
              parentItem = loadedParent;
              thumbImg.src = loadedParent.thumbnailUrl || loadedParent.imageUrl;
            })
            .catch(() => {});
        }

        parentThumb.addEventListener("click", async () => {
          if (parentItem) {
            openLineageLightboxItem(parentItem);
          } else {
            await AppDialog.alert(`Parent job #${p.id.substring(4, 9)} is no longer available.`, { title: "Parent Image Unavailable" });
          }
        });

        lineageList.appendChild(parentThumb);
      });
      lineageContainer.style.display = "block";
    } else {
      lineageContainer.style.display = "none";
    }
  }

  renderLightboxNavigation();
  preloadLightboxNeighbors();
}
