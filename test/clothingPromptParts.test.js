import assert from 'node:assert/strict';
import test from 'node:test';
import { compilePromptOnServer } from '../server/domain/generation/promptCompiler.js';

const CANONICAL_FALLBACK = 'wearing modest neutral character reference clothing, an opaque light gray fitted top and matching mid-thigh shorts, non-revealing, clean and practical for character sheet visibility';

test('Default fallback clothing is compiled when selections and references are empty', () => {
  const prompt = compilePromptOnServer(
    {},
    '1:1',
    {},
    'character-sheet',
    'portrait'
  );

  // Note: This assert checks the updated fallback wording from requirements
  assert.match(prompt, new RegExp(CANONICAL_FALLBACK));
});

test('Default fallback clothing is not injected outside Character Sheet mode', () => {
  const prompt = compilePromptOnServer(
    {},
    '1:1',
    {},
    'normal',
    'portrait'
  );

  assert.doesNotMatch(prompt, new RegExp(CANONICAL_FALLBACK));
});

test('Legacy Outfit Preset selection falls back in Character Sheet mode', () => {
  const selections = {
    'Outfit Preset': {
      id: 'outfit.preset.blazer_trousers',
      value: 'wearing a clean tailored blazer with straight trousers',
      group: 'Clothing',
      category: 'clothing',
      tags: ['clothing', 'outfit-preset', 'professional']
    }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    {},
    'character-sheet',
    'portrait'
  );

  assert.match(prompt, new RegExp(CANONICAL_FALLBACK));
  assert.doesNotMatch(prompt, /tailored blazer/);
});

test('Outfit Base modular selection tshirt_jeans compiles correctly', () => {
  const selections = {
    'Outfit Base': {
      id: 'outfit.base.unisex.tshirt_wide_jeans',
      value: 'wearing a simple fitted T-shirt and straight-leg jeans',
      group: 'Clothing',
      category: 'clothing',
      tags: ['clothing', 'outfit-base', 'outfit-base-unisex', 'casual']
    }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    {},
    'character-sheet',
    'portrait'
  );

  assert.match(prompt, /wearing a simple fitted T-shirt and straight-leg jeans/);
  assert.doesNotMatch(prompt, new RegExp(CANONICAL_FALLBACK));
});

test('Outfit Base modular selection simple_dress compiles correctly', () => {
  const selections = {
    'Outfit Base': {
      id: 'outfit.base.female.simple_day_dress',
      value: 'wearing a simple knee-length day dress with clean lines',
      group: 'Clothing',
      category: 'clothing',
      tags: ['clothing', 'outfit-base', 'outfit-base-female', 'dress']
    }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    {},
    'character-sheet',
    'portrait'
  );

  assert.match(prompt, /wearing a simple knee-length day dress with clean lines/);
  assert.doesNotMatch(prompt, new RegExp(CANONICAL_FALLBACK));
});

test('Uploaded outfit references override Outfit Base selection and fallback', () => {
  const selections = {
    'Outfit Base': {
      id: 'outfit.base.unisex.tshirt_wide_jeans',
      value: 'wearing a simple fitted T-shirt and straight-leg jeans',
      group: 'Clothing',
      category: 'clothing',
      tags: ['clothing', 'outfit-base', 'outfit-base-unisex', 'casual']
    }
  };

  const imageReferences = {
    outfitReference: true,
    outfitReferenceBack: true
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    imageReferences,
    'character-sheet',
    'portrait'
  );

  // Should match the Front & Back upload reference phrase from compiler
  assert.match(prompt, /matching the clothing outfit from the uploaded front and back outfit references/);
  assert.doesNotMatch(prompt, /wearing a simple fitted T-shirt and straight-leg jeans/);
  assert.doesNotMatch(prompt, new RegExp(CANONICAL_FALLBACK));
});

test('Safe clothing rules are respected, rejecting banned keywords', () => {
  const prompt = compilePromptOnServer(
    {},
    '1:1',
    {},
    'character-sheet',
    'portrait'
  );

  const bannedKeywords = [
    'sexy', 'revealing', 'transparent', 'lace', 'lingerie',
    'bikini', 'sensual', 'erotic', 'tight to show body', 'exposed'
  ];

  bannedKeywords.forEach(word => {
    const cleanPrompt = prompt.toLowerCase().replace(/\bnon-revealing\b/gi, '');
    assert.doesNotMatch(cleanPrompt, new RegExp(`\\b${word}\\b`, 'i'));
  });
});

test('Modular clothing with colors, patterns, and materials compiles correctly', () => {
  const selections = {
    'Outfit Base': {
      id: 'outfit.base.unisex.tshirt_wide_jeans',
      value: 'wearing a simple fitted T-shirt and straight-leg jeans',
      group: 'Clothing',
      category: 'clothing',
      tags: ['clothing', 'outfit-base', 'outfit-base-unisex', 'casual']
    },
    'Primary Color': {
      id: 'outfit.color.navy',
      value: 'navy',
      group: 'Clothing',
      category: 'clothing'
    },
    'Secondary Color': {
      id: 'outfit.color.white',
      value: 'white',
      group: 'Clothing',
      category: 'clothing'
    },
    'Pattern': {
      id: 'outfit.pattern.subtle_stripe',
      value: 'subtle vertical stripe pattern',
      group: 'Clothing',
      category: 'clothing'
    },
    'Material': {
      id: 'outfit.material.cotton',
      value: 'matte cotton fabric',
      group: 'Clothing',
      category: 'clothing'
    }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    {},
    'character-sheet',
    'portrait'
  );

  assert.match(prompt, /wearing a simple fitted T-shirt and straight-leg jeans/);
  assert.match(prompt, /in navy as the primary garment color/);
  assert.match(prompt, /with white secondary color in the pattern/);
  assert.match(prompt, /subtle vertical stripe pattern/);
  assert.match(prompt, /matte cotton fabric/);
});

