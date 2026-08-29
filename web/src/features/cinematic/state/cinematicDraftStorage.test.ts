import { beforeEach, describe, expect, it } from 'vitest';
import {
  createCinematicSetupDraft,
  readCinematicSetupRecoveryDraft,
  readCinematicSetupDraft,
  removeCinematicSetupRecoveryDraft,
  writeCinematicSetupRecoveryDraft,
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

  it('persists story role planning without binding a Character', () => {
    const draft = {
      ...createCinematicSetupDraft(),
      castPlanningMode: 'manual' as const,
      storyRoleSlots: [{
        id: 'role_lead', label: 'Lead', importance: 'required' as const,
        storyFunction: 'Carries the decision', relationshipHint: ''
      }]
    };
    writeCinematicSetupDraft('usr_alice', draft);
    const restored = readCinematicSetupDraft('usr_alice');
    expect(restored.storyRoleSlots[0]?.label).toBe('Lead');
    expect(restored.castPlanningMode).toBe('manual');
  });

  it('isolates recovery drafts by actor and existing Project', () => {
    const draft = { ...createCinematicSetupDraft(), projectName: 'Offline revision' };
    writeCinematicSetupRecoveryDraft('usr_alice', 'cineproj_1', draft);
    expect(readCinematicSetupRecoveryDraft('usr_alice', 'cineproj_1')?.projectName).toBe('Offline revision');
    expect(readCinematicSetupRecoveryDraft('usr_alice', 'cineproj_2')).toBeNull();
    expect(readCinematicSetupRecoveryDraft('usr_bob', 'cineproj_1')).toBeNull();
    removeCinematicSetupRecoveryDraft('usr_alice', 'cineproj_1');
    expect(readCinematicSetupRecoveryDraft('usr_alice', 'cineproj_1')).toBeNull();
  });
});
