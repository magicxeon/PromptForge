import * as Dialog from '@radix-ui/react-dialog';
import { Check, CircleDashed, Image as ImageIcon, Shirt, Sparkles, Upload, X } from 'lucide-react';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { composeGenerationReferences, uploadGenerationReference } from '../../generation/api/generationApi';
import {
  approveCharacterLookVersion,
  createCharacterLookDraft,
  getCharacterLookGenerationPlan,
  reviewGeneratedCharacterLookVersion,
  reviewCharacterLookVersion
} from '../api/profileApi';
import type { CharacterLook, CharacterLookGenerationPlan } from '../schemas/profileSchemas';
import { CharacterLookGenerationDialog } from './CharacterLookGenerationDialog';
import { ApiError } from '../../../lib/api/apiError';

export type CharacterLookDialogMode = 'ai' | 'upload';

export type CharacterLookSuggestion = {
  lookName: string;
  wardrobeDirection: string;
  garments: { upper: string; lower: string; outerwear: string; footwear: string; accessories: string[] };
  palette: string[];
  materials: string[];
  sceneScope: 'film_wide' | 'scene_specific';
  recommendedSceneIds: string[];
  rationale: string;
  movementConstraints: string[];
  continuityNotes: string[];
  warnings: string[];
  provenance: Record<string, unknown>;
  billingStatus: 'qualification_no_charge';
};

type GarmentRole = 'upper' | 'lower' | 'outerwear' | 'footwear' | 'accessory';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterProfileId: string;
  characterProfileVersionId: string;
  characterDisplayName?: string;
  initialMode?: CharacterLookDialogMode;
  lookToPrepare?: CharacterLook | null;
  requestAiSuggestion?: () => Promise<CharacterLookSuggestion>;
  onSaved: (look: CharacterLook) => void;
};

const STANDARD_SHEET_MANIFEST = {
  layoutVersion: 'character-look-sheet-v1',
  regions: {
    front: { x: 0.02, y: 0.02, width: 0.3, height: 0.62 },
    side: { x: 0.35, y: 0.02, width: 0.3, height: 0.62 },
    back: { x: 0.68, y: 0.02, width: 0.3, height: 0.62 },
    face: { x: 0.35, y: 0.67, width: 0.3, height: 0.3 }
  }
};

