import { readFileSync } from 'node:fs';

// Request actors can be frozen and carry an identity proof bound to the object itself.
const creditFreeActors = new WeakSet();
export const UNMETERED = 'unmetered';

export function withWebNextCreditPolicy(actor, creditsEnabled) {
  if (actor?.userId) {
    if (creditsEnabled === false) creditFreeActors.add(actor);
    else creditFreeActors.delete(actor);
  }
  return actor;
}
export function webNextCreditsDisabled(actor) { return creditFreeActors.has(actor); }

// Only normalized server workflow inputs belong here. Unknown workflows retain metered admission.
export function workspaceCreditDecision(actor, workflow, { context, templateExecution, internalGroupContext, capability, commercialOperation, writingScope } = {}) {
  let eligible = false;
  switch (workflow) {
    case 'image':
    case 'comparison':
      eligible = context?.generationSurface === 'playground' && context.generationMode === 'playground'
        && !templateExecution && !internalGroupContext;
      break;
    case 'video':
      eligible = capability === 'playground_video' && commercialOperation === 'playground_video';
      break;
    case 'speech':
    case 'voice_design':
      eligible = true;
      break;
    case 'cinematic_writing':
      eligible = ['chapter_outline', 'chapters', 'scenes', 'shots'].includes(commercialOperation)
        || (commercialOperation === 'characters' && writingScope === 'whole_story');
      break;
  }
  return { eligible, creditsDisabled: eligible && webNextCreditsDisabled(actor) };
}

// Admission records carry the decision across retries and config changes.
export function isUnmetered(record) { return record?.billingMode === UNMETERED; }

export function configuredWebNextCredits() {
  const policy = JSON.parse(readFileSync(new URL('../../config/web-next.json', import.meta.url), 'utf8'));
  if (typeof policy.creditsEnabled !== 'boolean') throw new Error('Invalid web-next Credits configuration.');
  return policy.creditsEnabled;
}
