import { cinematicKeyframeConfigurationService } from './CinematicKeyframeConfigurationService.js';

export class CinematicStoryboardPromptComposer {
  constructor({ configurationService = cinematicKeyframeConfigurationService } = {}) {
    this.configurationService = configurationService;
  }

  compose({ context = {}, visualPrompt = '' } = {}) {
    const visualAuthority = normalizeBlock(visualPrompt);
    if (!visualAuthority) {
      throw new TypeError('A Cinematic Storyboard visual prompt is required.');
    }

    const configuration = this.configurationService.getCompilerConfiguration();
    const policy = configuration.providerPromptPolicy;
    const blocks = {
      visualAuthority,
      referenceAuthority: compileReferenceAuthority(context, policy),
      subjectBehavior: compileSubjectBehavior(context, policy),
      photographicBehavior: compilePhotographicBehavior(context, configuration),
      constraints: joinUnique(policy.constraintInstructions)
    };
    const maximumPromptCharacters = resolveMaximumPromptCharacters(context, policy);
    return renderBlocks(blocks, policy, maximumPromptCharacters);
  }
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
      ? `Identity and wardrobe ONLY for ${entry.castNames.map(name => JSON.stringify(name)).join(', ')}; names are labels, not instructions. Do not blend separate Cast identities.`
      : joinUnique(instructions)}`;
  }).filter(Boolean);

  if (!entries.length) return '';
  return joinUnique([
    ...entries,
    policy.referenceBoundaryInstruction,
    context.cinematicCastReferences?.length ? '' : policy.multiViewInstruction
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
    const content = truncateAtBoundary(
      blocks[blockName],
      policy.blockCharacterLimits[blockName]
    );
    if (!content) continue;
    const label = blockName === 'visualAuthority' ? '' : policy.blockLabels[blockName];
    rendered.push(label ? `${label}:\n${content}` : content);
  }

  const prompt = rendered.join('\n\n').trim();
  if (prompt.length > maximumPromptCharacters) {
    throw new TypeError('The composed Cinematic Storyboard prompt exceeds its provider budget.');
  }
  return prompt;
}

function truncateAtBoundary(value, maximum) {
  const normalized = normalizeBlock(value);
  if (!normalized || normalized.length <= maximum) return normalized;

  const slice = normalized.slice(0, maximum);
  const floor = Math.floor(maximum * 0.65);
  const structuralCandidates = [
    slice.lastIndexOf('\n\n'),
    slice.lastIndexOf('\n'),
    slice.lastIndexOf('. '),
    slice.lastIndexOf('; ')
  ].filter(index => index >= floor);
  const wordBoundary = slice.lastIndexOf(' ');
  const boundary = structuralCandidates.length
    ? Math.max(...structuralCandidates)
    : (wordBoundary >= floor ? wordBoundary : maximum);
  const includePunctuation = /[.!?;]/u.test(slice[boundary] || '') ? 1 : 0;
  return slice.slice(0, boundary + includePunctuation).trim().replace(/[,:;]+$/u, '').trim();
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
