import { Plus, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import type { VideoModelCapability } from '../../generation/schemas/videoGenerationSchemas';
import { PlaygroundVideoSources } from './PlaygroundVideoSources';
import { TrustedVideoSources } from './TrustedVideoSources';
import { selectedImages, selectedCompositionImages, selectedTrustedImages, usesUploadedCompositionReferences, type NamedTrustedVideoSource, type VideoReferenceSelection } from './videoReferenceSelection';

export function VideoImageReferenceSources({ value, model, onChange, onBusy }: {
  value: VideoReferenceSelection; model: VideoModelCapability | null;
  onChange: (patch: Partial<VideoReferenceSelection>) => void; onBusy: (busy: boolean) => void;
}) {
  const { t } = useTranslation('playground');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const reportBusy = useCallback((pending: boolean) => { setBusy(pending); onBusy(pending); }, [onBusy]);
  const uploaded = usesUploadedCompositionReferences(value, model);
  const trusted = model?.playgroundReferencePolicy?.kind === 'trusted_generated_only' && !uploaded;
  const images = uploaded ? selectedCompositionImages(value) : selectedImages(value), trustedImages = selectedTrustedImages(value);
  const count = trusted ? trustedImages.length : images.length;
  const supportsMultiple = model?.supportsOrderedImageReferences && model.inputModes.includes('multimodal_reference');
  const limit = supportsMultiple ? Math.min(12, model.referenceImageLimit) : 1;
  function update(index: number, patch: { referenceImageUrl?: string | null; trustedFrame?: NamedTrustedVideoSource | null; characterName?: string }) {
    if (trusted) {
      const next = [...trustedImages];
      if ('characterName' in patch) next[index] = { ...next[index]!, characterName: patch.characterName };
      else if (patch.trustedFrame) next[index] = { ...patch.trustedFrame, characterName: next[index]?.characterName };
      else next.splice(index, 1);
      onChange({ trustedImages: next });
    } else {
      const next = [...images];
      if ('characterName' in patch) next[index] = { ...next[index]!, characterName: patch.characterName };
      else if (patch.referenceImageUrl) next[index] = { url: patch.referenceImageUrl, characterName: next[index]?.characterName };
      else next.splice(index, 1);
      onChange({ imageReferences: next, ...(uploaded ? { trustedImages: [], trustedFrame: null, referenceImageUrl: null } : {}) });
    }
    if (!('characterName' in patch)) setAdding(false);
  }
  return <div className="video-look-sheet-list video-image-reference-list">
    <div className="video-image-reference-grid">
    {Array.from({ length: Math.max(1, count + Number(adding)) }, (_, index) => {
      const image = trusted ? trustedImages[index] : images[index];
      const label = t('playground.video.references.imageNumber', { number: index + 1 });
      return <fieldset key={index} disabled={busy} className="min-w-0 grid gap-2">
        {trusted ? <TrustedVideoSources withLook={false} frame={trustedImages[index] || null} look={null} frameLabel={label}
          excludedIds={trustedImages.filter((_, i) => i !== index).map(item => item.id)}
          onChange={patch => update(index, patch)} />
          : <PlaygroundVideoSources value={{ ...value, character: null, lookSheet: null, referenceImageUrl: images[index]?.url || null }} frameLabel={label}
            characterNumber={index + 1} frameName={image?.characterName} onFrameNameChange={name => update(index, { characterName: name })}
            frameRole={uploaded || count > 1 || model?.firstFrameEnabled === false ? 'reference_image' : 'first_frame'}
            excludedUrls={images.filter((_, i) => i !== index).map(item => item.url)} onBusy={reportBusy}
            onChange={patch => update(index, patch)} />}
        {trusted && image ? <label className="video-image-reference-name grid gap-1 text-sm">
          {t('playground.video.references.imageName', { number: index + 1 })}
          <input className="w-full min-w-0" maxLength={80} value={image.characterName || ''}
            onChange={event => update(index, { characterName: event.target.value })} />
        </label> : null}
      </fieldset>;
    })}
    </div>
    {supportsMultiple ? <div className="playground-video-references__actions">
      <Button icon={adding ? <X /> : <Plus />} disabled={busy || (!adding && (!count || count >= limit))}
        onClick={() => setAdding(current => !current)}>
        {t(adding ? 'playground.video.references.cancelLook' : 'playground.video.references.addImage')}
      </Button>
      <span>{t('playground.video.references.referenceCount', { count, limit })}</span>
    </div> : null}
  </div>;
}
