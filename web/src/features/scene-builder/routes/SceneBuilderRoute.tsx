import { useMutation, useQuery } from '@tanstack/react-query';
import { BookOpen, FileText, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { GenerationExperience } from '../../../components/generation/GenerationExperience';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { getAttributesBundle } from '../../generation/api/generationApi';
import type { GenerationReferenceRole } from '../../generation/api/generationApi';
import {
  compileSelectionPreview,
  normalizeAttributeGroups,
  type AttributeSelection
} from '../../studio/attributes/attributeModel';
import { GuidedAttributeForm } from '../../studio/components/GuidedAttributeForm';
import { StudioConfiguratorActions } from '../../studio/components/StudioConfiguratorActions';
import { StudioModeSelector } from '../../studio/components/StudioModeSelector';
import {
  randomizeStudioSelections,
  visibleStudioGroups
} from '../../studio/studioModePolicy';
import {
  downloadStudioConfig,
  lightweightStudioReferences
} from '../../studio/studioConfigFile';
import { requestSharedSceneTemplate } from '../api/sceneTemplateApi';
import { HistoryReferencePicker } from '../components/HistoryReferencePicker';
import { SharedTemplatePanel } from '../components/SharedTemplatePanel';
import type { SceneTemplateSnapshot, SharedTemplate } from '../schemas/sceneTemplateSchemas';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { useActor } from '../../../lib/auth/ActorProvider';
import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../../lib/persistence/actorScopedStorage';
import { readHandoff } from '../../../lib/persistence/handoffStorage';
import { scheduleHashTargetScroll } from '../../../lib/navigation/hashScroll';

type AuthoringMode = 'guided' | 'manual';
const FEATURE = 'scene-builder';
const SCHEMA_VERSION = 1;

export function SceneBuilderRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const navigate = useNavigate();
  const location = useLocation();
  const previousActorId = useRef(getActiveActorId());
  const initialHandoff = useMemo(loadSceneHandoff, []);
  const initialDraft = useMemo(() => loadSceneDraft(getActiveActorId()), []);
  const [mode, setMode] = useState<AuthoringMode>(
    initialHandoff.snapshot?.authoringMode || initialDraft.mode
  );
  const [manualPrompt, setManualPrompt] = useState(
    initialHandoff.snapshot?.manualPromptSnapshot
      || initialHandoff.snapshot?.finalPromptSnapshot
      || initialDraft.manualPrompt
  );
  const [selections, setSelections] = useState<Record<string, AttributeSelection>>(
    initialHandoff.snapshot?.structuredSelectionsSnapshot as Record<string, AttributeSelection>
      || initialDraft.selections
  );
  const [lockedFields, setLockedFields] = useState<string[]>(initialDraft.lockedFields);
  const [snapshot, setSnapshot] = useState<SceneTemplateSnapshot | null>(initialHandoff.snapshot);
  const [references, setReferences] = useState<Partial<Record<GenerationReferenceRole, string>>>(initialHandoff.references);
  const [characterProfileContext] = useState<Record<string, unknown> | null>(initialHandoff.characterProfileContext);
  const [historyRole, setHistoryRole] = useState<GenerationReferenceRole>('character_reference');
  const bundle = useQuery({ queryKey: ['attribute-bundle'], queryFn: getAttributesBundle, staleTime: 10 * 60_000 });
  const groups = useMemo(() => bundle.data ? normalizeAttributeGroups(bundle.data) : [], [bundle.data]);
  const sceneGroups = useMemo(
    () => visibleStudioGroups(groups, 'scene', 'styled_character'),
    [groups]
  );
  const guidedPreview = useMemo(() => compileSelectionPreview(selections, 'headshot', 'styled_character'), [selections]);
  const useTemplate = useMutation({
    mutationFn: (template: SharedTemplate) => requestSharedSceneTemplate(template.id),
    onSuccess: next => {
      setSnapshot(next);
      setMode(next.authoringMode);
      setSelections(next.structuredSelectionsSnapshot as Record<string, AttributeSelection>);
      setManualPrompt(next.manualPromptSnapshot || next.finalPromptSnapshot || '');
    }
  });
  const activePrompt = mode === 'manual'
    ? manualPrompt
    : snapshot?.finalPromptSnapshot || guidedPreview;
  const activeSelections = mode === 'guided'
    ? (snapshot?.structuredSelectionsSnapshot || selections)
    : {};
  const requiredRoles = getRequiredReferenceRoles(snapshot);
  const missing = requiredRoles.filter(role => !references[role]);
  const availableRoles = getTemplateReferenceRoles(snapshot);

  useEffect(() => {
    if (!actor?.userId) return;
    if (previousActorId.current === actor.userId) return;
    previousActorId.current = actor.userId;
    const next = loadSceneDraft(actor.userId);
    setMode(next.mode);
    setManualPrompt(next.manualPrompt);
    setSelections(next.selections);
    setLockedFields(next.lockedFields);
    setSnapshot(null);
    setReferences({});
  }, [actor?.userId]);

  useEffect(() => {
    if (!actor?.userId) return;
    writeActorScopedDraft({
      actorId: actor.userId,
      feature: FEATURE,
      schemaVersion: SCHEMA_VERSION,
      payload: { mode, manualPrompt, selections, lockedFields }
    });
  }, [actor?.userId, lockedFields, manualPrompt, mode, selections]);

  useEffect(() => {
    if (!bundle.isLoading && location.hash === '#studio-configurator-title') {
      scheduleHashTargetScroll(location.hash);
    }
  }, [bundle.isLoading, location.hash]);

  if (bundle.isLoading) return <LoadingState label={t('ui.scene.loading')} />;
  if (bundle.isError) return <ErrorState title={t('ui.scene.unavailable')} description={bundle.error.message} />;
  return (
    <main className="studio-screen">
      <header className="studio-screen__header">
        <div className="studio-screen__title">
          <strong>{t('ui.studio.title')}</strong>
          <span>{t('ui.scene.title')}</span>
        </div>
      </header>
      <GenerationExperience
        surface="studio"
        generationMode="scene"
        prompt={activePrompt}
        onPromptChange={mode === 'manual' ? setManualPrompt : () => {}}
        selections={activeSelections}
        authoringMode={mode}
        references={references}
        onReferencesChange={setReferences}
        sceneTemplateSnapshot={snapshot as unknown as Record<string, unknown> | null}
        characterProfileContext={characterProfileContext}
        allowComparison
        showPromptEditor={false}
        layoutVariant="studio"
        blockedReason={missing.length ? t('ui.scene.requiredReferences', { roles: missing.join(', ') }) : null}
        referenceRoles={availableRoles}
        studioModeSelector={(
          <StudioModeSelector
            mode="scene"
            onChange={next => {
              navigate(next === 'scene'
                ? '/studio/scene'
                : next === 'character-sheet'
                  ? '/studio?mode=character-sheet'
                  : '/studio');
            }}
          />
        )}
        studioBuilder={(
          <>
            <div className="studio-builder-panel__heading">
              <h1>{t('ui.scene.title')}</h1>
              <p>{t('ui.scene.description')}</p>
            </div>
            <div className="studio-scene-authoring">
              <Button variant={mode === 'guided' ? 'primary' : 'secondary'} icon={<SlidersHorizontal className="size-4" />} onClick={() => setMode('guided')}>{t('ui.scene.guided')}</Button>
              {mode === 'guided' ? (
                <ConfirmDialog
                  trigger={<Button icon={<FileText className="size-4" />}>{t('ui.scene.manual')}</Button>}
                  title={t('ui.scene.copyTitle')}
                  description={t('ui.scene.copyDescription')}
                  confirmLabel={t('ui.scene.copyAction')}
                  onConfirm={() => { setManualPrompt(current => current || guidedPreview); setMode('manual'); }}
                />
              ) : <Button variant="primary" icon={<FileText className="size-4" />} onClick={() => setMode('manual')}>{t('ui.scene.manual')}</Button>}
            </div>
            {snapshot ? <Surface className="studio-template-status"><span><BookOpen className="size-4 text-cyan-300" />{t('ui.scene.templateLoaded', { mode: snapshot.authoringMode })}</span><Button size="sm" variant="ghost" onClick={() => setSnapshot(null)}>{t('ui.action.clearTemplate')}</Button></Surface> : null}
            {mode === 'guided' ? <GuidedAttributeForm
              groups={groups}
              mode="scene"
              characterType="styled_character"
              selections={selections}
              lockedFields={lockedFields}
              onLockChange={(fieldName, locked) => {
                setLockedFields(current => locked
                  ? [...new Set([...current, fieldName])]
                  : current.filter(item => item !== fieldName));
              }}
              onChange={next => { setSelections(next); setSnapshot(null); }}
            /> : (
              <Surface className="studio-manual-prompt"><label htmlFor="scene-manual-prompt">{t('ui.scene.manualLabel')}</label><textarea id="scene-manual-prompt" value={manualPrompt} onChange={event => { setManualPrompt(event.target.value); setSnapshot(null); }} placeholder={t('ui.scene.manualPlaceholder')} /></Surface>
            )}
            {availableRoles.length ? <HistoryReferencePicker roles={availableRoles} selectedRole={historyRole} onRoleChange={setHistoryRole} onPick={(role, imageUrl) => setReferences(current => ({ ...current, [role]: imageUrl }))} /> : null}
          </>
        )}
        studioConfigActions={(
          <StudioConfiguratorActions
            randomizeDisabled={mode === 'manual'}
            onReset={() => {
              setSelections({});
              setLockedFields([]);
              setManualPrompt('');
              setSnapshot(null);
              setReferences({});
            }}
            onRandomize={() => {
              setSelections(randomizeStudioSelections(
                sceneGroups,
                new Set(lockedFields),
                selections
              ));
              setSnapshot(null);
            }}
            onExport={() => downloadStudioConfig({
              mode: 'scene',
              authoringMode: mode,
              selections: mode === 'guided' ? selections : {},
              lockedFields,
              manualPrompt: mode === 'manual' ? manualPrompt : '',
              references: lightweightStudioReferences(references)
            })}
          />
        )}
        studioQueueExtra={(
          <>
            <SharedTemplatePanel onSelect={template => useTemplate.mutate(template)} />
            {useTemplate.isError ? <p className="text-sm text-red-300">{useTemplate.error.message}</p> : null}
          </>
        )}
      />
    </main>
  );
}

