import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const part = process.argv.find(value => value.startsWith('--part='))?.slice(7) || 'ui';
const groups = {
  server: ['test/characterPickerSearch.test.js', 'test/characterProfileSharing.test.js'],
  ui: ['src/features/scene-builder/routes/SceneBuilderTemplate.test.tsx', 'src/features/profiles/components/CharacterLibraryPicker.test.tsx', 'src/features/profiles/characterPickerRecents.test.ts', 'src/features/scene-builder/templateCharacterPolicy.test.ts'],
  compatibility: ['src/features/scene-builder/templateReferenceRequirements.test.ts', 'src/features/scene-builder/scenePoseRecipeModel.test.ts', 'src/features/studio/components/GuidedAttributeForm.test.tsx', 'src/features/scene-builder/schemas/sceneTemplateSchemas.test.ts', 'src/components/generation/StudioGenerationWorkspace.test.tsx']
};
if (part !== 'all' && !Object.hasOwn(groups, part)) throw new Error('Use --part=server|ui|compatibility|all');
for (const name of part === 'all' ? Object.keys(groups) : [part]) {
  const server = name === 'server';
  const result = spawnSync(process.execPath, server ? ['--test', ...groups[name]] : [fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)), 'run', ...groups[name]], {
    cwd: fileURLToPath(new URL(server ? '../' : '../web/', import.meta.url)), stdio: 'inherit', shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
