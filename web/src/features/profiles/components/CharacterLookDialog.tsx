import * as Dialog from '@radix-ui/react-dialog';
import { Check, Image as ImageIcon, LoaderCircle, Shirt, Sparkles, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { uploadGenerationReference } from '../../generation/api/generationApi';
import {
  approveCharacterLookVersion,
  createCharacterLookDraft,
  reviewCharacterLookVersion
} from '../api/profileApi';
import type { CharacterLook } from '../schemas/profileSchemas';

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
  initialMode?: CharacterLookDialogMode;
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
  initialMode = 'upload',
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
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useMemo(() => sourceFile ? URL.createObjectURL(sourceFile) : null, [sourceFile]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setUploadKind('garment');
    setGarmentSourceMode('full_look');
    setName('');
    setDescription('');
    setSourceFile(null);
    setPieceFiles({});
    setRightsAccepted(false);
    setError(null);
    setSuggestionFailed(false);
    setSuggestion(null);
  }, [initialMode, open]);

  const canSave = Boolean(
    name.trim()
    && !saving
    && (mode === 'ai'
      ? description.trim()
      : uploadKind === 'sheet'
        ? sourceFile
        : garmentSourceMode === 'full_look'
          ? sourceFile
          : pieceFiles.upper && pieceFiles.lower)
    && (mode !== 'upload' || uploadKind !== 'sheet' || rightsAccepted)
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

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
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
        finish(proposal);
        return;
      }

      if (uploadKind === 'garment' && garmentSourceMode === 'separate') {
        const uploaded = await Promise.all((Object.entries(pieceFiles) as [GarmentRole, File][]).map(async ([role, file]) => [
          role,
          await uploadGenerationReference(await readFileAsDataUrl(file), 'outfit_front', `character-look-${role}`)
        ] as const));
        const garmentAuthorities = Object.fromEntries(uploaded.map(([role, source]) => [role, { front: source.referenceId }]));
        finish(await createCharacterLookDraft(characterProfileId, {
          characterProfileVersionId,
          name: name.trim(),
          description: description.trim() || undefined,
          sourceMode: 'uploaded',
          garmentAuthorities,
          idempotencyKey
        }));
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
        finish(draft);
        return;
      }

      const reviewed = await reviewCharacterLookVersion(characterProfileId, draft.id, draft.activeVersionId, {
        sheetAssetId: source.referenceId,
        cropManifest: STANDARD_SHEET_MANIFEST,
        rightsDeclarationAccepted: rightsAccepted
      });
      const approved = await approveCharacterLookVersion(
        characterProfileId,
        reviewed.id,
        reviewed.activeVersionId
      );
      finish(approved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('cinematic.status.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  function finish(look: CharacterLook) {
    onSaved(look);
    onOpenChange(false);
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="character-look-dialog__overlay" />
      <Dialog.Content className="character-look-dialog__content">
        <header className="character-look-dialog__header">
          <div><Dialog.Title>{t('cinematic.lookDraft.title')}</Dialog.Title><Dialog.Description>{t('cinematic.lookDraft.description')}</Dialog.Description></div>
          <Dialog.Close asChild><Button type="button" size="sm" variant="ghost" icon={<X aria-hidden="true" />} aria-label={t('cinematic.actions.cancel')} /></Dialog.Close>
        </header>
        <div className="character-look-source-mode" role="radiogroup" aria-label={t('cinematic.lookDraft.sourceMode')}>
          <button type="button" role="radio" aria-checked={mode === 'ai'} className={mode === 'ai' ? 'is-active' : ''} onClick={() => { setMode('ai'); setError(null); }}><Sparkles aria-hidden="true" />{t('cinematic.lookDraft.aiSuggestion')}</button>
          <button type="button" role="radio" aria-checked={mode === 'upload'} className={mode === 'upload' ? 'is-active' : ''} onClick={() => { setMode('upload'); setError(null); }}><Upload aria-hidden="true" />{t('cinematic.lookDraft.uploadWardrobe')}</button>
        </div>
        <form className="character-look-draft-form" onSubmit={event => void save(event)}>
          {mode === 'ai' ? <>
            <section className="character-look-analysis" aria-busy={suggesting}>
              <div>
                <strong>{t('cinematic.lookDraft.analysisTitle')}</strong>
                <p>{t(requestAiSuggestion ? 'cinematic.lookDraft.analysisHint' : 'cinematic.lookDraft.analysisUnavailableHint')}</p>
              </div>
              {requestAiSuggestion ? <Button
                type="button"
                variant="secondary"
                disabled={suggesting || saving}
                icon={suggesting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
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
            <div className="character-look-upload-kind" role="radiogroup" aria-label={t('cinematic.lookDraft.uploadKind')}>
              <button type="button" role="radio" aria-checked={uploadKind === 'garment'} className={uploadKind === 'garment' ? 'is-active' : ''} onClick={() => { setUploadKind('garment'); setSourceFile(null); setPieceFiles({}); }}><Shirt aria-hidden="true" /><span><strong>{t('cinematic.lookDraft.garmentSource')}</strong><small>{t('cinematic.lookDraft.garmentSourceHint')}</small></span></button>
              <button type="button" role="radio" aria-checked={uploadKind === 'sheet'} className={uploadKind === 'sheet' ? 'is-active' : ''} onClick={() => { setUploadKind('sheet'); setSourceFile(null); setPieceFiles({}); }}><ImageIcon aria-hidden="true" /><span><strong>{t('cinematic.lookDraft.completeSheet')}</strong><small>{t('cinematic.lookDraft.completeSheetHint')}</small></span></button>
            </div>
            {uploadKind === 'garment' ? <>
              <div className="character-look-garment-mode" role="radiogroup" aria-label={t('cinematic.lookDraft.garmentMode')}>
                <button type="button" role="radio" aria-checked={garmentSourceMode === 'full_look'} className={garmentSourceMode === 'full_look' ? 'is-active' : ''} onClick={() => { setGarmentSourceMode('full_look'); setSourceFile(null); setPieceFiles({}); }}>{t('cinematic.lookDraft.fullLook')}</button>
                <button type="button" role="radio" aria-checked={garmentSourceMode === 'separate'} className={garmentSourceMode === 'separate' ? 'is-active' : ''} onClick={() => { setGarmentSourceMode('separate'); setSourceFile(null); setPieceFiles({}); }}>{t('cinematic.lookDraft.separatePieces')}</button>
              </div>
              {garmentSourceMode === 'full_look' ? <label className="character-look-upload"><Shirt aria-hidden="true" /><span>{t('cinematic.lookDraft.fullLookFile')}</span><input type="file" accept="image/*" onChange={event => setSourceFile(event.target.files?.[0] || null)} required /><small>{sourceFile?.name || t('cinematic.lookDraft.frontRequired')}</small>{previewUrl ? <img src={previewUrl} alt={t('cinematic.lookDraft.previewAlt')} /> : null}</label> : <div className="character-look-file-grid">
                {(['upper', 'lower', 'outerwear', 'footwear', 'accessory'] as GarmentRole[]).map(role => <label key={role} className="character-look-upload"><Shirt aria-hidden="true" /><span>{t(`cinematic.lookDraft.${role}`)}{['upper', 'lower'].includes(role) ? ' *' : ` (${t('cinematic.lookDraft.optional')})`}</span><input type="file" accept="image/*" required={['upper', 'lower'].includes(role)} onChange={event => setPieceFiles(current => ({ ...current, [role]: event.target.files?.[0] || undefined }))} /><small>{pieceFiles[role]?.name || t(['upper', 'lower'].includes(role) ? 'cinematic.lookDraft.frontRequired' : 'cinematic.lookDraft.optional')}</small></label>)}
              </div>}
            </> : <label className="character-look-upload is-sheet"><ImageIcon aria-hidden="true" /><span>{t('cinematic.lookDraft.sheetFile')}</span><input type="file" accept="image/*" onChange={event => setSourceFile(event.target.files?.[0] || null)} required /><small>{sourceFile?.name || t('cinematic.lookDraft.frontRequired')}</small>{previewUrl ? <img src={previewUrl} alt={t('cinematic.lookDraft.previewAlt')} /> : null}</label>}
            {uploadKind === 'sheet' ? <label className="character-look-rights-row"><input type="checkbox" checked={rightsAccepted} onChange={event => setRightsAccepted(event.target.checked)} /><span>{t('cinematic.lookDraft.sheetRights')}</span></label> : null}
            <p className="character-look-draft-form__notice">{t(uploadKind === 'sheet' ? 'cinematic.lookDraft.sheetNotice' : 'cinematic.lookDraft.notice')}</p>
          </>}
          {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
          <footer className="character-look-dialog__footer">
            <Dialog.Close asChild><Button type="button">{t('cinematic.actions.cancel')}</Button></Dialog.Close>
            <Button type="submit" variant="primary" disabled={!canSave} icon={saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}>
              {t(mode === 'ai' ? 'cinematic.lookDraft.saveAiDirection' : uploadKind === 'sheet' ? 'cinematic.lookDraft.approveSheet' : 'cinematic.lookDraft.save')}
            </Button>
          </footer>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('File could not be read.'));
    reader.readAsDataURL(file);
  });
}
