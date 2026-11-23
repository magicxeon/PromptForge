import templates from '../../config/cinematic/story-shot-templates.v1.json' with {type:'json'};

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
