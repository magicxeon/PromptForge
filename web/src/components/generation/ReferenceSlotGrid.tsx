import { ImagePlus, UserRound, Palette, PersonStanding, Shirt, X, PanelsTopLeft } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { scheduleHashTargetScroll } from '../../lib/navigation/hashScroll';
import { AuthenticatedMediaImage } from '../media/AuthenticatedMediaImage';
import {
  uploadGenerationReference,
  type GenerationReferenceRole
} from '../../features/generation/api/generationApi';
import type { ReferenceAuthorityProjection } from '../../features/generation/schemas/generationSchemas';
import { ReferenceProcessingPreview } from './ReferenceProcessingPreview';
import { ReferenceScopeSelector } from './ReferenceScopeSelector';
import { DisplayMediaImage, type DisplayMediaSource } from '../media/DisplayMediaImage';
import { GeneratedLookSourceField } from './GeneratedLookSourceField';
import { ProcessingSpinner } from '../ui/ProcessingSpinner';

export type ReferenceDisplayPreviews = Partial<Record<GenerationReferenceRole, { reference: string; sources: DisplayMediaSource[]; label: string }>>;

const definitions: Array<{
  role: GenerationReferenceRole;
  labelKey: string;
  descriptionKey: string;
  icon: typeof UserRound;
}> = [
  { role: 'face_reference', labelKey: 'playground.reference.face', descriptionKey: 'playground.reference.faceScope', icon: UserRound },
  { role: 'character_reference', labelKey: 'playground.reference.character', descriptionKey: 'playground.reference.characterScope', icon: PersonStanding },
  { role: 'style_reference', labelKey: 'playground.reference.style', descriptionKey: 'playground.reference.styleScope', icon: Palette },
  { role: 'pose_reference', labelKey: 'playground.reference.pose', descriptionKey: 'playground.reference.poseScope', icon: PersonStanding },
  { role: 'outfit_front', labelKey: 'playground.reference.outfitFront', descriptionKey: 'playground.reference.outfitFrontScope', icon: Shirt },
  { role: 'outfit_back', labelKey: 'playground.reference.outfitBack', descriptionKey: 'playground.reference.outfitBackScope', icon: Shirt }
];

export function ReferenceSlotGrid({
  value,
  displayPreviews,
  maxReferences,
  supported,
  roles,
  compact = false,
  authorityProjection,
  processing = false,
  processingError = null,
  characterIdentityPackActive = false,
  scopes = {},
  uploadReference,
  leadingContent,
  onScopeChange,
  onChange,
  readOnly = false,
  lookSheetSelection = false
}: {
  value: Partial<Record<GenerationReferenceRole, string>>;
  displayPreviews?: ReferenceDisplayPreviews;
  maxReferences: number;
  supported: boolean;
  roles?: GenerationReferenceRole[];
  compact?: boolean;
  authorityProjection?: ReferenceAuthorityProjection | null;
  processing?: boolean;
  processingError?: string | null;
  characterIdentityPackActive?: boolean;
  scopes?: Partial<Record<GenerationReferenceRole, string>>;
  uploadReference?: (dataUrl: string, role: GenerationReferenceRole) => Promise<string>;
  leadingContent?: ReactNode;
  onScopeChange?: (role: GenerationReferenceRole, scope: string) => void;
  onChange: (value: Partial<Record<GenerationReferenceRole, string>>) => void;
  readOnly?: boolean;
  lookSheetSelection?: boolean;
}) {
  const { t } = useTranslation('playground');
  const location = useLocation();
  const activeCount = Object.values(value).filter(Boolean).length;
  useEffect(() => {
    if (location.hash === '#reference-images') {
      scheduleHashTargetScroll(location.hash);
    }
  }, [location.hash]);
  if (!supported) return <p className="border border-[var(--mpf-border)] p-4 text-sm text-[var(--mpf-text-muted)]">{t('playground.reference.unsupported')}</p>;
  return (
    <section
      id="reference-images"
      className={`reference-slot-grid${compact ? ' reference-slot-grid--compact' : ''}`}
    >
      <div className="reference-slot-grid__heading mb-3 flex items-end justify-between gap-3">
        <div><h2 className="m-0 text-lg">{t('playground.reference.summaryTitle')}</h2><p className="mb-0 mt-1 text-xs text-[var(--mpf-text-muted)]">{t('playground.reference.usage', { active: activeCount, max: maxReferences })}</p></div>
      </div>
      {leadingContent}
      <div className="reference-slot-grid__items grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {definitions.filter(definition => !roles || roles.includes(definition.role)).map(definition => (
          <ReferenceSlot
            key={definition.role}
            role={definition.role}
            label={t(definition.labelKey)}
            description={definition.role === 'face_reference' && characterIdentityPackActive
              ? t('playground.reference.faceCharacterOverrideScope')
              : t(definition.descriptionKey)}
            icon={definition.icon}
            value={value[definition.role]}
            displayPreview={displayPreviews?.[definition.role]?.reference === value[definition.role] ? displayPreviews?.[definition.role] : undefined}
            disabled={!value[definition.role] && activeCount >= maxReferences}
            compact={compact}
            scope={scopes[definition.role]}
            uploadReference={uploadReference}
            onScopeChange={scope => onScopeChange?.(definition.role, scope)}
            onChange={next => onChange({ ...value, [definition.role]: next || undefined })}
            readOnly={readOnly}
            lookSheetSelection={lookSheetSelection && definition.role === 'character_reference'}
          />
        ))}
      </div>
      <ReferenceProcessingPreview
        projection={authorityProjection}
        loading={processing}
        error={processingError}
      />
    </section>
  );
}

