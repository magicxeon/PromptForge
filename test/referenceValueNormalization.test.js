import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  isBase64Reference,
  isHistoryReference,
  normalizeReferenceValue,
  resolveReferenceForProvider,
  stripEmbeddedReferenceDataFromSnapshot
} from '../server/referenceUtils.js';
import { historyRepository } from '../server/historyRepository.js';

// Setup historyRepository stub for resolution testing
const originalGetById = historyRepository.getById;

test('isBase64Reference checks base64 headers correctly', () => {
  assert.equal(isBase64Reference('data:image/png;base64,iVBORw0KGgoAAAANS'), true);
  assert.equal(isBase64Reference('/outputs/job_123.png'), false);
  assert.equal(isBase64Reference('job_123'), false);
  assert.equal(isBase64Reference(null), false);
});

test('isHistoryReference checks output path and jobId prefixes', () => {
  assert.equal(isHistoryReference('/outputs/job_123.png'), true);
  assert.equal(isHistoryReference('job_123'), true);
  assert.equal(isHistoryReference('data:image/png;base64,...'), false);
  assert.equal(isHistoryReference(null), false);
});

test('normalizeReferenceValue builds normalized reference structures', () => {
  const res1 = normalizeReferenceValue('data:image/png;base64,...');
  assert.equal(res1.source, 'upload');
  assert.equal(res1.jobId, null);

  const res2 = normalizeReferenceValue('/outputs/job_abc123.png');
  assert.equal(res2.source, 'history');
  assert.equal(res2.jobId, 'job_abc123');
  assert.equal(res2.imageUrl, '/outputs/job_abc123.png');

  const res3 = normalizeReferenceValue('job_xyz789');
  assert.equal(res3.source, 'history');
  assert.equal(res3.jobId, 'job_xyz789');
  assert.equal(res3.imageUrl, '/outputs/job_xyz789.png');
});

test('stripEmbeddedReferenceDataFromSnapshot performs deep sanitization of all base64 string occurrences', () => {
  const snapshot = {
    replaceableVariables: [
      { id: 'face_ref', type: 'reference_image', defaultValue: 'data:image/png;base64,...' },
      { id: 'style_ref', type: 'reference_image', defaultValue: '/outputs/job_123.png' }
    ],
    nestedMetadata: {
      customField: 'data:image/jpeg;base64,12345',
      safeField: 'hello world'
    }
  };

  const stripped = stripEmbeddedReferenceDataFromSnapshot(snapshot);
  assert.equal(stripped.replaceableVariables[0].defaultValue, null);
  assert.equal(stripped.replaceableVariables[1].defaultValue, '/outputs/job_123.png');
  assert.equal(stripped.nestedMetadata.customField, null);
  assert.equal(stripped.nestedMetadata.safeField, 'hello world');
});

test('resolveReferenceForProvider checks owner verification and blocks raw bypassing', async () => {
  // Stub getById to return a mock history entry
  historyRepository.getById = async (jobId) => {
    if (jobId === 'job_owner123') {
      return {
        id: 'job_owner123',
        username: 'user_alice',
        imageUrl: '/outputs/job_owner123.png'
      };
    }
    return null;
  };

  // Mock outputs file existence
  const outputsDir = path.resolve(process.cwd(), 'client/outputs');
  await fs.promises.mkdir(outputsDir, { recursive: true });
  const testFilePath = path.join(outputsDir, 'job_owner123.png');
  await fs.promises.writeFile(testFilePath, 'dummy image data');

  try {
    // 1. Correct owner -> succeeds and reads file
    const resolvedSucceed = await resolveReferenceForProvider('job_owner123', 'user_alice');
    assert.ok(resolvedSucceed);
    assert.match(resolvedSucceed, /^data:image\/png;base64,/);

    // 2. Ownership mismatch -> returns null
    const resolvedFail = await resolveReferenceForProvider('job_owner123', 'user_bob');
    assert.equal(resolvedFail, null);

    // 3. Base64 fallback -> returns value
    const base64Val = 'data:image/png;base64,abc';
    const resolvedBase64 = await resolveReferenceForProvider(base64Val, 'user_bob');
    assert.equal(resolvedBase64, base64Val);

    // 4. Ownership bypass attempt for non-existent job output -> should return null
    const resolvedBypass = await resolveReferenceForProvider('/outputs/job_unknown123.png', 'user_bob');
    assert.equal(resolvedBypass, null);

    // 5. Bypass attempt for non-fixture custom filename -> should return null
    const resolvedRaw = await resolveReferenceForProvider('/outputs/some_private_photo.png', 'user_bob');
    assert.equal(resolvedRaw, null);

    // 6. Accessing dev fixture (starting with test_ or fixture_) -> should succeed
    const fixtureFilePath = path.join(outputsDir, 'test_fixture_style.png');
    await fs.promises.writeFile(fixtureFilePath, 'dummy style data');
    try {
      const resolvedFixture = await resolveReferenceForProvider('/outputs/test_fixture_style.png', 'user_bob');
      assert.ok(resolvedFixture);
      assert.match(resolvedFixture, /^data:image\/png;base64,/);
    } finally {
      try {
        await fs.promises.unlink(fixtureFilePath);
      } catch {}
    }
  } finally {
    // Cleanup mock file and restore stub
    try {
      await fs.promises.unlink(testFilePath);
    } catch {}
    historyRepository.getById = originalGetById;
  }
});
