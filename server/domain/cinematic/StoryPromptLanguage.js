import templates from '../../config/cinematic/story-shot-templates.v1.json' with {type:'json'};
import {storyDirectionClockPattern} from './StoryPromptFormatting.js';

const templateLines = new Set(Object.values(templates).flatMap(group =>
  Object.values(group).filter(value => typeof value === 'string')));
const headings = new Set([...templates.video.sections, ...templates.still.sections,
  'REFERENCE NOTE','VISUAL TARGET','PRESERVE EXACTLY','WRITING DIRECTION','DIALOGUE','PERFORMANCE','CHARACTERS','ACTION','OPENING']);
const referenceRoleSuffixes = Object.values(templates.referenceRoles).map(role => `: ${role}.`);
const directionMarkers = new RegExp(`\\bReference \\d+\\b|${storyDirectionClockPattern.source}`, 'gi');
const markers = line => (line.match(directionMarkers) || []).join('|').toLowerCase();
const hasNonLatinLetters = text => [...text].some(char => /\p{L}/u.test(char) && !/\p{Script=Latin}/u.test(char));
const isThaiDialogue = (source, role, language) => role === 'dialogue' && language === 'Thai'
  && /\p{Script=Thai}/u.test(source) && !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(source);
const timeLiterals = text => (text.match(/\b\d+(?:\.\d+)?(?:\s*[–-]\s*\d+(?:\.\d+)?)?\s*(?:s|seconds?)\b/gi) || []).join('|');

