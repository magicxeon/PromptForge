import { useMutation, useQuery } from '@tanstack/react-query';
import { FileText, SlidersHorizontal } from 'lucide-react';
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
import { getMyCreatorProfile } from '../../profiles/api/profileApi';
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
import type {
  SceneTemplateSnapshot,
  SharedTemplate,
  TemplateUseContext
} from '../schemas/sceneTemplateSchemas';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { useActor } from '../../../lib/auth/ActorProvider';
import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../../lib/persistence/actorScopedStorage';
import {
  clearHandoff,
  readHandoff,
  writeHandoff
} from '../../../lib/persistence/handoffStorage';
import { scheduleHashTargetScroll } from '../../../lib/navigation/hashScroll';
import { readFaceReferenceHandoff } from '../../../lib/persistence/faceReferenceHandoff';
import {
  applyCustomColorSelectionAuthority,
  createStudioCustomColors,
  restrictCustomColorsForReferences,
  type StudioCustomColors
} from '../../studio/attributes/customColorModel';
import { ADDITIONAL_DIRECTION_MAX_LENGTH } from '../../studio/additionalDirectionContract';
import { AdditionalDirectionField } from '../../studio/components/AdditionalDirectionField';
import {
  buildSceneTemplateSnapshot,
  buildTemplateReplacements
} from '../../templates/templateSerializer';
import { TemplateUseBanner } from '../../../components/templates/TemplateUseBanner';
import {
  TemplateReadinessPanel
} from '../../../components/templates/TemplateReadinessPanel';
import {
  getMissingTemplateReferenceRequirements
} from '../templateReferenceRequirements';

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
  const [additionalDirection, setAdditionalDirection] = useState(
    initialDraft.additionalDirection
  );
  const [snapshot, setSnapshot] = useState<SceneTemplateSnapshot | null>(initialHandoff.snapshot);
  const [templateUseContext, setTemplateUseContext] = useState<TemplateUseContext | null>(
    initialHandoff.templateUseContext
  );
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
  const ownCreatorProfile = useQuery({
    queryKey: ['creator-profile', 'me', actor?.userId || 'loading'],
    queryFn: getMyCreatorProfile,
    enabled: Boolean(actor)
  });
  const creatorProfileBase = ownCreatorProfile.data
    ? `/profiles/${encodeURIComponent(ownCreatorProfile.data.handle)}`
    : null;
  const groups = useMemo(() => bundle.data ? normalizeAttributeGroups(bundle.data) : [], [bundle.data]);
  const sceneGroups = useMemo(
    () => visibleStudioGroups(groups, 'scene', 'styled_character'),
    [groups]
  );
  const effectiveGuidedSelections = useMemo(
    () => filterStudioSelections(
      selections,
      'scene',
      'styled_character',
      references,
      characterOutfitBehavior
    ),
    [characterOutfitBehavior, references, selections]
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
  const authoredSnapshot = useMemo(() => buildSceneTemplateSnapshot({
    authoringMode: mode,
    finalPrompt: mode === 'manual' ? manualPrompt : guidedPreview,
    selections: generationGuidedSelections,
    customColors: effectiveCustomColors,
    references,
    additionalDirection
  }), [
    additionalDirection,
    effectiveCustomColors,
    generationGuidedSelections,
    guidedPreview,
    manualPrompt,
    mode,
    references
  ]);
  const effectiveSnapshot = snapshot || authoredSnapshot;
  const useTemplate = useMutation({
    mutationFn: (template: SharedTemplate) => requestSharedSceneTemplate(template.id),
    onSuccess: next => {
      setSnapshot(next.snapshot);
      setTemplateUseContext(next.context);
      setReferences({});
      setCharacterOutfitBehavior('preserve');
      setCharacterProfileContext(null);
      setFaceReferenceContext(null);
      setMode(next.snapshot.authoringMode);
      setSelections(next.snapshot.structuredSelectionsSnapshot as Record<string, AttributeSelection>);
      setCustomColors(createStudioCustomColors(readSnapshotCustomColors(next.snapshot)));
      setManualPrompt(next.snapshot.manualPromptSnapshot || next.snapshot.finalPromptSnapshot || '');
      if (next.context) {
        writeHandoff({
          actorId: getActiveActorId(),
          kind: 'scene-template',
          payload: {
            sceneTemplateSnapshot: next.snapshot,
            templateUseContext: next.context
          }
        });
      }
    }
  });
  const activePrompt = mode === 'manual'
    ? manualPrompt
    : guidedPreview;
  const activeSelections = mode === 'guided'
    ? generationGuidedSelections
    : {};
  const requiredRoles = getRequiredReferenceRoles(effectiveSnapshot, templateUseContext);
  const missing = getMissingTemplateReferenceRequirements(requiredRoles, references);
  const availableRoles = getTemplateReferenceRoles(effectiveSnapshot, templateUseContext);
  const editableTemplateFields = useMemo(
    () => templateUseContext
      ? new Set(templateUseContext.publicInputSchema.inputs
        .filter(input => input.replacementPolicy !== 'locked' && input.type !== 'reference_image')
        .map(input => input.sourceFieldName))
      : undefined,
    [templateUseContext]
  );
  const templateReplacements = useMemo(
    () => templateUseContext
      ? buildTemplateReplacements({
        publicInputSchema: templateUseContext.publicInputSchema,
        selections: generationGuidedSelections,
        references,
        manualPrompt
      })
      : {},
    [generationGuidedSelections, manualPrompt, references, templateUseContext]
  );

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
    setAdditionalDirection(next.additionalDirection);
    setSnapshot(null);
    setTemplateUseContext(null);
    clearHandoff('scene-template');
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

    if (next.hasTemplateHandoff && next.snapshot) {
      setSnapshot(next.snapshot);
      setTemplateUseContext(next.templateUseContext);
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
    if (next.hasCharacterHandoff) {
      setReferences(current => ({
        ...current,
        face_reference: undefined,
        character_reference: next.references.character_reference
      }));
      setCharacterOutfitBehavior(next.characterOutfitBehavior);
      setCharacterProfileContext(next.characterProfileContext);
      setFaceReferenceContext(null);
    }
    if (next.hasFaceHandoff) {
      setReferences(current => ({
        ...current,
        character_reference: undefined,
        face_reference: next.references.face_reference
      }));
      setCharacterOutfitBehavior('preserve');
      setCharacterProfileContext(null);
      setFaceReferenceContext(next.faceReferenceContext);
    }
  }, [location.key]);

  useEffect(() => {
    if (!actor?.userId) return;
    writeActorScopedDraft({
      actorId: actor.userId,
      feature: FEATURE,
      schemaVersion: SCHEMA_VERSION,
      payload: {
        mode,
        manualPrompt,
        selections,
        lockedFields,
        customColors,
        additionalDirection
      }
    });
  }, [actor?.userId, additionalDirection, customColors, lockedFields, manualPrompt, mode, selections]);

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
        additionalDirection={templateUseContext ? '' : additionalDirection}
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
        sceneTemplateSnapshot={effectiveSnapshot as unknown as Record<string, unknown>}
        templateUseContext={templateUseContext
          ? {
            templateUseSessionId: templateUseContext.templateUseSessionId,
            replacements: templateReplacements
          }
          : null}
        characterProfileContext={characterProfileContext}
        characterReferenceOutfitBehavior={characterOutfitBehavior}
        faceReferenceContext={faceReferenceContext}
        allowComparison
        showPromptEditor={false}
        layoutVariant="studio"
        blockedReason={missing.length ? t('ui.scene.templateRequiredTitle') : null}
        blockedNotice={missing.length ? (
          <TemplateReadinessPanel
            missing={missing}
            onResolve={scrollToTemplateReferences}
          />
        ) : undefined}
        referenceRoles={availableRoles}
        studioModeSelector={(
          <StudioModeSelector
            mode="scene"
            onChange={next => {
              navigate(next === 'scene'
                ? '/create/studio/scene'
                : next === 'character-sheet'
                  ? '/create/studio/character'
                  : '/create/studio/face');
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
              <Button variant={mode === 'guided' ? 'primary' : 'secondary'} icon={<SlidersHorizontal className="size-4" />} onClick={() => {
                setMode('guided');
                setSnapshot(null);
                setTemplateUseContext(null);
                clearHandoff('scene-template');
              }}>{t('ui.scene.guided')}</Button>
              {mode === 'guided' ? (
                <ConfirmDialog
                  trigger={<Button icon={<FileText className="size-4" />}>{t('ui.scene.manual')}</Button>}
                  title={t('ui.scene.copyTitle')}
                  description={t('ui.scene.copyDescription')}
                  confirmLabel={t('ui.scene.copyAction')}
                  onConfirm={() => {
                    setManualPrompt(current => current || guidedPreview);
                    setMode('manual');
                    setSnapshot(null);
                    setTemplateUseContext(null);
                    clearHandoff('scene-template');
                  }}
                />
              ) : <Button variant="primary" icon={<FileText className="size-4" />} onClick={() => setMode('manual')}>{t('ui.scene.manual')}</Button>}
            </div>
            {templateUseContext ? <TemplateUseBanner authoringMode={snapshot?.authoringMode || mode} accessCredits={templateUseContext.pricing.accessCredits} onClear={() => {
              setSnapshot(null);
              setTemplateUseContext(null);
              clearHandoff('scene-template');
            }} /> : null}
            {mode === 'guided' ? <>
            <GuidedAttributeForm
              groups={groups}
              mode="scene"
              characterType="styled_character"
              manifests={visualManifests.data}
              selections={selections}
              customColors={customColors}
              customInputLimits={bundle.data?.inputPolicy?.customAttribute}
              references={references}
              characterOutfitBehavior={characterOutfitBehavior}
              lockedFields={lockedFields}
              editableFields={editableTemplateFields}
              onLockChange={(fieldName, locked) => {
                setLockedFields(current => locked
                  ? [...new Set([...current, fieldName])]
                  : current.filter(item => item !== fieldName));
              }}
              onCustomColorsChange={colors => {
                setCustomColors(colors);
                if (!templateUseContext) setSnapshot(null);
              }}
              onChange={next => {
                setSelections(next);
                if (!templateUseContext) setSnapshot(null);
              }}
            />
            {templateUseContext ? null : (
              <AdditionalDirectionField
                value={additionalDirection}
                onChange={value => {
                  setAdditionalDirection(value);
                  setSnapshot(null);
                }}
              />
            )}
            </> : (
              <Surface className="studio-manual-prompt"><label htmlFor="scene-manual-prompt">{t('ui.scene.manualLabel')}</label><textarea id="scene-manual-prompt" value={manualPrompt} onChange={event => {
                setManualPrompt(event.target.value);
                if (!templateUseContext) setSnapshot(null);
              }} placeholder={t('ui.scene.manualPlaceholder')} /></Surface>
            )}
            {availableRoles.length ? <HistoryReferencePicker
              roles={availableRoles}
              selectedRole={historyRole}
              onRoleChange={setHistoryRole}
              viewAllHref={creatorProfileBase ? `${creatorProfileBase}/gallery` : null}
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
              setAdditionalDirection('');
              setManualPrompt('');
              setSnapshot(null);
              setTemplateUseContext(null);
              clearHandoff('scene-template');
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
              setTemplateUseContext(null);
              clearHandoff('scene-template');
            }}
            onExport={() => downloadStudioConfig({
              mode: 'scene',
              authoringMode: mode,
              selections: mode === 'guided' ? generationGuidedSelections : {},
              customColors,
              lockedFields,
              manualPrompt: mode === 'manual' ? manualPrompt : '',
              additionalDirection: mode === 'guided' ? additionalDirection : '',
              characterReferenceOutfitBehavior: characterOutfitBehavior,
              references: lightweightStudioReferences(references)
            })}
          />
        )}
        studioQueueExtra={(
          <>
            <SharedTemplatePanel
              viewAllHref={creatorProfileBase ? `${creatorProfileBase}/templates` : null}
              onSelect={template => useTemplate.mutate(template)}
            />
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
  additionalDirection: string;
} {
  type SceneDraft = {
    mode: AuthoringMode;
    manualPrompt: string;
    selections: Record<string, AttributeSelection>;
    lockedFields?: string[];
    customColors?: Partial<StudioCustomColors>;
    additionalDirection?: string;
  };
  const empty: SceneDraft = {
    mode: 'guided',
    manualPrompt: '',
    selections: {},
    lockedFields: [],
    customColors: createStudioCustomColors(),
    additionalDirection: ''
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
    customColors: createStudioCustomColors(parsed.customColors),
    additionalDirection: typeof parsed.additionalDirection === 'string'
      ? Array.from(parsed.additionalDirection)
        .slice(0, ADDITIONAL_DIRECTION_MAX_LENGTH)
        .join('')
      : ''
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

function getTemplateReferenceRoles(
  snapshot: SceneTemplateSnapshot | null,
  context: TemplateUseContext | null
): GenerationReferenceRole[] {
  if (!snapshot) return ['face_reference', 'character_reference', 'style_reference', 'pose_reference', 'outfit_front', 'outfit_back'];
  const schemaRoles = context?.publicInputSchema.inputs
    .filter(input => input.type === 'reference_image' && input.replacementPolicy !== 'locked')
    .flatMap(input => normalizeRole(input.sourceFieldName)) || [];
  return [...new Set([
    ...Object.keys(snapshot.referenceSlotMapping).flatMap(normalizeRole),
    ...schemaRoles
  ])];
}

function getRequiredReferenceRoles(
  snapshot: SceneTemplateSnapshot | null,
  context: TemplateUseContext | null
) {
  if (!snapshot) return [];
  const snapshotRoles = Object.entries(snapshot.referenceSlotMapping).flatMap(([key, policy]) =>
    policy.required === true ? normalizeRole(key) : []
  );
  const schemaRoles = context?.publicInputSchema.inputs
    .filter(input => input.type === 'reference_image'
      && input.required
      && input.replacementPolicy !== 'locked')
    .flatMap(input => normalizeRole(input.sourceFieldName)) || [];
  return [...new Set([...snapshotRoles, ...schemaRoles])];
}

function scrollToTemplateReferences() {
  const target = document.getElementById('reference-images');
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => {
    target?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, 350);
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
  hasTemplateHandoff: boolean;
  hasCharacterHandoff: boolean;
  hasFaceHandoff: boolean;
  snapshot: SceneTemplateSnapshot | null;
  templateUseContext: TemplateUseContext | null;
  references: Partial<Record<GenerationReferenceRole, string>>;
  characterOutfitBehavior: CharacterOutfitBehavior;
  characterProfileContext: Record<string, unknown> | null;
  faceReferenceContext: { authorizationToken: string; expiresAt?: string } | null;
} {
  const empty = {
    hasHandoff: false,
    hasTemplateHandoff: false,
    hasCharacterHandoff: false,
    hasFaceHandoff: false,
    snapshot: null,
    templateUseContext: null,
    references: {},
    characterOutfitBehavior: 'preserve' as CharacterOutfitBehavior,
    characterProfileContext: null,
    faceReferenceContext: null
  };
  try {
    const activeActorId = getActiveActorId();
    const template = readHandoff<{
      sceneTemplateSnapshot?: SceneTemplateSnapshot;
      templateUseContext?: TemplateUseContext;
      payload?: { snapshot?: SceneTemplateSnapshot; sceneTemplateSnapshot?: SceneTemplateSnapshot };
    }>({ actorId: activeActorId, kind: 'scene-template', consume: false });
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
      hasTemplateHandoff: Boolean(template),
      hasCharacterHandoff: Boolean(characterPayload),
      hasFaceHandoff: Boolean(face),
      snapshot: template?.payload?.sceneTemplateSnapshot
        || template?.payload?.payload?.snapshot
        || template?.payload?.payload?.sceneTemplateSnapshot
        || null,
      templateUseContext: template?.payload?.templateUseContext || null,
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
