import { cinematicKeyframeConfigurationService } from './CinematicKeyframeConfigurationService.js';
import { resolveStoryboardPromptPolicy } from './CinematicStoryboardRenderStyle.js';
import { validateGenerationPrompt } from '../generation/GenerationPromptBudget.js';

export class CinematicStoryboardPromptComposer {
  constructor({ configurationService = cinematicKeyframeConfigurationService } = {}) {
    this.configurationService = configurationService;
  }

  compose(input = {}) {
    return this.prepare(input).prompt;
  }

  prepare({ context = {}, visualPrompt = '' } = {}) {
    const visualAuthority = normalizeBlock(visualPrompt);
    if (!visualAuthority) {
      throw new TypeError('A Cinematic Storyboard visual prompt is required.');
    }

    const configuration = this.configurationService.getCompilerConfiguration();
    const policy = resolveStoryboardPromptPolicy(configuration.providerPromptPolicy, context.cinematicFaceless, context.cinematicFacialTreatment);
    const blocks = {
      visualAuthority: joinUnique([context.cinematicContainsPeople === false ? 'Create ONE full-color photorealistic environment and object still. No visible people.' : policy.renderStyleInstruction, ['faceless_previs_v1', 'white_previs_v1'].includes(policy.renderStyle)
        ? projectFacelessVisualPrompt(visualAuthority)
        : visualAuthority]),
      referenceAuthority: compileReferenceAuthority(context, policy),
      subjectBehavior: compileSubjectBehavior(context, policy),
      photographicBehavior: compilePhotographicBehavior(context, { ...configuration, providerPromptPolicy: policy }),
      constraints: joinUnique(policy.constraintInstructions)
    };
    const maximumPromptCharacters = resolveMaximumPromptCharacters(context, policy);
    const original = renderBlocks(blocks, policy, Infinity);
    const prompt = renderBlocks(blocks, policy, maximumPromptCharacters);
    return { prompt, promptBudget: validateGenerationPrompt(prompt, {
      providerId: context.provider || context.providerId || '', modelId: context.submodel || context.modelId || '',
      operation: 'image', originalCharacters: Array.from(original).length,
      recommendedCharacters: maximumPromptCharacters
    }) };
  }
}

function projectFacelessVisualPrompt(value) {
  // Project the canonical text contract for this still only; do not change Shot/Video data.
  const sections = value.split(/\n\n(?=[A-Z][A-Z ]+:\n)/u);
  const priority = ['KEYFRAME MOMENT', 'LIGHTING AND ENVIRONMENT', 'CAMERA AND COMPOSITION', 'SUBJECT AUTHORITY'];
  const projected = sections.filter(section => !section.startsWith('VISIBLE PERFORMANCE:\n'))
    .map(section => section.replace(/preserve authorized identity/giu, 'preserve body silhouette, hair and wardrobe only; face stays blank'));
  if (!value.startsWith('STORYBOARD KEYFRAME CONTRACT')) return projected.join('\n\n');
  const header = projected.shift();
  projected.sort((a, b) => {
    const rank = section => {
      const index = priority.indexOf(section.slice(0, section.indexOf(':\n')));
      return index < 0 ? priority.length : index;
    };
    return rank(a) - rank(b);
  });
  return [header, ...projected].join('\n\n');
}

