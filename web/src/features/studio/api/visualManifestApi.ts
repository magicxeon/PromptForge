import {
  visualManifestIndexSchema,
  visualManifestSchema,
  type VisualManifest
} from '../schemas/visualManifestSchemas';

const HEADSHOT_INDEX =
  '/assets/visual-character-builder/headshot-v1/manifest.index.json';
const CHARACTER_SHEET_INDEX =
  '/assets/visual-character-builder/character-sheet-v1/manifest.index.json';
const SAFE_ASSET_PREFIX = '/assets/visual-character-builder/';

export async function loadStudioVisualManifests(
  mode: 'headshot' | 'character-sheet' | 'scene',
  signal?: AbortSignal
) {
  const indexUrls = mode !== 'headshot'
    ? [HEADSHOT_INDEX, CHARACTER_SHEET_INDEX]
    : [HEADSHOT_INDEX];
  const indexResults = await Promise.allSettled(
    indexUrls.map(async url => visualManifestIndexSchema.parse(
      await fetchJson(url, signal)
    ))
  );
  const indexes = indexResults.flatMap(result =>
    result.status === 'fulfilled' ? [result.value] : []
  );
  if (!indexes.length) {
    throw new Error('Studio visual manifest indexes are unavailable.');
  }
  const entries = indexes
    .flatMap(index => index.manifests)
    .filter(entry => isSafeVisualAssetUrl(entry.url));
  const manifests = await Promise.allSettled(
    [...new Set(entries.map(entry => entry.url))]
      .map(async url => visualManifestSchema.parse(await fetchJson(url, signal)))
  );

  return Object.fromEntries(
    manifests.flatMap(result => result.status === 'fulfilled'
      ? [[result.value.fieldId, result.value] as const]
      : [])
  ) as Record<string, VisualManifest>;
}

export function isSafeVisualAssetUrl(value: string) {
  return value.startsWith(SAFE_ASSET_PREFIX)
    && !value.includes('..')
    && !value.includes('\\');
}

async function fetchJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, {
    signal,
    credentials: 'same-origin'
  });
  if (!response.ok) {
    throw new Error(`Visual manifest request failed with HTTP ${response.status}.`);
  }
  return response.json() as Promise<unknown>;
}
