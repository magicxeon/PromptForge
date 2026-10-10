import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const registryPath = 'requirements/015-professional-agent-orchestration/agent-artifact-map.json';
export const registry = JSON.parse(readFileSync(path.join(root, registryPath), 'utf8'));
const roles = new Set(['base-implementation-owner', ...registry.artifacts.filter(a => a.kind === 'role').map(a => a.id)]);
const risks = new Set(['shared-contract', 'financial', 'security', 'privacy', 'migration', 'destructive', 'user-facing']);
const statuses = new Set(['proposed', 'ready', 'in_progress', 'review', 'complete', 'blocked', 'cancelled']);
const text = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.every(text) && new Set(value).size === value.length;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function safePath(value) {
  return text(value) && !/[\\:*?\[\]{}\x00-\x1f]/.test(value) && !value.startsWith('/') &&
    value.replace(/\/$/, '').split('/').every(part => part && part.trim() === part && !part.endsWith('.') && part !== '.' && part !== '..');
}

export function existingFile(value) {
  if (!safePath(value)) return false;
  const absolute = path.resolve(root, value);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) return false;
  const relative = path.relative(realpathSync(root), realpathSync(absolute));
  return !relative.startsWith('..') && !path.isAbsolute(relative) && !value.endsWith('/');
}

export function scopesOverlap(left, right) {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  return a.replace(/\/$/, '') === b.replace(/\/$/, '') ||
    (a.endsWith('/') && b.startsWith(a)) || (b.endsWith('/') && a.startsWith(b));
}

export function classifyTask({ capabilities = [], risks: taskRisks = [], uncertain = false, contractChanged = false } = {}) {
  if (!strings(capabilities) || !capabilities.length || !strings(taskRisks) ||
      taskRisks.some(risk => !risks.has(risk)) || typeof uncertain !== 'boolean' || typeof contractChanged !== 'boolean') {
    throw new Error('Classification requires capabilities, known risks and boolean uncertainty/contract flags.');
  }
  const complex = capabilities.length > 1 || taskRisks.length > 0 || uncertain || contractChanged;
  return { complexity: complex ? 'complex' : 'simple', execution: complex ? 'plan-before-delegation' : 'single-agent' };
}

