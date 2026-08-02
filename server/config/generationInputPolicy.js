export const GENERATION_INPUT_POLICY = Object.freeze({
  schemaVersion: 1,
  customAttribute: Object.freeze({
    maxCharactersPerField: 1000,
    maxCharactersTotal: 2000
  })
});

export function getPublicGenerationInputPolicy() {
  return GENERATION_INPUT_POLICY;
}
