import { ArrowRight, ChevronDown, Image, Images } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routePaths } from '../../../app/routeRegistry/routes';
import { ProviderMark } from '../../../components/generation/ProviderMark';
import { Button } from '../../../components/ui/Button';
import type { ProviderCatalog } from '../../generation/schemas/generationSchemas';

export function CommunityProviderDirectory({
  catalog,
  loading,
  error,
  onRetry
}: {
  catalog?: ProviderCatalog;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { t, i18n } = useTranslation('community');
  const providers = (catalog?.providers || []).map(provider => ({
    ...provider,
    models: provider.models.filter(model => model.capabilities.imageGeneration
      && !model.unavailableReason
      && model.paidRoutingEnabled !== false
      && (!model.allowedGenerationSurfaces || model.allowedGenerationSurfaces.includes('playground'))
      && (!model.allowedGenerationModes || model.allowedGenerationModes.includes('playground')))
  })).filter(provider => provider.models.length);
  const label = (value: string | Record<string, string>, fallback: string) => {
    if (typeof value === 'string') return value;
    const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]!;
    return value[language] || value.en || Object.values(value)[0] || fallback;
  };

  return (
    <section className="community-providers" aria-labelledby="community-providers-title" aria-busy={loading}>
      <header className="discovery-section-heading community-section-heading">
        <div>
          <span>{t('community.home.providers.eyebrow')}</span>
          <h2 id="community-providers-title">{t('community.home.providers.title')}</h2>
          <p>{t('community.home.providers.description')}</p>
        </div>
        <Link className="community-section-action" to={routePaths.createPlayground}>
          {t('community.home.providers.explore')}
          <ArrowRight aria-hidden="true" />
        </Link>
      </header>
      {loading ? <p role="status" className="community-providers__state">{t('community.home.providers.loading')}</p>
        : error ? (
          <div className="community-providers__state" role="status">
            <p>{t('community.home.providers.error')}</p>
            <Button onClick={onRetry}>{t('community.home.providers.retry')}</Button>
          </div>
        ) : !providers.length ? <p className="community-providers__state">{t('community.home.providers.empty')}</p> : (
          <div className="community-providers__grid">
            {providers.map(provider => (
              <details className="community-provider" key={provider.id}>
                <summary>
                  <ProviderMark providerId={provider.id} />
                  <span>
                    <strong>{label(provider.displayName, provider.id)}</strong>
                    <small>{t('community.home.providers.models', { count: provider.models.length })}</small>
                  </span>
                  <ChevronDown aria-hidden="true" />
                </summary>
                <ul>
                  {provider.models.map(model => (
                    <li key={model.id}>
                      <strong>{label(model.displayName, model.id)}</strong>
                      <small>
                        {model.capabilities.imageReferences ? <Images aria-hidden="true" /> : <Image aria-hidden="true" />}
                        {t(model.capabilities.imageReferences ? 'community.home.providers.references' : 'community.home.providers.textOnly')}
                      </small>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
    </section>
  );
}
