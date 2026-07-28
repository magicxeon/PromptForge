import { apiRequest } from '../../../lib/api/apiClient';
import {
  sceneTemplateSnapshotSchema,
  sharedTemplateListSchema,
  useTemplateResponseSchema,
  type SceneTemplateSnapshot
} from '../schemas/sceneTemplateSchemas';

export function listSharedSceneTemplates() {
  return apiRequest('/api/scene-templates/shared', { schema: sharedTemplateListSchema });
}

export async function requestSharedSceneTemplate(postId: string): Promise<SceneTemplateSnapshot> {
  const response = await apiRequest(`/api/scene-templates/shared/${encodeURIComponent(postId)}/use-template`, {
    method: 'POST',
    schema: useTemplateResponseSchema
  });
  const direct = sceneTemplateSnapshotSchema.safeParse(response);
  if (direct.success) return direct.data;
  const wrapper = response as {
    snapshot?: SceneTemplateSnapshot;
    sceneTemplateSnapshot?: SceneTemplateSnapshot;
    template?: SceneTemplateSnapshot;
  };
  const snapshot = wrapper.snapshot || wrapper.sceneTemplateSnapshot || wrapper.template;
  if (!snapshot) throw new Error('The template did not include a usable Scene snapshot.');
  return snapshot;
}
