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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterProfileId: string;
  characterProfileVersionId: string;
  initialMode?: CharacterLookDialogMode;
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
  onSaved
}: Props) {
  const { t } = useTranslation('cinematic');
  const [mode, setMode] = useState<CharacterLookDialogMode>(initialMode);
  const [uploadKind, setUploadKind] = useState<'garment' | 'sheet'>('garment');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [garmentRole, setGarmentRole] = useState('full_look');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useMemo(() => sourceFile ? URL.createObjectURL(sourceFile) : null, [sourceFile]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setUploadKind('garment');
    setName('');
    setDescription('');
    setGarmentRole('full_look');
    setSourceFile(null);
    setRightsAccepted(false);
    setError(null);
  }, [initialMode, open]);

  const canSave = Boolean(
    name.trim()
    && !saving
    && (mode === 'ai' ? description.trim() : sourceFile)
    && (mode !== 'upload' || uploadKind !== 'sheet' || rightsAccepted)
  );

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
          idempotencyKey
        });
        finish(proposal);
        return;
      }

      const source = await uploadGenerationReference(
        await readFileAsDataUrl(sourceFile as File),
        'outfit_front',
        uploadKind === 'sheet' ? 'character-look-sheet' : 'character-look'
      );
      const draft = await createCharacterLookDraft(characterProfileId, {
        characterProfileVersionId,
        name: name.trim(),
        description: description.trim() || undefined,
        sourceMode: uploadKind === 'sheet' ? 'uploaded_character_sheet' : 'uploaded',
        ...(uploadKind === 'sheet'
          ? { sourceSheetAssetId: source.referenceId }
          : { garmentAuthorities: { [garmentRole]: { front: source.referenceId } } }),
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
          <label><span>{t('cinematic.lookDraft.name')}</span><input value={name} maxLength={100} onChange={event => setName(event.target.value)} required /></label>
          {mode === 'ai' ? <>
            <label><span>{t('cinematic.lookDraft.aiDirection')}</span><textarea value={description} maxLength={500} rows={5} onChange={event => setDescription(event.target.value)} required placeholder={t('cinematic.lookDraft.aiDirectionPlaceholder')} /></label>
            <p className="character-look-draft-form__notice">{t('cinematic.lookDraft.aiNotice')}</p>
          </> : <>
            <div className="character-look-upload-kind" role="radiogroup" aria-label={t('cinematic.lookDraft.uploadKind')}>
              <button type="button" role="radio" aria-checked={uploadKind === 'garment'} className={uploadKind === 'garment' ? 'is-active' : ''} onClick={() => { setUploadKind('garment'); setSourceFile(null); }}><Shirt aria-hidden="true" /><span><strong>{t('cinematic.lookDraft.garmentSource')}</strong><small>{t('cinematic.lookDraft.garmentSourceHint')}</small></span></button>
              <button type="button" role="radio" aria-checked={uploadKind === 'sheet'} className={uploadKind === 'sheet' ? 'is-active' : ''} onClick={() => { setUploadKind('sheet'); setSourceFile(null); }}><ImageIcon aria-hidden="true" /><span><strong>{t('cinematic.lookDraft.completeSheet')}</strong><small>{t('cinematic.lookDraft.completeSheetHint')}</small></span></button>
            </div>
            {uploadKind === 'garment' ? <label><span>{t('cinematic.lookDraft.role')}</span><select value={garmentRole} onChange={event => setGarmentRole(event.target.value)}><option value="full_look">{t('cinematic.lookDraft.fullLook')}</option><option value="upper">{t('cinematic.lookDraft.upper')}</option><option value="lower">{t('cinematic.lookDraft.lower')}</option></select></label> : null}
            <label className={`character-look-upload${uploadKind === 'sheet' ? ' is-sheet' : ''}`}>
              {uploadKind === 'sheet' ? <ImageIcon aria-hidden="true" /> : <Shirt aria-hidden="true" />}
              <span>{t(uploadKind === 'sheet' ? 'cinematic.lookDraft.sheetFile' : 'cinematic.lookDraft.garmentFile')}</span>
              <input type="file" accept="image/*" onChange={event => setSourceFile(event.target.files?.[0] || null)} required />
              <small>{sourceFile?.name || t('cinematic.lookDraft.frontRequired')}</small>
              {previewUrl ? <img src={previewUrl} alt={t('cinematic.lookDraft.previewAlt')} /> : null}
            </label>
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
