import { beforeEach, describe, expect, it } from 'vitest';
import { readProduceVideoEnginePreference, writeProduceVideoEnginePreference } from './produceVideoPreferences';

describe('Produce video engine preferences', () => {
  beforeEach(() => localStorage.clear());

  it('keeps provider/model selection actor-scoped', () => {
    writeProduceVideoEnginePreference('usr-a', { providerId: 'modelark', modelId: 'seedance-1-0-pro' });
    expect(readProduceVideoEnginePreference('usr-a')).toEqual({ providerId: 'modelark', modelId: 'seedance-1-0-pro' });
    expect(readProduceVideoEnginePreference('usr-b')).toBeNull();
  });
});
