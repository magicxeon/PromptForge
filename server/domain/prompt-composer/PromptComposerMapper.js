const INTENT_ALIASES = [
  { terms: ['female', 'woman', 'girl', 'ผู้หญิง', 'นางแบบผู้หญิง'], targets: ['female'] },
  { terms: ['male', 'man', 'ผู้ชาย', 'นางแบบผู้ชาย'], targets: ['male'] },
  { terms: ['cafe', 'café', 'coffee shop', 'คาเฟ่', 'ร้านกาแฟ'], targets: ['cafe', 'coffee'] },
  { terms: ['studio', 'สตูดิโอ'], targets: ['photography studio', 'studio'] },
  { terms: ['street', 'ถนน'], targets: ['urban street', 'street'] },
  { terms: ['beach', 'ชายหาด'], targets: ['beach'] },
  { terms: ['nightclub', 'club', 'bar', 'ผับ', 'บาร์'], targets: ['nightclub', 'bar'] },
  { terms: ['dress', 'เดรส'], targets: ['dress'] },
  { terms: ['blazer', 'เสื้อสูท'], targets: ['blazer'] },
  { terms: ['hoodie', 'ฮู้ดดี้'], targets: ['hoodie'] },
  { terms: ['jeans', 'ยีนส์'], targets: ['jeans'] },
  { terms: ['portrait', 'headshot', 'พอร์เทรต', 'เขียนครึ่งตัว'], targets: ['portrait', 'headshot'] },
  { terms: ['full body', 'full-body', 'เต็มตัว'], targets: ['full body'] }
];

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function entrySearchText(entry) {
  return normalize([
    entry.id,
    entry.category,
    entry.subcategory,
    entry.label?.en,
    entry.label?.th,
    entry.prompt?.default,
    entry.prompt?.['gpt-image'],
    ...(Array.isArray(entry.tags) ? entry.tags : [])
  ].filter(Boolean).join(' '));
}

function findBestEntry(entries, targets) {
  const normalizedTargets = targets.map(normalize).filter(Boolean);
  let best = null;

  entries.forEach(entry => {
    const searchText = entrySearchText(entry);
    let score = 0;
    normalizedTargets.forEach(target => {
      if (!target || !searchText.includes(target)) return;
      score += target.split(' ').length * 10;
      if (normalize(entry.label?.en) === target || normalize(entry.id) === target) score += 8;
    });
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  });

  return best;
}

function toSelection(entry, sourceText, confidence) {
  return {
    fieldId: entry.subcategory || entry.category,
    valueId: entry.id,
    value: entry.prompt?.['gpt-image'] || entry.prompt?.default || entry.label?.en || entry.id,
    group: entry.ui?.group || '',
    category: entry.category || '',
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    confidence,
    sourceText
  };
}

export function createStructuredPromptProposal({ freeTextIdea, generationMode = 'playground', language = 'auto' }, attributesBundle) {
  const idea = String(freeTextIdea || '').replace(/\s+/g, ' ').trim();
  if (idea.length < 3) {
    const error = new Error('Describe the image idea using at least three characters.');
    error.code = 'prompt_composer_input_invalid';
    error.statusCode = 400;
    throw error;
  }
  if (idea.length > 2000) {
    const error = new Error('The image idea must be 2,000 characters or fewer.');
    error.code = 'prompt_composer_input_too_long';
    error.statusCode = 400;
    throw error;
  }

  const entries = (attributesBundle?.library || []).filter(entry => entry && entry.enabled !== false && entry.id);
  const normalizedIdea = normalize(idea);
  const selectedByField = new Map();

  INTENT_ALIASES.forEach(alias => {
    const matchingTerm = alias.terms.find(term => normalizedIdea.includes(normalize(term)));
    if (!matchingTerm) return;
    const match = findBestEntry(entries, alias.targets);
    if (!match) return;
    const selection = toSelection(match.entry, matchingTerm, Math.min(0.95, 0.6 + (match.score / 100)));
    const current = selectedByField.get(selection.fieldId);
    if (!current || current.confidence < selection.confidence) selectedByField.set(selection.fieldId, selection);
  });

  const fieldSelections = [...selectedByField.values()];
  const classificationSignals = [...new Set(fieldSelections.flatMap(selection => selection.tags))]
    .filter(tag => typeof tag === 'string' && tag.length > 0)
    .sort();
  const hasClothing = fieldSelections.some(selection => selection.category === 'clothing');

  return {
    composerMode: 'local_rules',
    language,
    generationMode,
    contentType: hasClothing ? 'fashion' : null,
    visualStyles: [],
    marketContexts: [],
    fieldSelections,
    customPromptParts: { intent: idea },
    missingFields: [],
    safetyNotes: [],
    classificationSignals,
    finalPromptDraft: idea
  };
}
