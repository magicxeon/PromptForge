import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureJsonFile,
  readJsonFile,
  writeJsonFileAtomic,
  mutateJsonFile
} from '../server/repositories/json/jsonFileStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, 'temp_json_store_test');

test.before(async () => {
  await fs.mkdir(tempDir, { recursive: true });
});

test.after(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

test('TC-002-002-001: read missing file returns fallback', async () => {
  const filePath = path.join(tempDir, 'missing.json');
  const fallback = { status: 'fallback' };
  const data = await readJsonFile(filePath, fallback);
  assert.deepEqual(data, fallback);
});

test('TC-002-002-002: write creates parent folder and writes formatted JSON', async () => {
  const filePath = path.join(tempDir, 'nested/folder/write.json');
  const data = { hello: 'world' };
  await writeJsonFileAtomic(filePath, data);

  const raw = await fs.readFile(filePath, 'utf8');
  assert.equal(raw, `${JSON.stringify(data, null, 2)}\n`);

  const parsed = await readJsonFile(filePath, {});
  assert.deepEqual(parsed, data);
});

test('TC-002-002-003: mutate updates data and returns operation result', async () => {
  const filePath = path.join(tempDir, 'mutate.json');
  const fallback = { count: 0 };

  const res1 = await mutateJsonFile(filePath, fallback, async (data) => {
    data.count += 1;
    return 'incremented';
  });
  assert.equal(res1, 'incremented');

  const data1 = await readJsonFile(filePath, fallback);
  assert.equal(data1.count, 1);

  const res2 = await mutateJsonFile(filePath, fallback, async (data) => {
    data.count += 10;
    return data.count;
  });
  assert.equal(res2, 11);

  const data2 = await readJsonFile(filePath, fallback);
  assert.equal(data2.count, 11);
});

test('TC-002-002-004: repeated/parallel writes preserve valid JSON and order', async () => {
  const filePath = path.join(tempDir, 'parallel.json');
  const fallback = { log: [] };

  // Trigger parallel updates
  const promises = Array.from({ length: 10 }, (_, i) => {
    return mutateJsonFile(filePath, fallback, async (data) => {
      data.log.push(i);
      return i;
    });
  });

  const results = await Promise.all(promises);
  assert.equal(results.length, 10);

  const finalData = await readJsonFile(filePath, fallback);
  assert.equal(finalData.log.length, 10);
  // Verify order is preserved correctly via the mutation chain queue
  assert.deepEqual(finalData.log.sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});
