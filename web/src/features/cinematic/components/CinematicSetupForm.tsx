import { Clapperboard, Globe, Save, Sparkles, Trash2 } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ThemeSelect } from '../../../components/ui/ThemeSelect';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import type { CinematicSetupDraft, CinematicStoryAuthoring } from '../schemas/cinematicSchemas';
import { StoryIntentChoices } from './StoryIntentChoices';
import { CinematicControlLevel } from './CinematicControlLevel';
import type { CinematicSaveState } from './CinematicWorkspaceHeader';

type RoleSlot = CinematicSetupDraft['storyRoleSlots'][number];

export function CinematicSetupForm({
  storyAuthoring,
  draft,
  saveState,
  saveError,
  pending,
  onUpdate,
  onPlanningModeChange,
  onAddRole,
  onUpdateRole,
  onRemoveRole,
  onEnhance,
  onAnalyzeRoles,
  onManualRoleCountChange,
  onSave,
  onContinue
}: {
  storyAuthoring?: CinematicStoryAuthoring;
  draft: CinematicSetupDraft;
  saveState: CinematicSaveState;
  saveError?: Error | null;
  pending: boolean;
  onUpdate: <K extends keyof CinematicSetupDraft>(key: K, value: CinematicSetupDraft[K]) => void;
  onPlanningModeChange: (mode: CinematicSetupDraft['castPlanningMode']) => void;
  onAddRole: () => void;
  onUpdateRole: (index: number, patch: Partial<RoleSlot>) => void;
  onRemoveRole: (index: number) => void;
  onEnhance: () => void;
  onAnalyzeRoles: () => void;
  onManualRoleCountChange: (count: number) => void;
  onSave: () => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation('cinematic');
  const validProject = Boolean(draft.projectName.trim());
  const validStory = Boolean(draft.storyBrief.trim());
  const validRoles = draft.storyRoleSlots.length > 0
    && draft.storyRoleSlots.some(role => role.importance === 'required')
    && draft.storyRoleSlots.every(role => role.label.trim())
    && (draft.castPlanningMode !== 'manual' || draft.storyRoleSlots.every(role => role.storyFunction.trim()));
  const canContinue = validProject && validStory && validRoles;

  return (
    <form className="cinematic-setup-form" onSubmit={event => event.preventDefault()}>
      <header className="cinematic-setup-heading">
        <div>
          <p>{t('cinematic.setup.eyebrow')}</p>
          <h2>{t('cinematic.setup.title')}</h2>
          <span>{t('cinematic.setup.description')}</span>
        </div>
        <CinematicControlLevel
          mode={draft.mode}
          label={t('cinematic.setup.authoringMode')}
          helpText={t('cinematic.setup.modeHelp')}
          onChange={mode => onUpdate('mode', mode)}
        />
      </header>

      <div className="cinematic-setup-content">
        <section className="cinematic-setup-section cinematic-setup-foundation" aria-labelledby="cinematic-foundation-title">
          <SectionHeading id="cinematic-foundation-title" eyebrow={t('cinematic.setup.foundationEyebrow')} title={t('cinematic.setup.foundationTitle')} />
          <div className="cinematic-foundation-fields">
            <Field label={t('cinematic.setup.projectName')} required>
              <input value={draft.projectName} maxLength={120} required aria-required="true" onChange={event => onUpdate('projectName', event.target.value)} />
            </Field>
            <Field label={t('cinematic.setup.format')}>
              <div className="cinematic-format-fact"><Clapperboard aria-hidden="true" /><span>{t('cinematic.setup.shortFilm')}</span></div>
            </Field>
            <SelectField label={t('cinematic.setup.platform')} value={draft.platform} values={['tiktok', 'youtube-shorts', 'reels', 'multi-platform']} onChange={value => onUpdate('platform', value as CinematicSetupDraft['platform'])} translationPrefix="cinematic.platform" />
            <Field label={t('cinematic.setup.duration')}>
              <select value={draft.durationSeconds} onChange={event => onUpdate('durationSeconds', Number(event.target.value) as CinematicSetupDraft['durationSeconds'])}>
                {[20, 30, 45, 60].map(value => <option key={value} value={value}>{value} {t('cinematic.units.seconds')}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section className="cinematic-setup-section cinematic-story-source" aria-labelledby="cinematic-story-source-title">
          <SectionHeading
            id="cinematic-story-source-title"
            eyebrow={t('cinematic.setup.storySourceEyebrow')}
            title={t('cinematic.setup.storySourceTitle')}
            description={t('cinematic.setup.storySourceDescription')}
            action={(
              <Button type="button" size="sm" variant="primary" icon={<Sparkles aria-hidden="true" />} disabled={!validStory || pending} onClick={onEnhance} title={!validStory ? t('cinematic.setup.addBriefFirst') : undefined}>
                {t('cinematic.setup.enhanceStory')}
              </Button>
            )}
          />
          <Field label={t('cinematic.setup.storyBrief')} hint={`${draft.storyBrief.length}${storyAuthoring ? ` / ${storyAuthoring.limits.storyBrief}` : ''}`} required description={t('cinematic.setup.storyBriefHint')}>
            <textarea rows={5} maxLength={storyAuthoring?.limits.storyBrief} required aria-required="true" value={draft.storyBrief} onChange={event => onUpdate('storyBrief', event.target.value)} placeholder={t('cinematic.setup.storyBriefPlaceholder')} />
          </Field>
          <Field label={t('cinematic.setup.creativeDirection')} hint={`${draft.creativeDirection.length}${storyAuthoring ? ` / ${storyAuthoring.limits.creativeDirection}` : ''}`} description={t('cinematic.setup.creativeDirectionHint')}>
            <textarea rows={4} maxLength={storyAuthoring?.limits.creativeDirection} value={draft.creativeDirection} onChange={event => onUpdate('creativeDirection', event.target.value)} placeholder={t('cinematic.setup.creativeDirectionPlaceholder')} />
          </Field>
          <details className="cinematic-setup-examples">
            <summary>{t('cinematic.setup.whatBelongsHere')}</summary>
            <p>{t('cinematic.setup.creativeDirectionExamples')}</p>
          </details>
        </section>

        <section className="cinematic-setup-section cinematic-creative-intent" aria-labelledby="cinematic-intent-title">
          <SectionHeading id="cinematic-intent-title" eyebrow={t('cinematic.setup.intentEyebrow')} title={t('cinematic.setup.intentTitle')} />
          <div className="cinematic-intent-fields">
            {storyAuthoring?.countryStyles ? <div className="cinematic-country-style">
              <span>{t('cinematic.setup.storyCountryStyle')}</span>
              <ThemeSelect ariaLabel={t('cinematic.setup.storyCountryStyle')} disabled={pending}
                value={draft.storyCountryStyle ?? storyAuthoring.countryStyles.default}
                onValueChange={value => onUpdate('storyCountryStyle', value)}
                options={storyAuthoring.countryStyles.options.map(option => ({
                  value: option.id, label: t(`cinematic.countryStyle.${option.id}`),
                  icon: option.flag ? <img className="cinematic-country-flag" src={`/assets/cinematic/flags/${option.flag}.svg`} alt="" /> : <Globe className="size-4" />
                }))} />
            </div> : null}
            {storyAuthoring ? <>
              <StoryIntentChoices label={t('cinematic.setup.genre')} prefix="cinematic.genre" rule={storyAuthoring.choices.genres} value={draft.genres || [draft.genre]} disabled={pending} onChange={value => onUpdate('genres', value)} />
              <StoryIntentChoices label={t('cinematic.setup.feeling')} prefix="cinematic.feeling" rule={storyAuthoring.choices.audienceFeelings} value={draft.audienceFeelings || [draft.audienceFeeling]} disabled={pending} onChange={value => onUpdate('audienceFeelings', value)} />
              <StoryIntentChoices label={t('cinematic.setup.pacing')} prefix="cinematic.pacing" rule={storyAuthoring.choices.pacingTraits} value={draft.pacingTraits || [draft.pacing]} disabled={pending} onChange={value => onUpdate('pacingTraits', value)} />
            </> : <p role="status">{t('cinematic.intent.configurationUnavailable')}</p>}
            <SelectField label={t('cinematic.setup.ending')} value={draft.endingIntent} values={['resolved', 'hopeful', 'twist', 'cliffhanger']} onChange={value => onUpdate('endingIntent', value as CinematicSetupDraft['endingIntent'])} translationPrefix="cinematic.ending" />
          </div>
          <p className="cinematic-intent-summary">
            {t('cinematic.setup.intentSummary', {
              genre: (draft.genres || [draft.genre]).map(id => t(`cinematic.genre.${id}`)).join(' + '),
              pacing: (draft.pacingTraits || [draft.pacing]).map(id => t(`cinematic.pacing.${id}`)).join(' + '),
              feeling: (draft.audienceFeelings || [draft.audienceFeeling]).map(id => t(`cinematic.feeling.${id}`)).join(' > '),
              ending: t(`cinematic.ending.${draft.endingIntent}`)
            })}
          </p>
          {draft.mode === 'advanced' ? <small className="cinematic-advanced-note">{t('cinematic.setup.intentAdvancedHelp')}</small> : null}
        </section>

        <section className="cinematic-setup-section cinematic-role-plan" aria-labelledby="cinematic-role-plan-title">
          <SectionHeading id="cinematic-role-plan-title" eyebrow={t('cinematic.setup.rolePlanEyebrow')} title={t('cinematic.setup.rolePlanTitle')} description={t('cinematic.setup.castPlanHint')} />
          <Field label={t('cinematic.setup.rolePlanningQuestion')}>
            <select value={draft.castPlanningMode} onChange={event => onPlanningModeChange(event.target.value as CinematicSetupDraft['castPlanningMode'])}>
              {['ai-recommended', 'solo', 'duo', 'manual'].map(value => <option key={value} value={value}>{t(`cinematic.castPlanningMode.${value}`)}</option>)}
            </select>
          </Field>
          {draft.castPlanningMode === 'ai-recommended' ? (
            <div className="cinematic-role-plan__toolbar">
              <p>{t('cinematic.setup.aiRoleAnalysisHelp')}</p>
              <Button type="button" size="sm" variant="primary" icon={<Sparkles aria-hidden="true" />} disabled={!validStory || pending} onClick={onAnalyzeRoles}>
                {t('cinematic.setup.analyzeStoryRoles')}
              </Button>
            </div>
          ) : null}
          {draft.castPlanningMode === 'manual' ? (
            <fieldset className="cinematic-role-count">
              <legend>{t('cinematic.setup.characterCount')}</legend>
              <div>
                {[1, 2, 3, 4].map(count => (
                  <Button key={count} type="button" size="sm" variant={draft.storyRoleSlots.length === count ? 'primary' : 'ghost'} aria-pressed={draft.storyRoleSlots.length === count} onClick={() => onManualRoleCountChange(count)}>
                    {count}
                  </Button>
                ))}
              </div>
              <small>{t('cinematic.setup.manualCountHelp')}</small>
            </fieldset>
          ) : null}
          {draft.storyRoleSlots.length ? (
            <div className={`cinematic-role-cards${draft.storyRoleSlots.length === 1 ? ' is-single' : ''}`}>
              {draft.storyRoleSlots.map((role, index) => (
                <article className="cinematic-role-card" key={role.id}>
                  <div className="cinematic-role-card__heading">
                    <small>{t('cinematic.setup.roleNumber', { count: index + 1 })}</small>
                    <input aria-label={t('cinematic.setup.roleName')} maxLength={80} required={draft.castPlanningMode === 'manual'} aria-invalid={draft.castPlanningMode === 'manual' && !role.label.trim()} value={role.label} onChange={event => onUpdateRole(index, { label: event.target.value })} />
                    <select aria-label={t('cinematic.setup.roleImportance')} value={role.importance} onChange={event => onUpdateRole(index, { importance: event.target.value as RoleSlot['importance'] })}>
                      <option value="required">{t('cinematic.roleImportance.required')}</option>
                      <option value="optional">{t('cinematic.roleImportance.optional')}</option>
                    </select>
                  </div>
                  <p>{t('cinematic.setup.characterSelectedInCast')}</p>
                  {draft.castPlanningMode === 'manual' ? (
                    <label className="cinematic-role-card__function">
                      <span>{t('cinematic.setup.storyFunction')} <b aria-hidden="true">*</b></span>
                      <input maxLength={240} required aria-invalid={!role.storyFunction.trim()} value={role.storyFunction} onChange={event => onUpdateRole(index, { storyFunction: event.target.value })} placeholder={t('cinematic.setup.storyFunctionPlaceholder')} />
                    </label>
                  ) : null}
                  {(role.storyFunction || role.relationshipHint || role.objective || role.emotionalArc || role.personalityTraits?.length || role.performanceDirection) ? (
                    <details>
                      <summary>{t('cinematic.setup.roleDetails')}</summary>
                      {role.storyFunction ? <p><strong>{t('cinematic.setup.storyFunction')}:</strong> {role.storyFunction}</p> : null}
                      {role.relationshipHint ? <p><strong>{t('cinematic.setup.relationshipHint')}:</strong> {role.relationshipHint}</p> : null}
                      {role.objective ? <p><strong>{t('cinematic.setup.roleObjective')}:</strong> {role.objective}</p> : null}
                      {role.emotionalArc ? <p><strong>{t('cinematic.setup.roleEmotionalArc')}:</strong> {role.emotionalArc}</p> : null}
                      {role.personalityTraits?.length ? <p><strong>{t('cinematic.setup.roleTraits')}:</strong> {role.personalityTraits.join(', ')}</p> : null}
                      {role.performanceDirection ? <p><strong>{t('cinematic.setup.rolePerformance')}:</strong> {role.performanceDirection}</p> : null}
                    </details>
                  ) : null}
                  {draft.castPlanningMode === 'manual' && draft.storyRoleSlots.length > 1 ? (
                    <Button type="button" size="sm" variant="ghost" icon={<Trash2 aria-hidden="true" />} onClick={() => onRemoveRole(index)}>{t('cinematic.actions.remove')}</Button>
                  ) : null}
                </article>
              ))}
            </div>
          ) : <p className="cinematic-role-plan__empty">{t(`cinematic.setup.${draft.castPlanningMode === 'manual' ? 'manualRolesEmpty' : 'castPlanPending'}`)}</p>}
          {draft.castPlanningMode === 'manual' && draft.storyRoleSlots.length < 4 ? <Button type="button" size="sm" onClick={onAddRole}>{t('cinematic.setup.addRole')}</Button> : null}
          {!validRoles ? <StatusNotice tone="warning" title={t('cinematic.setup.rolePlanRequired')}>{t('cinematic.setup.rolePlanRequiredHelp')}</StatusNotice> : null}
        </section>
      </div>

      <footer className="cinematic-setup-actions cinematic-setup-actions--inline">
        <div>
          <strong>{canContinue ? t('cinematic.setup.readyToContinue') : t('cinematic.setup.completeRequired')}</strong>
          <span>{t(`cinematic.save.${saveState}`)}</span>
        </div>
        <div>
          <Button type="button" icon={<Save aria-hidden="true" />} disabled={pending || saveState === 'saving'} onClick={onSave}>{t('cinematic.actions.saveDraft')}</Button>
          <Button type="button" variant="primary" disabled={pending || !canContinue} onClick={onContinue}>{t('cinematic.actions.continueToCast')}</Button>
        </div>
      </footer>
      {saveError ? <StatusNotice tone="error" title={t('cinematic.status.saveFailed')}>{saveError.message}</StatusNotice> : null}
    </form>
  );
}

function SectionHeading({ id, eyebrow, title, description, action }: { id: string; eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="cinematic-setup-section__heading">
      <div><p>{eyebrow}</p><h3 id={id}>{title}</h3>{description ? <span>{description}</span> : null}</div>
      {action}
    </header>
  );
}

function Field({ label, hint, description, required, children }: { label: string; hint?: string; description?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="cinematic-setup-field">
      <span><span>{label}{required ? <b aria-hidden="true"> *</b> : null}</span>{hint ? <small>{hint}</small> : null}</span>
      {description ? <small>{description}</small> : null}
      {children}
    </label>
  );
}

function SelectField({ label, value, values, onChange, translationPrefix }: { label: string; value: string; values: string[]; onChange: (value: string) => void; translationPrefix: string }) {
  const { t } = useTranslation('cinematic');
  return <Field label={label}><select value={value} onChange={event => onChange(event.target.value)}>{values.map(item => <option key={item} value={item}>{t(`${translationPrefix}.${item}`)}</option>)}</select></Field>;
}
