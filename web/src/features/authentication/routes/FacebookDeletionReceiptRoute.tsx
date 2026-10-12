import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getFacebookDeletionReceipt } from '../authenticationApi';

// A provider receipt acknowledges delivery only. It is never account authority
// and never a claim that product data has been deleted.
export function FacebookDeletionReceiptRoute() {
  const { t } = useTranslation('authentication'), location = useLocation();
  const { identityScope, isLoading, error } = useActor();
  const params = new URLSearchParams(location.search), values = params.getAll('confirmation_code');
  const code = values.length === 1 && [...params.keys()].every(key => key === 'confirmation_code')
    && values[0] !== undefined && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(values[0]) ? values[0] : null;
  const result = useQuery({ queryKey: ['authentication-facebook-deletion', identityScope, code],
    enabled: Boolean(code && !isLoading && !error), retry: false, gcTime: 0,
    refetchOnWindowFocus: false, refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      const controller = new AbortController(), abort = () => controller.abort();
      signal.addEventListener('abort', abort, { once: true });
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([getFacebookDeletionReceipt(code!, controller.signal), new Promise<never>((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error('Receipt lookup ended.')); }, 10000);
        })]);
      } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
    }
  });
  const pending = Boolean(code && !error && (isLoading || result.isFetching));
  return <section className="mpf-section-surface mx-auto my-8 w-full max-w-lg p-6" aria-labelledby="facebook-receipt-title">
    <h1 id="facebook-receipt-title" className="mb-5 text-xl">{t('social.deletionTitle')}</h1>
    <p role={result.isError || !code || error ? 'alert' : 'status'} aria-live="polite" className="mb-5 flex items-start gap-2 text-sm">
      {pending ? <><ProcessingSpinner className="size-4 shrink-0" />{t('social.deletionChecking')}</>
        : t(result.data?.status === 'received' ? 'social.deletionReceived' : 'social.deletionUnavailable')}
    </p>
    <Link to="/login" className="inline-flex min-h-10 items-center text-sm underline">{t('social.backToLogin')}</Link>
  </section>;
}