function compileReferenceAuthority(context, policy) {
  const manifest = Array.isArray(context.referenceRoleManifest)
    ? context.referenceRoleManifest
    : [];
  if (!manifest.length) return '';

  const entries = manifest.map((entry, manifestIndex) => {
    const index = Number.isInteger(Number(entry?.index))
      ? Number(entry.index)
      : manifestIndex + 1;
    const declaredRoles = [...new Set(Array.isArray(entry?.roles) ? entry.roles : [])];
    const unsupportedRoles = declaredRoles.filter(
      role => typeof policy.referenceRoleInstructions[role] !== 'string'
    );
    if (unsupportedRoles.length) {
      throw new TypeError(
        `Unsupported Cinematic reference role: ${unsupportedRoles.join(', ')}.`
      );
    }
    const roles = declaredRoles;
    if (!roles.length) return '';
    const instructions = roles.map(role => policy.referenceRoleInstructions[role]);
    return `Reference image ${index} (${roles.join(', ')}): ${entry.castNames?.length
      ? `${policy.castReferenceLabel || 'Look Sheet facial identity and wardrobe'} ONLY for ${entry.castNames.map(name => JSON.stringify(name)).join(', ')}.`
      : joinUnique(instructions)}`;
  }).filter(Boolean);

  if (!entries.length) return '';
  return joinUnique([
    ...entries,
    manifest.some(entry => entry.castNames?.length) ? policy.castLookIdentityInstruction : '',
    policy.referenceBoundaryInstruction,
    policy.multiViewInstruction
  ]);
}

function compileSubjectBehavior(context, policy) {
  if (context.cinematicContainsPeople === false) return 'No visible people. Preserve only the authored environment and object state.';
  const hasOutfitReference = context.imageReferences?.outfitReference === true;
  const outfitBehavior = context.characterReferenceOutfitBehavior
    || context.characterProfileContext?.outfitBehavior;
  const outfitInstruction = hasOutfitReference || outfitBehavior === 'replaceable'
    ? policy.replaceOutfitInstruction
    : policy.preserveOutfitInstruction;
  return joinUnique([
    outfitInstruction,
    compileAgeAuthority(context.characterProfileContext),
    ...policy.narrativeBehaviorInstructions,
  ]);
}

function compilePhotographicBehavior(context, configuration) {
  const policy = configuration.providerPromptPolicy;
  const captureProfileId = context.cinematicCaptureProfileId === null
    ? null
    : (context.cinematicCaptureProfileId || configuration.captureProfile.id);
  return joinUnique([
    ...policy.baselinePhotographicInstructions,
    ...(captureProfileId ? (policy.captureProfileInstructions[captureProfileId] || []) : [])
  ]);
}

function compileAgeAuthority(characterProfileContext) {
  if (characterProfileContext?.purpose !== 'character_usage') return '';
  const source = characterProfileContext.identityPack?.ageRange
    || characterProfileContext.identityMetadata?.ageRange;
  if (!source || typeof source !== 'object') return '';
  const minimum = Number(source.minimum ?? source.min);
  const rawMaximum = source.maximum ?? source.max;
  const maximum = rawMaximum === null ? null : Number(rawMaximum);
  if (!Number.isInteger(minimum) || minimum < 0 || minimum > 120) return '';
  if (maximum !== null && (!Number.isInteger(maximum) || maximum < minimum || maximum > 120)) {
    return '';
  }
  const range = maximum === null ? `${minimum}+` : `${minimum}-${maximum}`;
  return `Keep the authorized apparent age ${range}, matching the Character references without aging up or down.`;
}

function resolveMaximumPromptCharacters(context, policy) {
  const provider = String(
    context.provider || context.providerId || context.providerKey || ''
  ).trim().toLowerCase();
  return policy.providerMaximumPromptCharacters[provider]
    || policy.defaultMaximumPromptCharacters;
}

function renderBlocks(blocks, policy, maximumPromptCharacters) {
  const rendered = [];
  for (const blockName of policy.blockOrder) {
    const content = normalizeBlock(blocks[blockName]);
    if (!content) continue;
    const label = blockName === 'visualAuthority' ? '' : policy.blockLabels[blockName];
    rendered.push(label ? `${label}:\n${content}` : content);
  }

  const prompt = rendered.join('\n\n').trim();
  return prompt.length > maximumPromptCharacters
    ? rendered.map(block => block.replace(/:\n/g, ': ')).join('\n') : prompt;
}

function joinUnique(values) {
  const seen = new Set();
  return (values || []).map(normalizeBlock).filter(value => {
    if (!value) return false;
    const key = value.toLocaleLowerCase('en-US');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join(' ');
}

function normalizeBlock(value) {
  return String(value || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const cinematicStoryboardPromptComposer = new CinematicStoryboardPromptComposer();
