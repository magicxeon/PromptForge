export function buildCharacterIdentityFacets(version = {}) {
  const selections = version.structuredCharacterSnapshot?.selections || {};
  const ageMetadata = version.identityMetadata?.ageRange || null;
  return {
    presentationGender: clean(
      version.identityMetadata?.presentationGender?.value
      || selections.Gender?.value
      || selections.Gender?.label
    ),
    ageRange: ageMetadata ? {
      minimum: finiteOrNull(ageMetadata.minimum),
      maximum: finiteOrNull(ageMetadata.maximum),
      label: clean(selections.Age?.label)
    } : null,
    ethnicity: clean(selections.Ethnicity?.label || selections.Ethnicity?.value)
  };
}

function clean(value) {
  return String(value || '').trim().toLowerCase() || null;
}

function finiteOrNull(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}