export function validatePlan(plan) {
  const errors = [];
  const fail = message => errors.push(message);
  const only = (value, keys, label) => {
    if (!object(value)) { fail(`${label}: expected object`); return false; }
    for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`${label}: unknown field ${key}`);
    return true;
  };
  if (!only(plan, ['version', 'requirement', 'tasks', 'parallelBatches'], 'plan')) return errors;
  if (plan.version !== 1) fail('plan: version must be 1');
  if (!existingFile(plan.requirement)) fail('plan: requirement must be an existing repository file');
  if (!Array.isArray(plan.tasks) || !plan.tasks.length || plan.tasks.length > 100) return [...errors, 'plan: 1..100 tasks required'];
  if (!Array.isArray(plan.parallelBatches) || plan.parallelBatches.length > 100) return [...errors, 'plan: bounded parallelBatches required'];
  const byId = new Map();
  for (const task of plan.tasks) {
    if (!only(task, ['id', 'title', 'complexity', 'reason', 'owner', 'ownerAgentId', 'capabilities', 'risks',
      'uncertain', 'contractChanged', 'dependsOn', 'writeScope', 'status', 'acceptance', 'reviewers', 'evidence', 'reviews', 'handoff'], 'task')) continue;
    const label = task.id || 'task';
    if (!text(task.id) || !/^[A-Za-z0-9_-]+$/.test(task.id) || byId.has(task.id)) fail(`${label}: invalid/duplicate ID`);
    else byId.set(task.id, task);
    for (const key of ['title', 'reason', 'handoff']) if (!text(task[key])) fail(`${label}: ${key} required`);
    if (!roles.has(task.owner)) fail(`${label}: unknown owner`);
    if (task.ownerAgentId !== undefined && !text(task.ownerAgentId)) fail(`${label}: invalid ownerAgentId`);
    if (!statuses.has(task.status)) fail(`${label}: unknown status`);
    if (!['simple', 'complex'].includes(task.complexity)) fail(`${label}: unknown complexity`);
    for (const key of ['capabilities', 'risks', 'dependsOn', 'writeScope', 'acceptance', 'reviewers']) {
      if (!strings(task[key])) fail(`${label}: ${key} must be unique strings`);
    }
    if (!task.acceptance?.length) fail(`${label}: acceptance required`);
    if (!Array.isArray(task.evidence) || !Array.isArray(task.reviews)) fail(`${label}: evidence/reviews arrays required`);
    if (errors.length) continue;
    try {
      if (classifyTask(task).complexity === 'complex' && task.complexity === 'simple') fail(`${label}: risk/contract requires complex`);
    } catch (error) { fail(`${label}: ${error.message}`); }
    for (const scope of task.writeScope) {
      if (!safePath(scope)) { fail(`${label}: invalid write scope ${scope}`); continue; }
      const absolute = path.join(root, scope);
      if (existsSync(absolute) && statSync(absolute).isDirectory() && !scope.endsWith('/')) fail(`${label}: directory write scope requires trailing slash: ${scope}`);
    }
    for (const role of task.reviewers) if (!roles.has(role)) fail(`${label}: unknown reviewer ${role}`);
    const required = new Set(task.complexity === 'complex' ? ['qa-release-engineer'] : []);
    if (task.risks.includes('financial')) ['backend-platform-architect', 'commercial-financial-integrity', 'security-reviewer'].forEach(r => required.add(r));
    if (task.risks.some(r => ['security', 'privacy', 'destructive'].includes(r))) required.add('security-reviewer');
    if (task.risks.includes('user-facing')) required.add('ux-ui-product-designer');
    for (const role of required) if (!task.reviewers.includes(role)) fail(`${label}: missing reviewer ${role}`);
    for (const entry of task.evidence) {
      if (!only(entry, ['check', 'result', 'reference'], `${label} evidence`)) continue;
      if (!text(entry.check) || !['passed', 'failed', 'pending'].includes(entry.result) || !existingFile(entry.reference)) fail(`${label}: invalid evidence`);
    }
    for (const review of task.reviews) {
      if (!only(review, ['role', 'result', 'reference', 'agentId'], `${label} review`)) continue;
      if (!task.reviewers.includes(review.role) || !['passed', 'failed', 'pending'].includes(review.result) || !existingFile(review.reference)) fail(`${label}: invalid review`);
      if (text(task.ownerAgentId) && text(review.agentId) && review.agentId === task.ownerAgentId) fail(`${label}: implementer cannot review their own work under another role`);
      if (review.role === task.owner && (!text(task.ownerAgentId) || !text(review.agentId) || review.agentId === task.ownerAgentId)) fail(`${label}: independent same-role reviewer identity required`);
    }
    if (errors.length) continue;
    if (task.status === 'complete') {
      if (task.complexity === 'complex' && (!text(task.ownerAgentId) || task.reviews.some(r => !text(r.agentId)))) fail(`${label}: complex completion requires implementer and reviewer identities`);
      if (!task.evidence.length || task.evidence.some(e => e.result !== 'passed')) fail(`${label}: completion requires passed evidence`);
      for (const criterion of task.acceptance) if (!task.evidence.some(e => e.check === criterion && e.result === 'passed')) fail(`${label}: acceptance has no passed evidence: ${criterion}`);
      for (const role of task.reviewers) if (!task.reviews.some(r => r.role === role && r.result === 'passed') || task.reviews.some(r => r.role === role && r.result !== 'passed')) fail(`${label}: completion requires review ${role}`);
    }
  }
  if (errors.length) return errors;
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) { fail(`${id}: dependency cycle`); return; }
    if (visited.has(id)) return;
    const task = byId.get(id);
    if (!task) { fail(`${id}: missing dependency`); return; }
    visiting.add(id);
    for (const dependency of task.dependsOn) {
      visit(dependency);
      if (['in_progress', 'review', 'complete'].includes(task.status) && byId.get(dependency)?.status !== 'complete') fail(`${id}: dependency ${dependency} is not complete`);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  function checkWrites(tasks, label) {
    for (let i = 0; i < tasks.length; i++) for (let j = i + 1; j < tasks.length; j++) {
      if (tasks[i].writeScope.some(a => tasks[j].writeScope.some(b => scopesOverlap(a, b)))) fail(`${label}: overlapping writes ${tasks[i].id}/${tasks[j].id}`);
    }
  }
  const assigned = new Set();
  for (const batch of plan.parallelBatches) {
    if (!only(batch, ['reason', 'tasks'], 'batch') || !text(batch.reason) || !strings(batch.tasks) || batch.tasks.length < 2 || batch.tasks.length > 2) { fail('batch: reason and exactly two task IDs required'); continue; }
    const tasks = batch.tasks.map(id => byId.get(id));
    if (tasks.some(t => !t)) { fail('batch: unknown task'); continue; }
    for (const task of tasks) {
      if (assigned.has(task.id)) fail(`${task.id}: duplicate batch membership`);
      assigned.add(task.id);
      if (task.complexity !== 'complex' || !['ready', 'in_progress'].includes(task.status)) fail(`${task.id}: only runnable complex work can be parallel`);
      if (task.dependsOn.some(id => batch.tasks.includes(id) || byId.get(id)?.status !== 'complete')) fail(`${task.id}: parallel input dependencies not ready`);
    }
    checkWrites(tasks, 'batch');
  }
  const active = plan.tasks.filter(t => t.status === 'in_progress');
  if (active.length > 2) fail('active tasks: maximum two concurrent workers');
  if (active.length > 1) {
    for (const task of active) {
      if (task.complexity !== 'complex') fail(`${task.id}: simple work cannot run in parallel`);
      if (!assigned.has(task.id)) fail(`${task.id}: active parallel work requires a declared batch`);
    }
  }
  checkWrites(active, 'active tasks');
  return errors;
}

