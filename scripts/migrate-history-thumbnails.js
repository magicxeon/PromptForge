import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { MIGRATIONS_DATA_DIR, resolveDataFile } from '../server/config/paths.js';
import { ThumbnailService } from '../server/domain/generation/thumbnailService.js';

const HISTORY_FILE = resolveDataFile('history');
const COMPARISONS_FILE = resolveDataFile('comparisons');
const MIGRATIONS_DIR = MIGRATIONS_DATA_DIR;
const BACKUP_DIR = path.join(MIGRATIONS_DIR, 'backups');
const CHECKPOINT_DIR = path.join(MIGRATIONS_DIR, 'checkpoints');
const REPORT_DIR = path.join(MIGRATIONS_DIR, 'reports');
const CHECKPOINT_FILE = path.join(CHECKPOINT_DIR, 'history-thumbnails.json');
const LOCK_FILE = path.join(MIGRATIONS_DIR, 'history-thumbnails.lock');
const BATCH_SIZE = 20;

export function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const resume = argv.includes('--resume');
  const concurrencyArg = argv.find(arg => arg.startsWith('--concurrency='));
  const requestedConcurrency = Number(concurrencyArg?.split('=')[1] || 2);
  return {
    apply,
    resume,
    dryRun: !apply,
    concurrency: Math.min(8, Math.max(1, Number.isFinite(requestedConcurrency) ? requestedConcurrency : 2))
  };
}

