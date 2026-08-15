import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testDirectory, '..');
const orchestrationRoot = path.join(
  root,
  'requirements',
  '015-professional-agent-orchestration'
);
const fixtures = JSON.parse(
  readFileSync(path.join(orchestrationRoot, 'routing-fixtures.json'), 'utf8')
);

const requiredRoleSections = [
  'Mission',
  'Activation Triggers',
  'Required Sources',
  'Inputs',
  'Decisions Owned',
  'Required Outputs',
  'Review Checklist',
  'Forbidden Actions',
  'Handoff Contract',
  'Escalation Conditions'
];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, 'SKILL.md must start with YAML frontmatter');
  return match[1]
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => line.match(/^([a-z]+):\s*(.+)$/))
    .map((entry) => {
      assert.ok(entry, 'frontmatter must contain simple name/description keys');
      return [entry[1], entry[2]];
    });
}

test('professional role charters expose the complete bounded contract', () => {
  for (const role of fixtures.roles) {
    const content = read(
      `requirements/015-professional-agent-orchestration/roles/${role}.md`
    );
    for (const section of requiredRoleSections) {
      assert.match(content, new RegExp(`^## ${section}$`, 'm'), `${role}: ${section}`);
    }
    assert.ok(content.split(/\r?\n/).length <= 180, `${role} exceeds 180 lines`);
  }
});

test('professional Skills have valid metadata, UI metadata and context bounds', () => {
  const localSkills = fixtures.skills.filter(
    (skill) => skill !== 'implement-generation-workflow'
  );
  for (const skill of localSkills) {
    const relativeRoot =
      `requirements/015-professional-agent-orchestration/skills/${skill}`;
    const content = read(`${relativeRoot}/SKILL.md`);
    const frontmatter = parseFrontmatter(content);
    assert.deepEqual(
      frontmatter.map(([key]) => key),
      ['name', 'description'],
      `${skill} frontmatter keys`
    );
    assert.equal(frontmatter[0][1], skill);
    assert.ok(content.split(/\r?\n/).length <= 150, `${skill} exceeds 150 lines`);

    const metadata = read(`${relativeRoot}/agents/openai.yaml`);
    assert.match(metadata, new RegExp(`\\$${skill}\\b`));
    assert.match(metadata, /allow_implicit_invocation:\s*true/);
  }
});

test('routing fixtures remain bounded and reference known roles and Skills', () => {
  assert.ok(fixtures.cases.length >= 20);
  const roles = new Set([...fixtures.roles, 'base-implementation-owner']);
  const skills = new Set(fixtures.skills);
  const ids = new Set();

  for (const routeCase of fixtures.cases) {
    assert.ok(!ids.has(routeCase.id), `duplicate case ${routeCase.id}`);
    ids.add(routeCase.id);
    assert.ok(roles.has(routeCase.primary), `${routeCase.id}: unknown primary`);
    assert.ok(routeCase.reviewers.every((role) => roles.has(role)));
    assert.ok(routeCase.skills.every((skill) => skills.has(skill)));
    assert.ok(1 + routeCase.reviewers.length <= 3, `${routeCase.id}: too many roles`);
    assert.ok(routeCase.skills.length <= 2, `${routeCase.id}: too many Skills`);
  }

  const tinyCases = fixtures.cases.filter((routeCase) =>
    ['tiny-translation', 'prompt-wording-only'].includes(routeCase.id)
  );
  assert.ok(tinyCases.every((routeCase) => routeCase.skills.length === 0));
});

test('every role and Skill has positive and negative routing evidence', () => {
  const cases = new Map(fixtures.cases.map((routeCase) => [routeCase.id, routeCase]));
  for (const role of fixtures.roles) {
    assert.ok(
      fixtures.cases.some((routeCase) => routeCase.primary === role),
      `${role} has no primary routing case`
    );
  }

  for (const skill of fixtures.skills) {
    const coverage = fixtures.skillCoverage[skill];
    assert.ok(coverage, `${skill} has no coverage declaration`);
    const positive = cases.get(coverage.positive);
    const negative = cases.get(coverage.negative);
    assert.ok(positive?.skills.includes(skill), `${skill} positive trigger missing`);
    assert.ok(!negative?.skills.includes(skill), `${skill} negative trigger activated`);
  }
});

test('AGENTS router references every role and local Skill', () => {
  const agents = read('AGENTS.md');
  assert.match(agents, /Professional Role Routing/);
  assert.match(agents, /requirements\/015-professional-agent-orchestration/);
  for (const role of fixtures.roles) {
    assert.match(agents, new RegExp(role));
  }
  for (const skill of fixtures.skills) {
    assert.match(agents, new RegExp(skill));
  }
});
