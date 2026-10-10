import { describe, expect, it } from 'vitest';
import { catalogPaths, contentSchema, validateDraft, type CatalogDraft } from './contentCatalogApi';
import { moveItem } from '../components/ContentOutlineEditor';

function draft(count: number): CatalogDraft {
  return { kind: 'tutorial', format: 'course', title: 'Course', description: '', language: 'en',
    access: { mode: 'preview_then_paid', freeCount: 1, priceCredits: 10 },
    chapters: Array.from({ length: count }, (_, index) => ({ id: `chapter-${index}`, title: `Chapter ${index}`, description: '', lessons: [] })), episodes: [] };
}
describe('content catalog authoring contract', () => {
  it.each([1, 3, 5])('accepts a per-title preview count of %s', count => {
    const value = draft(count + 1); value.access.freeCount = count;
    expect(validateDraft(value)).toBeNull();
  });
  it.each([0, -1, 1.5, 4])('rejects invalid free count %s without clamping', count => {
    const value = draft(4); value.access.freeCount = count;
    expect(validateDraft(value)).toBe('invalidFreeCount');
    expect(value.access.freeCount).toBe(count);
  });
  it('rejects preview access for single films and unpaid draft offers', () => {
    const value = draft(4); value.kind = 'cinema'; value.format = 'film';
    expect(validateDraft(value)).toBe('invalidFreeCount');
    value.access.mode = 'paid'; value.access.priceCredits = 0;
    expect(validateDraft(value)).toBe('invalidPrice');
  });
  it('preserves stable IDs on reorder and guards bounds', () => {
    const items = draft(3).chapters;
    expect(moveItem(items, 0, 1).map(item => item.id)).toEqual(['chapter-1', 'chapter-0', 'chapter-2']);
    expect(moveItem(items, 0, -1)).toBe(items);
    expect(items[0]!.id).toBe('chapter-0');
  });
  it('parses authoritative wire data into catalog-specific view state', () => {
    const value = contentSchema.parse({ id: 'film-1', type: 'film', title: 'Film', description: '', status: 'draft', revision: 2,
      accessMode: 'free', freeCount: 0, episodes: [], createdAt: '2026-10-08', updatedAt: '2026-10-08' });
    expect(value.kind).toBe('cinema'); expect(value.format).toBe('film'); expect(value.chapters).toEqual([]);
    expect(catalogPaths('cinema').edit('a/b')).toBe('/ai-cinema/manage/a%2Fb/edit');
  });
});
