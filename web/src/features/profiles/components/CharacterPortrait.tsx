import { Images } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiMediaUrl } from '../../../lib/api/apiClient';

export function CharacterPortrait({ src, name, eager = false }: {
  src: string | null;
  name: string;
  eager?: boolean;
}) {
  const { t } = useTranslation('character-profiles');
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return src && failedSource !== src ? (
    <img src={apiMediaUrl(src) || ''} alt={name} loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailedSource(src)} />
  ) : (
    <span className="character-discovery-card__fallback" role="img" aria-label={name}>
      <Images aria-hidden="true" />
      <span>{t('character-profiles.states.mediaUnavailable')}</span>
    </span>
  );
}
