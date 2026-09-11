import { useMutation } from '@tanstack/react-query';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { updateCinematicShotVideoReferences, type CinematicVideoReferenceMode } from '../api/cinematicApi';
import type { CinematicProject, CinematicScene, CinematicShot } from '../schemas/cinematicSchemas';

export function useShotVideoReferences(project: CinematicProject, scene: CinematicScene | undefined,
  shot: CinematicShot | undefined, onRefresh?: () => void, suggestLooksOnly = false) {
  const actorId = getActiveActorId();
  const mutation = useMutation({
    mutationFn: async (referenceMode: CinematicVideoReferenceMode): Promise<{ actorId: string | null; project: CinematicProject }> => ({ actorId,
      project: await updateCinematicShotVideoReferences(project.id, scene!.id, shot!.id, {
        expectedVersion: effectiveProject.version, expectedShotVersion: effectiveShot!.version, referenceMode
      })
    }),
    onSuccess: () => onRefresh?.()
  });
  const saved = mutation.data?.actorId === actorId && mutation.data.project.id === project.id ? mutation.data.project : null;
  const effectiveProject = saved && saved.version >= project.version ? saved : project;
  const effectiveShot = effectiveProject.scenes.find(item => item.id === scene?.id)?.shots.find(item => item.id === shot?.id) || shot;
  const mode = effectiveShot?.videoReferenceMode
    || (suggestLooksOnly && !effectiveShot?.approvedStoryboardSource ? 'looks_only' : 'storyboard_only');
  return { mode, lastFirstFrameMode: effectiveShot?.lastFirstFrameMode || 'storyboard_only',
    changeMode: mutation.mutate, pending: mutation.isPending, error: mutation.error,
    projectVersion: effectiveProject.version };
}
