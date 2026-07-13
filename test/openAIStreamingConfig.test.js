import assert from 'node:assert/strict';
import test from 'node:test';
import { isOpenAIAPIStreamingEnabled } from '../server/providers/OpenAIProvider.js';

test('OpenAI image streaming defaults to enabled when unset', () => {
  const original = process.env.ENABLE_OPENAI_API_STREAMING;
  delete process.env.ENABLE_OPENAI_API_STREAMING;

  try {
    assert.equal(isOpenAIAPIStreamingEnabled(), true);
  } finally {
    if (original === undefined) {
      delete process.env.ENABLE_OPENAI_API_STREAMING;
    } else {
      process.env.ENABLE_OPENAI_API_STREAMING = original;
    }
  }
});

test('OpenAI image streaming parses true and false strictly', () => {
  const original = process.env.ENABLE_OPENAI_API_STREAMING;

  try {
    process.env.ENABLE_OPENAI_API_STREAMING = ' true ';
    assert.equal(isOpenAIAPIStreamingEnabled(), true);

    process.env.ENABLE_OPENAI_API_STREAMING = 'FALSE';
    assert.equal(isOpenAIAPIStreamingEnabled(), false);

    process.env.ENABLE_OPENAI_API_STREAMING = 'yes';
    assert.equal(isOpenAIAPIStreamingEnabled(), false);
  } finally {
    if (original === undefined) {
      delete process.env.ENABLE_OPENAI_API_STREAMING;
    } else {
      process.env.ENABLE_OPENAI_API_STREAMING = original;
    }
  }
});
