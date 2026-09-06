import fs from 'node:fs/promises';
import { installTemplateDetailLayoutFixture, templateFixture } from './templateDetailLayoutFixture.mjs';

export const policyFixture = { policyId: 'character-outfit-v1', supported: true,
  characterAvailable: true, outfitBackAvailable: true, characterEnabled: true,
  outfitBackEnabled: true, removedFields: [] };
export async function installTemplateInputPolicyLayoutFixture(context, origin) {
  const blocked = await installTemplateDetailLayoutFixture(context, origin);
  const html = await fs.readFile(new URL('../../web/dist/index.html', import.meta.url));
  const writes = [];
  await context.route('**/library/recent', route => route.fulfill({ body: html, contentType: 'text/html' }));
  await context.route('**/api/**', route => {
    const request = route.request(); const p = new URL(request.url()).pathname;
    if (p === '/api/community/generations/job-policy/share-status') return route.fulfill({ json: { shared: false } });
    if (p === '/api/scene-templates/shared/template-original') {
      if (request.method() === 'GET') return route.fulfill({ json: { ...templateFixture, viewer: { isOwner: true, permissions: {} } } });
      if (request.method() === 'PATCH') { writes.push(request.postDataJSON()); return route.fulfill({ json: { ...templateFixture, viewer: { isOwner: true, permissions: {} } } }); }
    }
    if (p === '/api/templates/template-fixture/input-policy') return route.fulfill({ json: {
      ...policyFixture, characterEnabled: false, templateId: 'template-fixture', templateVersionId: 'v1', removedFields: ['Environment', 'Pose reference']
    } });
    if (p === '/api/templates/template-fixture/pose-proxy') return route.fulfill({ json: {
      status: 'active', fashionCompatible: true, templateVersionId: 'v1', poseVariantId: 'default',
      proxyId: 'proxy', qaDecision: 'approved', qaReasonCodes: [], operationId: null, correlationId: null,
      reviewImageUrl: templateFixture.imageUrl
    } });
    if (p === '/api/history') return route.fulfill({ json: { items: [{ id: 'job-policy', imageUrl: templateFixture.imageUrl,
      timestamp: 1788600000000, provider: 'fixture', submodel: 'fixture-image', mode: 'scene' }], hasMore: false } });
    if (p === '/api/collections') return route.fulfill({ json: { collections: [] } });
    if (p === '/api/comparisons' || p === '/api/generation/video/tasks') return route.fulfill({ json: { items: [], hasMore: false } });
    if (p === '/api/community/share-drafts' && request.method() === 'POST') return route.fulfill({ json: {
      id: 'draft-policy', sourceGenerationId: 'job-policy', templateEligible: true,
      templateInputPolicy: policyFixture, mandatoryTemplateInputIds: ['outfit_front_reference']
    } });
    if (p === '/api/community/share-drafts/draft-policy/publish') {
      writes.push(request.postDataJSON());
      return route.fulfill({ json: { id: 'template-original', postType: 'template', templateId: 'template-fixture', templateVersionId: 'v1' } });
    }
    return route.fallback();
  });
  return { blocked, writes };
}
