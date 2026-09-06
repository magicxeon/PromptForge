import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { providerCatalogSchema } from '../../generation/schemas/generationSchemas';
import { CommunityProviderDirectory } from './CommunityProviderDirectory';

const i18n = i18next.createInstance();
const catalog = providerCatalogSchema.parse({
  defaultProvider: 'test',
  providers: [{ id: 'test', displayName: { en: 'Image provider', th: 'ผู้ให้บริการภาพ' }, models: [
    { id: 'text', displayName: 'Text model', capabilities: { imageGeneration: true } },
    { id: 'reference', displayName: 'Reference model', capabilities: { imageReferences: true } },
    { id: 'blocked', displayName: 'Blocked model', capabilities: {}, unavailableReason: 'provider_not_released' },
    { id: 'testing', displayName: 'Testing model', capabilities: {}, paidRoutingEnabled: false },
    { id: 'studio', displayName: 'Studio model', capabilities: {}, allowedGenerationSurfaces: ['studio'] },
    { id: 'video', displayName: 'Video model', capabilities: { imageGeneration: false } }
  ] }]
});

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en', fallbackLng: 'en',
    resources: { en: { community: {
      'community.home.providers.title': 'Image models',
      'community.home.providers.description': 'Available in Playground.',
      'community.home.providers.models': '{{count}} image models',
      'community.home.providers.textOnly': 'Text to image',
      'community.home.providers.references': 'Text and image references',
      'community.home.providers.loading': 'Loading models',
      'community.home.providers.error': 'Unable to load models',
      'community.home.providers.retry': 'Retry',
      'community.home.providers.empty': 'No models available',
      'community.home.providers.explore': 'Explore models'
    } } }
  });
});

function show(props: Partial<Parameters<typeof CommunityProviderDirectory>[0]> = {}) {
  return render(<I18nextProvider i18n={i18n}>
    <MemoryRouter>
      <CommunityProviderDirectory catalog={catalog} loading={false} error={false} onRetry={vi.fn()} {...props} />
    </MemoryRouter>
  </I18nextProvider>);
}

describe('CommunityProviderDirectory', () => {
  it('shows server names and capabilities without advertising blocked or wrong-surface models', () => {
    const { container } = show();
    expect(screen.getByText('Image provider')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Explore models' })).toHaveAttribute('href', '/create/playground');
    expect(screen.getByText('2 image models')).toBeVisible();
    const details = container.querySelector('details')!;
    expect(details.open).toBe(false);
    fireEvent.click(container.querySelector('summary')!);
    expect(details.open).toBe(true);
    expect(screen.getByText('Text model')).toBeVisible();
    expect(screen.getByText('Text to image')).toBeVisible();
    expect(screen.getByText('Text and image references')).toBeVisible();
    for (const text of ['Blocked model', 'Testing model', 'Studio model', 'Video model']) {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
  });

  it('accepts the actual empty server catalog with a null default', () => {
    show({ catalog: providerCatalogSchema.parse({ defaultProvider: null, providers: [] }) });
    expect(screen.getByText('No models available')).toBeVisible();
  });

  it('shows loading without stale model claims', () => {
    show({ loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading models');
    expect(screen.queryByText('Image provider')).not.toBeInTheDocument();
  });

  it('exposes retry and hides stale catalog on failure', () => {
    const retry = vi.fn();
    show({ error: true, onRetry: retry });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByText('Image provider')).not.toBeInTheDocument();
  });

  it('uses localized provider names', async () => {
    i18n.addResourceBundle('th', 'community', { 'community.home.providers.title': 'โมเดลสร้างภาพ' });
    await i18n.changeLanguage('th');
    show();
    expect(screen.getByText('ผู้ให้บริการภาพ')).toBeVisible();
    await i18n.changeLanguage('en');
  });
});
