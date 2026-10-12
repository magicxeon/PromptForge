import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import type { SocialProvider } from '../authenticationApi';

export function SocialLoginButtons({ methods, disabled, pending, onStart }: {
  methods: { google: boolean; facebook: boolean }; disabled: boolean;
  pending?: SocialProvider; onStart: (provider: SocialProvider) => void;
}) {
  const { t } = useTranslation('authentication');
  if (!methods.google && !methods.facebook) return null;
  return <div className="grid gap-3" aria-label={t('social.methods')}>
    {(['google', 'facebook'] as const).filter(provider => methods[provider]).map(provider =>
      <Button key={provider} type="button" className="w-full" disabled={disabled} loading={pending === provider}
        onClick={() => onStart(provider)}>{t(`social.${provider}`)}</Button>)}
  </div>;
}
