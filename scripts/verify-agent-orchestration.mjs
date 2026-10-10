import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { root, validatePlan, validateInventory } from './agent-orchestration/contracts.mjs';

const args = process.argv.slice(2);
const groups = {
  legacy: ['test/agentOrchestration.test.js'],
  contracts: ['test/agentCoordination.test.js'],
  inventory: null
};
try {
  if (args.length === 2 && args[0] === '--plan') {
    if (statSync(args[1]).size > 262144) throw new Error('Task plan exceeds 256 KiB');
    const errors = validatePlan(JSON.parse(readFileSync(args[1], 'utf8')));
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('PASS task plan structure. This does not prove evidence truth or execute agents.');
  } else {
    const selected = args.length === 1 && args[0] === '--all' ? Object.keys(groups)
      : args.length === 2 && args[0] === '--group' && Object.hasOwn(groups, args[1]) ? [args[1]] : null;
    if (!selected) {
      console.error('Usage: --group legacy|contracts|inventory OR --all OR --plan <task-plan.json>');
      process.exitCode = 2;
    } else for (const group of selected) {
      console.log(`[${group}] Offline checks only; no model calls, live-data writes or worker startup.`);
      if (group === 'inventory') {
        const errors = validateInventory();
        if (errors.length) throw new Error(errors.join('\n'));
        console.log('PASS current artifact inventory');
      } else {
        const result = spawnSync(process.execPath, ['--test', ...groups[group]], { cwd: root, stdio: 'inherit', windowsHide: true });
        if (result.error || result.status !== 0) throw result.error || new Error(`Failed ${group} (exit ${result.status})`);
      }
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
