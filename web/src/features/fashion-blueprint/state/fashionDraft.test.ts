import { beforeEach, describe, expect, it } from 'vitest';
import { readFashionDraft, writeFashionDraft, type FashionDraft } from './fashionDraft';

const draft: FashionDraft = {
  step: 3,
  templatePostId: 'post_1',
  templateUseSessionId: 'tuse_1',
  characterProfileId: 'char_1',
  characterProfileContext: { characterProfileId: 'char_1' },
  products: [{
    key: 'product_1',
    clientKey: 'product_1',
    name: 'Outfit 1',
    sku: '',
    productType: 'clothing_set',
    outfitScope: 'full_look',
    colorNotes: '',
    integrityLevel: 'balanced',
    references: {
      outfit_front: {
        assetId: 'ast_1',
        imageUrl: '/outputs/fashion-references/usr_a/front.jpg'
      }
    }
  }],
  activeProductKey: 'product_1',
  qualityTier: 'selling_quality',
  routingMode: 'simple',
  poseDirection: 'template_pose',
  environmentDirection: 'template_environment',
  runId: null
};

describe('Fashion Blueprint draft persistence', () => {
  beforeEach(() => localStorage.clear());

  it('restores only the active actor draft and contains no embedded image bytes', () => {
    writeFashionDraft('usr_a', draft);
    const restored = readFashionDraft('usr_a', { ...draft, step: 1 });
    const otherActor = readFashionDraft('usr_b', { ...draft, step: 1 });
    expect(restored.step).toBe(3);
    expect(otherActor.step).toBe(1);
    expect(JSON.stringify(restored)).not.toContain('data:image');
  });
});
