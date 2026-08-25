import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VideoPosterService } from '../server/domain/assets/VideoPosterService.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const dataRoot = path.resolve(args.dataRoot || path.join(projectRoot, 'server', 'data'));
const outputsRoot = path.resolve(args.outputsRoot || path.join(projectRoot, 'client', 'outputs'));
const backupRoot = path.resolve(args.backupRoot || path.join(projectRoot, '_temp', 'video-media-reconciliation'));
const files = {
  tasks: path.join(dataRoot, 'generation', 'videoProviderTasks.json'),
  assets: path.join(dataRoot, 'assets', 'assets.json'),
  posts: path.join(dataRoot, 'community', 'communityPosts.json'),
  projects: path.join(dataRoot, 'cinematic', 'projects.json')
};

const stores = {
  tasks: await readJson(files.tasks, { schemaVersion: 1, tasks: [] }),
  assets: await readJson(files.assets, []),
  posts: await readJson(files.posts, []),
  projects: await readJson(files.projects, { schemaVersion: 1, projects: [] })
};
assertStores(stores);

const report = {
  schemaVersion: 1,
  mode: args.apply ? 'apply' : 'dry-run',
  cleanupMissing: args.cleanupMissing,
  startedAt: new Date().toISOString(),
  posterCandidates: [],
  postersCreated: [],
  missingVideoRecords: [],
  cleanedRecords: [],
  blockedRecords: [],
  failures: [],
  creditRecordsChanged: false
};

let reportDirectory = null;
if (args.apply) {
  for (const filePath of Object.values(files)) await assertWritableDirectory(path.dirname(filePath));
  reportDirectory = path.join(backupRoot, timestamp());
  await fs.mkdir(reportDirectory, { recursive: true });
  for (const filePath of Object.values(files)) {
    if (await exists(filePath)) await fs.copyFile(filePath, path.join(reportDirectory, path.basename(filePath)));
  }
  await fs.writeFile(path.join(reportDirectory, 'report.json'), `${JSON.stringify({ ...report, status: 'in_progress' }, null, 2)}\n`, 'utf8');
}

const taskById = new Map(stores.tasks.tasks.map(task => [task.id, task]));
const assetByTaskId = new Map(stores.assets
  .filter(asset => asset.assetType === 'cinematic_video_output' && asset.sourceJobId)
  .map(asset => [asset.sourceJobId, asset]));
const sourceIds = new Set([...taskById.keys(), ...assetByTaskId.keys()]);
const missingSourceIds = new Set();

for (const sourceJobId of sourceIds) {
  const task = taskById.get(sourceJobId) || null;
  const asset = assetByTaskId.get(sourceJobId) || null;
  const publicUrl = asset?.publicUrl || task?.outputAsset?.publicUrl || null;
  if (!publicUrl) continue;
  let videoPath;
  try {
    videoPath = resolveOutputUrl(publicUrl, outputsRoot);
  } catch (error) {
    report.blockedRecords.push({ sourceJobId, reason: error.code || 'video_output_path_invalid' });
    continue;
  }
  if (!await isNonEmptyFile(videoPath)) {
    missingSourceIds.add(sourceJobId);
    report.missingVideoRecords.push({ sourceJobId, assetId: asset?.id || null, publicUrl });
    continue;
  }
  if (!asset) {
    report.blockedRecords.push({ sourceJobId, reason: 'video_asset_record_missing' });
    continue;
  }
  const posterUrl = asset.metadata?.posterUrl || asset.thumbnailUrl
    || task?.outputAsset?.posterUrl || null;
  const expectedPosterUrl = `/outputs/cinematic-video/${safeSegment(asset.ownerUserId)}/${safeSegment(sourceJobId)}.poster.webp`;
  const expectedPosterPath = resolveOutputUrl(expectedPosterUrl, outputsRoot);
  if (await isNonEmptyFile(expectedPosterPath)) {
    const posterStat = await fs.stat(expectedPosterPath);
    synchronizePosterProjection({
      asset,
      task,
      posterUrl: expectedPosterUrl,
      generated: { mimeType: 'image/webp', sizeBytes: posterStat.size }
    });
    continue;
  }
  report.posterCandidates.push({ sourceJobId, assetId: asset.id, videoUrl: publicUrl, posterUrl: expectedPosterUrl });
  if (!args.apply) continue;
  try {
    const posterService = new VideoPosterService({ ffmpegPath: args.ffmpegPath });
    const generated = await posterService.generatePoster({
      videoPath,
      posterPath: expectedPosterPath,
      durationSeconds: asset.metadata?.durationSeconds || task?.submittedRequest?.durationSeconds
    });
    synchronizePosterProjection({ asset, task, posterUrl: expectedPosterUrl, generated });
    report.postersCreated.push({ sourceJobId, assetId: asset.id, posterUrl: expectedPosterUrl });
  } catch (error) {
    report.failures.push({ sourceJobId, code: error.code || 'video_poster_extraction_failed', message: error.message });
  }
}

