import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const vitest = ['node_modules/vitest/vitest.mjs', 'run', '--root', 'web', '--config', 'vitest.config.ts', '--configLoader', 'runner'];
const groups = {
  loading: [['--test', 'test/sharedProcessingSpinner.test.js'], [...vitest, 'src/components/comparisons/ComparisonWorkspace.test.tsx', 'src/components/generation/GenerationResultSurface.test.tsx', 'src/features/profiles/components/LookSheetEnhancementPanel.test.tsx']],
  render: [['--test', 'test/comparisonExportRenderer.test.js']],
  service: [['--test', 'test/mediaExport.test.js']],
  ui: [[...vitest, 'src/components/media/ComparisonExportDialog.test.tsx', 'src/components/media/MediaExportButton.test.tsx', 'src/lib/api/apiClient.test.ts']],
  types: [['node_modules/typescript/bin/tsc', '-p', 'web/tsconfig.app.json', '--noEmit', '--incremental', 'false']]
};
for (const name of process.argv[2] === 'all' ? Object.keys(groups) : [process.argv[2]]) {
  if (!groups[name]) { console.error('Select loading, render, service, ui, types or all'); process.exit(2); }
  console.log(`Checking ${name}`);
  for (const args of groups[name]) {
    const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
    if (result.error) console.error(result.error.message);
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
