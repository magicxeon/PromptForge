import fs from 'node:fs/promises';
import { installCharacterDiscoveryLayoutFixture } from './characterDiscoveryLayoutFixture.mjs';

const asset = name => `/assets/scene-builder/shot-recipes/${name}.jpg`;
export const templateSceneHandoff = {
  postId: 'template-scene-original',
  sceneTemplateSnapshot: { sceneTemplateVersion: 1, authoringMode: 'guided', finalPromptSnapshot: 'Quiet editorial scene', structuredSelectionsSnapshot: {}, referenceSlotMapping: {}, replaceableVariables: [] },
  templateUseContext: { templateId: 'template', templateVersionId: 'v1', templateUseSessionId: 'template-session-fixture', sourceCommunityPostId: 'template-scene-original', expiresAt: '2099-01-01T00:00:00Z', pricing: { accessCredits: 3, currency: 'credits' }, publicInputSchema: { schemaVersion: 1, inputs: [{ id: 'identity', sourceFieldName: 'character_reference', type: 'reference_image', replacementPolicy: 'replaceable', required: true }] } }
};
export async function installTemplateSceneLayoutFixture(context, origin) {
  const blocked = await installCharacterDiscoveryLayoutFixture(context, origin);
  const html = await fs.readFile(new URL('../../web/dist/index.html', import.meta.url));
  const characters = Array.from({ length: 28 }, (_, index) => ({ id: `character-${index}`, displayName: `Nara ${index + 1}`, characterProfileVersionId: 'v1',
    imageUrl: asset(['soft-character-portrait', 'window-shadow-lookbook', 'cafe-seated-lifestyle'][index % 3]),
    handoffAvailable: true, characterType: 'reusable_model', outfitBehavior: 'replaceable', destinationCapabilities: ['scene_builder'] }));
  const drafts = [];
  await context.route('**/create/studio/scene', route => route.fulfill({ body: html, contentType: 'text/html' }));
  await context.route('**/assets/visual-character-builder/**/manifest.index.json*', route => route.fulfill({ json: { schemaVersion: 1, manifests: [] } }));
  await context.route('**/api/**', route => {
    const request = route.request(); const url = new URL(request.url()); const p = url.pathname;
    if (p === '/api/attributes/bundle') return route.fulfill({ json: { schema: [], library: [], templates: [], presets: {} } });
    if (p === '/api/providers') return route.fulfill({ json: { defaultProvider: 'fixture', providers: [{ id: 'fixture', displayName: 'Fixture provider', defaultModel: 'image', models: [{ id: 'image', displayName: 'Image model', paidRoutingEnabled: true, qualificationStatus: 'qualified', capabilities: { imageGeneration: true, imageReferences: true, maxReferenceImages: 6, aspectRatios: ['9:16', '1:1'] } }] }] } });
    if (p === '/api/history') return route.fulfill({ json: { items: [], hasMore: false } });
    if (p === '/api/collections') return route.fulfill({ json: { collections: [] } });
    if (p === '/api/scene-templates/shared') return route.fulfill({ json: [] });
    if (p === '/api/scene-templates/shared/template-scene-original') return route.fulfill({ json: { id: 'template-scene-original', postType: 'template', title: 'Window light editorial', creator: { displayName: 'Sample Creator', username: 'sample_creator' }, imageUrl: asset('street-walk-editorial'), engagementSummary: {} } });
    if (p === '/api/character-profiles' || p === '/api/community/characters') {
      const items = characters.filter(item => item.displayName.toLowerCase().includes((url.searchParams.get('q') || '').toLowerCase()));
      const offset = Number(url.searchParams.get('cursor')) || 0;
      return route.fulfill({ json: { items: items.slice(offset, offset + 24), nextCursor: offset + 24 < items.length ? String(offset + 24) : null, hasMore: offset + 24 < items.length } });
    }
    const match = p.match(/^\/api\/community\/characters\/(character-\d+)(\/handoffs)?$/);
    if (match) {
      const item = characters.find(value => value.id === match[1]);
      if (!match[2]) return route.fulfill({ json: item });
      return route.fulfill({ json: { handoffVersion: 1, destination: 'scene_builder', characterProfileId: item.id, characterProfileVersionId: 'v1', characterReferenceAssetId: 'authorized-fixture', characterReferenceUrl: item.imageUrl,
        displayName: item.displayName, characterType: 'reusable_model', outfitBehavior: 'replaceable', characterProfileContext: { purpose: 'character_usage', characterProfileId: item.id, characterProfileVersionId: 'v1' } } });
    }
    if (p === '/api/credits/estimate') {
      drafts.push(request.postDataJSON());
      return route.fulfill({ json: { estimate: { estimateId: 'fixture-estimate', estimatedCredits: 5, expiresAt: '2099-01-01T00:00:00Z' }, account: { availableCredits: 50, canAfford: true } } });
    }
    if (p === '/api/references/processing-plan') {
      drafts.push(request.postDataJSON());
      return route.fulfill({ json: { status: 'accepted', policyVersion: 'fixture', planFingerprint: 'fixture', publicAuthorityProjection: { schemaVersion: 1, policyVersion: 'fixture', planFingerprint: 'fixture' }, effectiveSelections: {}, providerPlan: { referenceCount: 1, executionMode: 'single_stage' } } });
    }
    if (p === '/api/generation/prompt-preview') return route.fulfill({ json: { compiledPrompt: 'Template fixture prompt' } });
    return route.fallback();
  });
  return { blocked, drafts };
}
