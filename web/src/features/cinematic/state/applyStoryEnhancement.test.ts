import { describe, expect, it } from 'vitest';
import { createCinematicSetupDraft } from './cinematicDraftStorage';
import { applyStoryEnhancement } from './applyStoryEnhancement';
import type { CinematicStoryEnhancement } from '../schemas/cinematicSchemas';

const result: CinematicStoryEnhancement = {
  enhancementId: 'preview', enhancedStoryBrief: 'New story', creativeDirection: '',
  premise: '', conflict: '', emotionalArc: '', ending: '', candidateScenes: [], warnings: [],
  recommendedRoles: [{ id: 'new', label: 'Lead', importance: 'required', storyFunction: 'Decides', relationshipHint: '' }],
  provenance: { provider: 'test', model: 'test', responseId: null }, billingStatus: 'qualification_no_charge'
};
describe('Purpose-specific story application', () => {
  it('applies story and direction only, preserving manual roles and intent', () => {
    const draft = { ...createCinematicSetupDraft(), storyBrief: 'Original', creativeDirection: 'Old direction',
      storyCountryStyle: 'japan', castPlanningMode: 'manual' as const,
      storyRoleSlots: [{ ...result.recommendedRoles[0]!, id: 'old' }] };
    const applied = applyStoryEnhancement(draft, result, 'story');
    expect(applied.storyBrief).toBe('New story');
    expect(applied.creativeDirection).toBe('');
    expect(applied.storyRoleSlots).toEqual(draft.storyRoleSlots);
    expect(applied.castPlanningMode).toBe('manual');
    expect(applied.storyCountryStyle).toBe('japan');
  });
  it('applies roles only even if a legacy response contains rewritten story fields', () => {
    const draft = { ...createCinematicSetupDraft(), storyBrief: 'Original', creativeDirection: 'Original direction' };
    const applied = applyStoryEnhancement(draft, result, 'roles');
    expect(applied.storyRoleSlots).toEqual(result.recommendedRoles);
    expect(applied.storyBrief).toBe(draft.storyBrief);
    expect(applied.creativeDirection).toBe(draft.creativeDirection);
    expect(applied.castPlanningMode).toBe('ai-recommended');
  });
});
