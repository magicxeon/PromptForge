import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(repositoryRoot, 'scripts', 'cleanup-failed-video-data.ps1');

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function runCleanup(args) {
  return spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
}

test('failed Video cleanup previews safely and removes only refunded tasks without output', {
  skip: process.platform !== 'win32',
}, async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'mpf-video-cleanup-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  const dataRoot = path.join(root, 'data');
  const backupRoot = path.join(root, 'backups');
  const tasksPath = path.join(dataRoot, 'generation', 'videoProviderTasks.json');
  const projectsPath = path.join(dataRoot, 'cinematic', 'projects.json');
  const now = '2026-01-01T00:00:00.000Z';
  const tasks = [
    {
      id: 'videotask_failed_refunded',
      ownerUserId: 'usr_test',
      status: 'failed',
      reservationId: 'crres_refunded',
      billingStatus: 'refunded',
      outputAsset: null,
      updatedAt: now,
    },
    {
      id: 'videotask_failed_reserved',
      ownerUserId: 'usr_test',
      status: 'failed',
      reservationId: 'crres_reserved',
      billingStatus: 'reserved',
      outputAsset: null,
      updatedAt: now,
    },
    {
      id: 'videotask_failed_with_output',
      ownerUserId: 'usr_test',
      status: 'failed',
      reservationId: 'crres_captured',
      billingStatus: 'captured',
      outputAsset: { publicUrl: '/outputs/video.mp4' },
      updatedAt: now,
    },
    {
      id: 'videotask_active',
      ownerUserId: 'usr_test',
      status: 'provider_processing',
      reservationId: 'crres_active',
      billingStatus: 'reserved',
      outputAsset: null,
      updatedAt: now,
    },
  ];
  const projects = [{
    id: 'cineproj_test',
    version: 1,
    status: 'failed_recoverable',
    updatedAt: now,
    generationAttempts: [
      { id: 'attempt_remove', generationJobId: 'videotask_failed_refunded', status: 'failed' },
      { id: 'attempt_keep', generationJobId: 'videotask_failed_reserved', status: 'failed' },
    ],
    scenes: [{ id: 'scene_test', shots: [] }],
  }];
  await writeJson(tasksPath, { version: 1, tasks });
  await writeJson(projectsPath, { version: 1, projects });

  const commonArgs = [
    '-Id', 'videotask_failed_refunded',
    '-DataRoot', dataRoot,
    '-BackupRoot', backupRoot,
  ];
  const preview = runCleanup(commonArgs);
  assert.equal(preview.status, 0, preview.stderr || preview.stdout);
  assert.match(preview.stdout, /Preview only/);
  assert.equal((await readJson(tasksPath)).tasks.length, 4);

  const applied = runCleanup([
    '-OlderThanHours', '1',
    '-OwnerUserId', 'usr_test',
    '-DataRoot', dataRoot,
    '-BackupRoot', backupRoot,
    '-Apply',
  ]);
  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  const taskStore = await readJson(tasksPath);
  assert.deepEqual(taskStore.tasks.map(({ id }) => id), [
    'videotask_failed_reserved',
    'videotask_failed_with_output',
    'videotask_active',
  ]);
  const projectStore = await readJson(projectsPath);
  assert.deepEqual(projectStore.projects[0].generationAttempts.map(({ id }) => id), ['attempt_keep']);
  assert.equal(projectStore.projects[0].version, 2);

  const blocked = runCleanup([
    '-Id', 'videotask_failed_reserved',
    '-DataRoot', dataRoot,
    '-BackupRoot', backupRoot,
    '-Apply',
  ]);
  assert.equal(blocked.status, 0, blocked.stderr || blocked.stdout);
  assert.match(blocked.stdout, /not refunded/);
  assert.equal((await readJson(tasksPath)).tasks.length, 3);
});