export async function runMigration(options = parseArgs(process.argv.slice(2)), paths = {}) {
  const historyFile = paths.historyFile || HISTORY_FILE;
  const comparisonsFile = paths.comparisonsFile || COMPARISONS_FILE;
  const migrationsDir = paths.migrationsDir || MIGRATIONS_DIR;
  const backupDir = path.join(migrationsDir, 'backups');
  const checkpointDir = path.join(migrationsDir, 'checkpoints');
  const reportDir = path.join(migrationsDir, 'reports');
  const checkpointFile = path.join(checkpointDir, 'history-thumbnails.json');
  const lockFile = path.join(migrationsDir, 'history-thumbnails.lock');
  const startedAt = Date.now();
  const history = await readJsonArray(historyFile);
  const sourceFingerprint = fingerprintHistory(history);
  const report = {
    mode: options.dryRun ? 'dry-run' : options.resume ? 'resume' : 'apply',
    startedAt: new Date(startedAt).toISOString(),
    sourceFingerprint,
    scanned: history.length,
    candidates: 0,
    migrated: 0,
    skipped: 0,
    missingOriginal: [],
    failed: [],
    orphanComparisonJobIds: await findOrphanComparisonJobIds(comparisonsFile, history)
  };
  const service = paths.thumbnailService || new ThumbnailService();
  const candidates = [];

  for (const item of history) {
    const originalPath = service.resolveOriginalPath(item.imageUrl);
    if (!await fileExists(originalPath)) {
      report.missingOriginal.push(item.id);
      continue;
    }
    if (hasCompleteThumbnailMetadata(item) && await fileExists(resolveThumbnailPath(service, item))) {
      report.skipped += 1;
      continue;
    }
    candidates.push(item);
  }
  report.candidates = candidates.length;

  if (options.dryRun) {
    report.elapsedMs = Date.now() - startedAt;
    printSummary(report);
    return report;
  }

  await fs.mkdir(backupDir, { recursive: true });
  await fs.mkdir(checkpointDir, { recursive: true });
  await fs.mkdir(reportDir, { recursive: true });
  const lockHandle = await acquireLock(lockFile);
  let stopping = false;
  const stopHandler = () => {
    stopping = true;
    process.stdout.write('\nShutdown requested. Finishing the active batch and saving a checkpoint...\n');
  };
  process.once('SIGINT', stopHandler);
  process.once('SIGTERM', stopHandler);

  try {
    const lockedHistory = await readJsonArray(historyFile);
    if (fingerprintHistory(lockedHistory) !== sourceFingerprint) {
      throw new Error('History changed before the migration lock was acquired. Run the command again.');
    }
    let checkpoint = null;
    if (options.resume) {
      checkpoint = await readJson(checkpointFile);
      if (!checkpoint || checkpoint.sourceFingerprint !== sourceFingerprint) {
        throw new Error('Checkpoint does not match the current History source. Run a new --apply migration.');
      }
    } else {
      const stamp = fileTimestamp();
      await fs.copyFile(historyFile, path.join(backupDir, `history-${stamp}.json`));
      checkpoint = { sourceFingerprint, processedIds: [], updatedAt: new Date().toISOString() };
      await atomicWriteJson(checkpointFile, checkpoint);
    }

    const processedIds = new Set(checkpoint.processedIds || []);
    const pending = candidates.filter(item => !processedIds.has(item.id));
    const historyById = new Map(history.map(item => [item.id, item]));

    for (let offset = 0; offset < pending.length && !stopping; offset += BATCH_SIZE) {
      const batch = pending.slice(offset, offset + BATCH_SIZE);
      const results = await mapWithConcurrency(batch, options.concurrency, async item => {
        try {
          const metadata = await service.createForHistoryItem(item);
          return { id: item.id, metadata };
        } catch (error) {
          return { id: item.id, error: error.message };
        }
      });

      for (const result of results) {
        processedIds.add(result.id);
        if (result.error) {
          report.failed.push({ id: result.id, message: result.error });
          continue;
        }
        Object.assign(historyById.get(result.id), result.metadata);
        report.migrated += 1;
      }
      await atomicWriteJson(historyFile, history);
      checkpoint.processedIds = [...processedIds];
      checkpoint.updatedAt = new Date().toISOString();
      await atomicWriteJson(checkpointFile, checkpoint);
    }

    report.interrupted = stopping;
    report.elapsedMs = Date.now() - startedAt;
    report.completedAt = new Date().toISOString();
    await atomicWriteJson(path.join(reportDir, `history-thumbnails-${fileTimestamp()}.json`), report);
    printSummary(report);
    return report;
  } finally {
    process.removeListener('SIGINT', stopHandler);
    process.removeListener('SIGTERM', stopHandler);
    await lockHandle.close();
    await fs.unlink(lockFile).catch(() => {});
  }
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function runWorker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

function hasCompleteThumbnailMetadata(item) {
  return Boolean(
    item.thumbnailUrl && item.thumbnailMimeType && item.thumbnailWidth && item.thumbnailHeight &&
    item.thumbnailBytes && item.width && item.height && item.originalBytes
  );
}

function resolveThumbnailPath(service, item) {
  const filename = path.basename(item.thumbnailUrl || `${item.id}.webp`);
  return path.join(service.thumbnailDir, filename);
}

function fingerprintHistory(history) {
  const immutableIdentity = history.map(item => [item.id, item.timestamp, item.imageUrl]);
  return crypto.createHash('sha256').update(JSON.stringify(immutableIdentity)).digest('hex');
}

async function findOrphanComparisonJobIds(comparisonsFile, history) {
  const historyIds = new Set(history.map(item => item.id));
  try {
    const data = await readJson(comparisonsFile);
    const jobIds = (data?.sets || []).flatMap(set =>
      (set.runs || []).flatMap(run => (run.slots || []).map(slot => slot.jobId).filter(Boolean))
    );
    return [...new Set(jobIds.filter(id => !historyIds.has(id)))];
  } catch {
    return [];
  }
}

async function acquireLock(lockFile) {
  try {
    return await fs.open(lockFile, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(`Migration lock exists at ${lockFile}. Ensure no migration is running before removing it.`);
    }
    throw error;
  }
}

async function atomicWriteJson(filename, value) {
  const temporaryFile = `${filename}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temporaryFile, filename);
}

async function readJson(filename) {
  return JSON.parse(await fs.readFile(filename, 'utf8'));
}

async function readJsonArray(filename) {
  const value = await readJson(filename);
  if (!Array.isArray(value)) throw new Error(`${filename} must contain a JSON array.`);
  return value;
}

async function fileExists(filename) {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
}

function fileTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function printSummary(report) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  runMigration().catch(error => {
    process.stderr.write(`Thumbnail migration failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
