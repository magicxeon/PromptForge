import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { classifyTask, existingFile, registry, root, safePath, scopesOverlap, validateInventory, validatePlan } from '../scripts/agent-orchestration/contracts.mjs';

const fixturePath = 'test/fixtures/agent-coordination-plan.json';
const read = file => readFileSync(path.join(root, file), 'utf8');
const fixture = () => JSON.parse(read(fixturePath));
const fails = (change, pattern) => {
  const plan = fixture();
  change(plan);
  assert.match(validatePlan(plan).join('\n'), pattern);
};

test('small low-risk changes stay single-agent; complexity is not parallelism', () => {
  assert.deepEqual(classifyTask({ capabilities: ['profiles'] }), { complexity: 'simple', execution: 'single-agent' });
  for (const input of [{ capabilities: ['a', 'b'] }, { capabilities: ['a'], uncertain: true },
    { capabilities: ['a'], contractChanged: true }, { capabilities: ['a'], risks: ['financial'] }]) {
    assert.deepEqual(classifyTask(input), { complexity: 'complex', execution: 'plan-before-delegation' });
  }
  assert.throws(() => classifyTask({ capabilities: ['a'], risks: ['unknown'] }));
});

test('valid sequential and dependency-ready parallel fixture plans pass', () => {
  assert.deepEqual(validatePlan(fixture()), []);
  const single = fixture();
  single.tasks = [single.tasks[0]];
  single.parallelBatches = [];
  assert.deepEqual(validatePlan(single), []);
});

test('the owning implementation plan respects the same task contract', () => {
  const plan = JSON.parse(read('requirements/015-professional-agent-orchestration/coordination-task-plan.json'));
  assert.deepEqual(validatePlan(plan), []);
});

test('risk cannot be hidden behind simple classification', () => {
  fails(p => { p.tasks[1].complexity = 'simple'; }, /requires complex/);
  fails(p => { p.tasks[0].contractChanged = true; }, /requires complex/);
});

test('small tasks cannot be artificially parallelized', () => {
  fails(p => { p.tasks[1].risks = []; p.tasks[1].complexity = 'simple'; }, /only runnable complex/);
});

test('missing, self and cyclic dependencies are rejected', () => {
  fails(p => p.tasks[1].dependsOn.push('MISSING'), /missing dependency/);
  fails(p => p.tasks[0].dependsOn.push('CONTRACT'), /cycle/);
  fails(p => p.tasks[0].dependsOn.push('FRONTEND'), /cycle/);
});

test('parallel tasks cannot consume unfinished or same-batch outputs', () => {
  fails(p => { p.tasks[0].status = 'review'; }, /dependencies not ready/);
  fails(p => p.tasks[1].dependsOn.push('BACKEND'), /dependencies not ready/);
});

test('starting or completing work requires completed dependencies', () => {
  fails(p => { p.tasks[0].status = 'ready'; p.tasks[1].status = 'in_progress'; }, /not complete/);
});

test('Windows case and directory-prefix write collisions are rejected', () => {
  assert.equal(scopesOverlap('WEB/src/', 'web/src/features/a.ts'), true);
  assert.equal(scopesOverlap('web/a.ts', 'web/a.tsx'), false);
  fails(p => { p.tasks[2].writeScope = ['WEB/src/features/tutorials/test.ts']; }, /overlapping writes/);
  fails(p => { p.parallelBatches = []; p.tasks[1].status = 'in_progress'; p.tasks[2].status = 'in_progress'; p.tasks[2].writeScope = ['web/src/']; }, /active tasks: overlapping/);
});

test('unsafe scopes, directory evidence and path traversal are rejected', () => {
  for (const value of ['../secret', 'D:/secret', '/root', 'server/*', 'server\\foo', 'a/../b', './a']) assert.equal(safePath(value), false);
  assert.equal(existingFile('requirements'), false);
  fails(p => { p.tasks[1].writeScope = ['../escape']; }, /invalid write scope/);
});

test('financial and security gates cannot be omitted', () => {
  fails(p => p.tasks[1].risks.push('financial'), /missing reviewer commercial-financial-integrity/);
  fails(p => p.tasks[1].risks.push('privacy'), /missing reviewer security-reviewer/);
  fails(p => { p.tasks[1].reviewers = []; }, /missing reviewer qa-release-engineer/);
  fails(p => { p.tasks[1].reviewers = ['qa-release-engineer']; }, /missing reviewer ux-ui-product-designer/);
});

test('completion requires all acceptance evidence and reviewer passes', () => {
  fails(p => { p.tasks[0].evidence = []; }, /completion requires passed evidence/);
  fails(p => { p.tasks[0].evidence[0].result = 'failed'; }, /completion requires passed evidence/);
  fails(p => p.tasks[0].acceptance.push('Unverified criterion'), /acceptance has no passed evidence/);
  fails(p => p.tasks[0].reviewers.push('qa-release-engineer'), /completion requires review/);
});

test('same-role review requires a distinct agent identity', () => {
  fails(p => {
    const task = p.tasks[0];
    task.reviewers = [task.owner];
    task.reviews = [{ role: task.owner, result: 'passed', reference: fixturePath }];
  }, /independent same-role/);
  const plan = fixture();
  const task = plan.tasks[0];
  task.ownerAgentId = 'writer';
  task.reviewers = [task.owner];
  task.reviews = [{ role: task.owner, agentId: 'reviewer', result: 'passed', reference: fixturePath }];
  assert.deepEqual(validatePlan(plan), []);
});