const cleanupIds = new Set();
if (args.cleanupMissing) {
  for (const sourceJobId of missingSourceIds) {
    const blockReason = approvedAttemptBlockReason(stores.projects.projects, sourceJobId);
    if (blockReason) report.blockedRecords.push({ sourceJobId, reason: blockReason });
    else cleanupIds.add(sourceJobId);
  }
}

if (args.apply && cleanupIds.size) {
  const removedAssetIds = new Set(stores.assets
    .filter(asset => cleanupIds.has(asset.sourceJobId))
    .map(asset => asset.id));
  const removedVideoUrls = new Set(stores.assets
    .filter(asset => cleanupIds.has(asset.sourceJobId))
    .map(asset => asset.publicUrl)
    .filter(Boolean));
  stores.tasks.tasks = stores.tasks.tasks.filter(task => !cleanupIds.has(task.id));
  stores.assets = stores.assets.filter(asset => !cleanupIds.has(asset.sourceJobId));
  const now = new Date().toISOString();
  for (const post of stores.posts) {
    if (post.postType !== 'video') continue;
    if (!removedAssetIds.has(post.videoAssetId) && !removedVideoUrls.has(post.videoUrl)) continue;
    post.status = 'deleted';
    post.deletedAt = now;
    post.updatedAt = now;
    post.moderationStatus = 'removed';
    post.removalReason = 'video_file_missing_reconciliation';
  }
  for (const project of stores.projects.projects) {
    const before = Array.isArray(project.generationAttempts) ? project.generationAttempts.length : 0;
    project.generationAttempts = (project.generationAttempts || [])
      .filter(attempt => !cleanupIds.has(attempt.generationJobId));
    if (project.generationAttempts.length !== before) {
      project.version = Number(project.version || 0) + 1;
      project.updatedAt = now;
    }
  }
  for (const sourceJobId of cleanupIds) {
    const asset = assetByTaskId.get(sourceJobId);
    const posterUrl = asset?.metadata?.posterUrl || asset?.thumbnailUrl
      || taskById.get(sourceJobId)?.outputAsset?.posterUrl;
    if (posterUrl) {
      try {
        const posterPath = resolveOutputUrl(posterUrl, outputsRoot);
        await fs.rm(posterPath, { force: true });
      } catch {
        // Invalid poster paths are reported through the removed record, never followed.
      }
    }
    report.cleanedRecords.push({ sourceJobId, assetId: asset?.id || null });
  }
}

if (args.apply) {
  await writeJsonAtomic(files.tasks, stores.tasks);
  await writeJsonAtomic(files.assets, stores.assets);
  await writeJsonAtomic(files.posts, stores.posts);
  await writeJsonAtomic(files.projects, stores.projects);
}

report.completedAt = new Date().toISOString();
report.summary = {
  posterCandidates: report.posterCandidates.length,
  postersCreated: report.postersCreated.length,
  missingVideoRecords: report.missingVideoRecords.length,
  cleanedRecords: report.cleanedRecords.length,
  blockedRecords: report.blockedRecords.length,
  failures: report.failures.length
};
if (args.apply) await fs.writeFile(path.join(reportDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ ...report.summary, mode: report.mode, reportDirectory }, null, 2));
if (!args.apply) console.log('Dry run only. Use --apply after reviewing this plan.');
if (report.failures.length) process.exitCode = 1;

