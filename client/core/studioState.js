/**
 * ModelPromptForge - Core Studio State & Constants
 */

window.ATTRIBUTE_FILES = [
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

window.FIELD_TO_CATEGORY_MAP = {
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

window.FIELD_TO_PROMPT_CATEGORY_MAP = {
  ...window.FIELD_TO_CATEGORY_MAP,
  "Face Shape": "face_shape"
};

window.GENDER_TO_HAIR_PRESENTATION = {
  "character.001": "feminine",
  "character.002": "masculine"
};

window.HAIR_CUT_STYLE_PRESENTATION_OPTIONS = {
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

window.TAG_CONFLICT_RULES = [
  ["indoor", "outdoor"],
  ["day", "night"],
  ["summer", "winter"],
  ["modern", "vintage"],
  ["cyberpunk", "traditional"]
];

window.CATEGORY_PRIORITIES = {
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

window.MODE_CATEGORY_POLICY = {
  normal: null,
  headshot: new Set(["Character", "Face", "Hair", "Skin", "Camera", "Lighting", "Quality"]),
  "character-sheet": new Set(["Character", "Face", "Hair", "Skin", "Body", "Clothing", "Camera", "Quality"])
};

// Global App State
window.state = {
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
  faceReferenceJobIds: [],
  styleReferenceImageA: null,
  styleReferenceImageB: null,
  styleReferenceJobIds: [],
  characterReferenceImageA: null,
  characterReferenceImageB: null,
  characterReferenceJobIds: [],
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
window.getLocalizedLabel = function(labelObj) {
  if (typeof labelObj === 'object' && labelObj !== null) {
    return labelObj[window.state.language] || labelObj['en'] || '';
  }
  return labelObj || '';
};

window.isGroupAllowedForMode = function(groupName, mode = window.state.mode) {
  const policy = window.MODE_CATEGORY_POLICY[mode];
  if (!policy || !groupName) return true;
  return policy.has(groupName);
};

window.pruneSelectionsForMode = function(selections = window.state.selections, mode = window.state.mode) {
  Object.keys(selections || {}).forEach(fieldName => {
    const groupName = selections[fieldName]?.group;
    if (groupName && !window.isGroupAllowedForMode(groupName, mode)) {
      delete selections[fieldName];
    }
  });
  return selections;
};

window.getModeCompatibleSelections = function(source = window.state.selections, mode = window.state.mode) {
  return window.pruneSelectionsForMode(JSON.parse(JSON.stringify(source || {})), mode);
};