// Only prose in directing sections can change. All other lines, including speech,
// reference assignments and opening-frame instructions, are copied from the draft.
export function planStoryPromptRefinement(draft) {
  const editableSections = new Set(['SCENE','SUBJECT','CAMERA','ACTION','ACTION TIMELINE','PERFORMANCE',
    'LIGHT','LIGHTING','AUDIO','ENVIRONMENT MOVEMENT','CONTINUITY','ART DIRECTION']);
  const lines = draft.split('\n');
  const editable = new Map();
  let section = '';
  for (const [lineId,line] of lines.entries()) {
    if (/^Shot \d+$/.test(line)) continue;
    if (/^(?:\[[A-Z &_-]+\]|[A-Z][A-Z &_-]+|Shot \d+)$/.test(line)) {
      section = line.replace(/^\[|\]$/g, '');
    } else if (editableSections.has(section) && line.trim() && !templateLines.has(line)
        && !/["“”]|^Reference \d+|^Starting state:/.test(line) && !hasNonLatinLetters(line)
        && !/^(?:\[[^\]]+\]\s*)?[^:]{1,80}:\s/.test(line)) {
      const prefix = line.match(/^(?:\d+(?:\.\d+)?(?:[–-]\d+(?:\.\d+)?)?s — |\[[\d:s.\s–-]+\]\s*)/)?.[0] || '';
      editable.set(lineId, prefix);
    }
  }
  return {lines:lines.map((text,id)=>({id,text,editable:editable.has(id)})), apply(edits) {
    const seen = new Set();
    const output = [...lines];
    const invalid = () => Object.assign(new Error('The prompt review returned an invalid edit.'), {
      code:'cinematic_prompt_refinement_invalid',statusCode:502
    });
    if (!Array.isArray(edits)) throw invalid();
    for (const edit of edits) {
      const id = edit?.id, text = typeof edit?.text === 'string' && edit.text.trim();
      if (!editable.has(id) || seen.has(id) || !text || /[\r\n"“”]/.test(text)
          || hasNonLatinLetters(text)
          || !text.startsWith(editable.get(id)) || markers(text) !== markers(lines[id]) || timeLiterals(text) !== timeLiterals(lines[id])
          || /^Shot \d+$|^\[[A-Z &_-]+\]$/.test(text)) throw invalid();
      seen.add(id);
      output[id] = text;
    }
    return output.join('\n');
  }};
}

// Give the sequence writer whole beats to compose. A spoken line, cut or change of
// department ends the paragraph. Internal event clocks remain protected markers.
function sequenceWritingLines(text) {
  const output = [];
  let section = '', paragraph = [];
  function flush() {
    if (paragraph.length > 1) {
      output.push(paragraph.map(line => line
        .replace(/^([\d.]+(?:[–-][\d.]+)?s) — /, '[$1] ')
        .replace(/^Starting state: /, 'At the cut, ')).join(' '));
    } else output.push(...paragraph);
    paragraph = [];
  }
  for (const line of text.split('\n')) {
    const heading = /^\[([A-Z &_-]+)\]$/.exec(line);
    if (heading) section = heading[1];
    const groupable = ['ACTION TIMELINE','CAMERA','SCENE','LIGHTING','CONTINUITY'].includes(section)
      && line.trim() && !heading && !/^Shot \d+$/.test(line) && !templateLines.has(line)
      && !/["“”]/.test(line);
    if (groupable) paragraph.push(line);
    else { flush(); output.push(line); }
  }
  flush();
  return output;
}

export function planStoryPromptLanguage(text, cues, findings = [], composeSequence = false, spokenLanguage) {
  const slots = [];
  const parts = [];
  const referenceLabels = new Map();
  const words = new Set(cues.map(cue => cue.text.trim()));
  const unresolved = new Set(findings.map(item => item.speaker));
  let section = '';
  let shotNumber;
  let linePrefix;
  const sequence = /^\d+ shots\. Shot boundaries:/m.test(text);
  const directionProse = source => source.replace(/“([^”]+)”|"([^"]+)"/gu, (quoted, curly, straight) =>
    words.has((curly ?? straight).trim()) ? 'the scripted line' : quoted);
  function slot(source, role) {
    if (!source || !/\p{L}/u.test(source) || isThaiDialogue(source, role, spokenLanguage)) { parts.push(source); return; }
    const id = slots.length;
    slots.push({id, role, source, section, shotNumber, linePrefix});
    parts.push(id);
    return id;
  }
  for (const line of composeSequence && sequence ? sequenceWritingLines(text) : text.split('\n')) {
    if (parts.length) parts.push('\n');
    const heading = line.replace(/^\[|\]$/g, '');
    if (headings.has(heading)) {
      section = heading;
      if (sequence) shotNumber = undefined;
      parts.push(line);
      continue;
    }
    const shotHeader = /^Shot (\d+)$/.exec(line);
    if (shotHeader) {
      shotNumber = Number(shotHeader[1]);
      parts.push(line);
      continue;
    }
    if (templateLines.has(line) || /^(?:Use Reference \d+ as the exact opening frame|Assign Reference \d+ to the opening-frame slot)\.$/.test(line)
      || /^\d+ shots\. Shot boundaries: [\d.,s ]+\.$/.test(line)) { parts.push(line); continue; }
    const prefix = line.match(/^(?:\[[\d:s.\s–-]+\]\s*|(?:\d+(?:\.\d+)?(?:[–-]\d+(?:\.\d+)?)?s — )|Reference \d+ — |(?:- )?Character \d+: |Duration: [\d.]+ seconds\.\s*|Starting state: )/)?.[0] || '';
    if (sequence && line.startsWith('Opening-frame basis: ')) {
      linePrefix = 'Opening-frame basis: ';
      parts.push(linePrefix);
      slot(directionProse(line.slice(linePrefix.length)), 'direction');
      continue;
    }
    linePrefix = prefix || undefined;
    parts.push(prefix);
    const body = line.slice(prefix.length);
    const referenceRole = section === 'REFERENCE MAPPING' && prefix.startsWith('Reference ')
      && referenceRoleSuffixes.find(role => body.endsWith(role));
    if (referenceRole) {
      const number = Number(prefix.match(/\d+/)[0]);
      linePrefix = undefined;
      const id = slot(body.slice(0, -referenceRole.length), 'reference_label');
      if (id !== undefined) referenceLabels.set(id,{number,suffix:referenceRole});
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
    } else slot(directionProse(body), 'direction');
  }
  return {slots, render(translations, spokenLanguage) {
    const invalid = (reason, item) => Object.assign(new Error({
      slot_count:'The writing model returned an incomplete prompt translation.',
      slot_invalid:'The writing model returned an invalid or empty translation slot.',
      unexpected_script:'The writing model left non-Latin text in a slot that requires English.',
      changed_markers:'The writing model changed protected time or reference markers.'
    }[reason]), {code:'cinematic_prompt_translation_invalid',statusCode:502,
      details:{reason,...(item && {slotId:item.id,section:item.section,role:item.role})}});
    if (!Array.isArray(translations) || translations.length !== slots.length) throw invalid('slot_count');
    const values = new Map();
    for (const row of translations) {
      const item = slots[row?.id];
      let value = typeof row?.text === 'string' && row.text.trim().replace(/[^\S\r\n]*[\r\n]+\s*/g, ' ');
      if (!item || item.id !== row.id || values.has(item.id) || !value) throw invalid('slot_invalid',item);
      const reference = referenceLabels.get(item.id);
      if (reference) {
        // The compiler owns the number and role. Accept a formatting echo of the same entry.
        const numberLabel = `(?:Reference|Image|Ref\\.)\\s*#?\\s*0*${reference.number}\\b`;
        value = value
          .replace(new RegExp(`^(?:\\[?\\s*${numberLabel}\\s*\\]?|\\[0*${reference.number}\\])\\s*(?:[—–:-]\\s*)?`, 'i'), '')
          .replace(new RegExp(`\\s*\\(${numberLabel}\\)\\s*\\.?$`, 'i'), '');
        if (value.toLowerCase().endsWith(reference.suffix.toLowerCase())) {
          value = value.slice(0, -reference.suffix.length).trim();
        }
        if (!value) throw invalid('slot_invalid',item);
        if (/^(?:\[?\s*(?:Reference|Image|Ref\.)\s*#?\s*\d+\b|\[\d+\])/i.test(value)) {
          throw invalid('changed_markers',item);
        }
      }
      const english = item.role !== 'dialogue' || spokenLanguage === 'English';
      if (english && hasNonLatinLetters(value)) throw invalid('unexpected_script',item);
      if (item.role !== 'dialogue' && markers(value) !== markers(item.source)) throw invalid('changed_markers',item);
      values.set(item.id, isThaiDialogue(item.source, item.role, spokenLanguage) ? item.source : value);
    }
    return parts.map(part => typeof part === 'number' ? values.get(part) : part).join('');
  }};
}
