import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ImagePresentationService,
  resolveImagePresentationProfile
} from '../server/domain/assets/ImagePresentationService.js';

test('template card presentation uses the shared Sharp top-biased crop profile', async () => {
  const calls = [];
  const sharp = filePath => {
    const pipeline = {
      rotate() {
        calls.push(['rotate']);
        return pipeline;
      },
      resize(options) {
        calls.push(['resize', options]);
        return pipeline;
      },
      webp(options) {
        calls.push(['webp', options]);
        return pipeline;
      },
      async toBuffer(options) {
        calls.push(['toBuffer', options]);
        return {
          data: Buffer.from('attention-cropped-image'),
          info: { width: 640, height: 400 }
        };
      }
    };
    calls.push(['source', filePath]);
    return pipeline;
  };
  sharp.strategy = { attention: 'sharp-attention' };
  const service = new ImagePresentationService({
    sharpLoader: async () => sharp,
    statLoader: async () => ({ size: 2048, mtimeMs: 1234 })
  });

  const first = await service.renderFile('/outputs/source.png', 'template-card-person-focus-v2');
  const second = await service.renderFile('/outputs/source.png', 'template-card-person-focus-v2');

  assert.equal(first, second);
  assert.equal(first.contentType, 'image/webp');
  assert.equal(first.width, 640);
  assert.equal(first.height, 400);
  assert.deepEqual(calls.find(call => call[0] === 'resize')[1], {
    width: 640,
    height: 400,
    fit: 'cover',
    position: 'north',
    withoutEnlargement: true
  });
  assert.equal(calls.filter(call => call[0] === 'source').length, 1);
});

test('unknown presentation profiles fail closed', () => {
  assert.throws(
    () => resolveImagePresentationProfile('arbitrary-client-profile'),
    error => error.code === 'image_presentation_profile_not_found' && error.statusCode === 404
  );
});

test('Creator Profile Template presentation is square and top-biased', () => {
  const profile = resolveImagePresentationProfile('profile-template-square-person-focus-v2');

  assert.equal(profile.width, 640);
  assert.equal(profile.height, 640);
  assert.equal(profile.fit, 'cover');
  assert.equal(profile.positionStrategy, 'north');
  assert.equal(profile.sourceMedia, 'thumbnail');
  assert.equal(profile.format, 'webp');
});

test('Template detail presentation uses a top-biased portrait crop', () => {
  const profile = resolveImagePresentationProfile('template-detail-person-focus-v1');

  assert.equal(profile.width, 768);
  assert.equal(profile.height, 960);
  assert.equal(profile.fit, 'cover');
  assert.equal(profile.positionStrategy, 'north');
  assert.equal(profile.sourceMedia, 'image');
  assert.equal(profile.format, 'webp');
});

test('comparison card profiles match each count-aware tile geometry', () => {
  const expected = {
    'comparison-card-1-person-focus': [864, 648],
    'comparison-card-2-person-focus': [432, 648],
    'comparison-card-3-person-focus': [288, 648],
    'comparison-card-4-person-focus': [432, 324]
  };

  for (const [profileId, [width, height]] of Object.entries(expected)) {
    const profile = resolveImagePresentationProfile(profileId);
    assert.equal(profile.width, width);
    assert.equal(profile.height, height);
    assert.equal(profile.fit, 'cover');
    assert.equal(profile.positionStrategy, 'attention');
    assert.equal(profile.sourceMedia, 'thumbnail');
    assert.equal(profile.format, 'webp');
  }
});

test('output presentation sources stay inside the configured output directory', async () => {
  const sources = [];
  const sharp = filePath => {
    sources.push(filePath);
    const pipeline = {
      rotate: () => pipeline,
      resize: () => pipeline,
      webp: () => pipeline,
      toBuffer: async () => ({
        data: Buffer.from('comparison-preview'),
        info: { width: 432, height: 648 }
      })
    };
    return pipeline;
  };
  sharp.strategy = { attention: 'sharp-attention' };
  const service = new ImagePresentationService({
    outputsDirectory: '/safe/outputs',
    sharpLoader: async () => sharp,
    statLoader: async () => ({ size: 100, mtimeMs: 1 })
  });

  await service.renderOutputUrl(
    '/outputs/thumbnails/job_1.webp',
    'comparison-card-2-person-focus'
  );
  assert.match(sources[0], /safe[\\/]outputs[\\/]thumbnails[\\/]job_1\.webp$/);
  await assert.rejects(
    async () => service.renderOutputUrl(
      '/outputs/../private.png',
      'comparison-card-2-person-focus'
    ),
    error => error.code === 'image_presentation_source_not_found'
  );
});
