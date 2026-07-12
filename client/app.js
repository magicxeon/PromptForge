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
  '023-architecture.json'
];

// Mapping ui-schema fields to attribute categories
const FIELD_TO_CATEGORY_MAP = {
  "Gender": "character",
  "Age": "character",
  "Ethnicity": "character",
  "Beauty": "character",
  "Reference Image": "character",
  "Face Shape": "face",
  "Eyes": "eyes",
  "Eyebrows": "eyebrows",
  "Nose": "nose",
  "Lips": "lips",
  "Smile": "lips",
  "Expression": "expression",
  "Length": "hair",
  "Style": "hair",
  "Texture": "hair",
  "Color": "hair",
  "Bangs": "",
  "Tone": "skin",
  "Texture": "skin",
  "Makeup": "skin",
  "Freckles": "skin",
  "Height": "body",
  "Body Shape": "body",
  "Build": "body",
  "Hands": "body",
  "Legs": "body",
  "Top": "clothing",
  "Bottom": "clothing",
  "Dress": "clothing",
  "Shoes": "clothing",
  "Accessories": "clothing",
  "Standing": "pose",
  "Sitting": "pose",
  "Walking": "pose",
  "Hand Position": "pose",
  "Eye Contact": "pose",
  "Location": "environment",
  "Architecture": "environment",
  "Props": "environment",
  "Weather": "environment",
  "Time of Day": "environment",
  "Season": "environment",
  "Key Light": "lighting",
  "Fill Light": "lighting",
  "Back Light": "lighting",
  "Flash": "lighting",
  "Neon": "lighting",
  "Ambient": "lighting",
  "Golden Hour": "lighting",
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
  "Foreground Layer": "foreground_layer",
  "Background Activity": "background_activity",
  "Camera Imperfections": "camera_imperfections"
};

// Submodel options definition per provider
const PROVIDER_SUBMODELS = {
  gemini: [
    { value: 'gemini-3.1-flash-lite-image', name: 'Nano Banana 2 Lite (Fastest & Cheapest)' },
    { value: 'gemini-3.1-flash-image', name: 'Nano Banana 2 (Generalist)' },
    { value: 'gemini-3-pro-image', name: 'Nano Banana Pro (Premium)' },
    { value: 'gemini-2.5-flash-image', name: 'Nano Banana (Legacy)' },
    { value: 'imagen-3.0-generate-002', name: 'Imagen 3 (Legacy)' }
  ],
  openai: [
    { value: 'gpt-image-1-mini', name: 'GPT-Image 1 Mini (Cheapest)' },
    { value: 'gpt-image-1', name: 'GPT-Image 1 (Standard)' },
    { value: 'gpt-image-1.5', name: 'GPT-Image 1.5 (Enhanced)' },
    { value: 'gpt-image-2', name: 'GPT-Image 2 (Premium)' },
    { value: 'dall-e-3', name: 'DALL-E 3 (Legacy)' },
    { value: 'dall-e-2', name: 'DALL-E 2 (Legacy)' }
  ]
};

