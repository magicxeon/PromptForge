const VISUAL_FIELD_KEYS = new Set([
  'body::Body Silhouette',
  'body::Model Build',
  'clothing::Material',
  'clothing::Material / Surface',
  'clothing::Outfit Base',
  'clothing::Pattern',
  'expression::Expression',
  'eyebrows::Eyebrows',
  'eyes::Eyes',
  'face::Expression',
  'face::Eye Shape',
  'face::Eyebrows',
  'face::Face Shape',
  'face::Facial Hair',
  'face::Lips',
  'face::Nose',
  'facial_hair::Facial Hair',
  'hair::Color',
  'hair::Cut / Style',
  'hair::Length',
  'hair::Parting / Fringe',
  'hair::Texture',
  'lips::Lips',
  'nose::Nose',
  'skin::Freckles',
  'skin::Makeup',
  'skin::Skin Texture',
  'skin::Tone'
]);

export function resolveAttributePresentationKind(category, field) {
  return VISUAL_FIELD_KEYS.has(`${String(category || '').trim()}::${String(field || '').trim()}`)
    ? 'visual'
    : 'text';
}
