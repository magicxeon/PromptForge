import { apiRequest } from '../../../lib/api/apiClient';
import {
  sceneTemplateSnapshotSchema,
  sharedTemplateListSchema,
  useTemplateResponseSchema,
  type SceneTemplateSnapshot,
  type TemplateUseContext
} from '../schemas/sceneTemplateSchemas';

export function listSharedSceneTemplates() {
  return apiRequest('/api/scene-templates/shared', { schema: sharedTemplateListSchema });
}

export type SceneTemplateUsePayload = {
  snapshot: SceneTemplateSnapshot;
  context: TemplateUseContext | null;
};

export async function requestSharedSceneTemplate(postId: string): Promise<SceneTemplateUsePayload> {
  const response = await apiRequest(`/api/scene-templates/shared/${encodeURIComponent(postId)}/use-template`, {
    method: 'POST',
    schema: useTemplateResponseSchema
  });
  const wrapper = response as {
    snapshot?: SceneTemplateSnapshot;
    sceneTemplateSnapshot?: SceneTemplateSnapshot;
    template?: SceneTemplateSnapshot;
    id?: string;
    currentVersionId?: string;
    useSession?: { id?: string; expiresAt?: string; sourceCommunityPostId?: string | null };
    pricing?: { accessCredits?: number; currency?: string };
    publicInputSchema?: { schemaVersion?: number; inputs?: unknown[] };
    postId?: string;
  };
  const snapshot = wrapper.snapshot || wrapper.sceneTemplateSnapshot || wrapper.template;
  if (!snapshot) {
    const direct = sceneTemplateSnapshotSchema.safeParse(response);
    if (direct.success) return { snapshot: direct.data, context: null };
    throw new Error('The template did not include a usable Scene snapshot.');
  }
  const context = wrapper.id && wrapper.currentVersionId && wrapper.useSession?.id && wrapper.useSession.expiresAt
    ? {
      templateId: wrapper.id,
      templateVersionId: wrapper.currentVersionId,
      templateUseSessionId: wrapper.useSession.id,
      sourceCommunityPostId: wrapper.useSession.sourceCommunityPostId || wrapper.postId || null,
      expiresAt: wrapper.useSession.expiresAt,
      pricing: {
        accessCredits: Number(wrapper.pricing?.accessCredits) || 0,
        currency: wrapper.pricing?.currency || 'credits'
      },
      publicInputSchema: {
        schemaVersion: Number(wrapper.publicInputSchema?.schemaVersion) || 1,
        inputs: (wrapper.publicInputSchema?.inputs || []) as TemplateUseContext['publicInputSchema']['inputs']
      }
    }
    : null;
  return { snapshot, context };
}
