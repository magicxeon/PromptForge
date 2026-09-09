// Policy v1: use the entire pinned run, never its current inspection page.
export function resolveComparisonImageLayout(sources, aspectRatio) {
  const parts = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspectRatio || '');
  const fallback = parts ? Number(parts[1]) / Number(parts[2]) : null;
  return sources.length && sources.every(source => {
    const ratio = source.width > 0 && source.height > 0 ? source.width / source.height : fallback;
    return Number.isFinite(ratio) && ratio > 1;
  }) ? 'stacked' : 'side_by_side';
}
