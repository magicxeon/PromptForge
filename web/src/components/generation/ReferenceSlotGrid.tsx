import { ImagePlus, UserRound, Palette, PersonStanding, Shirt, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import {
  uploadGenerationReference,
  type GenerationReferenceRole
} from '../../features/generation/api/generationApi';

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
  maxReferences,
  supported,
  roles,
  uploadReference,
  onChange
}: {
  value: Partial<Record<GenerationReferenceRole, string>>;
  maxReferences: number;
  supported: boolean;
  roles?: GenerationReferenceRole[];
  uploadReference?: (dataUrl: string, role: GenerationReferenceRole) => Promise<string>;
  onChange: (value: Partial<Record<GenerationReferenceRole, string>>) => void;
}) {
  const { t } = useTranslation('playground');
  const activeCount = Object.values(value).filter(Boolean).length;
  if (!supported) return <p className="border border-[var(--mpf-border)] p-4 text-sm text-[var(--mpf-text-muted)]">{t('playground.reference.unsupported')}</p>;
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div><h2 className="m-0 text-lg">{t('playground.reference.summaryTitle')}</h2><p className="mb-0 mt-1 text-xs text-[var(--mpf-text-muted)]">{t('playground.reference.usage', { active: activeCount, max: maxReferences })}</p></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {definitions.filter(definition => !roles || roles.includes(definition.role)).map(definition => (
          <ReferenceSlot
            key={definition.role}
            role={definition.role}
            label={t(definition.labelKey)}
            description={t(definition.descriptionKey)}
            icon={definition.icon}
            value={value[definition.role]}
            disabled={!value[definition.role] && activeCount >= maxReferences}
            uploadReference={uploadReference}
            onChange={next => onChange({ ...value, [definition.role]: next || undefined })}
          />
        ))}
      </div>
    </section>
  );
}

function ReferenceSlot({
  role,
  label,
  description,
  icon: Icon,
  value,
  disabled,
  uploadReference,
  onChange
}: {
  role: GenerationReferenceRole;
  label: string;
  description: string;
  icon: typeof UserRound;
  value?: string;
  disabled: boolean;
  uploadReference?: (dataUrl: string, role: GenerationReferenceRole) => Promise<string>;
  onChange: (value: string | null) => void;
}) {
  const { t } = useTranslation('playground');
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  useEffect(() => () => {
    if (value?.startsWith('blob:')) URL.revokeObjectURL(value);
  }, [value]);
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
    <article className="relative min-h-40 border border-dashed border-[var(--mpf-border-strong)] bg-black/20 p-3">
      {value ? <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null}
      <div className="relative flex h-full flex-col">
        <Icon className="size-6 text-cyan-300" />
        <strong className="mt-3 text-sm">{label}</strong>
        <small className="mt-1 text-[var(--mpf-text-muted)]">{description}</small>
        <div className="mt-auto flex gap-2 pt-3">
          <Button size="sm" disabled={disabled || uploading} icon={<ImagePlus className="size-4" />} onClick={() => inputRef.current?.click()}>{uploading ? t('playground.reference.uploading') : t(value ? 'playground.reference.replace' : 'playground.reference.browse')}</Button>
          {value ? <Button size="icon" variant="ghost" disabled={uploading} title={t('playground.reference.remove')} icon={<X className="size-4" />} onClick={() => onChange(null)} /> : null}
        </div>
        <input ref={inputRef} type="file" accept="image/*" hidden aria-label={label} onChange={event => receive(event.target.files?.[0])} data-reference-role={role} />
        {error ? <span className="mt-2 text-xs text-red-300">{error}</span> : null}
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
