import { z } from 'zod';
import { apiRequest } from '../../../lib/api/apiClient';

export type CatalogKind = 'tutorial' | 'cinema';
export const lessonSchema = z.object({ id: z.string(), title: z.string(), description: z.string().default('') });
export const chapterSchema = z.object({ id: z.string(), title: z.string(), description: z.string().default(''), lessons: z.array(lessonSchema) });
export const episodeSchema = lessonSchema.extend({ season: z.number().int().positive().default(1) });
export const accessSchema = z.object({
  mode: z.enum(['free', 'preview_then_paid', 'paid']), freeCount: z.number().int().nonnegative(),
  priceCredits: z.number().int().nonnegative()
});
export const contentSchema = z.object({
  id: z.string(), type: z.enum(['tutorial', 'film', 'series']),
  title: z.string(), description: z.string(), language: z.string().default('th'),
  status: z.enum(['draft', 'published', 'archived']), revision: z.number().int(),
  accessMode: accessSchema.shape.mode, freeCount: z.number().int(), priceCredits: z.number().int().default(0),
  chapters: z.array(chapterSchema).default([]), episodes: z.array(episodeSchema).default([]),
  createdAt: z.string(), updatedAt: z.string()
}).transform(item => ({ ...item, kind: (item.type === 'tutorial' ? 'tutorial' : 'cinema') as CatalogKind,
  format: (item.type === 'tutorial' ? 'course' : item.type) as 'course' | 'film' | 'series',
  access: { mode: item.accessMode, freeCount: item.freeCount, priceCredits: item.priceCredits }
}));
export const configSchema = z.object({
  enabled: z.boolean(), adminOnly: z.literal(true), billingEnabled: z.literal(false),
  defaultFreeCount: z.number().int().positive(),
  limits: z.object({ titleLength: z.number(), descriptionLength: z.number(), chapters: z.number(), episodes: z.number(), lessonsPerChapter: z.number(), totalLessons: z.number() })
});
export const listSchema = z.object({ items: z.array(contentSchema), total: z.number(), offset: z.number(), limit: z.number() });
export type CatalogContent = z.infer<typeof contentSchema>;
export type CatalogLimits = z.infer<typeof configSchema>['limits'];
export type CatalogDraft = Pick<CatalogContent, 'kind' | 'format' | 'title' | 'description' | 'language' | 'access' | 'chapters' | 'episodes'>;
export const catalogPaths = (kind: CatalogKind) => {
  const root = kind === 'tutorial' ? '/tutorials' : '/ai-cinema';
  const manage = `${root}/${kind === 'tutorial' ? 'teach' : 'manage'}`;
  return { root, manage, create: `${manage}/new`, edit: (id: string) => `${manage}/${encodeURIComponent(id)}/edit` };
};
export function getCatalogConfig(signal?: AbortSignal) {
  return apiRequest('/api/learning/config', { schema: configSchema, signal });
}
export function listCatalog(kind: CatalogKind, options: { page?: number; search?: string; includeDrafts?: boolean } = {}, signal?: AbortSignal) {
  const params = new URLSearchParams({ kind, offset: String(((options.page || 1) - 1) * 12), limit: '12', includeDrafts: String(Boolean(options.includeDrafts)) });
  if (options.search) params.set('search', options.search);
  return apiRequest(`/api/learning/catalog?${params}`, { schema: listSchema, signal });
}
export function getContent(id: string, kind: CatalogKind, signal?: AbortSignal) {
  return apiRequest(`/api/learning/catalog/${encodeURIComponent(id)}`, { schema: z.object({ item: contentSchema.refine(item => item.kind === kind) }), signal });
}
export function saveContent(draft: CatalogDraft, existing?: { id: string; revision: number }) {
  return apiRequest(existing ? `/api/learning/catalog/${encodeURIComponent(existing.id)}` : '/api/learning/catalog', {
    method: existing ? 'PATCH' : 'POST', body: {
      ...(existing ? { revision: existing.revision } : { type: draft.kind === 'tutorial' ? 'tutorial' : draft.format }),
      title: draft.title, description: draft.description, language: draft.language,
      accessMode: draft.access.mode, freeCount: draft.access.freeCount, priceCredits: draft.access.priceCredits,
      ...(draft.kind === 'tutorial' ? { chapters: draft.chapters } : { episodes: draft.episodes })
    },
    schema: z.object({ item: contentSchema })
  });
}
export function draftFromContent(item: CatalogContent): CatalogDraft {
  const { kind, format, title, description, language, access, chapters, episodes } = item;
  return structuredClone({ kind, format, title, description, language, access, chapters, episodes });
}
export function validateDraft(draft: CatalogDraft): string | null {
  if (!draft.title.trim() || draft.chapters.some(chapter => !chapter.title.trim() || chapter.lessons.some(lesson => !lesson.title.trim()))
    || draft.episodes.some(episode => !episode.title.trim())) return 'required';
  const count = draft.kind === 'tutorial' ? draft.chapters.length : draft.episodes.length;
  if (draft.access.mode === 'preview_then_paid' && (draft.format === 'film'
    || !Number.isInteger(draft.access.freeCount) || draft.access.freeCount < 1 || draft.access.freeCount >= count)) return 'invalidFreeCount';
  if (draft.access.mode !== 'free' && (!Number.isSafeInteger(draft.access.priceCredits) || draft.access.priceCredits <= 0)) return 'invalidPrice';
  if (draft.episodes.some((episode, index) => !Number.isInteger(episode.season) || episode.season < 1
    || (index > 0 && episode.season < draft.episodes[index - 1]!.season))) return 'invalidSeason';
  return null;
}
