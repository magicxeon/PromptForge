import * as Dialog from '@radix-ui/react-dialog';
import { Clapperboard, Layers3, Plus, Save, Settings2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { ThemeSelect } from '../../../components/ui/ThemeSelect';
import type { CinematicSeriesWorkspace, SeriesCommand } from '../schemas/cinematicSeriesSchemas';

type Props = { workspace: CinematicSeriesWorkspace; sourceTitle: string; seasonId: string;
  busy: boolean; error: string; onClose: () => void; onSubmit: (command: SeriesCommand) => void };

export function SeriesManagerDialog({ workspace, sourceTitle, seasonId, busy, error, onClose, onSubmit }: Props) {
  const { t } = useTranslation('cinematic');
  const [tab, setTab] = useState<'chapter' | 'season' | 'settings'>('chapter');
  const [title, setTitle] = useState(''), [brief, setBrief] = useState(''), [copyCast, setCopyCast] = useState(true);
  const [targetSeason, setTargetSeason] = useState(seasonId || workspace.series?.seasons[0]?.id || '');
  const [newSeasonName, setNewSeasonName] = useState('');
  const [seriesName, setSeriesName] = useState(workspace.series?.title || sourceTitle);
  const [seasonName, setSeasonName] = useState(workspace.series?.seasons.find(item => item.id === targetSeason)?.title || '');
  const series = workspace.series;
  const seasonOptions = series?.seasons.map(item => ({ value: item.id, label: `${t('cinematic.series.seasonNumber', { number: item.number })}${item.title ? `: ${item.title}` : ''}` })) || [];
  function selectSeason(id: string) { setTargetSeason(id); setSeasonName(series?.seasons.find(item => item.id === id)?.title || ''); }
  const pendingIcon = <ProcessingSpinner className="size-4" />;
  return <Dialog.Root open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="cinematic-dialog__overlay" />
      <Dialog.Content className="cinematic-dialog__content cinematic-series-dialog" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
        <header className="cinematic-dialog__header"><div><Dialog.Title>{t(series ? 'cinematic.series.manage' : 'cinematic.series.create')}</Dialog.Title><Dialog.Description>{series?.title || sourceTitle}</Dialog.Description></div>
          <Button size="icon" variant="ghost" icon={<X />} disabled={busy} aria-label={t('cinematic.actions.close')} onClick={onClose} /></header>
        {!series ? <form className="cinematic-series-form" onSubmit={event => { event.preventDefault(); if (!busy && seriesName.trim()) onSubmit({ kind: 'create', title: seriesName }); }}>
          <label><span>{t('cinematic.series.title')}</span><input autoFocus required maxLength={120} value={seriesName} disabled={busy} onChange={event => setSeriesName(event.target.value)} /></label>
          <p className="cinematic-series-position">{t('cinematic.series.initialPosition')}</p>
          <Button type="submit" variant="primary" icon={busy ? pendingIcon : <Layers3 />} disabled={busy || !seriesName.trim()}>{t('cinematic.series.create')}</Button>
        </form> : <>
          <div className="cinematic-series-tabs" role="group" aria-label={t('cinematic.series.manage')}>
            {(['chapter', 'season', 'settings'] as const).map(value => <Button key={value} size="sm" variant={tab === value ? 'primary' : 'secondary'} aria-pressed={tab === value} disabled={busy} icon={value === 'chapter' ? <Clapperboard /> : value === 'season' ? <Layers3 /> : <Settings2 />} onClick={() => setTab(value)}>{t(`cinematic.series.tab.${value}`)}</Button>)}
          </div>
          {tab === 'chapter' ? <form className="cinematic-series-form" onSubmit={event => { event.preventDefault(); if (!busy && title.trim() && brief.trim()) onSubmit({ kind: 'chapter', seasonId: targetSeason, title, storyBrief: brief, copyCast }); }}>
            <label><span>{t('cinematic.series.season')}</span><ThemeSelect value={targetSeason} options={seasonOptions} ariaLabel={t('cinematic.series.season')} disabled={busy} onValueChange={selectSeason} /></label>
            <label><span>{t('cinematic.series.chapterTitle')}</span><input required maxLength={120} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} /></label>
            <label><span>{t('cinematic.setup.storyBrief')}</span><textarea required rows={5} value={brief} disabled={busy} onChange={event => setBrief(event.target.value)} /></label>
            <label className="cinematic-series-check"><input type="checkbox" checked={copyCast} disabled={busy} onChange={event => setCopyCast(event.target.checked)} /><span>{t('cinematic.series.copyCast', { title: sourceTitle })}</span></label>
            <Button type="submit" variant="primary" icon={busy ? pendingIcon : <Plus />} disabled={busy || !title.trim() || !brief.trim() || !targetSeason || workspace.chapters.length >= 120}>{t('cinematic.series.addChapter')}</Button>
          </form> : tab === 'season' ? <form className="cinematic-series-form" onSubmit={event => { event.preventDefault(); if (!busy) onSubmit({ kind: 'season', title: newSeasonName }); }}>
            <label><span>{t('cinematic.series.seasonTitleOptional')}</span><input maxLength={120} value={newSeasonName} disabled={busy} onChange={event => setNewSeasonName(event.target.value)} /></label>
            <Button type="submit" variant="primary" icon={busy ? pendingIcon : <Plus />} disabled={busy || series.seasons.length >= 24}>{t('cinematic.series.addSeason')}</Button>
          </form> : <div className="cinematic-series-form">
            <form className="cinematic-series-form" onSubmit={event => { event.preventDefault(); if (!busy && seriesName.trim()) onSubmit({ kind: 'rename', title: seriesName }); }}>
              <label><span>{t('cinematic.series.title')}</span><input required maxLength={120} value={seriesName} disabled={busy} onChange={event => setSeriesName(event.target.value)} /></label>
              <Button type="submit" icon={busy ? pendingIcon : <Save />} disabled={busy || !seriesName.trim()}>{t('cinematic.series.renameSeries')}</Button>
            </form>
            <form className="cinematic-series-form" onSubmit={event => { event.preventDefault(); if (!busy && seasonName.trim()) onSubmit({ kind: 'rename', title: seasonName, seasonId: targetSeason }); }}>
              <label><span>{t('cinematic.series.season')}</span><ThemeSelect value={targetSeason} options={seasonOptions} ariaLabel={t('cinematic.series.season')} disabled={busy} onValueChange={selectSeason} /></label>
              <label><span>{t('cinematic.series.seasonTitle')}</span><input required maxLength={120} value={seasonName} disabled={busy} onChange={event => setSeasonName(event.target.value)} /></label>
              <Button type="submit" icon={busy ? pendingIcon : <Save />} disabled={busy || !seasonName.trim()}>{t('cinematic.series.renameSeason')}</Button>
            </form>
          </div>}
        </>}
        {busy ? <p role="status">{t('cinematic.series.saving')}</p> : null}
        {error ? <p role="alert" className="cinematic-series-error">{error}</p> : null}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
