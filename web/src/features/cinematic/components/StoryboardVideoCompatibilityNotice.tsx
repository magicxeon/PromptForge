import { useTranslation } from 'react-i18next';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import type { ProviderModel } from '../../generation/schemas/generationSchemas';

export function StoryboardVideoCompatibilityNotice({
  model,
  containsCharacter
}: {
  model?: ProviderModel | null;
  containsCharacter: boolean;
}) {
  const { t } = useTranslation('cinematic');
  if (!model || !containsCharacter || model.capabilities.generatedReferenceSourcesOpen === true) return null;
  const compatibility = model.capabilities.downstreamVideoCompatibility?.['modelark-seedance-2'] as {
    status?: string;
  } | undefined;
  const compatible = compatibility?.status === 'internal_testing';
  return <StatusNotice
    tone={compatible ? 'success' : 'warning'}
    title={t(compatible
      ? 'cinematic.storyboard.seedanceCompatibleTitle'
      : 'cinematic.storyboard.seedanceIncompatibleTitle')}
  >
    {t(compatible
      ? 'cinematic.storyboard.seedanceCompatibleDescription'
      : 'cinematic.storyboard.seedanceIncompatibleDescription')}
  </StatusNotice>;
}
