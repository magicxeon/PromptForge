export function storySkillProvenance(value) {
  const versions = value?.selectedSkillVersions;
  if (!Number.isSafeInteger(value?.selectionVersion) || value.selectionVersion < 1 ||
      !versions || typeof versions !== 'object' || Array.isArray(versions)) return {};
  const selected = Object.entries(versions).filter(([id, version]) =>
    /^[a-z][a-z0-9-]{0,99}$/.test(id) && Number.isSafeInteger(version) && version > 0);
  return {selectionVersion:value.selectionVersion, selectedSkillVersions:Object.fromEntries(selected)};
}