function ReferenceSlot({
  role,
  label,
  description,
  icon: Icon,
  value,
  displayPreview,
  disabled,
  compact,
  scope,
  uploadReference,
  onScopeChange,
  onChange,
  readOnly,
  lookSheetSelection
}: {
  role: GenerationReferenceRole;
  label: string;
  description: string;
  icon: typeof UserRound;
  value?: string;
  displayPreview?: ReferenceDisplayPreviews[GenerationReferenceRole];
  disabled: boolean;
  compact: boolean;
  scope?: string;
  uploadReference?: (dataUrl: string, role: GenerationReferenceRole) => Promise<string>;
  onScopeChange: (scope: string) => void;
  onChange: (value: string | null) => void;
  readOnly: boolean;
  lookSheetSelection: boolean;
}) {
  const { t } = useTranslation('playground');
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [lookPickerOpen, setLookPickerOpen] = useState(false);
  const sourceLabel = value
    ? referenceSourceLabel(
      value,
      t('playground.reference.uploadedSource'),
      t('playground.reference.source')
    )
    : '';
  useEffect(() => () => {
    if (value?.startsWith('blob:')) URL.revokeObjectURL(value);
  }, [value]);
  useEffect(() => {
    if (
      !readOnly
      && value
      && (role === 'outfit_front' || role === 'outfit_back')
      && !scope
    ) {
      onScopeChange('full_look');
    }
  }, [onScopeChange, readOnly, role, scope, value]);
  async function receive(file?: File) {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) {
      setError(t('playground.reference.invalidFile'));
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const imageUrl = uploadReference
        ? await uploadReference(dataUrl, role)
        : (await uploadGenerationReference(dataUrl, role, 'react')).imageUrl;
      onChange(imageUrl);
    } catch (reason) {
      setError(reason instanceof ReferenceReadError
        ? t('playground.reference.readFailed')
        : reason instanceof Error ? reason.message : t('playground.reference.readFailed'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }
  return (
    <article className={`reference-slot${compact ? ' reference-slot--compact' : ''}${value ? ' is-populated' : ''} relative min-h-40 border border-dashed border-[var(--mpf-border-strong)] bg-[var(--theme-bg-raised)] p-3`}>
      <div className="relative flex h-full flex-col">
        {value ? (
          <figure className="reference-slot__preview" title={displayPreview ? displayPreview.label : sourceLabel}>
            {displayPreview ? <DisplayMediaImage sources={displayPreview.sources} alt={displayPreview.label} fallback={<Icon className="reference-slot__icon size-6 text-cyan-300" />} /> : isAuthenticatedMediaPath(value) ? (
              <AuthenticatedMediaImage
                src={value}
                alt={label}
                fallback={<Icon className="reference-slot__icon size-6 text-cyan-300" />}
              />
            ) : (
              <img src={apiMediaUrl(value) || ''} alt={label} />
            )}
          </figure>
        ) : (
          <Icon className="reference-slot__icon size-6 text-cyan-300" />
        )}
        <strong className="reference-slot__label mt-3 text-sm">{label}</strong>
        <small className="reference-slot__description mt-1 text-[var(--mpf-text-muted)]">{description}</small>
        {value ? (
          <small className="reference-slot__source">{sourceLabel}</small>
        ) : null}
        {!readOnly && value && (role === 'outfit_front' || role === 'outfit_back') ? (
          <ReferenceScopeSelector
            value={scope || 'full_look'}
            onChange={onScopeChange}
          />
        ) : null}
        {!readOnly ? <div className="reference-slot__actions mt-auto flex flex-wrap gap-2 pt-3">
          {lookSheetSelection ? <Button size="sm" disabled={disabled || uploading} icon={<PanelsTopLeft className="size-4" />}
            onClick={() => setLookPickerOpen(true)}>{t('playground.reference.chooseLookSheet')}</Button> : null}
          <Button size="sm" disabled={disabled || uploading} icon={uploading ? <ProcessingSpinner /> : <ImagePlus className="size-4" />} onClick={() => inputRef.current?.click()}>{uploading ? t('playground.reference.uploading') : t(lookSheetSelection ? 'playground.reference.browseLookSheet' : value ? 'playground.reference.replace' : 'playground.reference.browse')}</Button>
          {value ? <Button size="icon" variant="ghost" disabled={uploading} title={t('playground.reference.remove')} icon={<X className="size-4" />} onClick={() => onChange(null)} /> : null}
        </div> : null}
        {!readOnly ? <input ref={inputRef} type="file" accept="image/*" hidden aria-label={label} onChange={event => receive(event.target.files?.[0])} data-reference-role={role} /> : null}
        {error ? <span className="mt-2 text-xs text-red-300">{error}</span> : null}
        {lookSheetSelection && !readOnly && lookPickerOpen ? <Dialog.Root open onOpenChange={setLookPickerOpen}>
          <Dialog.Portal><Dialog.Overlay className="cinematic-dialog__overlay" />
            <Dialog.Content className="cinematic-dialog__content">
              <div className="flex items-center justify-between gap-3">
                <Dialog.Title>{t('playground.reference.chooseLookSheet')}</Dialog.Title>
                <Dialog.Close asChild><Button size="icon" variant="ghost" icon={<X />}
                  aria-label={t('playground.reference.closeLookSheet')} /></Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">{t('playground.reference.characterScope')}</Dialog.Description>
              <GeneratedLookSourceField value={null} disabled={disabled || uploading}
                onPreviewReady={() => {}} onChange={source => {
                  if (!source || disabled || uploading) return;
                  onChange(source.previewUrl);
                  setLookPickerOpen(false);
                }} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root> : null}
      </div>
    </article>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new ReferenceReadError());
    reader.readAsDataURL(file);
  });
}

class ReferenceReadError extends Error {}

function isAuthenticatedMediaPath(value: string) {
  return /^\/api\//.test(value);
}

function referenceSourceLabel(value: string, uploadedLabel: string, fallbackLabel: string) {
  if (value.startsWith('data:') || value.startsWith('blob:')) return uploadedLabel;
  const clean = value.replace(/[?#].*$/, '');
  const filename = clean.split('/').filter(Boolean).at(-1);
  if (!filename) return fallbackLabel;
  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
}
