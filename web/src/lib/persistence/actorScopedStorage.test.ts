import { beforeEach, describe, expect, it } from 'vitest';
import { readActorScopedDraft, writeActorScopedDraft } from './actorScopedStorage';
import { readHandoff, writeHandoff } from './handoffStorage';
import { beginIdentityResolution, publishIdentity } from '../auth/actorStore';

describe('actor-scoped browser persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns a draft only to its actor and feature owner', () => {
    writeActorScopedDraft({
      actorId: 'usr_alice',
      feature: 'playground',
      schemaVersion: 1,
      payload: { prompt: 'hello' }
    });
    expect(readActorScopedDraft({
      actorId: 'usr_alice',
      feature: 'playground',
      schemaVersion: 1,
      fallback: { prompt: '' }
    })).toEqual({ prompt: 'hello' });
    expect(readActorScopedDraft({
      actorId: 'usr_bob',
      feature: 'playground',
      schemaVersion: 1,
      fallback: { prompt: '' }
    })).toEqual({ prompt: '' });
  });

  it('consumes a same-actor handoff once', () => {
    writeHandoff({
      actorId: 'usr_alice',
      kind: 'character',
      payload: { characterId: 'char_1' }
    });
    expect(readHandoff<{ characterId: string }>({
      actorId: 'usr_bob',
      kind: 'character'
    })).toBeNull();

    writeHandoff({
      actorId: 'usr_alice',
      kind: 'character',
      payload: { characterId: 'char_1' }
    });
    expect(readHandoff<{ characterId: string }>({
      actorId: 'usr_alice',
      kind: 'character',
      consume: true
    })?.payload.characterId).toBe('char_1');
    expect(readHandoff({
      actorId: 'usr_alice',
      kind: 'character'
    })).toBeNull();
  });
  it('isolates drafts and handoffs by mode even with equal IDs', () => {
    publishIdentity(beginIdentityResolution(), { actorId: 'owner', authMode: 'development_bypass', csrfToken: 'fixture' });
    writeActorScopedDraft({ actorId: 'owner', feature: 'playground', schemaVersion: 1, payload: { prompt: 'fixture' } });
    writeHandoff({ actorId: 'owner', kind: 'character', payload: { id: 'fixture' } });
    publishIdentity(beginIdentityResolution(), { actorId: 'owner', authMode: 'session', csrfToken: 'real-fixture' });
    expect(readActorScopedDraft({ actorId: 'owner', feature: 'playground', schemaVersion: 1, fallback: null })).toBeNull();
    expect(readHandoff({ actorId: 'owner', kind: 'character' })).toBeNull();
    publishIdentity(beginIdentityResolution(), { actorId: 'owner', authMode: 'development_bypass', csrfToken: 'fixture' });
    expect(readHandoff<{ id: string }>({ actorId: 'owner', kind: 'character' })?.payload.id).toBe('fixture');
  });
});