function synchronizePosterProjection({ asset, task, posterUrl, generated = null }) {
  asset.thumbnailUrl = posterUrl;
  asset.metadata = {
    ...(asset.metadata || {}),
    posterUrl,
    posterMimeType: generated?.mimeType || asset.metadata?.posterMimeType || 'image/webp',
    posterSizeBytes: generated?.sizeBytes || asset.metadata?.posterSizeBytes || null,
    posterFrameTimestamp: generated?.frameTimestamp || asset.metadata?.posterFrameTimestamp || null
  };
  asset.updatedAt = new Date().toISOString();
  if (!task) return;
  task.outputAsset = { ...(task.outputAsset || {}), posterUrl, thumbnailUrl: posterUrl };
  if (task.status === 'reconciliation_required' && String(task.providerError?.code || '').startsWith('video_poster_')) {
    task.status = 'completed';
    task.providerError = null;
    task.completedAt = task.completedAt || new Date().toISOString();
  }
  task.updatedAt = new Date().toISOString();
}

function approvedAttemptBlockReason(projects, sourceJobId) {
  for (const project of projects) {
    const attempts = (project.generationAttempts || []).filter(attempt => attempt.generationJobId === sourceJobId);
    for (const attempt of attempts) {
      if (attempt.status === 'approved') return `approved_cinematic_attempt:${attempt.id}`;
      for (const scene of project.scenes || []) {
        for (const shot of scene.shots || []) {
          if (shot.approvedVideoAttemptId === attempt.id) return `approved_cinematic_shot:${shot.id}`;
        }
      }
    }
  }
  return null;
}

function resolveOutputUrl(publicUrl, root) {
  const normalized = String(publicUrl || '').replace(/\\/g, '/');
  if (!normalized.startsWith('/outputs/')) throw scriptError('video_output_url_not_local');
  const relative = normalized.slice('/outputs/'.length);
  const resolved = path.resolve(root, ...relative.split('/'));
  const relation = path.relative(root, resolved);
  if (!relation || relation.startsWith('..') || path.isAbsolute(relation)) throw scriptError('video_output_path_invalid');
  return resolved;
}

async function readJson(filePath, fallback) {
  try { return JSON.parse(await fs.readFile(filePath, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return structuredClone(fallback); throw error; }
}

async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, filePath);
}

async function isNonEmptyFile(filePath) {
  const stat = await fs.stat(filePath).catch(() => null);
  return Boolean(stat?.isFile() && stat.size > 0);
}

async function exists(filePath) {
  return fs.access(filePath).then(() => true, () => false);
}

async function assertWritableDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
  const probe = path.join(directory, `.video-reconcile-write-probe-${process.pid}-${Date.now()}`);
  await fs.writeFile(probe, 'probe', 'utf8');
  await fs.rm(probe, { force: true });
}

function assertStores(value) {
  if (!Array.isArray(value.tasks?.tasks) || !Array.isArray(value.assets)
    || !Array.isArray(value.posts) || !Array.isArray(value.projects?.projects)) {
    throw new TypeError('Video reconciliation data stores are invalid.');
  }
}

function parseArgs(values) {
  const options = { apply: false, cleanupMissing: false, ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg' };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--apply') options.apply = true;
    else if (value === '--cleanup-missing') options.cleanupMissing = true;
    else if (value === '--data-root') options.dataRoot = values[++index];
    else if (value === '--outputs-root') options.outputsRoot = values[++index];
    else if (value === '--backup-root') options.backupRoot = values[++index];
    else if (value === '--ffmpeg') options.ffmpegPath = values[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  return options;
}

function safeSegment(value) {
  const safe = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safe) throw scriptError('video_storage_identity_invalid');
  return safe;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function scriptError(code) {
  return Object.assign(new Error(code), { code });
}