// Presets definitions
const PRESETS = {
  nightclub: {
    template: "nightclub",
    aspectRatio: "6:8",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Gender": { id: "character.001", value: "female", isCustom: false },
      "Age": { id: "character.004", value: "young adult", isCustom: false },
      "Ethnicity": { id: "character.007", value: "thai", isCustom: false },
      "Beauty": { id: "character.023", value: "cute doll-like Asian woman", isCustom: false },
      "Face Shape": { id: "face.016", value: "doll-like face shape", isCustom: false },
      "Eyes": { id: "eyes.006", value: "doe eyes", isCustom: false },
      "Eyebrows": { id: "eyebrows.001", value: "straight eyebrows", isCustom: false },
      "Nose": { id: "nose.001", value: "small button nose", isCustom: false },
      "Lips": { id: "lips.001", value: "cherry lips", isCustom: false },
      "Smile": { id: "lips.005", value: "gentle smile", isCustom: false },
      "Expression": { id: "face.017", value: "cute doll-like facial features", isCustom: false },
      "Length": { id: "hair_003", value: "long hair", isCustom: false },
      "Style": { id: "hair_023", value: "long loose waves/beach waves", isCustom: false },
      "Color": { id: "hair_021", value: "reddish-orange hair color", isCustom: false },
      "Bangs": { id: "hair_027", value: "see-through bangs", isCustom: false },
      "Tone": { id: "skin.tone_05", value: "rosy fair skin, glowing white complexion with natural soft pinkish undertones", isCustom: false },
      "Texture": { id: "skin.text_06", value: "radiant, smooth, and bright skin, with high-detail specular highlights from a strong camera flash", isCustom: false },
      "Top": { id: "clothing.014", value: "off-the-shoulder top", isCustom: false },
      "Bottom": { id: "clothing.015", value: "skirt with a thigh-high slit", isCustom: false },
      "Fit": { id: "clothing.003", value: "body-con style clothing", isCustom: false },
      "Fabric": { id: "clothing.008", value: "silk satin fabric", isCustom: false },
      "Sitting": { id: "pose.001", value: "crossing legs", isCustom: false },
      "Hand Position": { id: "pose.010", value: "hand touching the side of her face near cheek and ear", isCustom: false },
      "Location": { id: "environment.001", value: "inside a vibrant crowded bar or nightclub", isCustom: false },
      "Props": { id: "environment.009", value: "green glass bottle, glass with a purple straw, smartphone, table items", isCustom: false },
      "Flash": { id: "lighting.flash_01", value: "strong camera flash lighting illuminating the subject directly, making the skin appear radiant, smooth, and bright", isCustom: false },
      "Neon": { id: "lighting.neon_01", value: "strong dramatic red and pink neon lighting casting a warm atmospheric glow across the scene", isCustom: false },
      "Ambient": { id: "lighting.ambient_01", value: "soft highlights on the subject's skin and hair, with rich saturated ambient red environment", isCustom: false },
      "Brand": { id: "camera.brand_01", value: "shot on a modern high-resolution mirrorless camera, sharp focus", isCustom: false },
      "Lens": { id: "camera.lens_01", value: "shot on a high-end prime lens, minimal chromatic aberration, maximum sharpness, clear optics", isCustom: false },
      "Focal Length": { id: "camera.focal_01", value: "shot on a 50mm lens, natural perspective matching standard human vision, zero distortion", isCustom: false },
      "Perspective": { id: "camera.perspective_02", value: "medium close-up shot captured from a slightly low camera angle, highlighting posture", isCustom: false },
      "Aperture": { id: "camera.aperture_01", value: "f/1.4 shallow depth of field, creating circular glowing specular bokeh blur in background", isCustom: false }
    }
  },
  studio: {
    template: "studio",
    aspectRatio: "1:1",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Gender": { id: "character.001", value: "female", isCustom: false },
      "Age": { id: "character.004", value: "young adult", isCustom: false },
      "Ethnicity": { id: "character.009", value: "korean", isCustom: false },
      "Beauty": { id: "character.022", value: "beautiful young Asian woman", isCustom: false },
      "Face Shape": { id: "face.002", value: "oval face", isCustom: false },
      "Eyes": { id: "eyes.001", value: "almond-shaped eyes", isCustom: false },
      "Eyebrows": { id: "eyebrows.002", value: "soft arched eyebrows", isCustom: false },
      "Nose": { id: "nose.002", value: "high nose bridge", isCustom: false },
      "Lips": { id: "lips.003", value: "plump lips", isCustom: false },
      "Style": { id: "hair_022", value: "layered hush cut hairstyle", isCustom: false },
      "Tone": { id: "skin.tone_07", value: "milky white skin, smooth porcelain skin with soft cream undertones", isCustom: false },
      "Texture": { id: "skin.text_02", value: "dewy complexion reflecting soft ambient lights, hydrated skin look", isCustom: false },
      "Top": { id: "clothing.010", value: "corset top", isCustom: false },
      "Bottom": { id: "clothing.017", value: "tight leggings", isCustom: false },
      "Hand Position": { id: "pose.009", value: "hand on hip", isCustom: false },
      "Location": { id: "environment.003", value: "in a photography studio", isCustom: false },
      "Ambient": { id: "lighting.ambient_01", value: "soft highlights on the subject's skin and hair, with rich saturated ambient red environment", isCustom: false },
      "Brand": { id: "camera.brand_01", value: "shot on a modern high-resolution mirrorless camera, sharp focus", isCustom: false },
      "Lens": { id: "camera.lens_01", value: "shot on a high-end prime lens, minimal chromatic aberration, maximum sharpness, clear optics", isCustom: false },
      "Focal Length": { id: "camera.focal_01", value: "shot on a 50mm lens, natural perspective matching standard human vision, zero distortion", isCustom: false },
      "Aperture": { id: "camera.aperture_01", value: "f/1.4 shallow depth of field, creating circular glowing specular bokeh blur in background", isCustom: false }
    }
  },
  street: {
    template: "street",
    aspectRatio: "16:9",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Gender": { id: "character.001", value: "female", isCustom: false },
      "Age": { id: "character.004", value: "young adult", isCustom: false },
      "Ethnicity": { id: "character.008", value: "japanese", isCustom: false },
      "Beauty": { id: "character.022", value: "beautiful young Asian woman", isCustom: false },
      "Face Shape": { id: "face.003", value: "round baby face", isCustom: false },
      "Eyes": { id: "eyes.005", value: "puppy eyes", isCustom: false },
      "Eyebrows": { id: "eyebrows.003", value: "natural thick brows", isCustom: false },
      "Nose": { id: "nose.004", value: "soft rounded tip", isCustom: false },
      "Lips": { id: "lips.002", value: "cupid's bow lips", isCustom: false },
      "Style": { id: "hair_023", value: "long loose waves/beach waves", isCustom: false },
      "Tone": { id: "skin.tone_06", value: "translucent glass skin, highly reflective fair skin with a clear glassy sheen", isCustom: false },
      "Texture": { id: "skin.text_02", value: "dewy complexion reflecting soft ambient lights, hydrated skin look", isCustom: false },
      "Top": { id: "clothing.012", value: "deep V-neckline top", isCustom: false },
      "Standing": { id: "pose.005", value: "looking over shoulder", isCustom: false },
      "Location": { id: "environment.002", value: "on an urban street at night", isCustom: false },
      "Golden Hour": { id: "lighting.golden_01", value: "golden hour lighting", isCustom: false },
      "Brand": { id: "camera.brand_01", value: "shot on a modern high-resolution mirrorless camera, sharp focus", isCustom: false },
      "Lens": { id: "camera.lens_01", value: "shot on a high-end prime lens, minimal chromatic aberration, maximum sharpness, clear optics", isCustom: false },
      "Focal Length": { id: "camera.focal_01", value: "shot on a 50mm lens, natural perspective matching standard human vision, zero distortion", isCustom: false }
    }
  },
  thaiSilk: {
    template: "thaiTraditional",
    aspectRatio: "6:8",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Gender": { id: "character.001", value: "female", isCustom: false },
      "Age": { id: "character.004", value: "young adult", isCustom: false },
      "Ethnicity": { id: "character.007", value: "thai", isCustom: false },
      "Beauty": { id: "character.022", value: "beautiful young Asian woman", isCustom: false },
      "Face Shape": { id: "face.002", value: "oval face", isCustom: false },
      "Eyes": { id: "eyes.001", value: "almond-shaped eyes", isCustom: false },
      "Eyebrows": { id: "eyebrows.002", value: "soft arched eyebrows", isCustom: false },
      "Nose": { id: "nose.002", value: "high nose bridge", isCustom: false },
      "Lips": { id: "lips.003", value: "plump lips", isCustom: false },
      "Top": { id: "clothing.021", value: "modern one-shoulder Thai sabai top woven in vibrant emerald green and shimmering metallic gold threads", isCustom: false },
      "Bottom": { id: "clothing.023", value: "modern high-waist Thai wrap skirt in royal blue and gold brocade silk fabric, showing detailed traditional patterns", isCustom: false },
      "Location": { id: "environment.008", value: "traditional Thai architecture with ornate teak wooden structures and soft warm lighting", isCustom: false },
      "Golden Hour": { id: "lighting.golden_01", value: "golden hour lighting", isCustom: false },
      "Brand": { id: "camera.brand_01", value: "shot on a modern high-resolution mirrorless camera, sharp focus", isCustom: false },
      "Lens": { id: "camera.lens_01", value: "shot on a high-end prime lens, minimal chromatic aberration, maximum sharpness, clear optics", isCustom: false },
      "Focal Length": { id: "camera.focal_01", value: "shot on a 50mm lens, natural perspective matching standard human vision, zero distortion", isCustom: false }
    }
  },
  cheongsam: {
    template: "vintageFilm",
    aspectRatio: "1:1",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Gender": { id: "character.001", value: "female", isCustom: false },
      "Age": { id: "character.004", value: "young adult", isCustom: false },
      "Ethnicity": { id: "character.010", value: "chinese", isCustom: false },
      "Beauty": { id: "character.023", value: "cute doll-like Asian woman", isCustom: false },
      "Face Shape": { id: "face.003", value: "round baby face", isCustom: false },
      "Eyes": { id: "eyes.005", value: "puppy eyes", isCustom: false },
      "Eyebrows": { id: "eyebrows.001", value: "straight eyebrows", isCustom: false },
      "Lips": { id: "lips.001", value: "cherry lips", isCustom: false },
      "Dress": { id: "clothing.026", value: "modern high-collar Qipao dress with a high side slit, styled in soft pastel lavender with delicate emerald green floral patterns", isCustom: false },
      "Location": { id: "environment.008", value: "traditional Thai architecture with ornate teak wooden structures and soft warm lighting", isCustom: false },
      "Film Look": { id: "quality.004", value: "shot on Kodak Portra 400 film, warm skin tones, fine film grain, natural analog colors", isCustom: false },
      "Brand": { id: "camera.brand_01", value: "shot on a modern high-resolution mirrorless camera, sharp focus", isCustom: false },
      "Lens": { id: "camera.lens_01", value: "shot on a high-end prime lens, minimal chromatic aberration, maximum sharpness, clear optics", isCustom: false },
      "Focal Length": { id: "camera.focal_01", value: "shot on a 50mm lens, natural perspective matching standard human vision, zero distortion", isCustom: false }
    }
  },
  minimalistCafe: {
    template: "cafeMinimalist",
    aspectRatio: "6:8",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Gender": { id: "character.001", value: "female", isCustom: false },
      "Age": { id: "character.004", value: "young adult", isCustom: false },
      "Ethnicity": { id: "character.009", value: "korean", isCustom: false },
      "Beauty": { id: "character.022", value: "beautiful young Asian woman", isCustom: false },
      "Face Shape": { id: "face.002", value: "oval face", isCustom: false },
      "Style": { id: "hair_022", value: "layered hush cut hairstyle", isCustom: false },
      "Tone": { id: "skin.tone_07", value: "milky white skin, smooth porcelain skin with soft cream undertones", isCustom: false },
      "Texture": { id: "skin.text_02", value: "dewy complexion reflecting soft ambient lights, hydrated skin look", isCustom: false },
      "Dress": { id: "clothing.028", value: "Seoul style oversized minimalist shirt-dress in soft pastel mint green and cream tones", isCustom: false },
      "Location": { id: "environment.005", value: "in a cozy modern cafe with warm wooden decors and soft background chatter", isCustom: false },
      "Props": { id: "environment.010", value: "holding a hot paper coffee cup with soft steam rising gently from the lid", isCustom: false },
      "Natural": { id: "quality.003", value: "candid and unposed look, giving a natural cinematic environment feel", isCustom: false },
      "Brand": { id: "camera.brand_01", value: "shot on a modern high-resolution mirrorless camera, sharp focus", isCustom: false },
      "Lens": { id: "camera.lens_01", value: "shot on a high-end prime lens, minimal chromatic aberration, maximum sharpness, clear optics", isCustom: false },
      "Focal Length": { id: "camera.focal_01", value: "shot on a 50mm lens, natural perspective matching standard human vision, zero distortion", isCustom: false }
    }
  },
  beachCasual: {
    template: "portrait",
    aspectRatio: "16:9",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Gender": { id: "character.001", value: "female", isCustom: false },
      "Age": { id: "character.004", value: "young adult", isCustom: false },
      "Ethnicity": { id: "character.007", value: "thai", isCustom: false },
      "Top": { id: "clothing.casual_02", value: "relaxed loose-fit breathable linen shirt with rolled-up sleeves", isCustom: false },
      "Bottom": { id: "clothing.casual_04", value: "comfy high-waisted frayed denim shorts", isCustom: false },
      "Location": { id: "environment.pop_01", value: "on a scenic tropical beach with fine white sand and crystal clear turquoise ocean water", isCustom: false },
      "Key Light": { id: "lighting.golden_03", value: "dramatic low-angle sunset rays piercing through the background with brilliant golden highlights", isCustom: false },
      "Story Event": { id: "scene_story.008", value: "strolling relaxed and taking in the ambient atmosphere of the scene", isCustom: false },
      "Context Type": { id: "photo_context.007", value: "travel documentary slice-of-life photograph", isCustom: false },
      "Foreground Layer": { id: "foreground.002", value: "foreground flowers softly blurred", isCustom: false },
      "Camera Imperfections": { id: "camera.imp_01", value: "slight handheld camera movement, natural organic framing", isCustom: false }
    }
  },
  restaurantSitting: {
    template: "portrait",
    aspectRatio: "3:4",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Sitting": { id: "pose.sitting_03", value: "sitting resting chin on hand with elbow on table, looking directly at the camera", isCustom: false },
      "Location": { id: "environment.loc_03", value: "on a high-end rooftop restaurant terrace", isCustom: false },
      "Ambient": { id: "__custom__", value: "soft warm ambient restaurant lighting", isCustom: true },
      "Story Event": { id: "scene_story.001", value: "captured in a candid moment during a natural conversation, showing a spontaneous warm smile", isCustom: false },
      "Context Type": { id: "photo_context.003", value: "captured casually by a friend", isCustom: false },
      "Foreground Layer": { id: "foreground.003", value: "foreground restaurant menu out of focus", isCustom: false },
      "Background Activity": { id: "background.001", value: "with blurred customers talking in the background", isCustom: false },
      "Camera Imperfections": { id: "camera.imp_02", value: "minor chromatic aberration, corner softness, realistic lens optical imperfections", isCustom: false }
    }
  },
  barSitting: {
    template: "nightclub",
    aspectRatio: "3:4",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Sitting": { id: "pose.sitting_04", value: "sitting on a bar stool", isCustom: false },
      "Location": { id: "environment.001", value: "inside a vibrant crowded bar or nightclub", isCustom: false },
      "Props": { id: "environment.009", value: "green glass bottle, glass with a purple straw, smartphone, table items", isCustom: false },
      "Story Event": { id: "scene_story.003", value: "laughing genuinely at a lighthearted moment, showing a natural and relaxed smile", isCustom: false },
      "Context Type": { id: "photo_context.004", value: "spontaneous moment captured mid-conversation", isCustom: false },
      "Foreground Layer": { id: "foreground.004", value: "foreground glass of water with ice slightly out of focus", isCustom: false },
      "Background Activity": { id: "background.001", value: "with blurred customers talking in the background", isCustom: false },
      "Camera Imperfections": { id: "camera.imp_03", value: "subtle digital sensor noise, natural digital camera texture", isCustom: false }
    }
  },
  resortSitting: {
    template: "portrait",
    aspectRatio: "16:9",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Sitting": { id: "pose.sitting_01", value: "sitting crossing legs, showing neat and elegant body alignment", isCustom: false },
      "Location": { id: "environment.loc_resort", value: "at a luxury tropical resort", isCustom: false },
      "Top": { id: "clothing.travel_05", value: "breezy tropical sundress", isCustom: false },
      "Key Light": { id: "__custom__", value: "golden hour light", isCustom: true },
      "Story Event": { id: "scene_story.0010", value: "leaning slightly against a support surface, enjoying a peaceful candid moment", isCustom: false },
      "Context Type": { id: "photo_context.005", value: "unposed snapshot", isCustom: false },
      "Foreground Layer": { id: "foreground.004", value: "foreground glass of water with ice slightly out of focus", isCustom: false },
      "Background Activity": { id: "background.004", value: "with café staff working in the soft-focus background", isCustom: false },
      "Camera Imperfections": { id: "camera.imp_04", value: "gentle highlight halation, organic highlight roll-off", isCustom: false }
    }
  },
  naturePhoto: {
    template: "portrait",
    aspectRatio: "3:4",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Location": { id: "environment.pop_02", value: "in a lush green forest with tall trees and dappled sunlight", isCustom: false },
      "Top": { id: "clothing.travel_01", value: "lightweight linen safari shirt", isCustom: false },
      "Key Light": { id: "__custom__", value: "soft dappled sunlight filtering through the canopy", isCustom: true },
      "Story Event": { id: "scene_story.004", value: "taking a brief pause to look thoughtfully towards the distance", isCustom: false },
      "Context Type": { id: "photo_context.007", value: "travel documentary slice-of-life photograph", isCustom: false },
      "Foreground Layer": { id: "foreground.002", value: "foreground flowers softly blurred", isCustom: false },
      "Background Activity": { id: "background.002", value: "with moving pedestrians softly blurred in the background", isCustom: false },
      "Camera Imperfections": { id: "camera.imp_01", value: "slight handheld camera movement, natural organic framing", isCustom: false }
    }
  },
  mallWaiting: {
    template: "portrait",
    aspectRatio: "9:16",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Sitting": { id: "pose.sitting_01", value: "sitting crossing legs, showing neat and elegant body alignment", isCustom: false },
      "Location": { id: "environment.loc_mall", value: "inside a modern shopping mall", isCustom: false },
      "Top": { id: "clothing.casual_05", value: "oversized cozy knit sweater", isCustom: false },
      "Props": { id: "__custom__", value: "holding a hot paper coffee cup", isCustom: true },
      "Story Event": { id: "scene_story.005", value: "casually waiting, observing the surroundings with a calm and relaxed posture", isCustom: false },
      "Context Type": { id: "photo_context.006", value: "casual handheld smartphone photo", isCustom: false },
      "Foreground Layer": { id: "foreground.001", value: "foreground coffee cup slightly out of focus", isCustom: false },
      "Background Activity": { id: "background.002", value: "with moving pedestrians softly blurred in the background", isCustom: false },
      "Camera Imperfections": { id: "camera.imp_03", value: "subtle digital sensor noise, natural digital camera texture", isCustom: false }
    }
  }
};

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
    poseMatch: false
  },
  faceReferenceImageA: null,
  faceReferenceImageB: null,
  faceReferenceJobIds: [], // array of up to 2 referenced parent job IDs
  styleReferenceImageA: null,
  styleReferenceImageB: null,
  styleReferenceJobIds: [], // array of up to 2 referenced parent job IDs
  hasInitializedHistoryCollapse: false,
  language: "th",
  aspectRatio: "6:8",
  mode: "normal",
  userRole: "user",
  username: "user_demo",
  activeJobId: null
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
        selectEl.value = selection.id;
      }
      updateAccordionSummaryBadges(selection.group);
    }
  });
}

