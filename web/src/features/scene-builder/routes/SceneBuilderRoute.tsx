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
import { loadStudioVisualManifests } from '../../studio/api/visualManifestApi';
import {
  compileSelectionPreview,
  normalizeAttributeGroups,
  type AttributeSelection
} from '../../studio/attributes/attributeModel';
import { GuidedAttributeForm } from '../../studio/components/GuidedAttributeForm';
import { StudioConfiguratorActions } from '../../studio/components/StudioConfiguratorActions';
import { StudioModeSelector } from '../../studio/components/StudioModeSelector';
import {
  filterStudioSelections,
  randomizeStudioSelections,
  visibleStudioGroups
} from '../../studio/studioModePolicy';
import type { CharacterOutfitBehavior } from '../../studio/referenceAuthorityPolicy';
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
import { readFaceReferenceHandoff } from '../../../lib/persistence/faceReferenceHandoff';
import {
  applyCustomColorSelectionAuthority,
  createStudioCustomColors,
  restrictCustomColorsForReferences,
  type StudioCustomColors
} from '../../studio/attributes/customColorModel';

type AuthoringMode = 'guided' | 'manual';
const FEATURE = 'scene-builder';
const SCHEMA_VERSION = 1;

export function SceneBuilderRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const navigate = useNavigate();
  const location = useLocation();
  const previousActorId = useRef(getActiveActorId());
  const hydratedLocationKey = useRef(location.key);
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
  const [customColors, setCustomColors] = useState<StudioCustomColors>(
    createStudioCustomColors(
      readSnapshotCustomColors(initialHandoff.snapshot) || initialDraft.customColors
    )
  );
  const [snapshot, setSnapshot] = useState<SceneTemplateSnapshot | null>(initialHandoff.snapshot);
  const [references, setReferences] = useState<Partial<Record<GenerationReferenceRole, string>>>(initialHandoff.references);
  const [characterOutfitBehavior, setCharacterOutfitBehavior] = useState<CharacterOutfitBehavior>(
    initialHandoff.characterOutfitBehavior
  );
  const [characterProfileContext, setCharacterProfileContext] = useState<Record<string, unknown> | null>(
    initialHandoff.characterProfileContext
  );
  const [faceReferenceContext, setFaceReferenceContext] = useState<
    { authorizationToken: string; expiresAt?: string } | null
  >(initialHandoff.faceReferenceContext);
  const [historyRole, setHistoryRole] = useState<GenerationReferenceRole>('character_reference');
  const bundle = useQuery({ queryKey: ['attribute-bundle'], queryFn: getAttributesBundle, staleTime: 10 * 60_000 });
  const visualManifests = useQuery({
    queryKey: ['studio-visual-manifests', 'scene'],
    queryFn: ({ signal }) => loadStudioVisualManifests('scene', signal),
    staleTime: 30 * 60_000,
    retry: false
  });
  const groups = useMemo(() => bundle.data ? normalizeAttributeGroups(bundle.data) : [], [bundle.data]);
  const sceneGroups = useMemo(
    () => visibleStudioGroups(groups, 'scene', 'styled_character'),
    [groups]
  );
  const effectiveGuidedSelections = useMemo(
    () => filterStudioSelections(
      snapshot?.structuredSelectionsSnapshot as Record<string, AttributeSelection>
        || selections,
      'scene',
      'styled_character',
      references,
      characterOutfitBehavior
    ),
    [characterOutfitBehavior, references, selections, snapshot?.structuredSelectionsSnapshot]
  );
  const effectiveCustomColors = useMemo(
    () => restrictCustomColorsForReferences(customColors, {
      characterOwnsAppearance: Boolean(references.character_reference),
      characterOwnsOutfit: Boolean(
        references.character_reference && characterOutfitBehavior === 'preserve'
      ),
      outfitReferenceOwnsOutfit: Boolean(
        references.outfit_front || references.outfit_back
      )
    }),
    [characterOutfitBehavior, customColors, references]
  );
  const generationGuidedSelections = useMemo(
    () => applyCustomColorSelectionAuthority(
      effectiveGuidedSelections,
      effectiveCustomColors
    ),
    [effectiveCustomColors, effectiveGuidedSelections]
  );
  const guidedPreview = useMemo(
    () => compileSelectionPreview(
      generationGuidedSelections,
      'scene',
      'styled_character',
      effectiveCustomColors
    ),
    [effectiveCustomColors, generationGuidedSelections]
  );
  const useTemplate = useMutation({
    mutationFn: (template: SharedTemplate) => requestSharedSceneTemplate(template.id),
    onSuccess: next => {
      setSnapshot(next);
      setMode(next.authoringMode);
      setSelections(next.structuredSelectionsSnapshot as Record<string, AttributeSelection>);
      setCustomColors(createStudioCustomColors(readSnapshotCustomColors(next)));
      setManualPrompt(next.manualPromptSnapshot || next.finalPromptSnapshot || '');
    }
  });
  const activePrompt = mode === 'manual'
    ? manualPrompt
    : snapshot?.finalPromptSnapshot || guidedPreview;
  const activeSelections = mode === 'guided'
    ? generationGuidedSelections
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
    setCustomColors(createStudioCustomColors(next.customColors));
    setSnapshot(null);
    setReferences({});
    setCharacterOutfitBehavior('preserve');
    setCharacterProfileContext(null);
    setFaceReferenceContext(null);
  }, [actor?.userId]);

  useEffect(() => {
    if (hydratedLocationKey.current === location.key) return;
    hydratedLocationKey.current = location.key;
    const next = loadSceneHandoff();
    if (!next.hasHandoff) return;

    setSnapshot(next.snapshot);
    setReferences(next.references);
    setCharacterOutfitBehavior(next.characterOutfitBehavior);
    setCharacterProfileContext(next.characterProfileContext);
    setFaceReferenceContext(next.faceReferenceContext);

    if (next.snapshot) {
      setMode(next.snapshot.authoringMode);
      setSelections(
        next.snapshot.structuredSelectionsSnapshot as Record<string, AttributeSelection>
      );
      setCustomColors(createStudioCustomColors(
        readSnapshotCustomColors(next.snapshot)
      ));
      setManualPrompt(
        next.snapshot.manualPromptSnapshot
        || next.snapshot.finalPromptSnapshot
        || ''
      );
    }
  }, [location.key]);

  useEffect(() => {
    if (!actor?.userId) return;
    writeActorScopedDraft({
      actorId: actor.userId,
      feature: FEATURE,
      schemaVersion: SCHEMA_VERSION,
      payload: { mode, manualPrompt, selections, lockedFields, customColors }
    });
  }, [actor?.userId, customColors, lockedFields, manualPrompt, mode, selections]);

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
        customColors={effectiveCustomColors}
        authoringMode={mode}
        references={references}
        onReferencesChange={next => {
          if (next.face_reference !== references.face_reference) {
            setFaceReferenceContext(null);
          }
          if (next.character_reference !== references.character_reference) {
            setCharacterOutfitBehavior('preserve');
            setCharacterProfileContext(null);
          }
          setReferences(next);
        }}
        sceneTemplateSnapshot={snapshot as unknown as Record<string, unknown> | null}
        characterProfileContext={characterProfileContext}
        characterReferenceOutfitBehavior={characterOutfitBehavior}
        faceReferenceContext={faceReferenceContext}
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
              manifests={visualManifests.data}
              selections={selections}
              customColors={customColors}
              references={references}
              characterOutfitBehavior={characterOutfitBehavior}
              lockedFields={lockedFields}
              onLockChange={(fieldName, locked) => {
                setLockedFields(current => locked
                  ? [...new Set([...current, fieldName])]
                  : current.filter(item => item !== fieldName));
              }}
              onCustomColorsChange={colors => {
                setCustomColors(colors);
                setSnapshot(null);
              }}
              onChange={next => { setSelections(next); setSnapshot(null); }}
            /> : (
              <Surface className="studio-manual-prompt"><label htmlFor="scene-manual-prompt">{t('ui.scene.manualLabel')}</label><textarea id="scene-manual-prompt" value={manualPrompt} onChange={event => { setManualPrompt(event.target.value); setSnapshot(null); }} placeholder={t('ui.scene.manualPlaceholder')} /></Surface>
            )}
            {availableRoles.length ? <HistoryReferencePicker
              roles={availableRoles}
              selectedRole={historyRole}
              onRoleChange={setHistoryRole}
              onPick={(role, imageUrl) => {
                if (role === 'character_reference') {
                  setCharacterOutfitBehavior('preserve');
                  setCharacterProfileContext(null);
                }
                setReferences(current => ({ ...current, [role]: imageUrl }));
              }}
            /> : null}
          </>
        )}
        studioConfigActions={(
          <StudioConfiguratorActions
            randomizeDisabled={mode === 'manual'}
            onReset={() => {
              setSelections({});
              setLockedFields([]);
              setCustomColors(createStudioCustomColors());
              setManualPrompt('');
              setSnapshot(null);
              setReferences({});
              setCharacterOutfitBehavior('preserve');
              setCharacterProfileContext(null);
            }}
            onRandomize={() => {
              setSelections(randomizeStudioSelections(
                sceneGroups,
                new Set(lockedFields),
                selections,
                references,
                characterOutfitBehavior
              ));
              setSnapshot(null);
            }}
            onExport={() => downloadStudioConfig({
              mode: 'scene',
              authoringMode: mode,
              selections: mode === 'guided' ? generationGuidedSelections : {},
              customColors,
              lockedFields,
              manualPrompt: mode === 'manual' ? manualPrompt : '',
              characterReferenceOutfitBehavior: characterOutfitBehavior,
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
  customColors: StudioCustomColors;
} {
  type SceneDraft = {
    mode: AuthoringMode;
    manualPrompt: string;
    selections: Record<string, AttributeSelection>;
    lockedFields?: string[];
    customColors?: Partial<StudioCustomColors>;
  };
  const empty: SceneDraft = {
    mode: 'guided',
    manualPrompt: '',
    selections: {},
    lockedFields: [],
    customColors: createStudioCustomColors()
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
    lockedFields: Array.isArray(parsed.lockedFields) ? parsed.lockedFields : [],
    customColors: createStudioCustomColors(parsed.customColors)
  };
}

function readSnapshotCustomColors(
  snapshot: SceneTemplateSnapshot | null
): Partial<StudioCustomColors> | null {
  if (!snapshot) return null;
  const value = snapshot.customColorsSnapshot;
  return value && typeof value === 'object'
    ? value as Partial<StudioCustomColors>
    : null;
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
  hasHandoff: boolean;
  snapshot: SceneTemplateSnapshot | null;
  references: Partial<Record<GenerationReferenceRole, string>>;
  characterOutfitBehavior: CharacterOutfitBehavior;
  characterProfileContext: Record<string, unknown> | null;
  faceReferenceContext: { authorizationToken: string; expiresAt?: string } | null;
} {
  const empty = {
    hasHandoff: false,
    snapshot: null,
    references: {},
    characterOutfitBehavior: 'preserve' as CharacterOutfitBehavior,
    characterProfileContext: null,
    faceReferenceContext: null
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
      characterType?: string;
      outfitBehavior?: string;
      characterProfileContext?: Record<string, unknown>;
    }>({ actorId: activeActorId, kind: 'character', consume: true });
    const face = readFaceReferenceHandoff(activeActorId, 'scene_builder');
    const characterPayload = character?.payload?.destination === 'scene_builder'
      ? character.payload
      : null;
    return {
      hasHandoff: Boolean(template || characterPayload || face),
      snapshot: template?.payload?.sceneTemplateSnapshot
        || template?.payload?.payload?.snapshot
        || template?.payload?.payload?.sceneTemplateSnapshot
        || null,
      references: characterPayload?.characterReferenceUrl
        ? { character_reference: characterPayload.characterReferenceUrl }
        : face?.referenceValue.imageUrl
          ? { face_reference: face.referenceValue.imageUrl }
          : {},
      characterOutfitBehavior:
        characterPayload?.outfitBehavior === 'replaceable'
        || characterPayload?.characterType === 'reusable_model'
          ? 'replaceable'
          : 'preserve',
      characterProfileContext: characterPayload?.characterProfileContext || null,
      faceReferenceContext: face
        ? { authorizationToken: face.authorizationToken, expiresAt: face.expiresAt }
        : null
    };
  } catch {
    return empty;
  }
}
