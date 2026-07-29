import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ImagePresentationService,
  resolveImagePresentationProfile
} from '../server/domain/assets/ImagePresentationService.js';

test('template card presentation uses the shared Sharp attention crop profile', async () => {
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

  const first = await service.renderFile('/outputs/source.png', 'template-card-person-focus');
  const second = await service.renderFile('/outputs/source.png', 'template-card-person-focus');

  assert.equal(first, second);
  assert.equal(first.contentType, 'image/webp');
  assert.equal(first.width, 640);
  assert.equal(first.height, 400);
  assert.deepEqual(calls.find(call => call[0] === 'resize')[1], {
    width: 640,
    height: 400,
    fit: 'cover',
    position: 'sharp-attention',
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