// Validate mandatory required fields (Step 8)
function validateForm() {
  const required = [
    { field: "Ethnicity", group: "Character" },
    { field: "Gender", group: "Character" }
  ];

  for (const req of required) {
    const isSelected = state.selections[req.field] && state.selections[req.field].value && state.selections[req.field].value.trim() !== "";
    if (!isSelected) {
      // Find the select element
      const id = `select-${req.group.toLowerCase()}-${req.field.toLowerCase().replace(/\s+/g, "-")}`;
      const selectEl = document.getElementById(id);
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

  if (state.mode === "character-sheet") {
    const sheetCheckbox = document.getElementById("sheet-use-reference-img");
    if (sheetCheckbox) {
      sheetCheckbox.checked = true;
      sheetCheckbox.dispatchEvent(new Event("change"));
    }
  } else {
    const styleCheckbox = document.getElementById("ref-style-match");
    if (styleCheckbox) {
      styleCheckbox.checked = true;
      styleCheckbox.dispatchEvent(new Event("change"));
    }
  }
  updateReferencePreviewsUI();
}

// Populate submodel options inside the selectors
function updateSubmodelList() {
  const providerSelect = document.getElementById("api-provider-select");
  const submodelSelect = document.getElementById("api-submodel-select");
  if (!submodelSelect || !providerSelect) return;

  const provider = providerSelect.value;
  submodelSelect.innerHTML = "";
  const submodels = PROVIDER_SUBMODELS[provider] || [];
  submodels.forEach(model => {
    const opt = document.createElement("option");
    opt.value = model.value;
    opt.textContent = model.name;
    submodelSelect.appendChild(opt);
  });

  if (submodelSelect.options.length > 0) {
    submodelSelect.selectedIndex = 0;
  }

  // Disable reference upload if DALL-E 2 / DALL-E 3 is selected (Step 9/OpenAI)
  applyOpenAIImageReferenceControl();
}

// Disable/enable references depending on DALL-E support limits
function applyOpenAIImageReferenceControl() {
  const providerSelect = document.getElementById("api-provider-select");
  const submodelSelect = document.getElementById("api-submodel-select");
  if (!providerSelect || !submodelSelect) return;

  const provider = providerSelect.value;
  const submodel = submodelSelect.value;
  const isDalle = provider === "openai" && (submodel === "dall-e-3" || submodel === "dall-e-2");

  const refFace = document.getElementById("ref-face-match");
  const refStyle = document.getElementById("ref-style-match");
  const sheetUseRefImg = document.getElementById("sheet-use-reference-img");

  if (isDalle) {
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
    if (sheetUseRefImg) {
      sheetUseRefImg.checked = false;
      sheetUseRefImg.disabled = true;
      const lbl = sheetUseRefImg.closest(".checkbox-container");
      if (lbl) {
        lbl.style.opacity = "0.35";
        lbl.style.pointerEvents = "none";
      }
    }

    state.imageReferences.faceMatch = false;
    state.imageReferences.styleMatch = false;
    state.faceReferenceImageA = null;
    state.faceReferenceImageB = null;
    state.faceReferenceJobIds = [];
    state.styleReferenceImageA = null;
    state.styleReferenceImageB = null;
    state.styleReferenceJobIds = [];

    const faceUploadContainer = document.getElementById("face-match-upload-container");
    if (faceUploadContainer) faceUploadContainer.style.display = "none";
    const styleUploadContainer = document.getElementById("image-upload-container");
    if (styleUploadContainer) styleUploadContainer.style.display = "none";

    const vpActions = document.getElementById("viewport-loopback-actions");
    if (vpActions) vpActions.style.display = "none";
    const lbActions = document.querySelector(".lightbox-action-row");
    if (lbActions) lbActions.style.display = "none";

    updateReferencePreviewsUI();
    applyFaceMatchLockout();
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
    if (sheetUseRefImg) {
      sheetUseRefImg.disabled = false;
      const lbl = sheetUseRefImg.closest(".checkbox-container");
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
  try {
    const response = await fetch("/api/attributes/bundle");
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    const bundle = await response.json();

    state.schema = bundle.schema;
    state.templates = bundle.templates;
    state.order = bundle.order;
    state.library = bundle.library;

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
    updateSubmodelList();
    bindEvents();
    toggleUIForMode();
    updateCredits();
    updatePromptPreview();
    loadHistory();

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

      inner.appendChild(fieldDiv);
    });

    content.appendChild(inner);
    accordion.appendChild(content);
    container.appendChild(accordion);
  });
}

// Logic Helper: Filter attributes
function getOptionsForField(fieldName, category, allItems) {
  const items = allItems.filter(item => {
    if (item.category === "nsfw" && category !== "nsfw") return false;
    return item.category === category;
  });
  const lowerField = fieldName.toLowerCase();

  const itemsWithSubcat = items.filter(item => item.subcategory);
  const hasSubcategory = itemsWithSubcat.length > 0 && (itemsWithSubcat.length / items.length) > 0.5;
  if (hasSubcategory) {
    const matched = items.filter(item => item.subcategory && item.subcategory.toLowerCase() === lowerField);
    if (matched.length > 0) return matched;
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

// Bind event listeners
function bindEvents() {
  // Accordion Toggle Headers
  document.querySelectorAll(".accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      const accordion = header.parentElement;
      const isActive = accordion.classList.contains("active");
      document.querySelectorAll(".accordion").forEach(acc => acc.classList.remove("active"));
      if (!isActive) {
        accordion.classList.add("active");
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
          enforceExclusionRules(val);
        }
      }

      updateAccordionSummaryBadges(groupName);
      updatePromptPreview();
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
      applyOpenAIImageReferenceControl();
    });
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
      const preset = PRESETS[presetName];
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
      state.faceReferenceImageA = null;
      state.faceReferenceImageB = null;
      state.faceReferenceJobIds = [];
      if (faceFileInput) faceFileInput.value = "";
      updateReferencePreviewsUI();
    }

    applyFaceMatchLockout();
    updatePromptPreview();
  };

  refFace.addEventListener("change", updateRefState);
  refStyle.addEventListener("change", updateRefState);
  refPose.addEventListener("change", updateRefState);

  // Character Sheet style reference checkbox change listener (Step 9)
  const sheetUseRefImgCheckbox = document.getElementById("sheet-use-reference-img");
  if (sheetUseRefImgCheckbox) {
    sheetUseRefImgCheckbox.addEventListener("change", () => {
      const isChecked = sheetUseRefImgCheckbox.checked;
      if (!isChecked) {
        state.styleReferenceImageA = null;
        state.styleReferenceImageB = null;
        state.styleReferenceJobIds = [];
        updateReferencePreviewsUI();
      }
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
      }
      updateReferencePreviewsUI();
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
        state.faceReferenceImageA = evt.target.result.split(',')[1];
        state.faceReferenceJobIds[0] = null;
        updateReferencePreviewsUI();
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
        state.language = newLang;
        renderForm();
        restoreSelectionsToUI();
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
        alert("Failed to recharge credits: " + err.message);
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
    lightboxClose.addEventListener("click", () => {
      lightboxModal.style.display = "none";
    });
    lightboxModal.addEventListener("click", (e) => {
      if (e.target === lightboxModal) {
        lightboxModal.style.display = "none";
      }
    });
  }

  // Viewport Loopback action listeners (Step 9)
  const btnViewportUseFace = document.getElementById("btn-viewport-use-face");
  const btnViewportUseStyle = document.getElementById("btn-viewport-use-style");

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

  // Lightbox Loopback action listeners (Step 9)
  const btnLightboxUseFace = document.getElementById("btn-lightbox-use-face");
  const btnLightboxUseStyle = document.getElementById("btn-lightbox-use-style");

  if (btnLightboxUseFace) {
    btnLightboxUseFace.addEventListener("click", () => {
      const img = document.getElementById("lightbox-image");
      if (img && img.src && lightboxModal.style.display !== "none") {
        const activeItem = lightboxModal.activeItem;
        assignFaceReference(img.src, activeItem ? activeItem.id : null);
        lightboxModal.style.display = "none";
      }
    });
  }

  if (btnLightboxUseStyle) {
    btnLightboxUseStyle.addEventListener("click", () => {
      const img = document.getElementById("lightbox-image");
      if (img && img.src && lightboxModal.style.display !== "none") {
        const activeItem = lightboxModal.activeItem;
        assignStyleReference(img.src, activeItem ? activeItem.id : null);
        lightboxModal.style.display = "none";
      }
    });
  }

  // Generate Image Button (Background Queue & SSE Streaming Integration)
  const btnGenerateImage = document.getElementById("btn-generate-image");
  if (btnGenerateImage) {
    btnGenerateImage.addEventListener("click", async () => {
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
        const toggleGptSafe = document.getElementById("toggle-gpt-safe");
        const isGptSafe = toggleGptSafe ? toggleGptSafe.checked : false;

        // 2. Call backend generator queue endpoint
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Role': state.userRole
          },
          body: JSON.stringify({
            provider,
            submodel,
            selections: state.selections,
            aspectRatio: state.aspectRatio,
            imageReferences: state.imageReferences,
            mode: state.mode,
            template: document.getElementById("template-select").value || "portrait",
            isGptSafe,
            username: state.username,
            faceReferenceImageA: state.faceReferenceImageA,
            faceReferenceImageB: state.faceReferenceImageB,
            faceReferenceJobIds: state.faceReferenceJobIds,
            styleReferenceImageA: state.styleReferenceImageA,
            styleReferenceImageB: state.styleReferenceImageB,
            styleReferenceJobIds: state.styleReferenceJobIds
          })
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

        // 4. Create SSE connection to listen for dynamic chunks
        const sseSource = new EventSource(`/api/jobs/${jobId}/stream`);

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

        sseSource.addEventListener('image_generation.partial_image', renderPartialImage);
        sseSource.addEventListener('image_edit.partial_image', renderPartialImage);

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
            prompt: generatePromptText(true),
            imageUrl: finalImgSrc,
            timestamp: Date.now(),
            provider,
            submodel,
            referencedFaceJobIds: [...state.faceReferenceJobIds],
            referencedStyleJobIds: [...state.styleReferenceJobIds],
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
          loadHistory();
        });

        // Error event handler
        sseSource.addEventListener('error', (e) => {
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
      state.mode = chip.getAttribute("data-mode");

      if (state.mode === "headshot" || state.mode === "character-sheet") {
        const preset = PRESETS.studio;
        if (preset) {
          const randomizedPreset = randomizePresetSelections(preset, "studio");
          importConfigJSON(JSON.stringify(randomizedPreset));
        }
      }

      if (state.mode === "character-sheet" || state.mode === "headshot") {
        setAspectInUI("6:8");
      }

      toggleUIForMode();
      updatePromptPreview();
    });
  });

  const sheetUseRefImg = document.getElementById("sheet-use-reference-img");
  if (sheetUseRefImg) {
    sheetUseRefImg.addEventListener("change", () => {
      updatePromptPreview();
    });
  }
}

