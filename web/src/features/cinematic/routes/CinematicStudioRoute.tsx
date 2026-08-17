import { Clapperboard, Plus, Save, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { Surface } from '../../../components/ui/Surface';
import { routePaths } from '../../../app/routeRegistry/routes';
import { useActor } from '../../../lib/auth/ActorProvider';
import { useFeaturePolicy } from '../../../lib/permissions/FeaturePolicyProvider';
import { CinematicStageRail } from '../components/CinematicStageRail';
import { cinematicStages } from '../cinematicStages';
import { CinematicStageContent } from '../components/CinematicStageContent';
import { ProjectCostSummary } from '../components/ProjectCostSummary';
import { StoryEnhanceDialog } from '../components/CinematicDialogs';
import { cinematicStageSchema } from '../schemas/cinematicSchemas';
import type { CinematicSetupDraft } from '../schemas/cinematicSchemas';
import {
  readCinematicSetupDraft,
  writeCinematicSetupDraft
} from '../state/cinematicDraftStorage';

export function CinematicStudioRoute() {
  const { t } = useTranslation('cinematic');
  const { actor } = useActor();
  const { isEnabled, isLoading } = useFeaturePolicy();
  const location = useLocation();
  const { projectId, stage } = useParams();

  if (isLoading) {
    return <Surface fill centerContent><p>{t('cinematic.status.loading')}</p></Surface>;
  }
  if (!isEnabled('cinematic.enabled')) {
    return (
      <StatusNotice tone="warning" title={t('cinematic.status.unavailable')}>
        {t('cinematic.status.unavailableDescription')}
      </StatusNotice>
    );
  }
  if (!actor) return null;

  const isNew = location.pathname === routePaths.createCinematicNew;
  if (!isNew && !projectId) return <CinematicProjectList />;
  if (projectId) {
    return (
      <StatusNotice tone="info" title={t('cinematic.status.projectServicePending')}>
        {t('cinematic.status.projectServicePendingDescription')}
      </StatusNotice>
    );
  }

  return (
    <CinematicWorkspace
      key={`${actor.userId}:new`}
      actorId={actor.userId}
      requestedStage={stage}
    />
  );
}

function CinematicProjectList() {
  const { t } = useTranslation('cinematic');
  return (
    <main className="grid gap-4" data-testid="cinematic-project-list">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-semibold text-[var(--theme-primary)]">{t('cinematic.eyebrow')}</p>
          <h1 className="m-0 text-2xl">{t('cinematic.title')}</h1>
        </div>
        <Link to={routePaths.createCinematicNew} className="no-underline">
          <Button variant="primary" icon={<Plus className="size-4" />}>{t('cinematic.actions.newProject')}</Button>
        </Link>
      </header>
      <Surface className="min-h-64 p-6" centerContent>
        <Clapperboard className="size-10 text-[var(--theme-text-muted)]" aria-hidden="true" />
        <strong>{t('cinematic.empty.title')}</strong>
        <p className="m-0 max-w-md text-center text-sm text-[var(--theme-text-muted)]">{t('cinematic.empty.description')}</p>
      </Surface>
    </main>
  );
}

function CinematicWorkspace({
  actorId,
  requestedStage
}: {
  actorId: string;
  requestedStage?: string;
}) {
  const { t } = useTranslation('cinematic');
  const [draft, setDraft] = useState<CinematicSetupDraft>(() => readCinematicSetupDraft(actorId));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [enhanceOpen, setEnhanceOpen] = useState(false);
  const requestedStageResult = cinematicStageSchema.safeParse(requestedStage);
  const activeStage = requestedStageResult.success ? requestedStageResult.data : draft.activeStage;

  useEffect(() => {
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      writeCinematicSetupDraft(actorId, draft);
      setSaveState('saved');
    }, 300);
    return () => window.clearTimeout(timer);
  }, [actorId, draft]);

  const storyLength = useMemo(() => draft.storyBrief.length, [draft.storyBrief]);

  function update<K extends keyof CinematicSetupDraft>(key: K, value: CinematicSetupDraft[K]) {
    setDraft(current => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  }

  function setActiveStage(nextStage: CinematicSetupDraft['activeStage']) {
    update('activeStage', nextStage);
  }

  function moveStage(offset: -1 | 1) {
    const currentIndex = cinematicStages.indexOf(activeStage);
    const nextStage = cinematicStages[currentIndex + offset];
    if (nextStage) setActiveStage(nextStage);
  }

  return (
    <main className="grid gap-4" data-testid="cinematic-workspace">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-semibold text-[var(--theme-primary)]">{t('cinematic.eyebrow')}</p>
          <h1 className="m-0 text-2xl">{draft.projectName || t('cinematic.setup.untitled')}</h1>
        </div>
        <span className="inline-flex items-center gap-2 text-xs text-[var(--theme-text-muted)]" role="status" aria-live="polite">
          <Save className="size-4" aria-hidden="true" />
          {t(`cinematic.save.${saveState}`)}
        </span>
      </header>
      <Surface className="cinematic-workspace-surface p-4">
        <CinematicStageRail activeStage={activeStage} onStageChange={setActiveStage} />
        <div className="cinematic-workspace-layout">
          <div className="min-w-0">
          {activeStage === 'setup' ? (
          <form className="cinematic-setup-form" onSubmit={event => event.preventDefault()}>
            <header className="cinematic-stage-heading">
              <div><p>{t('cinematic.setup.eyebrow')}</p><h2>{t('cinematic.setup.title')}</h2></div>
              <span className="cinematic-prototype-badge">{t('cinematic.prototype.badge')}</span>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('cinematic.setup.projectName')}>
                <input value={draft.projectName} maxLength={120} onChange={event => update('projectName', event.target.value)} />
              </Field>
              <Field label={t('cinematic.setup.format')}>
                <select value={draft.format} disabled><option value="short-film">{t('cinematic.setup.shortFilm')}</option></select>
              </Field>
              <Field label={t('cinematic.setup.platform')}>
                <select value={draft.platform} onChange={event => update('platform', event.target.value as CinematicSetupDraft['platform'])}>
                  {['tiktok', 'youtube-shorts', 'reels', 'multi-platform'].map(value => <option key={value} value={value}>{t(`cinematic.platform.${value}`)}</option>)}
                </select>
              </Field>
              <Field label={t('cinematic.setup.duration')}>
                <select value={draft.durationSeconds} onChange={event => update('durationSeconds', Number(event.target.value) as CinematicSetupDraft['durationSeconds'])}>
                  {[20, 30, 45, 60].map(value => <option key={value} value={value}>{value} {t('cinematic.units.seconds')}</option>)}
                </select>
              </Field>
            </div>
            <Field label={t('cinematic.setup.storyBrief')} hint={`${storyLength}/600`}>
              <textarea rows={5} maxLength={600} value={draft.storyBrief} onChange={event => update('storyBrief', event.target.value)} />
            </Field>
            <div className="cinematic-creative-direction">
              <Field label={t('cinematic.setup.creativeDirection')} hint={`${draft.creativeDirection.length}/800`}>
                <textarea rows={4} maxLength={800} value={draft.creativeDirection} onChange={event => update('creativeDirection', event.target.value)} placeholder={t('cinematic.setup.creativeDirectionPlaceholder')} />
              </Field>
              <Button type="button" icon={<Sparkles aria-hidden="true" />} onClick={() => setEnhanceOpen(true)}>{t('cinematic.setup.enhanceStory')}</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField label={t('cinematic.setup.genre')} value={draft.genre} values={['drama', 'romance', 'comedy', 'thriller', 'fashion']} onChange={value => update('genre', value as CinematicSetupDraft['genre'])} translationPrefix="cinematic.genre" />
              <SelectField label={t('cinematic.setup.feeling')} value={draft.audienceFeeling} values={['moved', 'excited', 'curious', 'uplifted', 'surprised']} onChange={value => update('audienceFeeling', value as CinematicSetupDraft['audienceFeeling'])} translationPrefix="cinematic.feeling" />
              <SelectField label={t('cinematic.setup.pacing')} value={draft.pacing} values={['slow', 'balanced', 'fast']} onChange={value => update('pacing', value as CinematicSetupDraft['pacing'])} translationPrefix="cinematic.pacing" />
              <SelectField label={t('cinematic.setup.ending')} value={draft.endingIntent} values={['resolved', 'hopeful', 'twist', 'cliffhanger']} onChange={value => update('endingIntent', value as CinematicSetupDraft['endingIntent'])} translationPrefix="cinematic.ending" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] pt-4">
              <div className="inline-flex rounded-[var(--mpf-radius-sm)] border border-[var(--theme-border)] p-1">
                {(['simple', 'advanced'] as const).map(mode => (
                  <Button key={mode} type="button" size="sm" variant={draft.mode === mode ? 'primary' : 'ghost'} onClick={() => update('mode', mode)}>{t(`cinematic.mode.${mode}`)}</Button>
                ))}
              </div>
              <Button type="button" variant="primary" onClick={() => setActiveStage('cast')}>{t('cinematic.actions.continueToCast')}</Button>
            </div>
          </form>
          ) : (
            <CinematicStageContent
              activeStage={activeStage}
              mode={draft.mode}
              onModeChange={mode => update('mode', mode)}
              onPrevious={() => moveStage(-1)}
              onNext={() => moveStage(1)}
            />
          )}
          </div>
        </div>
        <ProjectCostSummary />
      </Surface>
      <StoryEnhanceDialog open={enhanceOpen} onOpenChange={setEnhanceOpen} />
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-[var(--theme-text-muted)]">
      <span className="flex justify-between gap-3"><span>{label}</span>{hint ? <small>{hint}</small> : null}</span>
      {children}
    </label>
  );
}

function SelectField({ label, value, values, onChange, translationPrefix }: { label: string; value: string; values: string[]; onChange: (value: string) => void; translationPrefix: string }) {
  const { t } = useTranslation('cinematic');
  return <Field label={label}><select value={value} onChange={event => onChange(event.target.value)}>{values.map(item => <option key={item} value={item}>{t(`${translationPrefix}.${item}`)}</option>)}</select></Field>;
}