test('changing role cannot disguise sensitive self-review', () => {
  fails(p => {
    const task = p.tasks[0];
    task.complexity = 'complex'; task.risks = ['security']; task.ownerAgentId = 'implementer';
    task.reviewers = ['qa-release-engineer', 'security-reviewer'];
    task.reviews = task.reviewers.map(role => ({ role, agentId: 'implementer', result: 'passed', reference: fixturePath }));
  }, /cannot review their own work/);
  fails(p => {
    const task = p.tasks[0];
    task.complexity = 'complex'; task.reviewers = ['qa-release-engineer'];
    task.reviews = [{ role: 'qa-release-engineer', result: 'passed', reference: fixturePath }];
  }, /completion requires implementer and reviewer identities/);
});

test('existing directory scopes require explicit prefix syntax', () => {
  fails(p => { p.tasks[1].writeScope = ['web/src/features/tutorials']; }, /directory write scope requires trailing slash/);
  assert.equal(safePath('web/src. /'), false);
  assert.equal(safePath('web/src./'), false);
});

test('omitted batches cannot bypass simple-task or concurrency limits', () => {
  fails(p => {
    p.parallelBatches = [];
    for (const task of p.tasks.slice(1)) { task.status = 'in_progress'; task.complexity = 'simple'; task.risks = []; }
  }, /simple work cannot run in parallel/);
  fails(p => {
    p.parallelBatches = [];
    for (const task of p.tasks.slice(1)) task.status = 'in_progress';
  }, /requires a declared batch/);
  fails(p => {
    p.parallelBatches = [];
    const task = p.tasks[2];
    p.tasks.push({ ...structuredClone(task), id: 'THIRD', writeScope: ['test/third.js'] });
    for (const item of p.tasks.slice(1)) item.status = 'in_progress';
  }, /maximum two concurrent/);
});

test('malformed plans, unknown fields and roles fail closed', () => {
  for (const value of [null, [], {}, { version: 1, tasks: [] }]) assert.ok(validatePlan(value).length);
  fails(p => { p.tasks[1].children = ['extra']; }, /unknown field children/);
  fails(p => { p.tasks[1].owner = 'unregistered'; }, /unknown owner/);
  fails(p => { p.tasks[1].id = p.tasks[0].id; }, /duplicate ID/);
  fails(p => { p.tasks[0].evidence = [null]; }, /expected object/);
  fails(p => { p.tasks[0].reviews = [null]; }, /expected object/);
});

test('batch membership, status and child-count limits are enforced', () => {
  fails(p => p.parallelBatches.push(p.parallelBatches[0]), /duplicate batch membership/);
  fails(p => p.parallelBatches[0].tasks.push('CONTRACT'), /exactly two/);
  fails(p => { p.tasks[1].status = 'blocked'; }, /only runnable complex/);
});

test('all retained guides, instruction files and custom profiles are registered', () => {
  assert.deepEqual(validateInventory(), []);
  assert.equal(registry.artifacts.filter(a => a.kind === 'reference-guide').length, 14);
  assert.equal(registry.artifacts.filter(a => a.kind === 'skill').length, 8);
});

test('all new roles have bounded complete charters', () => {
  for (const entry of registry.artifacts.filter(a => a.kind === 'role')) {
    const source = read(entry.canonicalPath);
    for (const section of ['Mission', 'Activation Triggers', 'Required Sources', 'Inputs', 'Decisions Owned',
      'Required Outputs', 'Review Checklist', 'Forbidden Actions', 'Handoff Contract', 'Escalation Conditions']) {
      assert.ok(source.includes(`## ${section}`), `${entry.id}: ${section}`);
    }
    assert.ok(source.split('\n').length <= 180);
  }
});

test('profile policy links roles and handoff without model or permission escalation', () => {
  const profiles = registry.artifacts.filter(a => a.kind === 'agent');
  const seen = new Set();
  for (const entry of profiles) {
    const source = read(entry.canonicalPath);
    const role = registry.artifacts.find(a => a.kind === 'role' && a.id === entry.role);
    assert.ok(role, entry.id);
    assert.ok(source.includes(`name = "${entry.id}"`));
    assert.ok(!seen.has(entry.id));
    seen.add(entry.id);
    assert.ok(source.includes(role.canonicalPath));
    assert.match(source, /009-task-contract-and-handoff\.md/);
    assert.match(source, /Do not spawn child agents/);
    assert.doesNotMatch(source, /^(model|model_reasoning_effort|approval_policy|mcp_servers|hooks)\s*=/m);
    assert.doesNotMatch(source, /danger-full-access/);
    if (['qa-release-engineer', 'security-reviewer', 'system-architect', 'user-journey-tester', 'commercial-financial-integrity'].includes(entry.id)) assert.match(source, /^sandbox_mode = "read-only"$/m);
  }
  assert.equal(profiles.length, 14);
  assert.match(read('.codex/config.toml'), /^max_concurrent_threads_per_session = 2$/m);
});

test('runner validates plans and rejects unknown groups instead of silently skipping', () => {
  for (const [args, code] of [[['--plan', fixturePath], 0], [['--group', 'missing'], 2]]) {
    const result = spawnSync(process.execPath, ['scripts/verify-agent-orchestration.mjs', ...args], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, code, result.stderr);
  }
});
