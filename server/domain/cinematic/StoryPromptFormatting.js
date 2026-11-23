import templates from '../../config/cinematic/story-shot-templates.v1.json' with {type:'json'};

const clockPart = String.raw`\d+(?::\d{1,2})?(?:\.\d+)?\s*(?:seconds|sec|s)?`;
export const storyDirectionClockPattern = new RegExp(
  String.raw`\[\s*(${clockPart})(?:\s*[-–—]\s*(${clockPart}))?\s*\]`, 'gi');

function clockMilliseconds(value) {
  const parts = value.replace(/\s*(seconds|sec|s)\s*$/i, '').split(':').map(Number);
  return Math.round((parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0]) * 1000);
}

// Documents use shot-local timestamps inside stage directions.
// Run during compilation only, before absolute cue lines and speech are inserted.
export function mergedSequenceClock(shots) {
  const precise = shots.some(({startMs,endMs}) => Math.round(startMs / 1000) === Math.round(endMs / 1000));
  return {precise, seconds:ms => precise ? ms / 1000 : Math.round(ms / 1000)};
}

export function rebaseDirectionClocks(direction, startMs = 0, onClock = () => {}, precise = false) {
  return (direction || '').replace(/“[^”]*”|"[^"]*"|\[[^\]\r\n]+\]/g, value => {
    const match = [...value.matchAll(storyDirectionClockPattern)][0];
    if (!match || match[0] !== value) return value;
    if (!match[2] && /^\d+\s*$/.test(match[1])) return value;
    const first = clockMilliseconds(match[1]);
    const last = match[2] ? clockMilliseconds(match[2]) : first;
    onClock(first,last);
    const start = precise ? (startMs + first) / 1000 : Math.round((startMs + first) / 1000);
    const end = precise ? (startMs + last) / 1000 : Math.round((startMs + last) / 1000);
    return start === end ? `[${start}s]` : `[${start}–${end}s]`;
  });
}

export function formatStoryPromptWholeSeconds(text) {
  const round = value => Math.round(Number(value));
  return text
    .replace(/^(Duration:[ \t]*)(\d+(?:\.\d+)?)([ \t]+seconds\b)/gm,
      (_, label, duration, unit) => `${label}${Math.max(1, round(duration))}${unit}`)
    .replace(/^(\s*\[?)(\d+(?:\.\d+)?)s?[ \t]*[–-][ \t]*(\d+(?:\.\d+)?)s(?=\]|[ \t]|\r?$)/gm,
      (_, prefix, start, end) => {
        const first = round(start), last = round(end);
        return `${prefix}${first === last ? first : `${first}–${last}`}s`;
      })
    .replace(/^(\s*\[)(\d+\.\d+)s(?=\])/gm, (_, prefix, at) => `${prefix}${round(at)}s`);
}

export function inspectStoryPromptDraft(text, references, durationMs, generated = '') {
  const issues = [];
  const cited = new Set();
  const mapped = new Set();
  const wanted = new Set(references.map(ref => ref.number));
  const duration = Math.max(durationMs / 1000, Math.round(durationMs / 1000));
  const lines = text.split(/\r?\n/);
  const sequence = /^\d+ shots\. Shot boundaries:/m.test(text);
  let shotNumber;
  let legacyShotNumber = 0;
  let inActionTimeline = false;
  for (const [index,line] of lines.entries()) {
    const heading = /^Shot (\d+)\s*$/.exec(line);
    if (heading) shotNumber = Number(heading[1]);
    else if (/^\[[A-Z &_-]+\]$/.test(line)) {
      inActionTimeline = line === '[ACTION TIMELINE]';
      if (sequence) shotNumber = undefined;
      legacyShotNumber = 0;
    } else if (inActionTimeline && /^\d+(?:\.\d+)?(?:[–-]\d+(?:\.\d+)?)?s — /.test(line) && /^Starting state:/.test(lines[index+1] || '')) {
      legacyShotNumber++;
    }
    const cueShot = shotNumber ?? (legacyShotNumber || undefined);
    const direction = line.replace(/“[^”]*”|"[^"]*"/g, '');
    const mapping = direction.match(/^\s*Reference\s+(\d+)\s*[—:-]/i);
    if (mapping) mapped.add(Number(mapping[1]));
    for (const match of direction.matchAll(/\bReference\s+(\d+)\b/gi)) cited.add(Number(match[1]));
    for (const match of direction.matchAll(/(?:^|\[)(\d+(?:\.\d+)?)(?:[–-](\d+(?:\.\d+)?))?s(?=\]| —)/g)) {
      const start = Number(match[1]), end = Number(match[2] ?? start);
      if (end > duration || start > end) issues.push({key:'reviewClock',value:match[0].replace('[',''),shotNumber:cueShot});
    }
    for (const [marker] of direction.matchAll(storyDirectionClockPattern)) {
      if (marker.includes(':')) issues.push({key:'reviewClock',value:marker,shotNumber:cueShot});
    }
  }
  for (const number of new Set([...wanted,...cited])) {
    if (!wanted.has(number) || !mapped.has(number)) issues.push({key:'reviewReference',value:String(number)});
  }
  const cues = source => Array.from(source.matchAll(/^\[([^\]]+)\]\s+(.+?):\s*“.+”/gm), m=>m[1]+' '+m[2]);
  const current = cues(text);
  for (const cue of cues(generated)) {
    const index = current.indexOf(cue);
    if (index < 0) issues.push({key:'reviewCue',value:cue});
    else current.splice(index,1);
  }
  return issues;
}

export function normalizeMergedStoryReferences(text) {
  return text.replace(/^\[PRESERVE EXACTLY\][ \t]*\r?\n([\s\S]*?)(?=^\[[A-Z][A-Z &_-]+\][ \t]*\r?$|(?![\s\S]))/gm, (_, body) => {
    const lines = body.trim().split(/\r?\n/);
    const firstContinuity = lines.findIndex(line => !/^Reference \d+\b/i.test(line.trim()));
    const references = firstContinuity < 0 ? lines : lines.slice(0, firstContinuity);
    const continuity = firstContinuity < 0 ? '' : lines.slice(firstContinuity).join('\n').trim();
    return [
      references.length && ['[REFERENCE MAPPING]', templates.video.referenceNote, ...references, templates.video.visualReferences].join('\n'),
      continuity && `[CONTINUITY]\n${continuity}`
    ].filter(Boolean).join('\n\n') + '\n\n';
  });
}
