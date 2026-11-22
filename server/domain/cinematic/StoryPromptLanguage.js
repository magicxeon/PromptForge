import templates from '../../config/cinematic/story-shot-templates.v1.json' with {type:'json'};

const templateLines = new Set(Object.values(templates).flatMap(group =>
  Object.values(group).filter(value => typeof value === 'string')));
const headings = new Set([...templates.video.sections, ...templates.still.sections,
  'REFERENCE NOTE','PRESERVE EXACTLY','WRITING DIRECTION','DIALOGUE','PERFORMANCE','CHARACTERS','ACTION','OPENING']);
const referenceRoleSuffixes = Object.values(templates.referenceRoles).map(role => `: ${role}.`);

// Keep template layout and cue boundaries in code. The writer translates only the text slots.
export function planStoryPromptLanguage(text, cues, findings = []) {
  const slots = [];
  const parts = [];
  const words = new Set(cues.map(cue => cue.text));
  const unresolved = new Set(findings.map(item => item.speaker));
  let section = '';
  function slot(source, role) {
    if (!source || !/\p{L}/u.test(source)) { parts.push(source); return; }
    const id = slots.length;
    slots.push({id, role, source});
    parts.push(id);
  }
  for (const line of text.split('\n')) {
    if (parts.length) parts.push('\n');
    const heading = line.replace(/^\[|\]$/g, '');
    if (headings.has(heading)) {
      section = heading;
      parts.push(line);
      continue;
    }
    if (templateLines.has(line)) { parts.push(line); continue; }
    const prefix = line.match(/^(?:\[[\d:s.\s–-]+\]\s*|(?:\d+(?:\.\d+)?[–-]\d+(?:\.\d+)?s — )|Reference \d+ — |(?:- )?Character \d+: |Duration: [\d.]+ seconds\.\s*|Starting state: )/)?.[0] || '';
    parts.push(prefix);
    const body = line.slice(prefix.length);
    const referenceRole = section === 'REFERENCE MAPPING' && prefix.startsWith('Reference ')
      && referenceRoleSuffixes.find(role => body.endsWith(role));
    if (referenceRole) {
      slot(body.slice(0, -referenceRole.length), 'direction');
      parts.push(referenceRole);
      continue;
    }
    const spoken = section === 'ACTION TIMELINE' && body.match(/^(.+?): “(.+)”$/u);
    const legacy = section === 'DIALOGUE' && body.match(/^(.+?): (.+)$/u);
    const unbound = section === 'PERFORMANCE' && body.match(/^([^:()]+?)(\s*\([^)]*\))?:\s*(.+)$/u);
    if (unbound && unresolved.has(unbound[1].trim())) {
      slot(unbound[1] + (unbound[2] || ''), 'direction');
      parts.push(': “'); slot(unbound[3], 'dialogue'); parts.push('”');
    } else if (spoken || (legacy && words.has(legacy[2]))) {
      const [,speaker,dialogue] = spoken || legacy;
      slot(speaker, 'direction'); parts.push(': “'); slot(dialogue, 'dialogue'); parts.push('”');
    } else slot(body, 'direction');
  }
  return {slots, render(translations, spokenLanguage) {
    const invalid = () => Object.assign(new Error('The writing model returned an incomplete prompt translation. Try building the prompt again.'),
      {code:'cinematic_prompt_translation_invalid',statusCode:502});
    if (!Array.isArray(translations) || translations.length !== slots.length) throw invalid();
    const values = new Map();
    for (const row of translations) {
      const item = slots[row?.id];
      const value = typeof row?.text === 'string' && row.text.trim();
      if (!item || item.id !== row.id || values.has(item.id) || !value || /[\r\n]/.test(value)) throw invalid();
      const english = item.role === 'direction' || spokenLanguage === 'English';
      if (english && [...value].some(char => /\p{L}/u.test(char) && !/\p{Script=Latin}/u.test(char))) throw invalid();
      values.set(item.id, value);
    }
    return parts.map(part => typeof part === 'number' ? values.get(part) : part).join('');
  }};
}