// Dynamically filter UI accordions based on active mode
function toggleUIForMode() {
  const mode = state.mode;
  const imageUpload = document.getElementById("image-upload-container");

  if (imageUpload) {
    imageUpload.style.display = mode === "character-sheet" ? "flex" : "none";
  }

  const presetsSection = document.querySelector(".presets-section");
  if (presetsSection) {
    presetsSection.style.display = mode === "normal" ? "block" : "none";
  }

  const visibleGroups = {
    normal: null,
    headshot: ["character", "face", "hair", "skin", "camera", "quality"],
    "character-sheet": ["character", "body", "clothing", "hair", "face", "camera", "quality"]
  };

  const visibleList = visibleGroups[mode];

  document.querySelectorAll(".accordion").forEach(accordion => {
    const groupName = accordion.id.replace("accordion-", "").replace(/-/g, " ");
    const isNsfwGroup = accordion.getAttribute("data-nsfw-controlled") === "true";
    const toggleNsfw = document.getElementById("toggle-nsfw");
    const isNsfwEnabled = toggleNsfw ? toggleNsfw.checked : false;

    if (visibleList) {
      const isVisible = visibleList.some(g => groupName.toLowerCase().includes(g.toLowerCase()));
      if (isVisible) {
        if (isNsfwGroup) {
          accordion.style.display = isNsfwEnabled ? "block" : "none";
        } else {
          accordion.style.display = "block";
        }
        accordion.classList.remove("hidden-accordion");
      } else {
        accordion.style.display = "none";
        accordion.classList.add("hidden-accordion");
      }
    } else {
      if (isNsfwGroup) {
        accordion.style.display = isNsfwEnabled ? "block" : "none";
      } else {
        accordion.style.display = "block";
      }
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
function getPromptValueForSelection(selection) {
  if (!selection) return "";
  if (selection.isCustom) {
    return selection.value;
  }

  const item = state.library.find(libItem => libItem.id === selection.id);
  if (!item || !item.prompt) {
    return selection.value;
  }

  const toggleGptSafe = document.getElementById("toggle-gpt-safe");
  const isGptSafe = toggleGptSafe ? toggleGptSafe.checked : false;

  if (isGptSafe) {
    return item.prompt["gpt-image-safe"] || item.prompt["gpt-image"] || item.prompt.default;
  } else {
    return item.prompt["gpt-image"] || item.prompt.default;
  }
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
    .map(key => getPromptValueForSelection(state.selections[key]))
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

  const activeSelections = JSON.parse(JSON.stringify(state.selections));
  resolveTagConflicts(activeSelections);

  const compileGroupSegment = (groupName, tokenClass) => {
    if (groupName.toLowerCase() === "face") {
      if (state.imageReferences.faceMatch) {
        const txt = "Preserve the identity of the uploaded person with high consistency while maintaining a completely natural appearance. Keep the same recognizable facial proportions, eye shape, nose, lips, eyebrows, hairstyle, and skin tone while allowing subtle natural variations from facial expression, camera perspective, lighting, and lens characteristics. Prioritize identity preservation over exact geometric matching.";
        return cleanTextOnly ? txt : `<span class="token-reference">${txt}</span>`;
      }
    }
    if (groupName.toLowerCase() === "clothing") {
      if (state.imageReferences.styleMatch) {
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
      const selection = Object.values(activeSelections).find(s => {
        const category = FIELD_TO_CATEGORY_MAP[s.group] || s.group.toLowerCase();
        return category.replace("_", "") === fieldId.replace("_", "") || s.group.toLowerCase() === fieldId.toLowerCase();
      });

      if (selection && selection.group.toLowerCase() === groupName.toLowerCase()) {
        const val = getPromptValueForSelection(selection);
        if (val && val.trim() !== "") {
          if (selection.isDropped) {
            if (!cleanTextOnly) segmentValues.push(`<span class="token-dropped" title="${selection.droppedReason}">${val}</span>`);
          } else {
            segmentValues.push(val);
          }
        }
      }
    });

    if (segmentValues.length === 0) {
      segmentValues = Object.keys(activeSelections)
        .filter(key => activeSelections[key].group.toLowerCase() === groupName.toLowerCase())
        .map(key => {
          const s = activeSelections[key];
          const val = getPromptValueForSelection(s);
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

  let subject = compileGroupSegment("Character", "token-subject");
  let appearance = compileGroupSegment("Face", "token-appearance");

  const getSelectionsForGroup = (grp) => {
    return Object.keys(activeSelections)
      .filter(key => activeSelections[key].group.toLowerCase() === grp.toLowerCase())
      .map(key => {
        const s = activeSelections[key];
        const val = getPromptValueForSelection(s);
        if (!val || val.trim() === "") return null;
        if (s.isDropped) return cleanTextOnly ? null : `<span class="token-dropped" title="${s.droppedReason}">${val}</span>`;
        return val;
      })
      .filter(val => val !== null);
  };

  let hairList = getSelectionsForGroup("Hair");
  let hair = hairList.length > 0 ? (cleanTextOnly ? hairList.join(", ") : `<span class="token-appearance">${hairList.join(", ")}</span>`) : "";

  let skinList = getSelectionsForGroup("Skin");
  let skin = skinList.length > 0 ? (cleanTextOnly ? skinList.join(", ") : `<span class="token-appearance">${skinList.join(", ")}</span>`) : "";

  let fullAppearance = [appearance, hair, skin].filter(s => s !== "").join(", ");

  let clothing = compileGroupSegment("Clothing", "token-clothing");

  // FULFILLS REQ 1: If clothing is empty in Character Sheet Mode, force tank top and shorts
  if (state.mode === "character-sheet" && (!clothing || clothing.trim() === "")) {
    const clText = "wearing a tight white tank top and white shorts to clearly show the model's body shape and physique";
    clothing = cleanTextOnly ? clText : `<span class="token-clothing">${clText}</span>`;
  }

  let pose = compileGroupSegment("Pose", "token-pose");
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
    let referenceText = "";
    const sheetUseRefImg = document.getElementById("sheet-use-reference-img");
    const isUsingRef = sheetUseRefImg ? sheetUseRefImg.checked : false;
    if (isUsingRef) {
      const refStr = `[Reference uploaded image]`;
      referenceText = cleanTextOnly ? refStr : `<span class="token-reference">${refStr}</span>`;
    }
    let sheetLayout = `character model sheet, character design sheet, showing front view, side view, and back view of the same character, full-body view, standing straight in a neutral pose`;
    let elements = [
      referenceText,
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

  prompt = prompt.replace(/,(\s*,)+/g, ",");
  prompt = prompt.replace(/^\s*,\s*/, "");
  prompt = prompt.replace(/\s*,\s*$/, "");
  prompt = prompt.trim();

  const toggleGptSafeEl = document.getElementById("toggle-gpt-safe");
  const isGptSafeActive = toggleGptSafeEl ? toggleGptSafeEl.checked : false;
  if (isGptSafeActive && prompt !== "") {
    let positiveWordsList = [];
    Object.values(state.selections).forEach(selection => {
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

  const htmlContent = generatePromptText(false);

  if (htmlContent === "") {
    previewBox.innerHTML = '<span class="placeholder-text">Prompt will generate here once attributes are selected...</span>';
  } else {
    previewBox.innerHTML = htmlContent;
  }

  const cleanPrompt = generatePromptText(true).toLowerCase();
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
    if (detected.length > 0 && htmlContent !== "") {
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
  const textVal = generatePromptText(true);
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

// Reset form
function resetForm() {
  document.querySelectorAll(".custom-select").forEach(select => {
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
  state.imageReferences = { faceMatch: false, styleMatch: false, poseMatch: false };
  state.faceReferenceImage = null;
  state.aspectRatio = "6:8";

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

  applyFaceMatchLockout();
  updatePromptPreview();
}

// Export state as JSON
function exportConfigJSON() {
  const payload = {
    selections: {},
    imageReferences: state.imageReferences,
    aspectRatio: state.aspectRatio,
    template: document.getElementById("template-select").value || "portrait"
  };

  Object.keys(state.selections).forEach(field => {
    payload.selections[field] = {
      id: state.selections[field].id,
      value: getPromptValueForSelection(state.selections[field]),
      isCustom: state.selections[field].isCustom
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

    resetForm();

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
      state.imageReferences = payload.imageReferences;
      document.getElementById("ref-face-match").checked = !!payload.imageReferences.faceMatch;
      document.getElementById("ref-style-match").checked = !!payload.imageReferences.styleMatch;
      document.getElementById("ref-pose-match").checked = !!payload.imageReferences.poseMatch;
    }

    let hasNsfwSelection = false;
    if (payload.selections) {
      Object.keys(payload.selections).forEach(field => {
        const item = payload.selections[field];
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

    applyFaceMatchLockout();
    updatePromptPreview();

  } catch (error) {
    alert("Failed to load preset configuration: " + error.message);
  }
}

// Lockout facial features when Face Match is checked
function applyFaceMatchLockout() {
  const isLocked = state.imageReferences.faceMatch;
  const faceFields = ["Face Shape", "Eyes", "Eyebrows", "Nose", "Lips", "Smile"];

  faceFields.forEach(field => {
    const select = document.querySelector(`.custom-select[data-field="${field}"]`);
    if (!select) return;

    const formField = select.closest(".form-field");
    if (isLocked) {
      select.disabled = true;
      if (formField) formField.classList.add("disabled");

      delete state.selections[field];
      select.value = "";

      const customInput = formField ? formField.querySelector(".custom-writein-input") : null;
      if (customInput) {
        customInput.value = "";
        customInput.style.display = "none";
      }
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

    if (isFaceLocked && faceFields.includes(fieldName)) return;
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
  const textVal = generatePromptText(true);
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

// Load generation history from backend
async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    const history = await res.json();
    state.history = history; // Store in state for lineage lookups (Step 9)
    renderHistory(history);

    // Auto-collapse on initial page load if history is empty (Step 7)
    if ((!history || history.length === 0) && !state.hasInitializedHistoryCollapse) {
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
    console.error("Failed to load history list:", err);
  }
}

// Render history thumbnail grid
function renderHistory(historyList) {
  const grid = document.getElementById("history-grid");
  const placeholder = document.getElementById("no-history-placeholder");
  if (!grid) return;

  grid.innerHTML = "";

  if (!historyList || historyList.length === 0) {
    grid.innerHTML = `<p class="no-history-text" id="no-history-placeholder">No history found</p>`;
    return;
  }

  historyList.forEach(item => {
    const card = document.createElement("div");
    card.className = "history-item";
    card.title = `Generate: ${item.prompt.substring(0, 100)}...`;

    const img = document.createElement("img");
    img.src = item.imageUrl;
    img.alt = "Generated Character Output";
    img.addEventListener("click", () => openLightbox(item));

    const btnDel = document.createElement("button");
    btnDel.className = "btn-delete-history";
    btnDel.innerHTML = "&times;";
    btnDel.title = "Delete image record";
    btnDel.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this generation history?")) {
        deleteHistory(item.id);
      }
    });

    card.appendChild(img);
    card.appendChild(btnDel);
    grid.appendChild(card);
  });
}

// Delete history record from disk
async function deleteHistory(jobId) {
  try {
    const res = await fetch(`/api/history/${jobId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      loadHistory();
    } else {
      const data = await res.json();
      alert("Failed to delete entry: " + data.error);
    }
  } catch (err) {
    alert("Delete operation failed: " + err.message);
  }
}

// Open full screen Lightbox modal
function openLightbox(item) {
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

  img.src = item.imageUrl;
  title.textContent = `Generation Reference #${item.id.substring(4, 9)}`;
  promptTxt.textContent = item.prompt;
  engine.textContent = item.provider ? item.provider.toUpperCase() : "N/A";
  model.textContent = item.submodel || "N/A";
  time.textContent = new Date(item.timestamp).toLocaleString();
  if (duration) duration.textContent = item.generationDuration ? `${item.generationDuration}s` : "N/A";
  dlLink.href = item.imageUrl;
  dlLink.download = `modelpromptforge-generation-${item.id}.png`;

  // Render lineage parent links (Step 9)
  if (lineageContainer && lineageList) {
    lineageList.innerHTML = "";
    const faceParents = item.referencedFaceJobIds || [];
    const styleParents = item.referencedStyleJobIds || [];
    const allParents = [
      ...faceParents.map(id => ({ id, type: "Face" })),
      ...styleParents.map(id => ({ id, type: "Style" }))
    ].filter(p => p.id);

    if (allParents.length > 0) {
      allParents.forEach(p => {
        const parentItem = (state.history || []).find(h => h.id === p.id);
        const parentThumb = document.createElement("div");
        parentThumb.style.position = "relative";
        parentThumb.style.width = "42px";
        parentThumb.style.height = "42px";
        parentThumb.style.border = "1px solid rgba(255, 255, 255, 0.15)";
        parentThumb.style.borderRadius = "4px";
        parentThumb.style.cursor = "pointer";
        parentThumb.title = `${p.type} Ref parent: #${p.id.substring(4, 9)}`;

        const thumbImg = document.createElement("img");
        thumbImg.src = parentItem ? parentItem.imageUrl : "";
        thumbImg.style.width = "100%";
        thumbImg.style.height = "100%";
        thumbImg.style.objectFit = "cover";
        thumbImg.style.borderRadius = "3px";

        const typeBadge = document.createElement("span");
        typeBadge.textContent = p.type === "Face" ? "F" : "S";
        typeBadge.style.position = "absolute";
        typeBadge.style.bottom = "-2px";
        typeBadge.style.right = "-2px";
        typeBadge.style.background = p.type === "Face" ? "var(--neon-cyan)" : "var(--neon-pink)";
        typeBadge.style.color = "#000";
        typeBadge.style.fontSize = "0.55rem";
        typeBadge.style.fontWeight = "900";
        typeBadge.style.padding = "0 3px";
        typeBadge.style.borderRadius = "2px";

        parentThumb.appendChild(thumbImg);
        parentThumb.appendChild(typeBadge);

        parentThumb.addEventListener("click", () => {
          if (parentItem) {
            openLightbox(parentItem);
          } else {
            alert(`Parent job #${p.id.substring(4, 9)} is not in local history list.`);
          }
        });

        lineageList.appendChild(parentThumb);
      });
      lineageContainer.style.display = "block";
    } else {
      lineageContainer.style.display = "none";
    }
  }

  modal.style.display = "flex";
}