test('Colors, patterns, and materials are ignored when Outfit Base is modest_reference', () => {
  const selections = {
    'Outfit Base': {
      id: 'outfit.base.modest_reference',
      value: 'wearing modest neutral fitted reference clothing, opaque light gray top and mid-thigh shorts, non-revealing',
      group: 'Clothing',
      category: 'clothing'
    },
    'Primary Color': {
      id: 'outfit.color.navy',
      value: 'navy',
      group: 'Clothing',
      category: 'clothing'
    }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    {},
    'character-sheet',
    'portrait'
  );

  assert.match(prompt, new RegExp(CANONICAL_FALLBACK));
  assert.doesNotMatch(prompt, /in navy as the primary garment color/);
});

test('Secondary color compiles as trim accents when pattern is solid', () => {
  const selections = {
    'Outfit Base': {
      id: 'outfit.base.unisex.tshirt_wide_jeans',
      value: 'wearing a simple fitted T-shirt and straight-leg jeans',
      group: 'Clothing',
      category: 'clothing',
      tags: ['clothing', 'outfit-base', 'outfit-base-unisex', 'casual']
    },
    'Secondary Color': {
      id: 'outfit.color.white',
      value: 'white',
      group: 'Clothing',
      category: 'clothing'
    },
    'Pattern': {
      id: 'outfit.pattern.solid',
      value: 'solid color fabric',
      group: 'Clothing',
      category: 'clothing'
    }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    {},
    'character-sheet',
    'portrait'
  );

  assert.match(prompt, /with white trim accents/);
  assert.doesNotMatch(prompt, /with white secondary color in the pattern/);
});

test('Outfit base with primary color compiles correctly', () => {
  const selections = {
    'Outfit Base': {
      id: 'outfit.base.unisex.tshirt_wide_jeans',
      value: 'wearing a simple fitted T-shirt and straight-leg jeans',
      group: 'Clothing',
      category: 'clothing',
      tags: ['clothing', 'outfit-base', 'outfit-base-unisex', 'casual']
    },
    'Primary Color': {
      id: 'outfit.color.navy',
      value: 'navy',
      group: 'Clothing',
      category: 'clothing'
    }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    {},
    'character-sheet',
    'portrait'
  );

  assert.match(prompt, /wearing a simple fitted T-shirt and straight-leg jeans/);
  assert.match(prompt, /in navy as the primary garment color/);
  assert.doesNotMatch(prompt, /trim accents/);
});

test('Outfit base with both primary and secondary colors compiles correctly', () => {
  const selections = {
    'Outfit Base': {
      id: 'outfit.base.unisex.tshirt_wide_jeans',
      value: 'wearing a simple fitted T-shirt and straight-leg jeans',
      group: 'Clothing',
      category: 'clothing',
      tags: ['clothing', 'outfit-base', 'outfit-base-unisex', 'casual']
    },
    'Primary Color': {
      id: 'outfit.color.navy',
      value: 'navy',
      group: 'Clothing',
      category: 'clothing'
    },
    'Secondary Color': {
      id: 'outfit.color.white',
      value: 'white',
      group: 'Clothing',
      category: 'clothing'
    }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    {},
    'character-sheet',
    'portrait'
  );

  assert.match(prompt, /wearing a simple fitted T-shirt and straight-leg jeans/);
  assert.match(prompt, /in navy as the primary garment color/);
  assert.match(prompt, /with white trim accents/);
});

test('Modular clothing custom color pickers compile hex colors without preset swatches', () => {
  const selections = {
    'Outfit Base': {
      id: 'outfit.base.unisex.tshirt_wide_jeans',
      value: 'wearing a simple fitted T-shirt and straight-leg jeans',
      group: 'Clothing',
      category: 'clothing',
      tags: ['clothing', 'outfit-base', 'outfit-base-unisex', 'casual']
    },
    'Pattern': {
      id: 'outfit.pattern.subtle_stripe',
      value: 'subtle vertical stripe pattern',
      group: 'Clothing',
      category: 'clothing'
    }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    {},
    'character-sheet',
    'portrait',
    false,
    {
      'Primary Color': { enabled: true, color: '#8b1e3f' },
      'Secondary Color': { enabled: true, color: '#f5f5f4' }
    }
  );

  assert.match(prompt, /in #8b1e3f as the primary garment color/);
  assert.match(prompt, /with #f5f5f4 secondary color in the pattern/);
  assert.doesNotMatch(prompt, /#8b1e3f colored in #8b1e3f/);
});