function loadSceneDraft(actorId: string): {
  mode: AuthoringMode;
  manualPrompt: string;
  selections: Record<string, AttributeSelection>;
  lockedFields: string[];
} {
  type SceneDraft = {
    mode: AuthoringMode;
    manualPrompt: string;
    selections: Record<string, AttributeSelection>;
    lockedFields?: string[];
  };
  const empty: SceneDraft = {
    mode: 'guided',
    manualPrompt: '',
    selections: {},
    lockedFields: []
  };
  const parsed = readActorScopedDraft<SceneDraft>({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback: empty
  });
  return {
    mode: parsed.mode === 'manual' ? 'manual' : 'guided',
    manualPrompt: typeof parsed.manualPrompt === 'string' ? parsed.manualPrompt : '',
    selections: parsed.selections && typeof parsed.selections === 'object'
      ? parsed.selections
      : {},
    lockedFields: Array.isArray(parsed.lockedFields) ? parsed.lockedFields : []
  };
}

function getTemplateReferenceRoles(snapshot: SceneTemplateSnapshot | null): GenerationReferenceRole[] {
  if (!snapshot) return ['face_reference', 'character_reference', 'style_reference', 'pose_reference', 'outfit_front', 'outfit_back'];
  return Object.keys(snapshot.referenceSlotMapping).flatMap(normalizeRole);
}

