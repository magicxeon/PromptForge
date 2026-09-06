import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { CommunityStartPaths } from './CommunityStartPaths';

const testI18n = i18next.createInstance();

describe('CommunityStartPaths', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          community: {
            'community.home.paths.eyebrow': 'Choose a starting point',
            'community.home.paths.title': 'Start with the workflow you need',
            'community.home.paths.playground.title': 'Create freely',
            'community.home.paths.playground.description': 'Open Playground.',
            'community.home.paths.templates.title': 'Use a template',
            'community.home.paths.templates.description': 'Browse templates.',
            'community.home.paths.characters.title': 'Find a Character',
            'community.home.paths.characters.description': 'Browse Characters.',
            'community.home.paths.comparisons.title': 'Compare models',
            'community.home.paths.comparisons.description': 'Open Comparisons.'
          }
        }
      },
      interpolation: { escapeValue: false }
    });
  });

  it('renders all four canonical start paths when policy allows them', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <CommunityStartPaths communityEnabled charactersEnabled />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByRole('link', { name: /Create freely/ })).toHaveAttribute('href', '/create/playground');
    expect(screen.getByRole('link', { name: /Use a template/ })).toHaveAttribute('href', '/explore/templates');
    expect(screen.getByRole('link', { name: /Find a Character/ })).toHaveAttribute('href', '/explore/characters');
    expect(screen.getByRole('link', { name: /Compare models/ })).toHaveAttribute('href', '/explore/comparisons');
  });

  it('keeps Playground available and omits unavailable destinations', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <CommunityStartPaths communityEnabled={false} charactersEnabled={false} />
        </MemoryRouter>
      </I18nextProvider>
    );
    expect(screen.getByRole('link', { name: /Create freely/ })).toBeVisible();
    expect(screen.queryByRole('link', { name: /Use a template/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Find a Character/ })).not.toBeInTheDocument();
  });
});
