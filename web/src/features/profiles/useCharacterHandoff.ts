import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { routePaths } from '../../app/routeRegistry/routes';
import { useActor } from '../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../lib/auth/actorStore';
import { writeHandoff } from '../../lib/persistence/handoffStorage';
import { requestCharacterHandoff } from './api/profileApi';
import { createCharacterHandoffNavigationState } from './characterHandoffNavigation';

type Destination = 'fashion_blueprint' | 'scene_builder';
type Selection = { characterId: string; actorId: string; destination: Destination };

export function useCharacterHandoff(characterId: string) {
  const { actor } = useActor();
  const navigate = useNavigate();
  const busy = useRef(false);
  const mounted = useRef(true);
  const currentCharacter = useRef(characterId);
  useEffect(() => { currentCharacter.current = characterId; }, [characterId]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const mutation = useMutation({
    retry: false,
    mutationFn: (selection: Selection) => requestCharacterHandoff(selection.characterId, selection.destination),
    onSuccess: (payload, selection) => {
      // A late response must never select private references for a new actor.
      if (!mounted.current || currentCharacter.current !== selection.characterId
        || getActiveActorId() !== selection.actorId) return;
      writeHandoff({ actorId: selection.actorId, kind: 'character', payload });
      if (payload.destination === 'fashion_blueprint') {
        navigate(routePaths.createFashion);
      } else {
        navigate(routePaths.createStudioScene, { state: createCharacterHandoffNavigationState(payload) });
      }
    },
    onSettled: () => { busy.current = false; }
  });
  return {
    ...mutation,
    mutate: (destination: Destination) => {
      if (busy.current || !actor?.userId || !characterId) return;
      busy.current = true;
      mutation.mutate({ actorId: actor.userId, characterId, destination });
    }
  };
}
