import { render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SharedTemplatePanel } from './SharedTemplatePanel';

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      {
        id: 'template_paid',
        title: 'Paid template',
        ownerUsername: 'alice',
        presentationUrls: {},
        templatePricing: { accessCredits: 20, currency: 'credits' }
      },
      {
        id: 'template_unpriced',
        title: 'Template without pricing',
        ownerUsername: 'alice',
        presentationUrls: {}
      }
    ],
    isLoading: false,
    isError: false
  })
}));

vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: 'usr_alice' } })
}));

const testI18n = i18next.createInstance();

describe('SharedTemplatePanel', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          'react-ui': {
            'ui.scene.sharedTemplates': 'Shared templates',
            'ui.carousel.previous': 'Previous',
            'ui.carousel.next': 'Next',
            'ui.action.useTemplate': 'Use template',
            'ui.template.pricePerUse': '{{count}} credits/use'
          }
        }
      },
      keySeparator: false,
      interpolation: { escapeValue: false }
    });
  });

  it('anchors paid and unpriced Template actions to the same card footer contract', () => {
    const { container } = render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <SharedTemplatePanel onSelect={() => {}} />
        </I18nextProvider>
      </MemoryRouter>
    );

    const cards = container.querySelectorAll('.shared-template-card');
    expect(cards).toHaveLength(2);
    cards.forEach(card => {
      expect(card).toHaveClass('flex', 'h-full', 'flex-col');
      expect(card.querySelector('.shared-template-card__body')).toHaveClass(
        'flex',
        'flex-1',
        'flex-col'
      );
      expect(card.querySelector('.shared-template-card__action')).toHaveClass('mt-auto', 'pt-3');
      expect(card.querySelector('button')).toHaveClass('w-full');
    });
    expect(screen.getByText('20 credits/use')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Use template' })).toHaveLength(2);
  });
});
