import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runMigration } from '../scripts/migrate-history-thumbnails.js';

async function createFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'history-migration-'));
  const outputsDir = path.join(directory, 'outputs');
  const thumbnailDir = path.join(outputsDir, 'thumbnails');
  const historyFile = path.join(directory, 'history.json');
  const comparisonsFile = path.join(directory, 'comparisons.json');
  const migrationsDir = path.join(directory, 'migrations');
  await fs.mkdir(outputsDir);
  await fs.writeFile(path.join(outputsDir, 'job_one.png'), 'original', 'utf8');
  await fs.writeFile(historyFile, JSON.stringify([{
    id: 'job_one', imageUrl: '/outputs/job_one.png', timestamp: 123,
    comparisonSetId: 'cmp_one', referencedFaceJobIds: ['job_parent']
  }]), 'utf8');
  await fs.writeFile(comparisonsFile, JSON.stringify({ version: 1, sets: [] }), 'utf8');
  const thumbnailService = {
    outputsDir,
    thumbnailDir,
    resolveOriginalPath: imageUrl => path.join(outputsDir, path.basename(imageUrl)),
    async createForHistoryItem(item) {
      await fs.mkdir(thumbnailDir, { recursive: true });
      await fs.writeFile(path.join(thumbnailDir, `${item.id}.webp`), 'thumbnail', 'utf8');
      return {
        thumbnailUrl: `/outputs/thumbnails/${item.id}.webp`, thumbnailMimeType: 'image/webp',
        thumbnailWidth: 640, thumbnailHeight: 480, thumbnailBytes: 9,
        width: 1200, height: 900, originalBytes: 8
      };
    }
  };
  return { directory, historyFile, comparisonsFile, migrationsDir, thumbnailService };
}

test('migration dry-run writes no files', async t => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.directory, { recursive: true, force: true }));
  const before = await fs.readFile(fixture.historyFile, 'utf8');
  const report = await runMigration(
    { apply: false, resume: false, dryRun: true, concurrency: 2 }, fixture
  );
  assert.equal(report.candidates, 1);
  assert.equal(await fs.readFile(fixture.historyFile, 'utf8'), before);
  await assert.rejects(fs.access(fixture.migrationsDir));
});

test('migration apply preserves lineage and resume is idempotent', async t => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.directory, { recursive: true, force: true }));
  const first = await runMigration(
    { apply: true, resume: false, dryRun: false, concurrency: 2 }, fixture
  );
  const migrated = JSON.parse(await fs.readFile(fixture.historyFile, 'utf8'))[0];
  assert.equal(first.migrated, 1);
  assert.equal(migrated.id, 'job_one');
  assert.equal(migrated.timestamp, 123);
  assert.equal(migrated.comparisonSetId, 'cmp_one');
  assert.deepEqual(migrated.referencedFaceJobIds, ['job_parent']);
  const resumed = await runMigration(
    { apply: true, resume: true, dryRun: false, concurrency: 2 }, fixture
  );
  assert.equal(resumed.migrated, 0);
  assert.equal(resumed.skipped, 1);
});
