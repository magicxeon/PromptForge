/**
 * ModelPromptForge - Scene Template Versioning & Migration (Server Side)
 */

function getSceneTemplateVersion() {
  return 1;
}

function migrateSceneTemplateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return snapshot;

  // Currently version 1 is MVP. No migrations needed yet.
  return snapshot;
}

export {
  getSceneTemplateVersion,
  migrateSceneTemplateSnapshot
};
