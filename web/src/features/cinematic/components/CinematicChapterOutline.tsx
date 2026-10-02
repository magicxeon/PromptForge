import { ArrowDown, ArrowUp, Calculator, Check, Plus, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { CinematicWritingConsent } from './CinematicWritingConsent';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { estimateCinematicChapterPlanning, proposeCinematicChapterOutline, reviewCinematicChapterOutline } from '../api/cinematicApi';
import type { CinematicChapterOutlineRow, CinematicChapterPlanningEstimate, CinematicProject } from '../schemas/cinematicSchemas';

export function chapterOutlineIsStale(project: CinematicProject) {
  const plan = project.chapterOutline;
  if (!plan) return false;
  const setup = project.setup;
  return plan.sourceRevisionId !== project.confirmedFullStoryVersionId
    || project.activeFullStoryVersionId !== project.confirmedFullStoryVersionId
    || plan.settings.format !== setup.format || plan.settings.durationSeconds !== setup.durationSeconds
    || plan.settings.seasonEnabled !== setup.seasonEnabled
    || plan.settings.seasonCount !== (setup.seasonEnabled ? setup.seasonCount : 1);
}

export function chapterOutlineNeedsReview(project: CinematicProject) {
  const plan = project.chapterOutline;
  return Boolean(plan && (plan.status !== 'approved' || chapterOutlineIsStale(project)
    || plan.chapters.length !== project.setup.chapterCount
    || project.setup.chaptersPerSeason.some((count, index) => count !== plan.chapters.filter(row => row.seasonNumber === index + 1).length)));
}

type Props = {
  actorId: string; project: CinematicProject; disabled: boolean;
  onProjectChanged: (project: CinematicProject) => void;
  onPendingChange: (pending: boolean) => void;
  sectionRef?: Ref<HTMLElement>;
};

export function CinematicChapterOutline({ actorId, project, disabled, onProjectChanged, onPendingChange, sectionRef }: Props) {
  const { t } = useTranslation('cinematic');
  const plan = project.chapterOutline;
  const [rows, setRows] = useState<CinematicChapterOutlineRow[]>(plan?.chapters || []);
  const [busy, setBusy] = useState<'plan' | 'approve' | 'discard' | 'estimate' | null>(null);
  const [error, setError] = useState('');
  const [estimate, setEstimate] = useState<CinematicChapterPlanningEstimate | null>(null);
  const requestActive = useRef(false);
  const mounted = useRef(true);
  const currentOwner = useRef({ actorId, projectId: project.id });
  currentOwner.current = { actorId, projectId: project.id };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const savedRows = JSON.stringify(plan?.chapters || []);
  useEffect(() => { setRows(JSON.parse(savedRows)); setError(''); }, [savedRows, plan?.id, actorId, project.id]);
  useEffect(() => { setEstimate(null); }, [project.version, actorId, project.id]);
  const dirty = JSON.stringify(rows) !== savedRows;
  useEffect(() => { onPendingChange(dirty || Boolean(busy)); }, [dirty, busy, onPendingChange]);
  useEffect(() => () => onPendingChange(false), [onPendingChange]);
  const stale = chapterOutlineIsStale(project);
  const seasons = project.setup.seasonEnabled ? project.setup.seasonCount : 1;
  const maximum = project.setup.format === 'short-film' ? 1 : (plan?.limits?.maximumChapters || 24);
  const synopsisMaximum = plan?.limits?.synopsisMaximumCharacters || 800;
  const valid = rows.length > 0 && rows.length <= maximum && rows.every((row, index) => row.title.trim() && row.synopsis.trim()
    && row.synopsis.length <= synopsisMaximum && Number.isInteger(row.seasonNumber) && row.seasonNumber >= 1 && row.seasonNumber <= seasons
    && (index === 0 ? row.seasonNumber === 1 : row.seasonNumber >= rows[index - 1]!.seasonNumber))
    && Array.from({ length: seasons }, (_, index) => rows.some(row => row.seasonNumber === index + 1)).every(Boolean);
  const locked = disabled || Boolean(busy);
  const key = (name: string) => t(`cinematic.chapterOutline.${name}`);

  async function run(kind: NonNullable<typeof busy>) {
    if (disabled || requestActive.current || (dirty && ['plan', 'estimate', 'discard'].includes(kind))) return;
    requestActive.current = true; setBusy(kind); setError('');
    const owner = { actorId, projectId: project.id };
    const current = () => mounted.current && currentOwner.current.actorId === owner.actorId
      && currentOwner.current.projectId === owner.projectId && getActiveActorId() === owner.actorId;
    try {
      if (kind === 'estimate') {
        const result = await estimateCinematicChapterPlanning(project.id, project.version);
        if (current()) setEstimate(result);
      } else {
        const result = kind === 'plan' ? await proposeCinematicChapterOutline(project.id, project.version)
          : await reviewCinematicChapterOutline(project.id, { expectedVersion: project.version, outlineId: plan!.id,
            action: kind === 'discard' ? 'discard' : 'approve', ...(kind === 'approve' ? { chapters: rows } : {}) });
        if (current()) onProjectChanged(result);
      }
    } catch (cause) {
      if (current()) setError(cause instanceof Error ? cause.message : key('failed'));
    } finally {
      requestActive.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  function update(index: number, patch: Partial<CinematicChapterOutlineRow>) {
    setRows(current => current.map((row, position) => position === index ? { ...row, ...patch } : row));
  }
  function move(index: number, offset: number) {
    setRows(current => {
      const selected = current[index], adjacent = current[index + offset];
      if (!selected || !adjacent) return current;
      const next = [...current]; next[index] = adjacent; next[index + offset] = selected;
      return next;
    });
  }
  const iconButton = (name: string, icon: ReactNode, action: () => void, unavailable = false) =>
    <Button type="button" size="icon" icon={icon} aria-label={key(name)} title={key(name)} disabled={locked || unavailable} onClick={action} />;

  return <section ref={sectionRef} id="cinematic-chapter-outline" className="cinematic-chapter-outline" aria-labelledby="chapter-outline-title">
    <header><h2 id="chapter-outline-title" tabIndex={-1}>{key('title')}</h2>
      <span role="status">{key(stale ? 'stale' : dirty ? 'unsaved' : plan?.status || 'empty')}</span></header>
    <div className="cinematic-chapter-outline__actions">
      <CinematicWritingConsent key={JSON.stringify([actorId, project.id, project.version, locked, dirty])} title={key(plan ? 'regenerate' : 'generate')}
        scope={t('cinematic.bulk.outlineScope', { name: project.title })} pending={locked || dirty} onConfirm={() => void run('plan')}
        trigger={<Button icon={<Sparkles />} loading={busy === 'plan'} disabled={locked || dirty}>{key(plan ? 'regenerate' : 'generate')}</Button>} />
      <Button icon={<Calculator />} loading={busy === 'estimate'} disabled={locked || dirty} onClick={() => void run('estimate')}>{key('estimate')}</Button>
    </div>
    <p className="cinematic-chapter-outline__note">{key('free')}</p>
    {estimate?.projectVersion === project.version ? <div className="cinematic-chapter-outline__estimate" role="status">
      <dl>{(['chapter_outline', 'chapters'] as const).map(operation => {
        const value = estimate.estimates[operation];
        return <div key={operation}><dt>{key(operation)}</dt><dd className={value ? 'cinematic-chapter-outline__price' : undefined}>{value
          ? t('cinematic.chapterOutline.price', { credits: value.credits }) : key('unavailable')}</dd></div>;
      })}</dl>
      <p>{key('estimateNote')}</p>
      {Object.values(estimate.estimates).some(value => value?.exceedsValueTarget) ? <p>{key('valueReview')}</p> : null}
    </div> : null}
    {error ? <p role="alert">{error}</p> : null}
    {plan ? <>
      <p>{plan.rationale}</p>
      {plan.warnings.length ? <ul>{plan.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul> : null}
      <ol className="cinematic-chapter-outline__rows">{rows.map((row, index) => <li key={index}>
        <div className="cinematic-chapter-outline__row-heading"><strong>{t('cinematic.chapterOutline.number', { number: index + 1 })}</strong>
          <div className="cinematic-chapter-outline__tools">
            {iconButton('up', <ArrowUp />, () => move(index, -1), index === 0 || stale)}
            {iconButton('down', <ArrowDown />, () => move(index, 1), index === rows.length - 1 || stale)}
            {iconButton('remove', <Trash2 />, () => setRows(current => current.filter((_, position) => position !== index)), rows.length === 1 || stale)}
          </div></div>
        <label><span>{key('chapterTitle')}</span><input value={row.title} maxLength={120} disabled={locked || stale}
          onChange={event => update(index, { title: event.target.value })} /></label>
        <label><span>{key('synopsis')}</span><textarea rows={3} value={row.synopsis} maxLength={synopsisMaximum} disabled={locked || stale}
          onChange={event => update(index, { synopsis: event.target.value })} /></label>
        {seasons > 1 ? <label><span>{key('season')}</span><input type="number" min={1} max={seasons} step={1} value={row.seasonNumber} disabled={locked || stale}
          onChange={event => update(index, { seasonNumber: Number(event.target.value) })} /></label> : null}
      </li>)}</ol>
      <div className="cinematic-chapter-outline__actions">
        {iconButton('add', <Plus />, () => setRows(current => [...current, { title: '', synopsis: '', seasonNumber: current.at(-1)?.seasonNumber || 1 }]), rows.length >= maximum || stale)}
        {dirty ? iconButton('reset', <RotateCcw />, () => setRows(plan.chapters)) : null}
        <Button icon={<X />} loading={busy === 'discard'} disabled={locked || dirty} onClick={() => void run('discard')}>{key('discard')}</Button>
        <Button variant="primary" icon={<Check />} loading={busy === 'approve'} disabled={locked || stale || !valid || (!dirty && !chapterOutlineNeedsReview(project))}
          onClick={() => void run('approve')}>{key('approve')}</Button>
      </div>
      {!valid && dirty ? <p role="status">{key('invalid')}</p> : null}
    </> : null}
  </section>;
}
