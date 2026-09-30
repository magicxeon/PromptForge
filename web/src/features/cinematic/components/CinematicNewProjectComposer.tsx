import {
  ArrowLeft,
  Check,
  ChevronDown,
  CloudOff,
  FilePlus2,
  FileText,
  Film,
  Layers3,
  Pencil,
  RectangleHorizontal,
  RectangleVertical,
  Save,
  Settings2,
  Sparkles,
  Square
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routePaths } from '../../../app/routeRegistry/routes';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { ThemeSelect } from '../../../components/ui/ThemeSelect';
import type {
  CinematicSetupDraft,
  CinematicStoryAuthoring
} from '../schemas/cinematicSchemas';
import { cinematicChapterDurationValues } from '../schemas/cinematicSchemas';
import type { CinematicSaveState } from './CinematicWorkspaceHeader';
import { StoryIntentChoices } from './StoryIntentChoices';
import { CinematicStoryFileImport, type StoryFile, type StoryImportPolicy } from './CinematicStoryFileImport';

type CreationPolicy = {
  formats: Array<CinematicSetupDraft['format']>;
  defaultFormat: CinematicSetupDraft['format'];
  aspectRatios: Array<CinematicSetupDraft['aspectRatio']>;
  defaultAspectRatio: CinematicSetupDraft['aspectRatio'];
  chapterDurationsSeconds: Array<CinematicSetupDraft['durationSeconds']>;
  defaultSeasonEnabled?: boolean;
  defaultSeasonCount?: number;
  defaultChapterCount?: number;
  maximumSeasonCount?: number;
  maximumChapterCount?: number;
};

type Props = {
  variant?: 'create' | 'edit';
  draft: CinematicSetupDraft;
  storyAuthoring?: CinematicStoryAuthoring;
  creationPolicy?: CreationPolicy;
  saveState: CinematicSaveState;
  saveError?: Error | null;
  pending: boolean;
  online: boolean;
  onUpdate: <K extends keyof CinematicSetupDraft>(key: K, value: CinematicSetupDraft[K]) => void;
  onCreateDraft: () => void;
  onPrepareStory: () => void;
  onSave?: () => void;
  onContinueFullStory?: () => void;
  importPolicy?: StoryImportPolicy;
  maximumStoryCharacters?: number;
  maximumVideoDirectionCharacters?: number;
  onImportFullStory?: (file: StoryFile) => Promise<void>;
  importedFullStory?: { importFileName?: string; importEdited?: boolean };
};

const FALLBACK_FORMATS: CreationPolicy['formats'] = ['short-film', 'mini-series'];
const FALLBACK_ASPECT_RATIOS: CreationPolicy['aspectRatios'] = ['9:16', '16:9', '1:1'];
const FALLBACK_CHAPTER_DURATIONS: CreationPolicy['chapterDurationsSeconds'] = [...cinematicChapterDurationValues];

