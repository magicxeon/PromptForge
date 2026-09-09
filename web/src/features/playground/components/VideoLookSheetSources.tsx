import { Plus, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import type { VideoModelCapability } from '../../generation/schemas/videoGenerationSchemas';
import { PlaygroundVideoSources } from './PlaygroundVideoSources';
import { TrustedVideoSources } from './TrustedVideoSources';
import { selectedLooks, selectedTrustedLooks, type VideoReferenceSelection } from './videoReferenceSelection';

export function VideoLookSheetSources({ value, model, onChange, onBusy }: {
  value: VideoReferenceSelection;
  model: VideoModelCapability | null;
  onChange: (patch: Partial<VideoReferenceSelection>) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { t } = useTranslation('playground');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const reportBusy = useCallback((pending: boolean) => { setBusy(pending); onBusy(pending); }, [onBusy]);
  const trusted = model?.playgroundReferencePolicy?.kind === 'trusted_generated_only';
  const withLook = value.operation === 'character_to_video';
  const looks = selectedLooks(value);
  const trustedLooks = selectedTrustedLooks(value);
  const count = trusted ? trustedLooks.length : looks.length;
  const frameCount = Number(Boolean(trusted ? value.trustedFrame : value.referenceImageUrl));
  const limit = Math.min(12, model?.supportsOrderedImageReferences ? model.referenceImageLimit : Math.min(1, model?.referenceImageLimit || 0));
  const rows = withLook ? Math.max(1, count + Number(adding)) : 1;
  function change(index: number, patch: Partial<VideoReferenceSelection>) {
    if (patch.character) {
      onChange({ ...patch, lookSheet: null, lookSheets: [] });
    } else if ('lookSheet' in patch) {
      const next = [...looks];
      if (patch.lookSheet) next[index] = { ...patch.lookSheet, characterName: patch.lookSheet.characterName ?? looks[index]?.characterName };
      else next.splice(index, 1);
      onChange({ ...patch, lookSheets: next, lookSheet: next[0] || null });
      setAdding(false);
    } else if ('trustedLook' in patch) {
      const next = [...trustedLooks];
      if (patch.trustedLook) next[index] = { ...patch.trustedLook, characterName: patch.trustedLook.characterName ?? trustedLooks[index]?.characterName };
      else next.splice(index, 1);
      onChange({ ...patch, trustedLooks: next, trustedLook: next[0] || null });
      setAdding(false);
    } else onChange(patch);
  }
  return <div className="video-look-sheet-list">
    {Array.from({ length: rows }, (_, index) => <fieldset disabled={busy} key={index} className={index ? 'video-look-sheet-list__additional' : undefined}>
      {trusted ? <TrustedVideoSources withLook={withLook} frame={value.trustedFrame || null}
        look={trustedLooks[index] || null} lookOnly={index > 0} characterNumber={index + 1}
        excludedIds={trustedLooks.filter((_, i) => i !== index).map(item => item.id)}
        onChange={patch => change(index, patch)} />
        : <PlaygroundVideoSources value={{ ...value, lookSheet: looks[index] || null }}
          lookOnly={index > 0} characterNumber={index + 1}
          excludedUrls={looks.filter((_, i) => i !== index).map(item => item.url)}
          onBusy={reportBusy} onChange={patch => change(index, patch)} />}
    </fieldset>)}
    {withLook && model?.supportsOrderedImageReferences ? <div className="playground-video-references__actions">
      <Button icon={adding ? <X /> : <Plus />} disabled={busy || (!adding && (count === 0 || count + frameCount >= limit || Boolean(value.character)))}
        onClick={() => setAdding(current => !current)}>
        {t(adding ? 'playground.video.references.cancelLook' : 'playground.video.references.addLook')}
      </Button>
      <span>{t('playground.video.references.referenceCount', { count: count + frameCount, limit })}</span>
    </div> : null}
  </div>;
}
