import { useMutation, useQuery } from '@tanstack/react-query';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { getCinematicVideoCapabilityCatalog, updateCinematicShotVideoReferences, type CinematicVideoReferenceMode } from '../api/cinematicApi';
import { readProduceVideoEnginePreference } from './produceVideoPreferences';
import { resolveStoryboardShotCast } from '../components/storyboardGenerationAdapter';
import type { CinematicProject, CinematicScene, CinematicShot } from '../schemas/cinematicSchemas';

export function useShotVideoReferences(project: CinematicProject, scene: CinematicScene | undefined,
  shot: CinematicShot | undefined, onRefresh?: () => void, suggestLooksOnly = false, firstFrameEnabled?: boolean) {
  const preferredPolicy = usePreferredFirstFramePolicy();
  const framesEnabled = firstFrameEnabled ?? preferredPolicy;
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
  const noCast = Boolean(scene && effectiveShot && !resolveStoryboardShotCast(effectiveProject, scene, effectiveShot).length);
  const sketchAvailable = effectiveShot?.approvedStoryboardSource?.storyboardRenderStyle === 'concept_sketch_v1' && suggestLooksOnly;
  const mode = !framesEnabled && !sketchAvailable ? (noCast ? 'text_only' : 'looks_only') : effectiveShot?.videoReferenceMode
    || (suggestLooksOnly && !effectiveShot?.approvedStoryboardSource ? 'looks_only' : 'storyboard_only');
  return { mode, sketchAvailable, firstFrameEnabled: framesEnabled, lastFirstFrameMode: effectiveShot?.lastFirstFrameMode || 'storyboard_only',
    changeMode: (value: CinematicVideoReferenceMode) => mutation.mutate(value === 'looks_only' && noCast ? 'text_only' : value), pending: mutation.isPending, error: mutation.error,
    projectVersion: effectiveProject.version };
}

export function usePreferredFirstFramePolicy() {
  const catalog = useQuery({ queryKey: ['video-capabilities', 'cinematic'], queryFn: getCinematicVideoCapabilityCatalog });
  const preference = readProduceVideoEnginePreference(getActiveActorId());
  const models = catalog.data?.models.filter(model => model.commercialOperations.includes('cinematic_draft_clip')) || [];
  const model = models.find(item => item.providerId === preference?.providerId && item.modelId === preference?.modelId) || models[0];
  return model?.firstFrameEnabled !== false;
}
