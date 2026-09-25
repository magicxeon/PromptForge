import { describe, expect, it } from 'vitest';
import { cinematicCastAssignmentSchema, cinematicProjectListResponseSchema } from './cinematicSchemas';
import { cinematicSeriesWorkspaceSchema } from './cinematicSeriesSchemas';

describe('Cinematic Rewamp contracts', () => {
  it('keeps root, Chapter and production-unit identities distinct at the API boundary', () => {
    const parsed = cinematicSeriesWorkspaceSchema.parse({
      productionProject: {
        id: 'project-root-1', productionProjectId: 'project-root-1', version: 3,
        title: 'Rain Stories', format: 'mini-series', seasonsEnabled: true, chapterCount: 1,
        chapterWorkStarted: true
      },
      series: null,
      chapters: [{
        projectId: 'production-unit-1', ownerUserId: 'owner', title: 'Chapter one', activeStage: 'setup',
        durationSeconds: 60, status: 'draft', updatedAt: '2026-09-19T00:00:00.000Z',
        productionProjectId: 'project-root-1', chapterId: 'chapter-1', productionUnitId: 'production-unit-1',
        seasonId: null, order: 1, storyBrief: 'A letter arrives.'
      }]
    });
    expect(parsed.chapters[0]).toMatchObject({
      productionProjectId: 'project-root-1', chapterId: 'chapter-1', productionUnitId: 'production-unit-1'
    });
  });

  it('accepts a text dossier without treating it as production-ready identity authority', () => {
    const parsed = cinematicCastAssignmentSchema.parse({
      id: 'cinedossier_lead', sourceType: 'dossier', generatedSheet: null,
      characterProfileId: null, characterProfileVersionId: null, portraitUrl: null,
      displayName: 'Lead', storyRole: 'Lead', storyRoleSlotId: 'role_lead', storyImportance: 'protagonist',
      objective: 'Find the truth', motivation: '', pressure: '', personalityTraits: ['careful'],
      emotionalBaseline: '', dialogueStyle: '', performanceDirection: '', identityReady: false,
      identityReadinessSnapshot: null, apparentAgeRange: null, looks: [], active: true,
      updatedAt: '2026-09-19T00:00:00.000Z'
    });
    expect(parsed.sourceType).toBe('dossier');
    expect(parsed.identityReady).toBe(false);
    expect(parsed.looks).toEqual([]);
  });

  it('parses a bounded Project Library summary without embedded Shot or Take history', () => {
    const parsed = cinematicProjectListResponseSchema.parse({
      items: [{
        projectId: 'chapter_1', productionProjectId: 'root_1', chapterId: 'chapter_1',
        productionUnitId: 'chapter_1', ownerUserId: 'owner', title: 'Rain Stories',
        chapterTitle: 'The first rain', chapterCount: 1, thumbnailUrl: null,
        activeStage: 'storyboard', durationSeconds: 60, status: 'producing',
        updatedAt: '2026-09-19T00:00:00.000Z',
        progress: { approvedClipCount: 1, totalClipCount: 3 },
        resumeContext: {
          productionProjectId: 'root_1', chapterId: 'chapter_1',
          productionUnitId: 'chapter_1', stage: 'storyboard'
        }
      }],
      nextCursor: null, hasMore: false, totalApprox: 1
    });
    expect(parsed.items[0]!.progress).toEqual({ approvedClipCount: 1, totalClipCount: 3 });
    expect(parsed.items[0]!).not.toHaveProperty('generationAttempts');
  });
});
