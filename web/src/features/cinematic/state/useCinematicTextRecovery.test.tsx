import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readActorScopedDraft, writeActorScopedDraft } from '../../../lib/persistence/actorScopedStorage';
import { cinematicTextEquals, fullStoryRecoverySchema, RECOVERY_LIMITS, useCinematicTextRecovery } from './useCinematicTextRecovery';

const props = { actorId: 'actor-a', projectId: 'project-a', documentId: 'full-story', revision: 'revision-1',
  serverValue: { content: 'Saved story', instruction: '' }, schema: fullStoryRecoverySchema };
const entries = () => readActorScopedDraft<unknown[]>({ actorId: props.actorId, feature: 'cinematic-text-recovery', schemaVersion: 1, fallback: [] });

describe('Cinematic text recovery', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('compares text records independently of schema property ordering', () => {
    expect(cinematicTextEquals({ speakerBindings: [{ alias: 'Mina', castAssignmentId: 'cast-1', visible: true }] },
      { speakerBindings: [{ castAssignmentId: 'cast-1', alias: 'Mina', visible: true }] })).toBe(true);
  });

  it('persists synchronously, requires explicit restore on remount, and warns on unload', () => {
    const first = renderHook(() => useCinematicTextRecovery(props));
    act(() => first.result.current.setValue({ content: 'Unfinished story', instruction: 'Keep this note' }));
    expect(entries()).toHaveLength(1);
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    first.unmount();
    const second = renderHook(() => useCinematicTextRecovery(props));
    expect(second.result.current.value.content).toBe('Saved story');
    expect(second.result.current.pending).toBe(true);
    act(() => second.result.current.setValue({ content: 'Must not replace recovery', instruction: '' }));
    expect(second.result.current.value.content).toBe('Saved story');
    act(() => second.result.current.restore());
    expect(second.result.current.value).toEqual({ content: 'Unfinished story', instruction: 'Keep this note' });
    expect(second.result.current.dirty).toBe(true);
  });

  it('guards stale restore and preserves restored text through later server changes', () => {
    const hook = renderHook(input => useCinematicTextRecovery(input), { initialProps: props });
    act(() => hook.result.current.setValue({ content: 'My work', instruction: '' }));
    hook.unmount();
    const updated = { ...props, revision: 'revision-2', serverValue: { content: 'Server changed', instruction: '' } };
    const next = renderHook(input => useCinematicTextRecovery(input), { initialProps: updated });
    expect(next.result.current.stale).toBe(true);
    act(() => next.result.current.restore());
    expect(next.result.current.value.content).toBe('Server changed');
    act(() => next.result.current.restore(true));
    next.rerender({ ...updated, revision: 'revision-3', serverValue: { content: 'Another update', instruction: '' } });
    expect(next.result.current.value.content).toBe('My work');
    expect(next.result.current.dirty).toBe(true);
  });

  it('isolates actor, project and document switches without carrying old text into a new scope', () => {
    const hook = renderHook(input => useCinematicTextRecovery(input), { initialProps: props });
    act(() => hook.result.current.setValue({ content: 'Private draft', instruction: '' }));
    for (const changed of [{ actorId: 'actor-b' }, { projectId: 'project-b' }, { documentId: 'chapter' }]) {
      hook.rerender({ ...props, ...changed });
      expect(hook.result.current.pending).toBe(false);
      expect(hook.result.current.value.content).toBe('Saved story');
    }
    hook.rerender(props);
    expect(hook.result.current.pending).toBe(true);
    act(() => hook.result.current.restore());
    expect(hook.result.current.value.content).toBe('Private draft');
    expect(entries()).toHaveLength(1);
  });

  it('clears only saved fields and preserves typing that occurs while a save is pending', () => {
    const hook = renderHook(() => useCinematicTextRecovery(props));
    act(() => hook.result.current.setValue({ content: 'Submitted', instruction: 'Not submitted' }));
    const snapshot = hook.result.current.value;
    act(() => hook.result.current.setValue(value => ({ ...value, content: 'Newer edit' })));
    act(() => hook.result.current.markSaved({ content: snapshot.content }, { content: 'Submitted', instruction: '' }, 'revision-2'));
    expect(hook.result.current.value).toEqual({ content: 'Newer edit', instruction: 'Not submitted' });
    expect(entries()).toHaveLength(1);
    act(() => hook.result.current.markSaved(hook.result.current.value, { content: 'Newer edit', instruction: '' }, 'revision-3'));
    expect(entries()).toHaveLength(0);
    expect(hook.result.current.dirty).toBe(false);
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it.each(['response-first', 'refresh-first'])('preserves A after A to B, submit B, then revert to A (%s)', order => {
    const hook = renderHook(input => useCinematicTextRecovery(input), { initialProps: props });
    act(() => hook.result.current.setValue({ content: 'B', instruction: '' }));
    const submitted = hook.result.current.value;
    act(() => hook.result.current.setValue(props.serverValue));
    if (order === 'refresh-first') {
      hook.rerender({ ...props, revision: 'revision-2', serverValue: submitted });
      expect(hook.result.current.value.content).toBe('Saved story');
      expect(entries()[0]).toMatchObject({ value: { content: 'Saved story' } });
    }
    act(() => hook.result.current.markSaved(submitted, submitted, 'revision-2'));
    hook.rerender({ ...props, revision: 'revision-2', serverValue: submitted });
    expect(hook.result.current.value.content).toBe('Saved story');
    expect(hook.result.current.dirty).toBe(true);
    expect(entries()[0]).toMatchObject({ base: { content: 'B' }, value: { content: 'Saved story' } });
    hook.unmount();
    const reloaded = renderHook(() => useCinematicTextRecovery({ ...props, revision: 'revision-2', serverValue: submitted }));
    expect(reloaded.result.current.pending).toBe(true);
    act(() => reloaded.result.current.restore());
    expect(reloaded.result.current.value.content).toBe('Saved story');
  });

  it('still adopts a saved historical revision when its editor field was untouched', () => {
    const hook = renderHook(() => useCinematicTextRecovery(props));
    const historical = { content: 'Historical revision', instruction: '' };
    act(() => hook.result.current.markSaved(historical, historical, 'revision-2'));
    expect(hook.result.current.value).toEqual(historical);
    expect(hook.result.current.dirty).toBe(false);
  });

  it('requires explicit leave consent only for dirty work whose recovery failed', () => {
    const hook = renderHook(() => useCinematicTextRecovery(props));
    const confirmLeave = vi.fn(() => false);
    expect(hook.result.current.canLeave(confirmLeave)).toBe(true);
    act(() => hook.result.current.setValue({ content: 'Recoverable', instruction: '' }));
    expect(hook.result.current.canLeave(confirmLeave)).toBe(true);
    expect(confirmLeave).not.toHaveBeenCalled();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    act(() => hook.result.current.setValue({ content: 'Not recoverable', instruction: '' }));
    expect(hook.result.current.canLeave(confirmLeave)).toBe(false);
    expect(hook.result.current.value.content).toBe('Not recoverable');
    confirmLeave.mockReturnValue(true);
    expect(hook.result.current.canLeave(confirmLeave)).toBe(true);
    expect(confirmLeave).toHaveBeenCalledTimes(2);
  });

  it('discard removes only the offered document and makes no server mutation', () => {
    const hook = renderHook(input => useCinematicTextRecovery(input), { initialProps: props });
    act(() => hook.result.current.setValue({ content: 'First draft', instruction: '' }));
    hook.rerender({ ...props, documentId: 'chapter' });
    act(() => hook.result.current.setValue({ content: 'Second draft', instruction: '' }));
    hook.rerender(props);
    act(() => hook.result.current.discard());
    expect(hook.result.current.pending).toBe(false);
    expect(entries()).toHaveLength(1);
    expect(entries()[0]).toMatchObject({ documentId: 'chapter' });
  });

  it('does not let a late save from an unmounted writer delete a newer mounted draft', () => {
    const first = renderHook(() => useCinematicTextRecovery(props));
    act(() => first.result.current.setValue({ content: 'Submitted', instruction: '' }));
    const submitted = first.result.current.value;
    const finishSave = first.result.current.markSaved;
    first.unmount();
    const second = renderHook(() => useCinematicTextRecovery(props));
    act(() => second.result.current.restore());
    act(() => second.result.current.setValue({ content: 'Newer mounted work', instruction: '' }));
    act(() => finishSave(submitted, submitted, 'revision-2'));
    expect(entries()[0]).toMatchObject({ value: { content: 'Newer mounted work' } });
  });

  it('bounds retained documents without silently evicting existing work', () => {
    const hook = renderHook(input => useCinematicTextRecovery(input), { initialProps: props });
    for (let index = 0; index <= RECOVERY_LIMITS.documents; index++) {
      hook.rerender({ ...props, documentId: `document-${index}` });
      act(() => hook.result.current.setValue({ content: `Draft ${index}`, instruction: '' }));
    }
    expect(entries()).toHaveLength(RECOVERY_LIMITS.documents);
    expect(hook.result.current.unavailable).toBe(true);
    expect(hook.result.current.value.content).toBe(`Draft ${RECOVERY_LIMITS.documents}`);
  });

  it('rejects media payloads, oversized text and storage failures without losing in-memory work', () => {
    const hook = renderHook(() => useCinematicTextRecovery(props));
    act(() => hook.result.current.setValue({ content: 'data:image/png;base64,AAAA', instruction: '' }));
    expect(entries()).toHaveLength(0);
    expect(hook.result.current.unavailable).toBe(true);
    act(() => hook.result.current.setValue({ content: 'long '.repeat(11000), instruction: '' }));
    expect(entries()).toHaveLength(0);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    act(() => hook.result.current.setValue({ content: 'Still in the editor', instruction: '' }));
    expect(hook.result.current.value.content).toBe('Still in the editor');
    expect(hook.result.current.unavailable).toBe(true);
  });

  it('rejects expired and malformed recovery, including unexpected media fields', () => {
    for (const entry of [
      { updatedAt: Date.now() - RECOVERY_LIMITS.retentionMs - 1, value: { content: 'Expired', instruction: '' } },
      { updatedAt: Date.now(), value: { content: 'Unsafe', instruction: '', imageUrl: '/private' } }
    ]) {
      writeActorScopedDraft({ actorId: props.actorId, feature: 'cinematic-text-recovery', schemaVersion: 1,
        payload: [{ projectId: props.projectId, documentId: props.documentId, revision: props.revision, base: props.serverValue, ...entry }] });
      const hook = renderHook(() => useCinematicTextRecovery(props));
      expect(hook.result.current.pending).toBe(false);
      expect(hook.result.current.value.content).toBe('Saved story');
      hook.unmount();
    }
  });
});
