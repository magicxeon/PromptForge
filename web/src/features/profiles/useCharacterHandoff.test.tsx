import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useCharacterHandoff } from './useCharacterHandoff';
import { requestCharacterHandoff } from './api/profileApi';
import { characterHandoffSchema } from './schemas/profileSchemas';
import { writeHandoff } from '../../lib/persistence/handoffStorage';

const state = vi.hoisted(() => ({ actorId: 'actor-a', navigate: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => state.navigate }));
vi.mock('../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: state.actorId } }) }));
vi.mock('../../lib/auth/actorStore', () => ({ getActiveActorId: () => state.actorId }));
vi.mock('../../lib/persistence/handoffStorage', () => ({ writeHandoff: vi.fn() }));
vi.mock('./api/profileApi', () => ({ requestCharacterHandoff: vi.fn() }));

function payload(destination: 'fashion_blueprint' | 'scene_builder' | 'playground_image') {
  return characterHandoffSchema.parse({
    handoffVersion: 1, destination, characterProfileId: 'identity', characterProfileVersionId: 'approved-v1',
    characterReferenceAssetId: 'reference', characterReferenceUrl: '/authorized-reference', displayName: 'Mali',
    characterType: 'reusable_model', outfitBehavior: 'flexible',
    characterProfileContext: { purpose: 'character_usage', characterProfileId: 'identity', characterProfileVersionId: 'approved-v1' }
  });
}
function setup() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(({ id }) => useCharacterHandoff(id), { initialProps: { id: 'identity' }, wrapper });
}
beforeEach(() => {
  vi.clearAllMocks();
  state.actorId = 'actor-a';
  vi.mocked(requestCharacterHandoff).mockImplementation(async (_id, destination) => payload(destination));
});

it.each(['fashion_blueprint', 'scene_builder'] as const)('preserves the approved payload and existing %s destination', async destination => {
  const { result } = setup();
  act(() => result.current.mutate(destination));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(requestCharacterHandoff).toHaveBeenCalledWith('identity', destination);
  expect(writeHandoff).toHaveBeenCalledWith({ actorId: 'actor-a', kind: 'character', payload: payload(destination) });
  if (destination === 'fashion_blueprint') expect(state.navigate).toHaveBeenCalledWith('/create/fashion');
  else expect(state.navigate).toHaveBeenCalledWith('/create/studio/scene', {
    state: { mpfCharacterHandoff: payload(destination) }
  });
});

it('does not write or navigate on server rejection and permits an explicit retry', async () => {
  vi.mocked(requestCharacterHandoff).mockRejectedValueOnce(new Error('Reuse no longer permitted'));
  const { result } = setup();
  act(() => result.current.mutate('scene_builder'));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(writeHandoff).not.toHaveBeenCalled();
  expect(state.navigate).not.toHaveBeenCalled();
  act(() => result.current.mutate('scene_builder'));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});

it('guards rapid duplicate selections while pending', async () => {
  let resolve!: (value: ReturnType<typeof payload>) => void;
  vi.mocked(requestCharacterHandoff).mockReturnValue(new Promise(done => { resolve = done; }));
  const { result } = setup();
  act(() => { result.current.mutate('scene_builder'); result.current.mutate('scene_builder'); });
  await waitFor(() => expect(requestCharacterHandoff).toHaveBeenCalledOnce());
  await act(async () => resolve(payload('scene_builder')));
});

it.each(['actor', 'character', 'unmount'])('discards late responses after %s changes', async change => {
  let resolve!: (value: ReturnType<typeof payload>) => void;
  vi.mocked(requestCharacterHandoff).mockReturnValue(new Promise(done => { resolve = done; }));
  const view = setup();
  act(() => view.result.current.mutate('scene_builder'));
  await waitFor(() => expect(requestCharacterHandoff).toHaveBeenCalledOnce());
  if (change === 'actor') state.actorId = 'actor-b';
  if (change === 'character') view.rerender({ id: 'other' });
  if (change === 'unmount') view.unmount();
  await act(async () => resolve(payload('scene_builder')));
  expect(writeHandoff).not.toHaveBeenCalled();
  expect(state.navigate).not.toHaveBeenCalled();
});
