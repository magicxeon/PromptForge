import { spawnSync } from 'child_process';

const checks = [
  {
    label: 'Character Sheet prompt and persistence tests',
    command: process.execPath,
    args: [
      '--test',
      'test/modeSpecificCharacterReference.test.js',
      'test/characterSheetPersistence.test.js'
    ]
  },
  {
    label: 'Headshot/Character prompt cleanup regression',
    command: process.execPath,
    args: ['scripts/test-prompt-cleanup.js']
  },
  {
    label: 'Character Sheet visual manifest contract',
    command: process.execPath,
    args: ['scripts/slice-visual-assets.js', '--check', '--field=character-sheet']
  }
];

for (const check of checks) {
  console.log(`\n[Character Sheet Gate] ${check.label}`);
  const result = spawnSync(check.command, check.args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error.message);
    }
    console.error(`\n[Character Sheet Gate] Failed: ${check.label}`);
    process.exit(result.status || 1);
  }
}

console.log('\n[Character Sheet Gate] Automated checks passed.');
