import { ArrowDown, ArrowUp, Plus, Trash2, Video } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import type { CatalogDraft, CatalogLimits } from '../api/contentCatalogApi';

export function moveItem<T>(items: T[], from: number, direction: number): T[] {
  const to = from + direction;
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
  const result = [...items];
  [result[from], result[to]] = [result[to]!, result[from]!];
  return result;
}
const newLesson = () => ({ id: crypto.randomUUID(), title: '', description: '' });

export function ContentOutlineEditor({ draft, onChange, limits }: {
  draft: CatalogDraft; onChange: (draft: CatalogDraft) => void; limits: CatalogLimits;
}) {
  const { t } = useTranslation('tutorials');
  const [remove, setRemove] = useState<(() => void) | null>(null);
  const tutorial = draft.kind === 'tutorial';
  const maxUnits = tutorial ? limits.chapters : limits.episodes;
  const totalLessons = draft.chapters.reduce((count, chapter) => count + chapter.lessons.length, 0);
  const units = tutorial ? draft.chapters : draft.episodes;
  const removeUnit = (index: number) => setRemove(() => () => onChange(tutorial
    ? { ...draft, chapters: draft.chapters.filter((_, position) => position !== index) }
    : { ...draft, episodes: draft.episodes.filter((_, position) => position !== index) }));
  const reorder = (index: number, direction: number) => onChange(tutorial
    ? { ...draft, chapters: moveItem(draft.chapters, index, direction) }
    : { ...draft, episodes: moveItem(draft.episodes, index, direction) });

  return <section className="content-authoring__section" aria-labelledby="content-outline-title">
    <header className="content-authoring__section-heading">
      <h2 id="content-outline-title">{t(tutorial ? 'curriculum' : 'episodes')}</h2>
      {draft.format !== 'film' && <Button type="button" icon={<Plus size={16} />} disabled={units.length >= maxUnits} onClick={() => onChange(tutorial
        ? { ...draft, chapters: [...draft.chapters, { id: crypto.randomUUID(), title: '', description: '', lessons: [] }] }
        : { ...draft, episodes: [...draft.episodes, { ...newLesson(), season: draft.episodes.at(-1)?.season || 1 }] })}>{t(tutorial ? 'addChapter' : 'addEpisode')}</Button>}
    </header>
    {draft.format === 'film' ? <p className="content-authoring__muted"><Video size={18} />{t('mediaPending')}</p> : units.map((unit, index) => <article className="content-authoring__unit" key={unit.id}>
      <div className="content-authoring__unit-heading">
        <strong>{t(tutorial ? 'chapter' : 'episode', { number: index + 1 })}</strong>
        <div className="content-authoring__tools">
          <Button type="button" variant="ghost" size="icon" title={t('up')} aria-label={t('up')} disabled={index === 0} onClick={() => reorder(index, -1)} icon={<ArrowUp size={16} />} />
          <Button type="button" variant="ghost" size="icon" title={t('down')} aria-label={t('down')} disabled={index === units.length - 1} onClick={() => reorder(index, 1)} icon={<ArrowDown size={16} />} />
          <Button type="button" variant="ghost" size="icon" title={t('remove')} aria-label={t('remove')} onClick={() => removeUnit(index)} icon={<Trash2 size={16} />} />
        </div>
      </div>
      <div className="content-authoring__unit-fields">
        <label>{t(tutorial ? 'chapterTitle' : 'episodeTitle')}<input required maxLength={limits.titleLength} value={unit.title} onChange={event => onChange(tutorial
          ? { ...draft, chapters: draft.chapters.map((chapter, position) => position === index ? { ...chapter, title: event.target.value } : chapter) }
          : { ...draft, episodes: draft.episodes.map((episode, position) => position === index ? { ...episode, title: event.target.value } : episode) })} /></label>
        {!tutorial && <label>{t('season')}<input type="number" min={1} max={1000} step={1} value={draft.episodes[index]!.season} onChange={event => onChange({ ...draft,
          episodes: draft.episodes.map((episode, position) => position === index ? { ...episode, season: event.target.valueAsNumber || 0 } : episode) })} /></label>}
      </div>
      {tutorial ? <div className="content-authoring__lessons">
        {draft.chapters[index]!.lessons.map((lesson, lessonIndex) => <div className="content-authoring__lesson" key={lesson.id}>
          <label>{t('lesson', { number: lessonIndex + 1 })}<input required maxLength={limits.titleLength} value={lesson.title} onChange={event => onChange({ ...draft,
            chapters: draft.chapters.map((chapter, position) => position === index ? { ...chapter, lessons: chapter.lessons.map((item, li) => li === lessonIndex ? { ...item, title: event.target.value } : item) } : chapter) })} /></label>
          <div className="content-authoring__tools">
            {[-1, 1].map(direction => <Button key={direction} type="button" variant="ghost" size="icon" title={t(direction < 0 ? 'up' : 'down')} aria-label={t(direction < 0 ? 'up' : 'down')}
              disabled={direction < 0 ? lessonIndex === 0 : lessonIndex === draft.chapters[index]!.lessons.length - 1}
              onClick={() => onChange({ ...draft, chapters: draft.chapters.map((chapter, position) => position === index ? { ...chapter, lessons: moveItem(chapter.lessons, lessonIndex, direction) } : chapter) })}
              icon={direction < 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />} />)}
            <Button type="button" variant="ghost" size="icon" title={t('remove')} aria-label={t('remove')} icon={<Trash2 size={16} />} onClick={() => setRemove(() => () => onChange({ ...draft,
              chapters: draft.chapters.map((chapter, position) => position === index ? { ...chapter, lessons: chapter.lessons.filter((_, li) => li !== lessonIndex) } : chapter) }))} />
          </div>
          <small className="content-authoring__muted">{t('mediaPending')}</small>
        </div>)}
        <Button type="button" variant="ghost" icon={<Plus size={16} />} disabled={draft.chapters[index]!.lessons.length >= limits.lessonsPerChapter || totalLessons >= limits.totalLessons} onClick={() => onChange({ ...draft,
          chapters: draft.chapters.map((chapter, position) => position === index ? { ...chapter, lessons: [...chapter.lessons, newLesson()] } : chapter) })}>{t('addLesson')}</Button>
      </div> : <small className="content-authoring__muted">{t('mediaPending')}</small>}
    </article>)}
    <ConfirmDialog trigger={<span hidden />} open={Boolean(remove)} onOpenChange={open => { if (!open) setRemove(null); }} title={t('removeTitle')} description={t('removeDescription')} confirmLabel={t('remove')} destructive onConfirm={() => { remove?.(); setRemove(null); }} />
  </section>;
}