function walk(directory, filename) {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = `${directory}/${entry.name}`;
    return entry.isDirectory() ? walk(relative, filename) : entry.name === filename ? [relative] : [];
  });
}

export function validateInventory() {
  const errors = [];
  const mapped = new Set(registry.artifacts.map(a => a.canonicalPath));
  for (const entry of registry.artifacts) if (!existingFile(entry.canonicalPath)) errors.push(`Missing artifact: ${entry.canonicalPath}`);
  const actual = [...walk('requirements', 'SKILL.md'), ...walk('.agents', 'SKILL.md'),
    ...walk('requirements', 'AGENTS.md'), 'AGENTS.md', 'web/AGENTS.md', 'server/AGENTS.md', 'post-processing-service/AGENTS.md'];
  for (const file of actual) if (!mapped.has(file)) errors.push(`Unregistered guide/instructions: ${file}`);
  for (const file of readdirSync(path.join(root, '.codex/agents')).filter(n => n.endsWith('.toml'))) {
    if (!mapped.has(`.codex/agents/${file}`)) errors.push(`Unregistered profile: ${file}`);
  }
  const names = new Set();
  for (const entry of registry.artifacts.filter(a => a.kind === 'skill' || a.kind === 'reference-guide')) {
    const content = readFileSync(path.join(root, entry.canonicalPath), 'utf8');
    const name = content.match(/^name:\s*(.+)$/m)?.[1];
    if (!name || names.has(name)) errors.push(`Missing/duplicate Skill name: ${entry.canonicalPath}`);
    names.add(name);
  }
  return errors;
}
