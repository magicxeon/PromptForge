import { beforeEach, describe, expect, it } from 'vitest';
import {
  createCinematicSetupDraft,
  readCinematicSetupDraft,
  writeCinematicSetupDraft
} from './cinematicDraftStorage';

describe('Cinematic actor-scoped draft storage', () => {
  beforeEach(() => localStorage.clear());

  it('restores only the matching actor draft', () => {
    const draft = {
      ...createCinematicSetupDraft(new Date('2026-08-17T00:00:00.000Z')),
      projectName: 'Night train'
    };
    writeCinematicSetupDraft('usr_alice', draft);

    expect(readCinematicSetupDraft('usr_alice').projectName).toBe('Night train');
    expect(readCinematicSetupDraft('usr_bob').projectName).toBe('');
  });

  it('rejects malformed payloads and removes unknown media fields at the schema boundary', () => {
    const draft = createCinematicSetupDraft();
    expect(() => writeCinematicSetupDraft('usr_alice', {
      ...draft,
      storyBrief: 'x'.repeat(601)
    })).toThrow();

    writeCinematicSetupDraft('usr_alice', {
      ...draft,
      mediaBase64: 'data:image/png;base64,private'
    } as typeof draft & { mediaBase64: string });
    expect(localStorage.getItem('mpf.react.draft:cinematic-project:new:usr_alice'))
      .not.toContain('mediaBase64');
  });
});
