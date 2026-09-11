import type { CinematicSetupDraft, CinematicStoryEnhancement } from '../schemas/cinematicSchemas';

export function applyStoryEnhancement(draft: CinematicSetupDraft, result: CinematicStoryEnhancement, purpose: 'story' | 'roles'): CinematicSetupDraft {
  return {
    ...draft,
    ...(purpose === 'roles' ? { storyRoleSlots: result.recommendedRoles, castPlanningMode: 'ai-recommended' as const }
      : { storyBrief: result.enhancedStoryBrief, creativeDirection: result.creativeDirection }),
    updatedAt: new Date().toISOString()
  };
}
