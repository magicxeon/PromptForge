// Creative preset weights, not population statistics or a beauty score.
// Keep historical pools unchanged: saved seeds refer to their recorded version.
export const LEGACY_TRENDING_VERSION = 'contemporary-2026-11-v1';
export const TRENDING_VERSION = 'leading-2026-11-v2';
export const TRENDING_SKIN_TONES = ['light', 'medium'];
export const TRENDING_COMMON = {
  faceShape: [['oval', 5], ['diamond', 3], ['heart', 3], ['oblong', 2], ['square', 1], ['round', 1], ['combination', 2]],
  facialSymmetry: [[3, 2], [4, 6], [5, 2]],
  eyeShape: [['almond', 6], ['fox', 2], ['cat', 2], ['round', 1], ['hooded', 1]],
  eyelidType: [['double', 4], ['single', 2], ['tapered', 4], ['deep', 1]],
  browShape: [['straight', 4], ['soft-angled', 5], ['arched', 2], ['sword', 1]],
  skinTone: [['light', 7], ['medium', 3]],
  realisticTexture: [[2, 3], [3, 6], [4, 1]], freckles: [[1, 9], [2, 1]],
  subtleAsymmetry: [[1, 4], [2, 5], [3, 1]],
  beautyMarks: [[[], 8], [['left-cheek'], 1], [['right-cheek'], 1]], minorScars: [[[], 1]],
  dimple: [['none', 6], ['left', 1], ['right', 1], ['both', 1]],
  hairColor: [['black', 5], ['brown', 5]], hairPart: [['center', 5], ['side', 5]],
  hairTexture: [['straight', 5], ['wavy', 5]], hairVolume: [[3, 6], [4, 4]],
  era: [['modern', 1]], material: [['cotton', 4], ['linen', 3], ['silk', 2], ['wool', 3]],
  costume: [['casual', 5], ['business', 4], ['formal', 2], ['creative', 1]],
  costumeColor: [['#202936', 3], ['#344b49', 3], ['#e9e5dc', 3], ['#7b8795', 2], ['#806954', 2], ['#473a42', 1], ['#b4c9d6', 2]],
  expression: [['neutral', 5], ['smile', 3], ['cold', 1], ['joy', 1]],
  accessories: [['none', 5], ['watch', 3], ['earrings', 2], ['glasses', 1], ['necklace', 1]]
};
export const TRENDING_PRESENTATIONS = {
  male: {
    hairLength: [['short', 6], ['medium', 4]], fringe: [['none', 6], ['soft', 4]],
    jawDefinition: [[3, 2], [4, 6], [5, 2]], jawWidth: [[3, 5], [4, 4], [2, 1]],
    browDensity: [[3, 4], [4, 5], [5, 1]], makeup: [['none', 5], ['natural', 5]]
  },
  female: {
    hairLength: [['long', 5], ['medium', 4], ['short', 1]], fringe: [['none', 4], ['soft', 6]],
    jawDefinition: [[2, 2], [3, 5], [4, 3]], jawWidth: [[2, 3], [3, 6], [4, 1]],
    lipFullness: [[2, 1], [3, 5], [4, 4]], makeup: [['natural', 7], ['editorial', 2], ['none', 1]]
  },
  custom: {
    hairLength: [['short', 3], ['medium', 4], ['long', 3]], fringe: [['none', 5], ['soft', 5]],
    makeup: [['none', 3], ['natural', 5], ['editorial', 2]]
  }
};
// Leading-character creative brief. Every field has a pool; there is no broad
// fallback. Face geometry is selected as a recipe before any attributes are drawn.
export const LEADING_COMMON = {
  faceLength: [[3, 1]], faceWidth: [[3, 1]], facialThirdBalance: [[4, 1]], facialSymmetry: [[4, 1]],
  cheekboneHeight: [[3, 4], [4, 6]], cheekboneProminence: [[3, 7], [4, 3]], cheekFullness: [[3, 1]],
  chinLength: [[3, 1]], chinWidth: [[2, 4], [3, 6]],
  eyeSize: [[3, 7], [4, 3]], eyeSpacing: [[3, 1]], canthalTilt: [[3, 7], [4, 3]], eyeDepth: [[3, 1]],
  eyelidType: [['tapered', 6], ['double', 4]], browAngle: [[3, 1]],
  noseBridgeHeight: [[3, 6], [4, 4]], bridgeShape: [['straight', 1]],
  tipShape: [['defined', 7], ['rounded', 3]], noseWidth: [[2, 3], [3, 7]],
  lipFullness: [[3, 7], [4, 3]], upperLowerBalance: [[3, 1]], cupidBow: [[3, 7], [4, 3]], mouthWidth: [[3, 1]],
  earShape: [['rounded', 5], ['attached', 3], ['detached', 2]],
  skinTone: [['light', 7], ['medium', 3]], undertone: [['neutral', 6], ['warm', 3], ['cool', 1]],
  realisticTexture: [[2, 4], [3, 6]], freckles: [[1, 1]], subtleAsymmetry: [[1, 3], [2, 7]],
  beautyMarks: [[[], 9], [['left-cheek'], 1], [['right-cheek'], 1]], minorScars: [[[], 1]],
  dimple: [['none', 7], ['left', 1], ['right', 1], ['both', 1]],
  hairColor: [['black', 6], ['brown', 4]], hairPart: [['center', 5], ['side', 5]],
  hairTexture: [['straight', 5], ['wavy', 5]], hairVolume: [[3, 7], [4, 3]],
  earVisibility: [['visible', 3], ['partial', 7]],
  era: [['modern', 1]], material: [['cotton', 4], ['linen', 3], ['silk', 2], ['wool', 2]],
  costume: [['casual', 5], ['business', 3], ['formal', 2]],
  costumeColor: [['#202936', 3], ['#344b49', 3], ['#e9e5dc', 4], ['#7b8795', 2], ['#806954', 2]],
  expression: [['neutral', 4], ['smile', 5], ['cold', 1]],
  accessories: [['none', 7], ['watch', 2], ['earrings', 1], ['necklace', 1]],
  pose: [['relaxed', 8], ['seated', 2]], camera: [['front', 6], ['three-quarter', 4]],
  lens: [['85mm', 8], ['50mm', 2]], lighting: [['soft', 7], ['window', 3]],
  background: [['studio', 6], ['garden', 2], ['office', 2]], aspectRatio: [['2:3', 8], ['9:16', 2]]
};
export const LEADING_RECIPES = [
  { id: 'male-romantic', presentation: 'male', direction: 'soft', label: 'พระเอกหล่ออบอุ่น',
    brief: 'ตัวเอกชายแนวโรแมนติก หล่อละมุน โครงหน้าสมดุล ดวงตาสื่ออารมณ์ คิ้วได้รูปและกรามชัดอย่างเป็นธรรมชาติ',
    pools: {
      faceShape: [['oval', 7], ['combination', 3]], eyeShape: [['almond', 1]],
      browShape: [['straight', 7], ['soft-angled', 3]], browDensity: [[3, 3], [4, 7]],
      jawWidth: [[3, 1]], jawAngularness: [[2, 4], [3, 6]], jawDefinition: [[3, 3], [4, 7]],
      chinShape: [['rounded', 1]], hairLength: [['short', 7], ['medium', 3]],
      fringe: [['none', 4], ['soft', 6]], makeup: [['none', 6], ['natural', 4]]
    } },
  { id: 'male-charismatic', presentation: 'male', direction: 'sharp', label: 'พระเอกหล่อคม',
    brief: 'ตัวเอกชายหล่อคมสง่า มีเสน่ห์จากสายตา โหนกแก้มและแนวกรามชัดพอดี บุคลิกมั่นใจโดยไม่แข็งกร้าว',
    pools: {
      faceShape: [['combination', 6], ['diamond', 4]], eyeShape: [['almond', 7], ['fox', 3]],
      browShape: [['soft-angled', 7], ['sword', 3]], browDensity: [[4, 1]],
      jawWidth: [[3, 8], [4, 2]], jawAngularness: [[3, 7], [4, 3]], jawDefinition: [[4, 1]],
      chinShape: [['rounded', 7], ['pointed', 3]], cheekFullness: [[2, 3], [3, 7]],
      hairLength: [['short', 8], ['medium', 2]], fringe: [['none', 8], ['soft', 2]],
      makeup: [['none', 7], ['natural', 3]], expression: [['neutral', 7], ['smile', 2], ['cold', 1]]
    } },
  { id: 'female-romantic', presentation: 'female', direction: 'soft', label: 'นางเอกหวานละมุน',
    brief: 'ตัวเอกหญิงสวยหวานละมุน ใบหน้ารูปไข่หรือหัวใจ ดวงตาสดใสสื่ออารมณ์ จมูกได้รูปและริมฝีปากอิ่มเป็นธรรมชาติ',
    pools: {
      faceShape: [['oval', 7], ['heart', 3]], eyeShape: [['almond', 7], ['round', 3]], eyeSize: [[3, 4], [4, 6]],
      browShape: [['straight', 4], ['soft-angled', 6]], browDensity: [[3, 1]],
      jawWidth: [[2, 7], [3, 3]], jawAngularness: [[2, 1]], jawDefinition: [[3, 1]],
      chinShape: [['rounded', 7], ['pointed', 3]], chinWidth: [[2, 1]], cheekboneProminence: [[3, 1]],
      bridgeShape: [['straight', 6], ['soft', 4]], noseBridgeHeight: [[3, 1]],
      hairLength: [['long', 7], ['medium', 3]], fringe: [['soft', 7], ['none', 3]],
      makeup: [['natural', 1]], expression: [['smile', 7], ['neutral', 3]]
    } },
  { id: 'female-elegant', presentation: 'female', direction: 'sharp', label: 'นางเอกสวยคมสง่า',
    brief: 'ตัวเอกหญิงสวยคมสง่า ใบหน้าเรียวสมดุล ดวงตาอัลมอนด์หรือยกหางอ่อน โหนกแก้มมีมิติและแนวกรามเรียบละมุน',
    pools: {
      faceShape: [['oval', 6], ['diamond', 4]], eyeShape: [['almond', 7], ['cat', 3]],
      browShape: [['soft-angled', 7], ['arched', 3]], browDensity: [[3, 8], [4, 2]],
      jawWidth: [[2, 1]], jawAngularness: [[2, 6], [3, 4]], jawDefinition: [[3, 7], [4, 3]],
      chinShape: [['rounded', 4], ['pointed', 6]], chinWidth: [[2, 1]],
      hairLength: [['long', 6], ['medium', 4]], fringe: [['none', 8], ['soft', 2]],
      makeup: [['natural', 1]], expression: [['neutral', 6], ['smile', 4]]
    } }
];
export function selectLeadingRecipe(presentation, rng, mode = 'full', archetype = 'custom') {
  const direction = ['soft', 'elegant'].includes(archetype) ? 'soft' : ['fox', 'cat', 'wolf', 'sharp'].includes(archetype) ? 'sharp' : null;
  const recipes = LEADING_RECIPES.filter(recipe => presentation === 'custom' || recipe.presentation === presentation);
  return weightedChoice(recipes.map(recipe => [recipe, mode !== 'full' && direction === recipe.direction ? 4 : 1]), rng);
}
export function recordedLeadingRecipe(profile) {
  const trace = profile.randomization;
  if (trace?.trendingPresetVersion !== TRENDING_VERSION || trace.baseline?.presentation !== profile.presentation) return null;
  return LEADING_RECIPES.find(recipe => recipe.id === trace.leadingRecipeId) || null;
}
export function trendingPool(field, presentation, version = TRENDING_VERSION, recipe = null) {
  if (version === LEGACY_TRENDING_VERSION) {
    const pool = TRENDING_PRESENTATIONS[presentation]?.[field.id] || TRENDING_COMMON[field.id];
    return pool || (field.type === 'range' ? [[2, 2], [3, 5], [4, 3]] : null);
  }
  if (version !== TRENDING_VERSION) throw new Error('ไม่รองรับ Trending preset รุ่นนี้ กรุณาใช้ JSON Snapshot เดิม');
  if (recipe) return recipe.pools[field.id] || LEADING_COMMON[field.id] || null;
  // Union for dictionary inspection; generation always supplies one recipe.
  const recipes = LEADING_RECIPES.filter(item => presentation === 'custom' || item.presentation === presentation);
  return recipes.flatMap(item => item.pools[field.id] || LEADING_COMMON[field.id] || []);
}
export function weightedChoice(pool, rng) {
  let sample = rng() * pool.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [value, weight] of pool) { sample -= weight; if (sample < 0) return structuredClone(value); }
  return structuredClone(pool.at(-1)[0]);
}
