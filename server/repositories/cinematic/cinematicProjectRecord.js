export const CINEMATIC_AUTHORING_CONTRACT_VERSION = 'cinematic-authoring-v1';

export function normalizeCinematicAuthoringEnvelope(project, { newRecord = false } = {}) {
  if (!project || typeof project !== 'object') return project;
  if (project.authoringContractVersion !== CINEMATIC_AUTHORING_CONTRACT_VERSION) {
    project.authoringContractVersion = CINEMATIC_AUTHORING_CONTRACT_VERSION;
  }
  if (!project.authoringState || typeof project.authoringState !== 'object' || Array.isArray(project.authoringState)) {
    project.authoringState = {
      inferenceMode: newRecord ? 'explicit' : 'legacy',
      fieldStates: {}
    };
  }
  if (!['explicit', 'legacy'].includes(project.authoringState.inferenceMode)) {
    project.authoringState.inferenceMode = newRecord ? 'explicit' : 'legacy';
  }
  if (!project.authoringState.fieldStates || typeof project.authoringState.fieldStates !== 'object'
    || Array.isArray(project.authoringState.fieldStates)) {
    project.authoringState.fieldStates = {};
  }
  return project;
}

