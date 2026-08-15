import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
const artifactMap = JSON.parse(
  readFileSync(path.join(orchestrationRoot, 'agent-artifact-map.json'), 'utf8')
);
const adoptionEvidence = JSON.parse(
  readFileSync(path.join(orchestrationRoot, 'adoption-evidence.json'), 'utf8')
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

function artifact(id, kind) {
  const match = artifactMap.artifacts.find(
    (entry) => entry.id === id && entry.kind === kind
  );
  assert.ok(match, `missing ${kind} artifact ${id}`);
  return match;
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
    const roleArtifact = artifact(role, 'role');
    const content = read(roleArtifact.canonicalPath);
    for (const section of requiredRoleSections) {
      assert.match(content, new RegExp(`^## ${section}$`, 'm'), `${role}: ${section}`);
    }
    assert.ok(content.split(/\r?\n/).length <= 180, `${role} exceeds 180 lines`);
  }
});

test('professional Skills have valid metadata, UI metadata and context bounds', () => {
  for (const skill of fixtures.skills) {
    const skillArtifact = artifact(skill, 'skill');
    assert.equal(skillArtifact.canonicalPath, skillArtifact.discoveryPath);
    assert.match(skillArtifact.discoveryPath, /^\.agents\/skills\//);
    const relativeRoot = path.posix.dirname(skillArtifact.canonicalPath);
    const content = read(skillArtifact.canonicalPath);
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

test('artifact map has unique canonical paths and all active artifacts exist', () => {
  assert.equal(artifactMap.version, 1);
  const ids = new Set();
  const canonicalPaths = new Set();
  const skillNames = new Set();

  for (const entry of artifactMap.artifacts) {
    const key = `${entry.kind}:${entry.id}`;
    assert.ok(!ids.has(key), `duplicate artifact ${key}`);
    ids.add(key);
    assert.ok(!canonicalPaths.has(entry.canonicalPath), `duplicate path ${entry.canonicalPath}`);
    canonicalPaths.add(entry.canonicalPath);
    assert.ok(existsSync(path.join(root, entry.canonicalPath)), `missing ${entry.canonicalPath}`);

    if (entry.kind === 'skill') {
      const frontmatter = parseFrontmatter(read(entry.canonicalPath));
      const skillName = frontmatter.find(([name]) => name === 'name')?.[1];
      assert.ok(!skillNames.has(skillName), `duplicate Skill name ${skillName}`);
      skillNames.add(skillName);
    }
  }
});

test('discoverable Skill directory matches the canonical artifact map exactly', () => {
  const mappedSkills = artifactMap.artifacts
    .filter((entry) => entry.kind === 'skill')
    .map((entry) => entry.id)
    .sort();
  const discoveredSkills = readdirSync(path.join(root, '.agents', 'skills'), {
    withFileTypes: true
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(discoveredSkills, mappedSkills);
});

test('scoped AGENTS files extend root policy and point to their domain role', () => {
  const expectations = new Map([
    ['web/AGENTS.md', 'ux-ui-product-designer'],
    ['server/AGENTS.md', 'backend-platform-architect'],
    ['requirements/016-cinematic-studio/AGENTS.md', 'cinematic-experience-director'],
    ['requirements/017-implementation-backend/AGENTS.md', 'backend-platform-architect'],
    ['requirements/018-implementation-commercial-feature-plan/AGENTS.md', 'commercial-financial-integrity']
  ]);

  for (const [relativePath, role] of expectations) {
    const content = read(relativePath);
    assert.match(content, /extends the repository root `AGENTS\.md`/i);
    assert.match(content, new RegExp(role));
  }
});

test('centralized compatibility copies are removed after placement migration', () => {
  assert.ok(!existsSync(path.join(orchestrationRoot, 'skills')));
  for (const role of [
    'ux-ui-product-designer',
    'cinematic-experience-director',
    'backend-platform-architect',
    'commercial-financial-integrity'
  ]) {
    assert.ok(!existsSync(path.join(orchestrationRoot, 'roles', `${role}.md`)));
  }
  assert.ok(
    !existsSync(
      path.join(
        root,
        'requirements',
        '009-migration-to-react',
        'skills',
        'implement-generation-workflow'
      )
    )
  );
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
    assert.match(agents, new RegExp(artifact(role, 'role').canonicalPath.replaceAll('/', '\\/')));
  }
  for (const skill of fixtures.skills) {
    assert.match(agents, new RegExp(skill));
    assert.match(agents, new RegExp(artifact(skill, 'skill').canonicalPath.replaceAll('/', '\\/')));
  }
});

test('operational adoption evidence covers real tasks and release gates', () => {
  assert.equal(adoptionEvidence.version, 1);
  assert.ok(adoptionEvidence.realTasks.length >= 3);

  const knownRoles = new Set(fixtures.roles);
  const knownSkills = new Set(fixtures.skills);
  const taskIds = new Set();
  const capabilities = new Set();

  for (const task of adoptionEvidence.realTasks) {
    assert.ok(!taskIds.has(task.id), `duplicate adoption task ${task.id}`);
    taskIds.add(task.id);
    capabilities.add(task.owningCapability);
    assert.ok(knownRoles.has(task.primaryRole), `${task.id}: unknown primary role`);
    assert.ok(task.reviewerRoles.every((role) => knownRoles.has(role)));
    assert.ok(task.skills.every((skill) => knownSkills.has(skill)));
    assert.ok(1 + task.reviewerRoles.length <= 3, `${task.id}: too many roles`);
    assert.ok(task.skills.length <= 2, `${task.id}: too many Skills`);
    assert.equal(task.status, 'requirement-complete');
    assert.ok(task.reasonForRouting.length > 0);
    assert.ok(task.handoff.length > 0);
    assert.ok(existsSync(path.join(root, task.owningRequirement)));
    assert.ok(task.outputs.length > 0);
    for (const output of task.outputs) {
      assert.ok(existsSync(path.join(root, output)), `${task.id}: stale output ${output}`);
    }
  }

  assert.ok(capabilities.size >= 3, 'adoption must cover three capabilities');

  const mandatory = adoptionEvidence.mandatoryReviewEvidence;
  const highRiskTask = adoptionEvidence.realTasks.find(
    (task) => task.id === mandatory.taskId
  );
  assert.ok(highRiskTask, 'mandatory-review task is missing');
  assert.ok(mandatory.riskClasses.length > 0);
  for (const role of ['commercial-financial-integrity', 'qa-release-engineer']) {
    assert.ok(mandatory.requiredRoles.includes(role));
    assert.ok(highRiskTask.reviewerRoles.includes(role));
  }
  assert.equal(mandatory.result, 'passed-sequential-review');

  const cases = new Map(fixtures.cases.map((routeCase) => [routeCase.id, routeCase]));
  const lowOverhead = adoptionEvidence.lowOverheadEvidence;
  assert.deepEqual(cases.get(lowOverhead.routingCaseId)?.skills, lowOverhead.expectedSkills);
  assert.equal(lowOverhead.result, 'passed');

  const override = adoptionEvidence.productOwnerOverrideEvidence;
  const overrideCase = cases.get(override.routingCaseId);
  assert.ok(overrideCase?.userOverride);
  assert.equal(override.requiresRouterEdit, false);
  assert.equal(override.result, 'passed');

  assert.equal(adoptionEvidence.reviewExecution.mode, 'sequential');
  assert.equal(adoptionEvidence.reviewExecution.independentAgentAvailable, false);
  assert.equal(adoptionEvidence.reviewExecution.remainingGate, 'blind-seeded-regression');
  assert.match(adoptionEvidence.reviewExecution.disclosure, /not provide an independent/i);
});