export function CinematicNewProjectComposer({
  variant = 'create',
  draft,
  storyAuthoring,
  creationPolicy,
  saveState,
  saveError,
  pending,
  online,
  onUpdate,
  onCreateDraft,
  onPrepareStory,
  onSave,
  onContinueFullStory,
  importPolicy,
  maximumStoryCharacters = 50000,
  maximumVideoDirectionCharacters = 2000,
  onImportFullStory,
  importedFullStory
}: Props) {
  const { t } = useTranslation('cinematic');
  const formats = creationPolicy?.formats || FALLBACK_FORMATS;
  const aspectRatios = creationPolicy?.aspectRatios || FALLBACK_ASPECT_RATIOS;
  const chapterDurations = creationPolicy?.chapterDurationsSeconds || FALLBACK_CHAPTER_DURATIONS;
  const genreRule = storyAuthoring?.choices.genres || {
    ids: [draft.genre],
    default: draft.genre,
    maxSelections: 3
  };
  const storyLimit = storyAuthoring?.limits.storyBrief || 600;
  const [essentialsOpen, setEssentialsOpen] = useState(true);
  const [briefOpen, setBriefOpen] = useState(false);
  const fullStorySource = importedFullStory?.importFileName;
  const source = fullStorySource
    ? { fileName: fullStorySource, edited: importedFullStory.importEdited, destination: 'full-story' as const }
    : draft.storyBriefImport ? { ...draft.storyBriefImport, destination: 'draft' as const } : null;
  const selectedGenres = draft.genres || [draft.genre];
  const editing = variant === 'edit';
  const durationLabel = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (!minutes) return `${seconds} ${t('cinematic.units.seconds')}`;
    if (!remainingSeconds) return t('cinematic.newProject.durationMinutes', { minutes });
    return t('cinematic.newProject.durationMinutesSeconds', { minutes, seconds: remainingSeconds });
  };

  return (
    <main className="cinematic-new-project" data-testid="cinematic-new-project">
      <header className="cinematic-new-project__header">
        <Link className="cinematic-new-project__back" to={routePaths.createCinematic}>
          <ArrowLeft aria-hidden="true" />
          {t('cinematic.newProject.back')}
        </Link>
        <SaveState state={saveState} online={online} />
      </header>

      <form className="cinematic-new-project__document" onSubmit={event => event.preventDefault()}>
        <div className="cinematic-new-project__intro">
          <span>{t('cinematic.newProject.eyebrow')}</span>
          <h1>{t(editing ? 'cinematic.newProject.existingTitle' : 'cinematic.newProject.title')}</h1>
          <p>{t(editing ? 'cinematic.newProject.existingDescription' : 'cinematic.newProject.description')}</p>
        </div>

        <fieldset disabled={pending}>
          <label className="cinematic-new-project__title-field">
            <span>{t('cinematic.newProject.projectTitle')}</span>
            <input
              autoFocus
              maxLength={120}
              value={draft.projectName}
              onChange={event => onUpdate('projectName', event.target.value)}
              placeholder={t('cinematic.newProject.untitled')}
            />
          </label>

          {source ? <section className="cinematic-story-import__source" aria-label={t('cinematic.storyImport.source')}>
            <FileText aria-hidden="true" />
            <div className="cinematic-story-import__source-info">
              <small>{t(source.edited ? 'cinematic.storyImport.sourceEdited' : 'cinematic.storyImport.source')}</small>
              <strong>{source.fileName}</strong>
              <span>{t(`cinematic.storyImport.${source.destination}`)}</span>
            </div>
            <div className="cinematic-story-import__source-actions">
              {fullStorySource ? <Button type="button" icon={<Pencil />} disabled={pending || !online || !onContinueFullStory}
                onClick={onContinueFullStory}>{t('cinematic.storyImport.editFullStory')}</Button> : null}
              <Button type="button" icon={briefOpen ? <ChevronDown /> : <Pencil />} disabled={pending}
                aria-expanded={briefOpen} aria-controls="cinematic-imported-brief"
                onClick={() => setBriefOpen(open => !open)}>
                {t(briefOpen ? 'cinematic.storyImport.hideBrief' : 'cinematic.storyImport.editBrief')}
              </Button>
            </div>
          </section> : null}

          {onImportFullStory ? <CinematicStoryFileImport policy={importPolicy} briefLimit={storyLimit} replacing={Boolean(source)}
            maximumCharacters={maximumStoryCharacters} disabled={pending || !online}
            onImport={async (file, destination) => {
              if (destination === 'full-story') await onImportFullStory(file);
              else {
                onUpdate('storyBrief', file.content);
                onUpdate('storyBriefImport', { fileName: file.fileName, edited: false });
                setBriefOpen(false);
                if (!draft.projectName.trim()) onUpdate('projectName', file.fileName.replace(/\.(md|txt)$/i, '').slice(0, 120));
              }
            }} /> : null}

          <label id="cinematic-imported-brief" className="cinematic-new-project__brief-field" hidden={Boolean(source) && !briefOpen}>
            <span>{t('cinematic.newProject.storyIdea')}</span>
            <textarea
              rows={10}
              maxLength={storyLimit}
              value={draft.storyBrief}
              onChange={event => onUpdate('storyBrief', event.target.value)}
              placeholder={t('cinematic.newProject.storyPlaceholder')}
            />
            <small>{t('cinematic.newProject.storyCount', { count: draft.storyBrief.length, limit: storyLimit })}</small>
          </label>

          <details
            className="cinematic-new-project__section cinematic-new-project__essentials"
            open={essentialsOpen}
            onToggle={event => setEssentialsOpen(event.currentTarget.open)}
          >
            <summary>
              <Layers3 aria-hidden="true" />
              <span>
                <strong>{t('cinematic.newProject.quickSettings')}</strong>
                <small>{[
                  t(`cinematic.newProject.format.${draft.format}`),
                  draft.aspectRatio,
                  selectedGenres.map(genre => t(`cinematic.genre.${genre}`)).join(', ')
                ].join(' · ')}</small>
              </span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <section className="cinematic-new-project__quick-settings" aria-label={t('cinematic.newProject.quickSettings')}>
              <ChoiceGroup label={t('cinematic.newProject.format')}>
                <div className="cinematic-new-project__segments">
                  {formats.map(format => (
                    <button
                      key={format}
                      type="button"
                      aria-pressed={draft.format === format}
                      className={draft.format === format ? 'is-selected' : ''}
                      onClick={() => onUpdate('format', format)}
                    >
                      {format === 'mini-series' ? <Layers3 aria-hidden="true" /> : <Film aria-hidden="true" />}
                      {t(`cinematic.newProject.format.${format}`)}
                    </button>
                  ))}
                </div>
              </ChoiceGroup>

              <ChoiceGroup label={t('cinematic.newProject.orientation')}>
                <div className="cinematic-new-project__segments cinematic-new-project__segments--orientation">
                  {aspectRatios.map(aspectRatio => (
                    <button
                      key={aspectRatio}
                      type="button"
                      aria-label={t(`cinematic.newProject.orientation.${aspectRatio}`)}
                      title={t(`cinematic.newProject.orientation.${aspectRatio}`)}
                      aria-pressed={draft.aspectRatio === aspectRatio}
                      className={draft.aspectRatio === aspectRatio ? 'is-selected' : ''}
                      onClick={() => onUpdate('aspectRatio', aspectRatio)}
                    >
                      {aspectRatio === '9:16' ? <RectangleVertical aria-hidden="true" /> : aspectRatio === '16:9' ? <RectangleHorizontal aria-hidden="true" /> : <Square aria-hidden="true" />}
                      <span>{aspectRatio}</span>
                    </button>
                  ))}
                </div>
              </ChoiceGroup>

              <div className="cinematic-new-project__genre-choice" data-testid="cinematic-new-project-genres">
                <StoryIntentChoices
                  label={t('cinematic.newProject.genre')}
                  prefix="cinematic.genre"
                  rule={genreRule}
                  value={selectedGenres}
                  disabled={pending}
                  onChange={value => onUpdate('genres', value)}
                />
              </div>
            </section>
          </details>

          <details className="cinematic-new-project__section cinematic-new-project__settings">
            <summary>
              <Settings2 aria-hidden="true" />
              <span><strong>{t('cinematic.newProject.settings')}</strong><small>{t('cinematic.newProject.settingsHint')}</small></span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <div className="cinematic-new-project__settings-grid">
              {storyAuthoring?.countryStyles ? (
                <ChoiceGroup label={t('cinematic.setup.storyCountryStyle')}>
                  <ThemeSelect
                    ariaLabel={t('cinematic.setup.storyCountryStyle')}
                    value={draft.storyCountryStyle || storyAuthoring.countryStyles.default}
                    options={storyAuthoring.countryStyles.options.map(option => ({
                      value: option.id,
                      label: t(`cinematic.countryStyle.${option.id}`),
                      icon: option.flag
                        ? <img className="cinematic-country-flag" src={`/assets/cinematic/flags/${option.flag}.svg`} alt="" />
                        : undefined
                    }))}
                    onValueChange={value => onUpdate('storyCountryStyle', value)}
                  />
                </ChoiceGroup>
              ) : null}

              {storyAuthoring?.periods ? (
                <ChoiceGroup label={t('cinematic.newProject.period')}>
                  <ThemeSelect
                    ariaLabel={t('cinematic.newProject.period')}
                    value={draft.storyPeriod || storyAuthoring.periods.default}
                    options={storyAuthoring.periods.options.map(option => ({
                      value: option.id,
                      label: t(`cinematic.period.${option.id}`)
                    }))}
                    onValueChange={value => onUpdate('storyPeriod', value)}
                  />
                </ChoiceGroup>
              ) : null}

              <ChoiceGroup label={t('cinematic.newProject.durationPerChapter')}>
                <ThemeSelect
                  ariaLabel={t('cinematic.newProject.durationPerChapter')}
                  value={String(draft.durationSeconds)}
                  options={chapterDurations.map(value => ({ value: String(value), label: durationLabel(value) }))}
                  onValueChange={value => onUpdate('durationSeconds', Number(value) as CinematicSetupDraft['durationSeconds'])}
                />
              </ChoiceGroup>

              <div className="cinematic-new-project__chapter-plan">
                <label className="cinematic-new-project__toggle">
                  <input
                    type="checkbox"
                    checked={draft.format === 'mini-series' && draft.seasonEnabled}
                    disabled={draft.format !== 'mini-series'}
                    onChange={event => onUpdate('seasonEnabled', event.target.checked)}
                  />
                  <span>{t('cinematic.newProject.useSeasons')}</span>
                </label>
                {draft.format === 'mini-series' && draft.seasonEnabled ? (
                  <>
                    <label>
                      <span>{t('cinematic.newProject.seasonCount')}</span>
                      <input type="number" min={1} max={creationPolicy?.maximumSeasonCount || 8} value={draft.seasonCount} onChange={event => {
                        const count = Math.max(1, Math.min(creationPolicy?.maximumSeasonCount || 8, Number(event.target.value) || 1));
                        onUpdate('seasonCount', count);
                        onUpdate('chaptersPerSeason', Array.from({ length: count }, (_, index) => draft.chaptersPerSeason[index] || 1));
                      }} />
                    </label>
                    <div className="cinematic-new-project__season-counts">
                      {Array.from({ length: draft.seasonCount }, (_, index) => (
                        <label key={index}>
                          <span>{t('cinematic.newProject.seasonChapters', { season: index + 1 })}</span>
                          <input type="number" min={1} max={creationPolicy?.maximumChapterCount || 24} value={draft.chaptersPerSeason[index] || 1} onChange={event => {
                            const next = [...draft.chaptersPerSeason];
                            next[index] = Math.max(1, Math.min(creationPolicy?.maximumChapterCount || 24, Number(event.target.value) || 1));
                            onUpdate('chaptersPerSeason', next);
                            onUpdate('chapterCount', next.reduce((sum, value) => sum + value, 0));
                          }} />
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <label>
                    <span>{t('cinematic.newProject.chapterCount')}</span>
                    <input type="number" min={1} max={draft.format === 'short-film' ? 1 : creationPolicy?.maximumChapterCount || 24} value={draft.format === 'short-film' ? 1 : draft.chapterCount} disabled={draft.format === 'short-film'} onChange={event => onUpdate('chapterCount', Math.max(1, Math.min(creationPolicy?.maximumChapterCount || 24, Number(event.target.value) || 1)))} />
                  </label>
                )}
              </div>

              <ChoiceGroup label={t('cinematic.setup.platform')}>
                <ThemeSelect
                  ariaLabel={t('cinematic.setup.platform')}
                  value={draft.platform}
                  options={['tiktok', 'youtube-shorts', 'reels', 'multi-platform'].map(value => ({
                    value,
                    label: t(`cinematic.platform.${value}`)
                  }))}
                  onValueChange={value => onUpdate('platform', value as CinematicSetupDraft['platform'])}
                />
              </ChoiceGroup>

              {storyAuthoring ? (
                <div className="cinematic-new-project__intent-options">
                  <StoryIntentChoices
                    label={t('cinematic.setup.feeling')}
                    prefix="cinematic.feeling"
                    rule={storyAuthoring.choices.audienceFeelings}
                    value={draft.audienceFeelings || [draft.audienceFeeling]}
                    disabled={pending}
                    onChange={value => onUpdate('audienceFeelings', value)}
                  />
                  <StoryIntentChoices
                    label={t('cinematic.setup.pacing')}
                    prefix="cinematic.pacing"
                    rule={storyAuthoring.choices.pacingTraits}
                    value={draft.pacingTraits || [draft.pacing]}
                    disabled={pending}
                    onChange={value => onUpdate('pacingTraits', value)}
                  />
                </div>
              ) : null}

              <ChoiceGroup label={t('cinematic.setup.ending')}>
                <ThemeSelect
                  ariaLabel={t('cinematic.setup.ending')}
                  value={draft.endingIntent}
                  options={['resolved', 'hopeful', 'twist', 'cliffhanger'].map(value => ({
                    value,
                    label: t(`cinematic.ending.${value}`)
                  }))}
                  onValueChange={value => onUpdate('endingIntent', value as CinematicSetupDraft['endingIntent'])}
                />
              </ChoiceGroup>

              <label className="cinematic-new-project__direction">
                <span>{t('cinematic.setup.creativeDirection')}</span>
                <textarea
                  rows={4}
                  maxLength={storyAuthoring?.limits.creativeDirection || 800}
                  value={draft.creativeDirection}
                  onChange={event => onUpdate('creativeDirection', event.target.value)}
                  placeholder={t('cinematic.setup.creativeDirectionPlaceholder')}
                />
              </label>
              <label className="cinematic-new-project__direction">
                <span>{t('cinematic.videoDirection.title')}</span>
                <textarea aria-label={t('cinematic.videoDirection.title')} rows={4} maxLength={maximumVideoDirectionCharacters} value={draft.videoDirection || ''}
                  onChange={event => onUpdate('videoDirection', event.target.value)}
                  placeholder={t('cinematic.videoDirection.placeholder')} />
                <small>{t('cinematic.videoDirection.hint')}</small>
              </label>
            </div>
          </details>

          {!online ? (
            <StatusNotice tone="warning" title={t('cinematic.newProject.offlineTitle')}>
              {t('cinematic.newProject.offlineDescription')}
            </StatusNotice>
          ) : null}
          {saveError ? (
            <StatusNotice tone="error" title={t('cinematic.status.saveFailed')}>
              {saveError.message}
            </StatusNotice>
          ) : null}

          <footer className="cinematic-new-project__actions">
            <div>
              <strong>{t(editing ? 'cinematic.newProject.editActionsTitle' : 'cinematic.newProject.actionsTitle')}</strong>
              <span>{t(editing ? 'cinematic.newProject.editActionsHint' : 'cinematic.newProject.actionsHint')}</span>
            </div>
            <div>
              <Button
                type="button"
                icon={pending ? <ProcessingSpinner className="size-4" /> : editing ? <Save aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />}
                disabled={pending || !online}
                onClick={editing ? onSave : onCreateDraft}
              >
                {t(editing ? 'cinematic.newProject.saveBrief' : 'cinematic.newProject.createDraft')}
              </Button>
              <Button
                type="button"
                variant="primary"
                icon={pending ? <ProcessingSpinner className="size-4" /> : <Sparkles aria-hidden="true" />}
                disabled={pending || !online || (!editing && !draft.storyBrief.trim())}
                title={!editing && !draft.storyBrief.trim() ? t('cinematic.newProject.prepareNeedsStory') : undefined}
                onClick={editing ? onContinueFullStory : onPrepareStory}
              >
                {t(editing ? 'cinematic.newProject.continueFullStory' : 'cinematic.newProject.prepareStory')}
              </Button>
            </div>
          </footer>
        </fieldset>
      </form>
    </main>
  );
}

function ChoiceGroup({ label, children }: { label: string; children: ReactNode }) {
  return <div className="cinematic-new-project__choice"><span>{label}</span>{children}</div>;
}

function SaveState({ state, online }: { state: CinematicSaveState; online: boolean }) {
  const { t } = useTranslation('cinematic');
  const icon = !online || state === 'offline'
    ? <CloudOff aria-hidden="true" />
    : state === 'saving'
      ? <ProcessingSpinner className="size-4" />
      : <Check aria-hidden="true" />;
  return <span className={`cinematic-new-project__save-state is-${state}`} role="status">{icon}{t(`cinematic.save.${!online ? 'offline' : state}`)}</span>;
}