function getRequiredReferenceRoles(snapshot: SceneTemplateSnapshot | null) {
  if (!snapshot) return [];
  return Object.entries(snapshot.referenceSlotMapping).flatMap(([key, policy]) =>
    policy.required === true ? normalizeRole(key) : []
  );
}

function normalizeRole(value: string): GenerationReferenceRole[] {
  const aliases: Record<string, GenerationReferenceRole> = {
    face_reference: 'face_reference',
    character_reference: 'character_reference',
    style_reference: 'style_reference',
    pose_reference: 'pose_reference',
    outfit_front_reference: 'outfit_front',
    outfit_back_reference: 'outfit_back',
    outfit_front: 'outfit_front',
    outfit_back: 'outfit_back'
  };
  return aliases[value] ? [aliases[value]] : [];
}

function loadSceneHandoff(): {
  snapshot: SceneTemplateSnapshot | null;
  references: Partial<Record<GenerationReferenceRole, string>>;
  characterProfileContext: Record<string, unknown> | null;
} {
  const empty = {
    snapshot: null,
    references: {},
    characterProfileContext: null
  };
  try {
    const activeActorId = getActiveActorId();
    const template = readHandoff<{
      sceneTemplateSnapshot?: SceneTemplateSnapshot;
      payload?: { snapshot?: SceneTemplateSnapshot; sceneTemplateSnapshot?: SceneTemplateSnapshot };
    }>({ actorId: activeActorId, kind: 'scene-template', consume: true });
    const character = readHandoff<{
      destination?: string;
      characterReferenceUrl?: string;
      characterProfileContext?: Record<string, unknown>;
    }>({ actorId: activeActorId, kind: 'character', consume: true });
    const characterPayload = character?.payload?.destination === 'scene_builder'
      ? character.payload
      : null;
    return {
      snapshot: template?.payload?.sceneTemplateSnapshot
        || template?.payload?.payload?.snapshot
        || template?.payload?.payload?.sceneTemplateSnapshot
        || null,
      references: characterPayload?.characterReferenceUrl
        ? { character_reference: characterPayload.characterReferenceUrl }
        : {},
      characterProfileContext: characterPayload?.characterProfileContext || null
    };
  } catch {
    return empty;
  }
}