export function CharacterLookDialog({
  open,
  onOpenChange,
  characterProfileId,
  characterProfileVersionId,
  characterDisplayName,
  initialMode = 'upload',
  lookToPrepare = null,
  requestAiSuggestion,
  onSaved
}: Props) {
  const { t } = useTranslation('cinematic');
  const [mode, setMode] = useState<CharacterLookDialogMode>(initialMode);
  const [uploadKind, setUploadKind] = useState<'garment' | 'sheet'>('garment');
  const [garmentSourceMode, setGarmentSourceMode] = useState<'full_look' | 'separate'>('full_look');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [pieceFiles, setPieceFiles] = useState<Partial<Record<GarmentRole, File>>>({});
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionFailed, setSuggestionFailed] = useState(false);
  const [suggestion, setSuggestion] = useState<CharacterLookSuggestion | null>(null);
  const [generationPlan, setGenerationPlan] = useState<CharacterLookGenerationPlan | null>(null);
  const [generationPlanLoading, setGenerationPlanLoading] = useState(false);
  const [adoptingResultId, setAdoptingResultId] = useState<string | null>(null);
  const [dialogView, setDialogView] = useState<'source' | 'generation'>('source');
  const [returnedReviewLook, setReturnedReviewLook] = useState<CharacterLook | null>(null);
  const [sourcePreviewReady, setSourcePreviewReady] = useState(false);
  const [reviewMediaReady, setReviewMediaReady] = useState(false);
  const [useCompleteSheetUpload, setUseCompleteSheetUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previewUrl = useMemo(() => sourceFile ? URL.createObjectURL(sourceFile) : null, [sourceFile]);
  const preparationLook = returnedReviewLook || lookToPrepare;
  const preparationVersion = useMemo(() => preparationLook?.versions.find(version => (
    version.id === preparationLook.activeVersionId
  )) || null, [preparationLook]);
  const reviewedPreparation = preparationVersion?.status === 'review'
    && Boolean(preparationVersion.approvedViewAssets);
  const needsCompleteSheetUpload = !reviewedPreparation && (
    preparationVersion?.sourceMode === 'uploaded_character_sheet' || useCompleteSheetUpload
  );
  const sourceReferenceRoles = useMemo(() => preparationVersion
    ? Object.entries(preparationVersion.garmentAuthorities)
      .flatMap(([garment, views]) => Object.keys(views).map(view => `${garment}:${view}`))
    : [], [preparationVersion]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    setSourcePreviewReady(false);
  }, [previewUrl]);

  useEffect(() => {
    setReviewMediaReady(false);
  }, [preparationVersion?.id, preparationVersion?.reviewMediaUrl]);

  useEffect(() => {
    if (!open) return;
    setMode(lookToPrepare ? 'upload' : initialMode);
    setUploadKind('garment');
    setGarmentSourceMode('full_look');
    setName(lookToPrepare?.name || '');
    setDescription(lookToPrepare?.description || '');
    setSourceFile(null);
    setPieceFiles({});
    setRightsAccepted(false);
    setError(null);
    setSuggestionFailed(false);
    setSuggestion(null);
    setGenerationPlan(null);
    setGenerationPlanLoading(false);
    setAdoptingResultId(null);
    setDialogView('source');
    setReturnedReviewLook(null);
    setSourcePreviewReady(false);
    setReviewMediaReady(false);
    setUseCompleteSheetUpload(false);
  }, [initialMode, lookToPrepare, open, characterProfileId, characterProfileVersionId]);

  const canSave = Boolean(
    preparationLook
      ? !saving && (reviewedPreparation
        ? reviewMediaReady
        : sourceFile && sourcePreviewReady && rightsAccepted)
      : name.trim()
        && !saving
        && (mode === 'ai'
          ? description.trim()
          : uploadKind === 'sheet'
            ? sourceFile && sourcePreviewReady
            : garmentSourceMode === 'full_look'
              ? sourceFile
              : pieceFiles.upper && pieceFiles.lower)
        && (mode !== 'upload' || uploadKind !== 'sheet' || (sourcePreviewReady && rightsAccepted))
  );

  async function requestSuggestion() {
    if (!requestAiSuggestion || suggesting) return;
    setSuggesting(true);
    setSuggestionFailed(false);
    setError(null);
    try {
      const next = await requestAiSuggestion();
      setSuggestion(next);
      setName(next.lookName);
      setDescription(next.wardrobeDirection);
    } catch (reason) {
      setSuggestionFailed(true);
      setError(reason instanceof Error ? reason.message : t('cinematic.status.saveFailed'));
    } finally {
      setSuggesting(false);
    }
  }

  async function openAiGeneration() {
    if (!preparationLook || generationPlanLoading) return;
    if (generationPlan) {
      setDialogView('generation');
      return;
    }
    setGenerationPlanLoading(true);
    setError(null);
    try {
      const plan = await getCharacterLookGenerationPlan(
        characterProfileId,
        preparationLook.id,
        preparationLook.activeVersionId
      );
      setGenerationPlan(plan);
      setDialogView('generation');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('cinematic.status.saveFailed'));
    } finally {
      setGenerationPlanLoading(false);
    }
  }

  async function adoptGeneratedSheet(generationResultId: string) {
    if (!preparationLook || adoptingResultId) return;
    setAdoptingResultId(generationResultId);
    setError(null);
    try {
      const reviewed = await reviewGeneratedCharacterLookVersion(
        characterProfileId,
        preparationLook.id,
        preparationLook.activeVersionId,
        generationResultId
      );
      setReturnedReviewLook(reviewed);
      setGenerationPlan(null);
      setAdoptingResultId(null);
      setDialogView('source');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('cinematic.status.saveFailed'));
      setAdoptingResultId(null);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const intent = submitter?.dataset.intent || 'continue';
    setSaving(true);
    setError(null);
    try {
      if (preparationLook) {
        let reviewed = preparationLook;
        if (!reviewedPreparation) {
          const source = await uploadGenerationReference(
            await readFileAsDataUrl(sourceFile as File),
            'outfit_front',
            'character-look-sheet'
          );
          reviewed = await reviewCharacterLookVersion(
            characterProfileId,
            preparationLook.id,
            preparationLook.activeVersionId,
            {
              sheetAssetId: source.referenceId,
              cropManifest: STANDARD_SHEET_MANIFEST,
              rightsDeclarationAccepted: rightsAccepted
            }
          );
          setReturnedReviewLook(reviewed);
          setSourceFile(null);
          setRightsAccepted(false);
          return;
        }
        finish(await approveCharacterLookVersion(
          characterProfileId,
          reviewed.id,
          reviewed.activeVersionId
        ));
        return;
      }
      const idempotencyKey = `character-look:${characterProfileId}:${crypto.randomUUID()}`;
      if (mode === 'ai') {
        const proposal = await createCharacterLookDraft(characterProfileId, {
          characterProfileVersionId,
          name: name.trim(),
          description: description.trim(),
          sourceMode: 'ai_suggestion',
          suggestionSnapshot: suggestion ? structuredClone(suggestion) as unknown as Record<string, unknown> : null,
          idempotencyKey
        });
        if (intent === 'draft') finish(proposal);
        else setReturnedReviewLook(proposal);
        return;
      }

      if (uploadKind === 'garment' && garmentSourceMode === 'separate') {
        const uploaded = await Promise.all((Object.entries(pieceFiles) as [GarmentRole, File][]).map(async ([role, file]) => [
          role,
          await uploadGenerationReference(await readFileAsDataUrl(file), 'outfit_front', `character-look-${role}`)
        ] as const));
        const composite = await composeGenerationReferences(
          uploaded.map(([, source]) => source.referenceId),
          'outfit_front',
          'character-look-separate-pieces'
        );
        const garmentAuthorities = {
          ...Object.fromEntries(uploaded.map(([role, source]) => [role, { front: source.referenceId }])),
          full_look: { front: composite.referenceId }
        };
        const draft = await createCharacterLookDraft(characterProfileId, {
          characterProfileVersionId,
          name: name.trim(),
          description: description.trim() || undefined,
          sourceMode: 'uploaded',
          garmentAuthorities,
          idempotencyKey
        });
        if (intent === 'draft') finish(draft);
        else setReturnedReviewLook(draft);
        return;
      }

      const source = await uploadGenerationReference(
        await readFileAsDataUrl(sourceFile as File),
        'outfit_front',
        uploadKind === 'sheet' ? 'character-look-sheet' : 'character-look-full-look'
      );
      const draft = await createCharacterLookDraft(characterProfileId, {
        characterProfileVersionId,
        name: name.trim(),
        description: description.trim() || undefined,
        sourceMode: uploadKind === 'sheet' ? 'uploaded_character_sheet' : 'uploaded',
        ...(uploadKind === 'sheet'
          ? { sourceSheetAssetId: source.referenceId }
          : { garmentAuthorities: { full_look: { front: source.referenceId } } }),
        idempotencyKey
      });
      if (uploadKind === 'garment') {
        if (intent === 'draft') finish(draft);
        else setReturnedReviewLook(draft);
        return;
      }

      const reviewed = await reviewCharacterLookVersion(characterProfileId, draft.id, draft.activeVersionId, {
        sheetAssetId: source.referenceId,
        cropManifest: STANDARD_SHEET_MANIFEST,
        rightsDeclarationAccepted: rightsAccepted
      });
      setReturnedReviewLook(reviewed);
      setSourceFile(null);
      setRightsAccepted(false);
    } catch (reason) {
      setError(reason instanceof ApiError && ['video_trusted_source_unavailable', 'video_reference_content_invalid', 'character_look_sheet_changed'].includes(reason.code)
        ? t('cinematic.lookDraft.generatedUnavailable')
        : reason instanceof Error ? reason.message : t('cinematic.status.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  function finish(look: CharacterLook) {
    onSaved(look);
    onOpenChange(false);
  }

  function closeFlow() {
    if (saving) return;
    if (returnedReviewLook) onSaved(returnedReviewLook);
    onOpenChange(false);
  }

  function returnToPreparation() {
    setDialogView('source');
    window.requestAnimationFrame(() => generationTriggerRef.current?.focus());
  }

  return <>
  <Dialog.Root open={open && dialogView === 'source'} onOpenChange={nextOpen => { if (!nextOpen) closeFlow(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="character-look-dialog__overlay" />
      <Dialog.Content className="character-look-dialog__content">
        <header className="character-look-dialog__header">
          <div><Dialog.Title>{t(preparationLook ? 'cinematic.lookDraft.prepareTitle' : 'cinematic.lookDraft.title')}</Dialog.Title><Dialog.Description>{t(preparationLook ? 'cinematic.lookDraft.prepareDescription' : 'cinematic.lookDraft.description')}</Dialog.Description></div>
          <Button type="button" size="sm" variant="ghost" icon={<X aria-hidden="true" />} aria-label={t('cinematic.actions.cancel')} onClick={closeFlow} />
        </header>
        {!preparationLook ? <div className="character-look-source-mode character-look-source-mode--three" role="radiogroup" aria-label={t('cinematic.lookDraft.sourceMode')}>
          <button type="button" role="radio" aria-checked={mode === 'ai'} className={mode === 'ai' ? 'is-active' : ''} onClick={() => { setMode('ai'); setUploadKind('garment'); setSourceFile(null); setPieceFiles({}); setRightsAccepted(false); setError(null); }}><Sparkles aria-hidden="true" />{t('cinematic.lookDraft.aiSuggestion')}</button>
          <button type="button" role="radio" aria-checked={mode === 'upload' && uploadKind === 'garment'} className={mode === 'upload' && uploadKind === 'garment' ? 'is-active' : ''} onClick={() => { setMode('upload'); setUploadKind('garment'); setSourceFile(null); setPieceFiles({}); setRightsAccepted(false); setError(null); }}><Upload aria-hidden="true" />{t('cinematic.lookDraft.uploadWardrobe')}</button>
          <button type="button" role="radio" aria-checked={mode === 'upload' && uploadKind === 'sheet'} className={mode === 'upload' && uploadKind === 'sheet' ? 'is-active' : ''} onClick={() => { setMode('upload'); setUploadKind('sheet'); setSourceFile(null); setPieceFiles({}); setRightsAccepted(false); setError(null); }}><ImageIcon aria-hidden="true" />{t('cinematic.lookDraft.completeSheet')}</button>
        </div> : null}
        <form className="character-look-draft-form" onSubmit={event => void save(event)}>
          {preparationLook ? <>
            <section className="character-look-source-summary"><Check aria-hidden="true" /><div><span>{t('cinematic.lookDraft.stepSource')}</span><strong>{preparationLook.name}</strong><small>{t(`cinematic.lookDraft.source.${preparationVersion?.sourceMode || 'character_default'}`)}</small><dl>{characterDisplayName ? <div><dt>{t('cinematic.lookDraft.character')}</dt><dd>{characterDisplayName}</dd></div> : null}<div><dt>{t('cinematic.lookDraft.identitySource')}</dt><dd>{t('cinematic.lookDraft.identityPinned')}</dd></div>{sourceReferenceRoles.length ? <div><dt>{t('cinematic.lookDraft.wardrobeReferences')}</dt><dd>{sourceReferenceRoles.join(', ')}</dd></div> : null}</dl></div></section>
            <ol className="character-look-preparation-steps character-look-preparation-steps--focused" aria-label={t('cinematic.lookDraft.preparationSteps')}>
              <li className={reviewedPreparation ? 'is-complete' : 'is-current'}>{reviewedPreparation ? <Check aria-hidden="true" /> : <CircleDashed aria-hidden="true" />}<span><strong>{t('cinematic.lookDraft.stepSheet')}</strong><small>{t('cinematic.lookDraft.stepSheetHint')}</small></span></li>
              <li className={reviewedPreparation ? 'is-current' : ''}><CircleDashed aria-hidden="true" /><span><strong>{t('cinematic.lookDraft.stepReview')}</strong><small>{t('cinematic.lookDraft.stepReviewHint')}</small></span></li>
            </ol>
            {needsCompleteSheetUpload ? <>
              <label className="character-look-upload is-sheet"><ImageIcon aria-hidden="true" /><span>{t('cinematic.lookDraft.sheetFile')}</span><input type="file" accept="image/*" onChange={event => setSourceFile(event.target.files?.[0] || null)} required /><small>{sourceFile?.name || t('cinematic.lookDraft.frontRequired')}</small>{previewUrl ? <img src={previewUrl} alt={t('cinematic.lookDraft.previewAlt')} onLoad={() => setSourcePreviewReady(true)} onError={() => { setSourcePreviewReady(false); setError(t('cinematic.lookDraft.previewFailed')); }} /> : null}</label>
              {sourcePreviewReady ? <p className="character-look-identity-warning">{t('cinematic.lookDraft.uploadIdentityWarning')}</p> : null}
              <label className="character-look-rights-row is-terminal"><input type="checkbox" checked={rightsAccepted} disabled={!sourcePreviewReady} onChange={event => setRightsAccepted(event.target.checked)} /><span>{t('cinematic.lookDraft.sheetRights')}</span></label>
              {preparationVersion?.sourceMode !== 'uploaded_character_sheet' ? <Button type="button" size="sm" variant="ghost" onClick={() => { setUseCompleteSheetUpload(false); setSourceFile(null); setRightsAccepted(false); setError(null); }}>{t('cinematic.lookDraft.backToAiGeneration')}</Button> : null}
            </> : null}
            {!reviewedPreparation && !needsCompleteSheetUpload ? <section className={`character-look-generation-gate${generationPlan ? ' is-active' : ''}`}>
              <Sparkles aria-hidden="true" />
              <div><strong>{t('cinematic.lookDraft.aiGenerationPending')}</strong><p>{t('cinematic.lookDraft.aiGenerationReadyHint')}</p></div>
              <Button
                ref={generationTriggerRef}
                type="button"
                variant="primary"
                disabled={generationPlanLoading || reviewedPreparation}
                icon={generationPlanLoading ? <ProcessingSpinner className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                onClick={() => void openAiGeneration()}
              >{t(generationPlanLoading ? 'cinematic.lookDraft.preparingGeneration' : generationPlan ? 'cinematic.lookDraft.resumeGeneration' : 'cinematic.lookDraft.openAiGeneration')}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setUseCompleteSheetUpload(true); setError(null); }}>{t('cinematic.lookDraft.uploadCompleteInstead')}</Button>
            </section> : null}
            {reviewedPreparation ? <section className="character-look-review" aria-label={t('cinematic.lookDraft.reviewTitle')}>
              <div className="character-look-review__media">{preparationVersion?.reviewMediaUrl
                ? <AuthenticatedMediaImage
                  src={preparationVersion.reviewMediaUrl}
                  fallback={<ImageIcon aria-hidden="true" />}
                  renderResolved={resolvedSrc => <div className="character-look-review__sheet">
                    <img src={resolvedSrc} alt={t('cinematic.lookDraft.reviewPreviewAlt', { name: preparationLook.name })} onLoad={() => setReviewMediaReady(true)} onError={() => { setReviewMediaReady(false); setError(t('cinematic.lookDraft.reviewMediaFailed')); }} />
                    {preparationVersion.cropManifest?.regions ? <div className="character-look-review__crops" aria-label={t('cinematic.lookDraft.cropPreviews')}>
                      {Object.entries(preparationVersion.cropManifest.regions).filter(([role]) => ['front', 'side', 'back', 'face'].includes(role)).map(([role, region]) => <figure key={role}><div><img src={resolvedSrc} alt="" style={{ width: `${100 / region.width}%`, height: `${100 / region.height}%`, maxHeight: 'none', transform: `translate(${-region.x * 100}%, ${-region.y * 100}%)` }} /></div><figcaption>{t(`cinematic.lookDraft.crop.${role}`)}</figcaption></figure>)}
                    </div> : null}
                  </div>}
                />
                : <ImageIcon aria-hidden="true" />}</div>
              <div className="character-look-review__details">
                <span>{t('cinematic.lookDraft.reviewTitle')}</span><h3>{preparationLook.name}</h3>
                <p>{t(`cinematic.lookDraft.assurance.${preparationVersion?.identityAssurance?.status || 'legacy_unknown'}`)}</p>
                {preparationVersion?.provenance?.kind === 'system_generated' ? <p>{t('cinematic.lookDraft.generatedBy', { provider: preparationVersion.provenance.provider || t('cinematic.lookDraft.unknownProvider'), model: preparationVersion.provenance.model || t('cinematic.lookDraft.unknownModel'), recipeVersion: preparationVersion.provenance.recipeVersion || 1 })}</p> : null}
                {['user_uploaded', 'generated_import', 'legacy_unknown'].includes(preparationVersion?.provenance?.kind || 'legacy_unknown')
                  ? <p className="character-look-identity-warning">{t('cinematic.lookDraft.uploadIdentityWarning')}</p>
                  : null}
                <ul><li>{t('cinematic.lookDraft.checkOneCharacter')}</li><li>{t('cinematic.lookDraft.checkConsistentIdentity')}</li><li>{t('cinematic.lookDraft.checkConsistentOutfit')}</li><li>{t('cinematic.lookDraft.checkViews')}</li><li>{t('cinematic.lookDraft.checkCanonicalFace')}</li><li>{t(preparationVersion?.provenance?.kind === 'generated_import' ? 'cinematic.lookDraft.checkImportedSheet' : 'cinematic.lookDraft.checkCleanSheet')}</li></ul>
              </div>
            </section> : null}
          </> : mode === 'ai' ? <>
            <section className="character-look-analysis" aria-busy={suggesting}>
              <div>
                <strong>{t('cinematic.lookDraft.analysisTitle')}</strong>
                <p>{t(requestAiSuggestion ? 'cinematic.lookDraft.analysisHint' : 'cinematic.lookDraft.analysisUnavailableHint')}</p>
              </div>
              {requestAiSuggestion ? <Button
                type="button"
                variant="secondary"
                disabled={suggesting || saving}
                icon={suggesting ? <ProcessingSpinner className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                onClick={() => void requestSuggestion()}
              >{t(suggesting
                ? 'cinematic.lookDraft.analyzingSuggestion'
                : suggestionFailed
                  ? 'cinematic.lookDraft.retrySuggestion'
                  : suggestion
                    ? 'cinematic.lookDraft.regenerateSuggestion'
                    : 'cinematic.lookDraft.generateSuggestion')}</Button> : null}
            </section>
            <label><span>{t('cinematic.lookDraft.name')}</span><input value={name} maxLength={100} onChange={event => setName(event.target.value)} required /></label>
            <label><span>{t('cinematic.lookDraft.aiDirection')}</span><textarea value={description} maxLength={1200} rows={6} onChange={event => setDescription(event.target.value)} required placeholder={t('cinematic.lookDraft.aiDirectionPlaceholder')} /></label>
            {suggestion ? <section className="character-look-suggestion-summary"><strong>{t('cinematic.lookDraft.suggestionSummary')}</strong><p>{suggestion.rationale}</p><dl><div><dt>{t('cinematic.lookDraft.palette')}</dt><dd>{suggestion.palette.join(', ') || '—'}</dd></div><div><dt>{t('cinematic.lookDraft.materials')}</dt><dd>{suggestion.materials.join(', ') || '—'}</dd></div></dl>{suggestion.warnings.length ? <ul>{suggestion.warnings.map(item => <li key={item}>{item}</li>)}</ul> : null}</section> : null}
            <p className="character-look-draft-form__notice">{t('cinematic.lookDraft.aiNotice')}</p>
          </> : <>
            <label><span>{t('cinematic.lookDraft.name')}</span><input value={name} maxLength={100} onChange={event => setName(event.target.value)} required /></label>
            {uploadKind === 'garment' ? <>
              <div className="character-look-garment-mode" role="radiogroup" aria-label={t('cinematic.lookDraft.garmentMode')}>
                <button type="button" role="radio" aria-checked={garmentSourceMode === 'full_look'} className={garmentSourceMode === 'full_look' ? 'is-active' : ''} onClick={() => { setGarmentSourceMode('full_look'); setSourceFile(null); setPieceFiles({}); }}>{t('cinematic.lookDraft.fullLook')}</button>
                <button type="button" role="radio" aria-checked={garmentSourceMode === 'separate'} className={garmentSourceMode === 'separate' ? 'is-active' : ''} onClick={() => { setGarmentSourceMode('separate'); setSourceFile(null); setPieceFiles({}); }}>{t('cinematic.lookDraft.separatePieces')}</button>
              </div>
              {garmentSourceMode === 'full_look' ? <label className="character-look-upload"><Shirt aria-hidden="true" /><span>{t('cinematic.lookDraft.fullLookFile')}</span><input type="file" accept="image/*" onChange={event => setSourceFile(event.target.files?.[0] || null)} required /><small>{sourceFile?.name || t('cinematic.lookDraft.frontRequired')}</small>{previewUrl ? <img src={previewUrl} alt={t('cinematic.lookDraft.previewAlt')} /> : null}</label> : <div className="character-look-file-grid">
                {(['upper', 'lower', 'outerwear', 'footwear', 'accessory'] as GarmentRole[]).map(role => <label key={role} className="character-look-upload"><Shirt aria-hidden="true" /><span>{t(`cinematic.lookDraft.${role}`)}{['upper', 'lower'].includes(role) ? ' *' : ` (${t('cinematic.lookDraft.optional')})`}</span><input type="file" accept="image/*" required={['upper', 'lower'].includes(role)} onChange={event => setPieceFiles(current => ({ ...current, [role]: event.target.files?.[0] || undefined }))} /><small>{pieceFiles[role]?.name || t(['upper', 'lower'].includes(role) ? 'cinematic.lookDraft.frontRequired' : 'cinematic.lookDraft.optional')}</small></label>)}
              </div>}
            </> : <><label className="character-look-upload is-sheet"><ImageIcon aria-hidden="true" /><span>{t('cinematic.lookDraft.sheetFile')}</span><input type="file" accept="image/*" onChange={event => setSourceFile(event.target.files?.[0] || null)} required /><small>{sourceFile?.name || t('cinematic.lookDraft.frontRequired')}</small>{previewUrl ? <img src={previewUrl} alt={t('cinematic.lookDraft.previewAlt')} onLoad={() => setSourcePreviewReady(true)} onError={() => { setSourcePreviewReady(false); setError(t('cinematic.lookDraft.previewFailed')); }} /> : null}</label>{sourcePreviewReady ? <p className="character-look-identity-warning">{t('cinematic.lookDraft.uploadIdentityWarning')}</p> : null}<label className="character-look-rights-row is-terminal"><input type="checkbox" checked={rightsAccepted} disabled={!sourcePreviewReady} onChange={event => setRightsAccepted(event.target.checked)} /><span>{t('cinematic.lookDraft.sheetRights')}</span></label></>}
            <p className="character-look-draft-form__notice">{t(uploadKind === 'sheet' ? 'cinematic.lookDraft.sheetNotice' : 'cinematic.lookDraft.notice')}</p>
          </>}
          {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
          <footer className="character-look-dialog__footer">
            <Button type="button" onClick={closeFlow}>{t('cinematic.actions.cancel')}</Button>
            {!preparationLook && !(mode === 'upload' && uploadKind === 'sheet') ? <Button
              type="submit" variant="secondary" disabled={!canSave} data-intent="draft">
              {t('cinematic.lookDraft.saveAsDraft')}
            </Button> : null}
            {(reviewedPreparation || needsCompleteSheetUpload || !preparationLook) ? <Button
              type="submit" variant="primary" disabled={!canSave} data-intent="continue"
              icon={saving ? <ProcessingSpinner className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}>
              {t(reviewedPreparation
                ? 'cinematic.lookDraft.approveUse'
                : (mode === 'upload' && uploadKind === 'sheet') || needsCompleteSheetUpload
                  ? 'cinematic.lookDraft.continueToReview'
                  : 'cinematic.lookDraft.savePrepare')}
            </Button> : null}
          </footer>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
  {generationPlan ? <CharacterLookGenerationDialog
    open={open && dialogView === 'generation'}
    plan={generationPlan}
    characterName={characterDisplayName}
    lookName={preparationLook?.name || ''}
    adoptingResultId={adoptingResultId}
    error={error}
    onBack={returnToPreparation}
    onAdopt={generationResultId => void adoptGeneratedSheet(generationResultId)}
  /> : null}
  </>;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('File could not be read.'));
    reader.readAsDataURL(file);
  });
}
