import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(repositoryRoot, 'scripts', 'reconcile-video-media.js');

test('Video media reconciliation is dry-run safe and cleans only unapproved missing media', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'video-reconcile-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dataRoot = path.join(root, 'data');
  const outputsRoot = path.join(root, 'outputs');
  const backupRoot = path.join(root, 'backups');
  const now = '2026-08-25T00:00:00.000Z';
  const goodUrl = '/outputs/cinematic-video/usr_test/videotask_good.mp4';
  const goodPoster = '/outputs/cinematic-video/usr_test/videotask_good.poster.webp';
  const missingUrl = '/outputs/cinematic-video/usr_test/videotask_missing.mp4';
  const blockedUrl = '/outputs/cinematic-video/usr_test/videotask_blocked.mp4';
  await writeFixture(path.join(outputsRoot, 'cinematic-video', 'usr_test', 'videotask_good.mp4'), 'video');
  await writeFixture(path.join(outputsRoot, 'cinematic-video', 'usr_test', 'videotask_good.poster.webp'), 'poster');

  const tasks = { schemaVersion: 1, tasks: [
    task('videotask_good', goodUrl, 'asset_good'),
    task('videotask_missing', missingUrl, 'asset_missing'),
    task('videotask_blocked', blockedUrl, 'asset_blocked')
  ] };
  const assets = [
    asset('asset_good', 'videotask_good', goodUrl, goodPoster),
    asset('asset_missing', 'videotask_missing', missingUrl, null),
    asset('asset_blocked', 'videotask_blocked', blockedUrl, null)
  ];
  const posts = [{ id: 'post_missing', postType: 'video', videoAssetId: 'asset_missing', videoUrl: missingUrl, status: 'published' }];
  const projects = { schemaVersion: 1, projects: [{
    id: 'project_test', version: 1, generationAttempts: [
      { id: 'attempt_missing', generationJobId: 'videotask_missing', status: 'failed' },
      { id: 'attempt_blocked', generationJobId: 'videotask_blocked', status: 'approved' }
    ], scenes: [{ id: 'scene_test', shots: [{ id: 'shot_test', approvedVideoAttemptId: 'attempt_blocked' }] }]
  }] };
  await writeJson(path.join(dataRoot, 'generation', 'videoProviderTasks.json'), tasks);
  await writeJson(path.join(dataRoot, 'assets', 'assets.json'), assets);
  await writeJson(path.join(dataRoot, 'community', 'communityPosts.json'), posts);
  await writeJson(path.join(dataRoot, 'cinematic', 'projects.json'), projects);
  const creditPath = path.join(dataRoot, 'credits', 'database.json');
  await writeJson(creditPath, { ledger: [{ id: 'credit_evidence', amount: 80 }] });
  const creditBefore = await readFile(creditPath, 'utf8');
  const taskPath = path.join(dataRoot, 'generation', 'videoProviderTasks.json');
  const tasksBefore = await readFile(taskPath, 'utf8');

  const common = ['--cleanup-missing', '--data-root', dataRoot, '--outputs-root', outputsRoot, '--backup-root', backupRoot];
  const preview = runScript(common);
  assert.equal(preview.status, 0, preview.stderr || preview.stdout);
  assert.match(preview.stdout, /Dry run only/);
  assert.equal(await readFile(taskPath, 'utf8'), tasksBefore);

  const applied = runScript(['--apply', ...common]);
  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  const nextTasks = JSON.parse(await readFile(taskPath, 'utf8'));
  assert.deepEqual(nextTasks.tasks.map(item => item.id), ['videotask_good', 'videotask_blocked']);
  assert.equal(nextTasks.tasks[0].outputAsset.posterUrl, goodPoster);
  const nextAssets = JSON.parse(await readFile(path.join(dataRoot, 'assets', 'assets.json'), 'utf8'));
  assert.deepEqual(nextAssets.map(item => item.id), ['asset_good', 'asset_blocked']);
  const nextPosts = JSON.parse(await readFile(path.join(dataRoot, 'community', 'communityPosts.json'), 'utf8'));
  assert.equal(nextPosts[0].status, 'deleted');
  const nextProjects = JSON.parse(await readFile(path.join(dataRoot, 'cinematic', 'projects.json'), 'utf8'));
  assert.deepEqual(nextProjects.projects[0].generationAttempts.map(item => item.id), ['attempt_blocked']);
  assert.equal(await readFile(creditPath, 'utf8'), creditBefore);
  assert.match(applied.stdout, /"blockedRecords": 1/);
});

function task(id, publicUrl, assetId) {
  return { id, ownerUserId: 'usr_test', status: 'completed', billingStatus: 'captured', outputAsset: { assetId, publicUrl } };
}

function asset(id, sourceJobId, publicUrl, posterUrl) {
  return {
    id, sourceJobId, ownerUserId: 'usr_test', assetType: 'cinematic_video_output',
    storageKey: publicUrl.slice('/outputs/'.length), publicUrl, thumbnailUrl: posterUrl,
    metadata: posterUrl ? { durationSeconds: 6, posterUrl } : { durationSeconds: 6 }
  };
}

async function writeFixture(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, 'utf8');
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runScript(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], { cwd: repositoryRoot, encoding: 'utf8' });
}
