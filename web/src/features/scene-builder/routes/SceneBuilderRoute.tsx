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
import { getCharacter, getMyCreatorProfile } from '../../profiles/api/profileApi';
import { characterDisplayImages } from '../../profiles/characterDisplayImage';
import { readCharacterHandoffNavigationState } from '../../profiles/characterHandoffNavigation';
import {
  compileSelectionPreview,
  normalizeAttributeGroups,
  sanitizeAttributeSelections,
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
import {
  characterOutfitBehaviorForType,
  type CharacterOutfitBehavior
} from '../../studio/referenceAuthorityPolicy';
import {
  downloadStudioConfig,
  lightweightStudioReferences
} from '../../studio/studioConfigFile';
import { requestSharedSceneTemplate } from '../api/sceneTemplateApi';
import { HistoryReferencePicker } from '../components/HistoryReferencePicker';
import { SharedTemplatePanel } from '../components/SharedTemplatePanel';
import { ScenePoseControlPanel } from '../components/ScenePoseControlPanel';
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
import { TemplateScenePanel } from '../components/TemplateScenePanel';
import {
  TemplateReadinessPanel
} from '../../../components/templates/TemplateReadinessPanel';
import {
  getMissingTemplateReferenceRequirements
} from '../templateReferenceRequirements';
import {
  applyScenePoseRecipe,
  applyScenePoseStyle,
  isScenePoseRecipeAdjusted,
  isScenePoseStyleCompatible,
  normalizeScenePoseRecipes,
  normalizeScenePoseStyles,
  type ScenePoseControlMode
} from '../scenePoseRecipeModel';
import { resolveCharacterPresentationGender } from '../characterPresentationModel';

type AuthoringMode = 'guided' | 'manual';
const FEATURE = 'scene-builder';
const SCHEMA_VERSION = 3;
const SIMPLE_VISIBLE_GROUPS = new Set([
  'Character', 'Face', 'Hair', 'Skin', 'Body', 'Clothing', 'Quality'
]);
const SCENE_RECIPE_OWNED_FIELDS = new Set([
  'Brand', 'Lens', 'ISO', 'White Balance', 'Set Design', 'Pose Style'
]);
const SCENE_CURATED_OPTIONS = new Map<string, ReadonlySet<string>>([
  ['Motion Blur', new Set([
    'camera.blur_00',
    'camera.blur_01',
    'camera.blur_02',
    'camera.blur_05'
  ])]
]);

export function SceneBuilderRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const navigate = useNavigate();
  const location = useLocation();
  const previousActorId = useRef(getActiveActorId());
  const persistenceActorId = useRef(getActiveActorId());
  const hydratedLocationKey = useRef(location.key);
  const initialHandoff = useMemo(() => loadSceneHandoff(location.state), []);
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
    sanitizeAttributeSelections(
      initialHandoff.snapshot?.structuredSelectionsSnapshot || initialDraft.selections
    )
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
  const [poseControlMode, setPoseControlMode] = useState<ScenePoseControlMode>(
    initialHandoff.snapshot?.poseControlMode || initialDraft.poseControlMode
  );
  const [scenePoseRecipeId, setScenePoseRecipeId] = useState<string | null>(
    initialHandoff.snapshot?.scenePoseRecipeId || initialDraft.scenePoseRecipeId
  );
  const [appliedScenePoseRecipeVersion, setAppliedScenePoseRecipeVersion] = useState<number | null>(
    initialHandoff.snapshot?.scenePoseRecipeVersion || initialDraft.scenePoseRecipeVersion
  );
  const [snapshot, setSnapshot] = useState<SceneTemplateSnapshot | null>(initialHandoff.snapshot);
  const [templateUseContext, setTemplateUseContext] = useState<TemplateUseContext | null>(
    initialHandoff.templateUseContext
  );
  const [templatePostId, setTemplatePostId] = useState<string | null>(initialHandoff.templatePostId);
  const templateActive = Boolean(snapshot);
  const normalDraft = useRef(initialDraft);
  const [characterHandoffBlocked, setCharacterHandoffBlocked] = useState(initialHandoff.characterHandoffBlocked);
  const [references, setReferences] = useState<Partial<Record<GenerationReferenceRole, string>>>(initialHandoff.references);
  const [characterOutfitBehavior, setCharacterOutfitBehavior] = useState<CharacterOutfitBehavior>(
    initialHandoff.characterOutfitBehavior
  );
  const [characterProfileContext, setCharacterProfileContext] = useState<Record<string, unknown> | null>(
    initialHandoff.characterProfileContext
  );
  const [characterPresentationGender, setCharacterPresentationGender] = useState<AttributeSelection | undefined>(
    initialHandoff.characterPresentationGender
  );
  const [faceReferenceContext, setFaceReferenceContext] = useState<
    { authorizationToken: string; expiresAt?: string } | null
  >(initialHandoff.faceReferenceContext);
  const [historyRole, setHistoryRole] = useState<GenerationReferenceRole>('character_reference');
  const displayCharacterId = typeof characterProfileContext?.characterProfileId === 'string' ? characterProfileContext.characterProfileId : '';
  const displayCharacterQuery = useQuery({
    queryKey: ['character', actor?.userId || 'loading', displayCharacterId],
    queryFn: () => getCharacter(displayCharacterId),
    enabled: Boolean(actor && displayCharacterId && references.character_reference),
    staleTime: 30_000, retry: false
  });
  const displayCharacter = actor?.userId === persistenceActorId.current && references.character_reference
    && !displayCharacterQuery.isError
    && displayCharacterQuery.data?.id === displayCharacterId
    && displayCharacterQuery.data.characterProfileVersionId === characterProfileContext?.characterProfileVersionId
    ? displayCharacterQuery.data : null;
  useEffect(() => { if (initialHandoff.hasCharacterHandoff) clearHandoff('character'); }, [initialHandoff.hasCharacterHandoff]);
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
  const scenePoseRecipes = useMemo(
    () => normalizeScenePoseRecipes(bundle.data?.scenePoseRecipes),
    [bundle.data?.scenePoseRecipes]
  );
  const scenePoseStyles = useMemo(
    () => normalizeScenePoseStyles(bundle.data?.scenePoseRecipes),
    [bundle.data?.scenePoseRecipes]
  );
  const selectedScenePoseRecipe = useMemo(
    () => scenePoseRecipes.find(recipe => recipe.id === scenePoseRecipeId) || null,
    [scenePoseRecipeId, scenePoseRecipes]
  );
  const selectedScenePoseStyleId = useMemo(() => {
    const optionId = selections['Pose Style']?.id;
    return scenePoseStyles.find(style => style.optionId === optionId)?.id
      || scenePoseStyles.find(style => style.optionId === null)?.id
      || 'pose-style.auto';
  }, [scenePoseStyles, selections]);
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
    additionalDirection,
    poseControlMode,
    scenePoseRecipeId,
    scenePoseRecipeVersion: appliedScenePoseRecipeVersion
  }), [
    additionalDirection,
    appliedScenePoseRecipeVersion,
    effectiveCustomColors,
    generationGuidedSelections,
    guidedPreview,
    manualPrompt,
    mode,
    poseControlMode,
    references,
    scenePoseRecipeId
  ]);
  const effectiveSnapshot = snapshot || authoredSnapshot;
  const useTemplate = useMutation({
    mutationFn: (template: SharedTemplate) => requestSharedSceneTemplate(template.id),
    onSuccess: (next, template) => {
      setCharacterHandoffBlocked(false);
      setTemplatePostId(next.context?.sourceCommunityPostId || template.id);
      setSnapshot(next.snapshot);
      setTemplateUseContext(next.context);
      setReferences({});
      setCharacterOutfitBehavior('preserve');
      setCharacterProfileContext(null);
      setCharacterPresentationGender(undefined);
      setFaceReferenceContext(null);
      setMode(next.snapshot.authoringMode);
      setPoseControlMode(next.snapshot.poseControlMode || 'advanced');
      setScenePoseRecipeId(next.snapshot.scenePoseRecipeId || null);
      setAppliedScenePoseRecipeVersion(next.snapshot.scenePoseRecipeVersion || null);
      setSelections(sanitizeAttributeSelections(next.snapshot.structuredSelectionsSnapshot));
      setCustomColors(createStudioCustomColors(readSnapshotCustomColors(next.snapshot)));
      setManualPrompt(next.snapshot.manualPromptSnapshot || next.snapshot.finalPromptSnapshot || '');
      if (next.context) {
        writeHandoff({
          actorId: getActiveActorId(),
          kind: 'scene-template',
          payload: {
            postId: next.context.sourceCommunityPostId || template.id,
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
  const templateInputs = useMemo(() => templateUseContext?.publicInputSchema.inputs || snapshot?.replaceableVariables || [], [templateUseContext, snapshot]);
  const editableTemplateFields = useMemo(
    () => templateActive
      ? new Set(templateInputs
        .filter(input => input.replacementPolicy !== 'locked' && input.type !== 'reference_image')
        .map(input => input.sourceFieldName))
      : undefined,
    [templateActive, templateInputs]
  );
  const blockedRecipeGroups = useMemo(
    () => references.pose_reference ? new Set(['Pose']) : new Set<string>(),
    [references.pose_reference]
  );
  const selectedRecipeAdjusted = useMemo(
    () => selectedScenePoseRecipe
      ? isScenePoseRecipeAdjusted(
        selectedScenePoseRecipe,
        selections,
        editableTemplateFields,
        blockedRecipeGroups,
        groups
      )
      : false,
    [blockedRecipeGroups, editableTemplateFields, groups, selectedScenePoseRecipe, selections]
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
    setPoseControlMode(next.poseControlMode);
    setScenePoseRecipeId(next.scenePoseRecipeId);
    setAppliedScenePoseRecipeVersion(next.scenePoseRecipeVersion);
    setSnapshot(null);
    setTemplateUseContext(null);
    setTemplatePostId(null);
    setCharacterHandoffBlocked(false);
    normalDraft.current = next;
    clearHandoff('scene-template');
    setReferences({});
    setCharacterOutfitBehavior('preserve');
    setCharacterProfileContext(null);
    setCharacterPresentationGender(undefined);
    setFaceReferenceContext(null);
  }, [actor?.userId]);

  useEffect(() => {
    if (hydratedLocationKey.current === location.key) return;
    hydratedLocationKey.current = location.key;
    const next = loadSceneHandoff(location.state);
    if (!next.hasHandoff) return;

    const sameTemplate = next.templateUseContext?.templateUseSessionId
      ? next.templateUseContext.templateUseSessionId === templateUseContext?.templateUseSessionId
      : Boolean(snapshot) && next.templatePostId === templatePostId && JSON.stringify(next.snapshot) === JSON.stringify(snapshot);
    setCharacterHandoffBlocked(next.characterHandoffBlocked);
    if (next.hasTemplateHandoff && next.snapshot && !sameTemplate) {
      setReferences({}); setCharacterProfileContext(null); setCharacterPresentationGender(undefined);
      setFaceReferenceContext(null); setCharacterOutfitBehavior('preserve');
      setTemplatePostId(next.templatePostId);
      setSnapshot(next.snapshot);
      setTemplateUseContext(next.templateUseContext);
      setMode(next.snapshot.authoringMode);
      setPoseControlMode(next.snapshot.poseControlMode || 'advanced');
      setScenePoseRecipeId(next.snapshot.scenePoseRecipeId || null);
      setAppliedScenePoseRecipeVersion(next.snapshot.scenePoseRecipeVersion || null);
      setSelections(sanitizeAttributeSelections(
        next.snapshot.structuredSelectionsSnapshot
      ));
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
      clearHandoff('character');
      setReferences(current => ({
        ...current,
        face_reference: undefined,
        character_reference: next.references.character_reference
      }));
      setCharacterOutfitBehavior(next.characterOutfitBehavior);
      setCharacterProfileContext(next.characterProfileContext);
      setCharacterPresentationGender(next.characterPresentationGender);
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
      setCharacterPresentationGender(undefined);
      setFaceReferenceContext(next.faceReferenceContext);
    }
  }, [location.key, location.state, snapshot, templatePostId, templateUseContext]);

  useEffect(() => {
    if (mode !== 'guided' || poseControlMode !== 'simple') return;
    if (templateActive || !scenePoseRecipes.length || !groups.length) return;
    const recipe = scenePoseRecipes.find(item => item.id === scenePoseRecipeId)
      || scenePoseRecipes.find(item => item.discoverable)
      || scenePoseRecipes[0];
    if (!recipe) return;
    if (
      scenePoseRecipeId === recipe.id
      && appliedScenePoseRecipeVersion === recipe.version
    ) return;
    const result = applyScenePoseRecipe({
      recipe,
      groups,
      selections,
      editableFields: editableTemplateFields,
      blockedGroups: blockedRecipeGroups
    });
    const selectedStyle = scenePoseStyles.find(style => style.id === selectedScenePoseStyleId);
    const nextSelections = applyScenePoseStyle({
      style: selectedStyle && isScenePoseStyleCompatible(selectedStyle, recipe.id)
        ? selectedStyle
        : null,
      recipeId: recipe.id,
      groups,
      selections: result.selections
    });
    setScenePoseRecipeId(recipe.id);
    setAppliedScenePoseRecipeVersion(recipe.version);
    setSelections(nextSelections);
  }, [
    appliedScenePoseRecipeVersion,
    blockedRecipeGroups,
    editableTemplateFields,
    groups,
    mode,
    poseControlMode,
    scenePoseRecipeId,
    scenePoseRecipes,
    scenePoseStyles,
    selectedScenePoseStyleId,
    selections,
    templateActive,
    templateUseContext
  ]);

  useEffect(() => {
    if (!actor?.userId) return;
    if (persistenceActorId.current !== actor.userId) { persistenceActorId.current = actor.userId; return; }
    if (templateActive || previousActorId.current !== actor.userId) return;
    normalDraft.current = { mode, manualPrompt, selections, lockedFields, customColors, additionalDirection, poseControlMode, scenePoseRecipeId, scenePoseRecipeVersion: appliedScenePoseRecipeVersion };
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
        additionalDirection,
        poseControlMode,
        scenePoseRecipeId,
        scenePoseRecipeVersion: appliedScenePoseRecipeVersion
      }
    });
  }, [actor?.userId, additionalDirection, appliedScenePoseRecipeVersion, customColors, lockedFields, manualPrompt, mode, poseControlMode, scenePoseRecipeId, selections, templateActive]);

  function exitTemplate() {
    const draft = normalDraft.current;
    setSnapshot(null); setTemplateUseContext(null); setTemplatePostId(null); clearHandoff('scene-template');
    setCharacterHandoffBlocked(false);
    setMode(draft.mode); setManualPrompt(draft.manualPrompt); setSelections(draft.selections);
    setLockedFields(draft.lockedFields); setCustomColors(draft.customColors); setAdditionalDirection(draft.additionalDirection);
    setPoseControlMode(draft.poseControlMode); setScenePoseRecipeId(draft.scenePoseRecipeId); setAppliedScenePoseRecipeVersion(draft.scenePoseRecipeVersion);
    setReferences({}); setCharacterProfileContext(null); setCharacterPresentationGender(undefined); setFaceReferenceContext(null); setCharacterOutfitBehavior('preserve');
  }

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
          <strong>{t(templateActive ? 'ui.templateScene.title' : 'ui.studio.title')}</strong>
          <span>{t('ui.scene.title')}</span>
        </div>
      </header>
      <GenerationExperience
        surface="studio"
        generationMode="scene"
        prompt={activePrompt}
        onPromptChange={mode === 'manual' ? setManualPrompt : () => {}}
        selections={activeSelections}
        additionalDirection={templateActive ? '' : additionalDirection}
        customColors={effectiveCustomColors}
        authoringMode={mode}
        references={references}
        referenceDisplayPreviews={displayCharacter && references.character_reference ? {
          character_reference: { reference: references.character_reference, sources: characterDisplayImages(displayCharacter), label: t('ui.templateScene.characterArtwork', { name: displayCharacter.displayName }) }
        } : undefined}
        onReferencesChange={next => {
          if (next.face_reference !== references.face_reference) {
            setFaceReferenceContext(null);
          }
          if (next.character_reference !== references.character_reference) {
            setCharacterOutfitBehavior('replaceable');
            setCharacterProfileContext(null);
            setCharacterPresentationGender(undefined);
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
        studioBuilderTitle={templateActive ? t('ui.templateScene.inputs') : undefined}
        studioConfigurationFirst={templateActive}
        blockedReason={missing.length ? t('ui.scene.templateRequiredTitle') : null}
        blockedNotice={missing.length ? (
          <TemplateReadinessPanel
            missing={missing}
            onResolve={scrollToTemplateReferences}
          />
        ) : undefined}
        referenceRoles={availableRoles}
        studioModeSelector={templateActive ? undefined : (
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
        studioBuilder={templateActive ? (
          <TemplateScenePanel key={`${actor?.userId}:${templateUseContext?.templateUseSessionId || templatePostId}`}
            postId={templateUseContext?.sourceCommunityPostId || templatePostId} accessCredits={templateUseContext?.pricing.accessCredits}
            characterAllowed={availableRoles.includes('character_reference')} characterReference={references.character_reference}
            displayCharacter={displayCharacter}
            onCharacter={handoff => {
              setReferences(current => ({ ...current, face_reference: undefined, character_reference: handoff.characterReferenceUrl }));
              setCharacterProfileContext(handoff.characterProfileContext); setCharacterOutfitBehavior('replaceable');
              setCharacterPresentationGender(resolveCharacterPresentationGender(handoff)); setFaceReferenceContext(null);
            }} onClearCharacter={() => { setReferences(current => ({ ...current, character_reference: undefined })); setCharacterProfileContext(null); setCharacterPresentationGender(undefined); }} onExit={exitTemplate}>
            {characterHandoffBlocked ? <p role="alert">{t('ui.templateScene.handoffUnsupported')}</p> : null}
            {editableTemplateFields?.has('manualPromptSnapshot') ? <label className="template-scene-panel__manual">{t('ui.scene.manualLabel')}<textarea value={manualPrompt} onChange={event => setManualPrompt(event.target.value)} /></label> : null}
            {editableTemplateFields && [...editableTemplateFields].some(field => field !== 'manualPromptSnapshot') ? <GuidedAttributeForm groups={groups} mode="scene" characterType="styled_character"
              manifests={visualManifests.data} selections={selections} presentationGender={characterPresentationGender} customColors={customColors}
              references={references} characterOutfitBehavior={characterOutfitBehavior} editableFields={editableTemplateFields}
              customInputLimits={bundle.data?.inputPolicy?.customAttribute} onCustomColorsChange={setCustomColors} onChange={setSelections} singleOpen /> : <p>{t('ui.templateScene.fixed')}</p>}
          </TemplateScenePanel>
        ) : (
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
            {mode === 'guided' ? <>
            <ScenePoseControlPanel
              mode={poseControlMode}
              recipes={scenePoseRecipes}
              poseStyles={scenePoseStyles}
              selectedRecipeId={scenePoseRecipeId}
              selectedPoseStyleId={selectedScenePoseStyleId}
              poseStyleEditable={!editableTemplateFields || editableTemplateFields.has('Pose Style')}
              selectedRecipeAdjusted={selectedRecipeAdjusted}
              onModeChange={nextMode => {
                setPoseControlMode(nextMode);
                if (nextMode === 'advanced' && selections['Pose Style']) {
                  setSelections(current => {
                    const next = { ...current };
                    delete next['Pose Style'];
                    return next;
                  });
                }
              }}
              onSelectRecipe={recipe => {
                const result = applyScenePoseRecipe({
                  recipe,
                  groups,
                  selections,
                  editableFields: editableTemplateFields,
                  blockedGroups: blockedRecipeGroups
                });
                const selectedStyle = scenePoseStyles.find(
                  style => style.id === selectedScenePoseStyleId
                );
                const nextSelections = applyScenePoseStyle({
                  style: selectedStyle && isScenePoseStyleCompatible(selectedStyle, recipe.id)
                    ? selectedStyle
                    : null,
                  recipeId: recipe.id,
                  groups,
                  selections: result.selections
                });
                setScenePoseRecipeId(recipe.id);
                setAppliedScenePoseRecipeVersion(recipe.version);
                setSelections(nextSelections);
                if (!templateUseContext) setSnapshot(null);
              }}
              onSelectPoseStyle={style => {
                if (editableTemplateFields && !editableTemplateFields.has('Pose Style')) return;
                setSelections(current => applyScenePoseStyle({
                  style,
                  recipeId: scenePoseRecipeId,
                  groups,
                  selections: current
                }));
                if (!templateUseContext) setSnapshot(null);
              }}
            />
            <GuidedAttributeForm
              groups={groups}
              mode="scene"
              characterType="styled_character"
              manifests={visualManifests.data}
              selections={selections}
              presentationGender={characterPresentationGender}
              customColors={customColors}
              customInputLimits={bundle.data?.inputPolicy?.customAttribute}
              references={references}
              characterOutfitBehavior={characterOutfitBehavior}
              lockedFields={lockedFields}
              editableFields={editableTemplateFields}
              includedGroups={poseControlMode === 'simple' ? SIMPLE_VISIBLE_GROUPS : undefined}
              excludedFields={SCENE_RECIPE_OWNED_FIELDS}
              optionIdsByField={SCENE_CURATED_OPTIONS}
              singleOpen
              showNextActions
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
              onPick={(role, imageUrl, item) => {
                if (role === 'character_reference') {
                  setCharacterOutfitBehavior(characterOutfitBehaviorForType(
                    item.characterSheetConfig?.characterType
                  ));
                  setCharacterProfileContext(null);
                  setCharacterPresentationGender(resolveCharacterPresentationGender(item));
                }
                setReferences(current => ({ ...current, [role]: imageUrl }));
              }}
            /> : null}
          </>
        )}
        studioConfigActions={templateActive ? undefined : (
          <StudioConfiguratorActions
            randomizeDisabled={mode === 'manual'}
            onReset={() => {
              setSelections({});
              setLockedFields([]);
              setCustomColors(createStudioCustomColors());
              setAdditionalDirection('');
              setPoseControlMode('simple');
              setScenePoseRecipeId(null);
              setAppliedScenePoseRecipeVersion(null);
              setManualPrompt('');
              setSnapshot(null);
              setTemplateUseContext(null);
              clearHandoff('scene-template');
              setReferences({});
              setCharacterOutfitBehavior('preserve');
              setCharacterProfileContext(null);
              setCharacterPresentationGender(undefined);
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
            variant="scene"
          />
        )}
        studioQueueExtra={templateActive ? undefined : (
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
  poseControlMode: ScenePoseControlMode;
  scenePoseRecipeId: string | null;
  scenePoseRecipeVersion: number | null;
} {
  type SceneDraft = {
    mode: AuthoringMode;
    manualPrompt: string;
    selections: Record<string, AttributeSelection>;
    lockedFields?: string[];
    customColors?: Partial<StudioCustomColors>;
    additionalDirection?: string;
    poseControlMode?: ScenePoseControlMode;
    scenePoseRecipeId?: string | null;
    scenePoseRecipeVersion?: number | null;
  };
  const empty: SceneDraft = {
    mode: 'guided',
    manualPrompt: '',
    selections: {},
    lockedFields: [],
    customColors: createStudioCustomColors(),
    additionalDirection: '',
    poseControlMode: 'simple',
    scenePoseRecipeId: null,
    scenePoseRecipeVersion: null
  };
  const parsed = readActorScopedDraft<SceneDraft>({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback: empty,
    migrate: envelope => {
      const payload = envelope.payload;
      if (!payload || typeof payload !== 'object') return null;
      const legacy = payload as SceneDraft;
      if (envelope.schemaVersion >= 2) {
        return { ...empty, ...legacy, scenePoseRecipeVersion: null };
      }
      return {
        ...empty,
        ...legacy,
        poseControlMode: Object.keys(legacy.selections || {}).length ? 'advanced' : 'simple',
        scenePoseRecipeId: null,
        scenePoseRecipeVersion: null
      };
    }
  });
  return {
    mode: parsed.mode === 'manual' ? 'manual' : 'guided',
    manualPrompt: typeof parsed.manualPrompt === 'string' ? parsed.manualPrompt : '',
    selections: sanitizeAttributeSelections(parsed.selections),
    lockedFields: Array.isArray(parsed.lockedFields) ? parsed.lockedFields : [],
    customColors: createStudioCustomColors(parsed.customColors),
    additionalDirection: typeof parsed.additionalDirection === 'string'
      ? Array.from(parsed.additionalDirection)
        .slice(0, ADDITIONAL_DIRECTION_MAX_LENGTH)
        .join('')
      : '',
    poseControlMode: parsed.poseControlMode === 'advanced' ? 'advanced' : 'simple',
    scenePoseRecipeId: typeof parsed.scenePoseRecipeId === 'string'
      ? parsed.scenePoseRecipeId
      : null,
    scenePoseRecipeVersion: Number.isInteger(parsed.scenePoseRecipeVersion)
      ? Number(parsed.scenePoseRecipeVersion)
      : null
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
  if (context) return [...new Set(schemaRoles)];
  const snapshotRoles = Object.entries(snapshot.referenceSlotMapping)
    .filter(([, policy]) => policy.replacementPolicy !== 'locked')
    .flatMap(([fieldName]) => normalizeRole(fieldName));
  return [...new Set(snapshotRoles)];
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

function loadSceneHandoff(routeState: unknown = null): {
  hasHandoff: boolean;
  hasTemplateHandoff: boolean;
  hasCharacterHandoff: boolean;
  hasFaceHandoff: boolean;
  snapshot: SceneTemplateSnapshot | null;
  templateUseContext: TemplateUseContext | null;
  templatePostId: string | null;
  characterHandoffBlocked: boolean;
  references: Partial<Record<GenerationReferenceRole, string>>;
  characterOutfitBehavior: CharacterOutfitBehavior;
  characterProfileContext: Record<string, unknown> | null;
  characterPresentationGender: AttributeSelection | undefined;
  faceReferenceContext: { authorizationToken: string; expiresAt?: string } | null;
} {
  const empty = {
    hasHandoff: false,
    hasTemplateHandoff: false,
    hasCharacterHandoff: false,
    hasFaceHandoff: false,
    snapshot: null,
    templateUseContext: null,
    templatePostId: null,
    characterHandoffBlocked: false,
    references: {},
    characterOutfitBehavior: 'preserve' as CharacterOutfitBehavior,
    characterProfileContext: null,
    characterPresentationGender: undefined,
    faceReferenceContext: null
  };
  try {
    const activeActorId = getActiveActorId();
    const storedTemplate = readHandoff<{
      postId?: string;
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
    }>({ actorId: activeActorId, kind: 'character', consume: false });
    const routeCharacterPayload = readCharacterHandoffNavigationState(
      routeState,
      'scene_builder'
    );
    const face = readFaceReferenceHandoff(activeActorId, 'scene_builder');
    const storedTemplateContext = storedTemplate?.payload?.templateUseContext || null;
    const template = isExpiredTemplateUseContext(storedTemplateContext)
      ? null
      : storedTemplate;
    if (storedTemplate && !template) clearHandoff('scene-template');
    const characterPayload = routeCharacterPayload
      || (character?.payload?.destination === 'scene_builder'
        ? character.payload
        : null);
    const templateSnapshot = template?.payload?.sceneTemplateSnapshot
      || template?.payload?.payload?.snapshot
      || template?.payload?.payload?.sceneTemplateSnapshot || null;
    const applyCharacter = Boolean(characterPayload && (!template || (
      routeCharacterPayload && routeCharacterPayload.outfitBehavior === 'replaceable'
      && getTemplateReferenceRoles(templateSnapshot, storedTemplateContext).includes('character_reference')
    )));
    return {
      hasHandoff: Boolean(template || characterPayload || face),
      hasTemplateHandoff: Boolean(template),
      hasCharacterHandoff: applyCharacter,
      characterHandoffBlocked: Boolean(template && routeCharacterPayload && !applyCharacter),
      hasFaceHandoff: !template && Boolean(face),
      snapshot: templateSnapshot,
      templateUseContext: template?.payload?.templateUseContext || null,
      templatePostId: template?.payload?.templateUseContext?.sourceCommunityPostId || template?.payload?.postId || null,
      references: applyCharacter && characterPayload?.characterReferenceUrl
        ? { character_reference: characterPayload.characterReferenceUrl }
        : !template && face?.referenceValue.imageUrl
          ? { face_reference: face.referenceValue.imageUrl }
          : {},
      characterOutfitBehavior:
        characterPayload?.outfitBehavior === 'replaceable'
        || characterPayload?.characterType === 'reusable_model'
          ? 'replaceable'
          : 'preserve',
      characterProfileContext: applyCharacter ? characterPayload?.characterProfileContext || null : null,
      characterPresentationGender: applyCharacter ? resolveCharacterPresentationGender(characterPayload) : undefined,
      faceReferenceContext: !template && face
        ? { authorizationToken: face.authorizationToken, expiresAt: face.expiresAt }
        : null
    };
  } catch {
    return empty;
  }
}

function isExpiredTemplateUseContext(context: TemplateUseContext | null) {
  if (!context || typeof context.expiresAt !== 'string') return false;
  const expiresAt = Date.parse(context.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}
