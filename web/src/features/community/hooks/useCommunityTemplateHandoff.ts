import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { routePaths } from '../../../app/routeRegistry/routes';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { writeHandoff } from '../../../lib/persistence/handoffStorage';
import { requestCommunityTemplateHandoff } from '../api/communityApi';

export function useCommunityTemplateHandoff() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (postId: string) => requestCommunityTemplateHandoff(postId),
    onSuccess: payload => {
      writeHandoff({
        actorId: getActiveActorId(),
        kind: 'scene-template',
        payload: {
          postId: payload.postId,
          sceneTemplateSnapshot: payload.sceneTemplateSnapshot,
          templateUseContext: payload.id && payload.currentVersionId && payload.useSession
            ? {
              templateId: payload.id,
              templateVersionId: payload.currentVersionId,
              templateUseSessionId: payload.useSession.id,
              sourceCommunityPostId: payload.useSession.sourceCommunityPostId || payload.postId,
              expiresAt: payload.useSession.expiresAt,
              pricing: payload.pricing || { accessCredits: 0, currency: 'credits' },
              publicInputSchema: payload.publicInputSchema || { schemaVersion: 1, inputs: [] }
            }
            : null
        }
      });
      navigate(routePaths.createStudioScene);
    }
  });
}
