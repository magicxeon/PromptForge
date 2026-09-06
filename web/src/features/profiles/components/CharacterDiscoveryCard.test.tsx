import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { characterSummarySchema } from '../schemas/profileSchemas';
import { CharacterDiscoveryCard } from './CharacterDiscoveryCard';

const testI18n = i18next.createInstance();

describe('CharacterDiscoveryCard', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          'character-profiles': {
            'character-profiles.states.mediaUnavailable': 'Image unavailable',
            'character-profiles.status.available': 'Available',
            'character-profiles.status.viewOnly': 'View only',
            'character-profiles.type.reusable': 'Reusable model',
            'character-profiles.type.styled': 'Styled Character',
            'character-profiles.page.noPersonality': 'No personality',
            'character-profiles.uses.fashion': 'Fashion',
            'character-profiles.uses.scene': 'Scene',
            'character-profiles.stats.total': 'Outputs',
            'character-profiles.gallery.ready': 'Ready',
            'character-profiles.gallery.creatorFallback': 'creator',
            'character-profiles.gallery.viewCharacter': 'View Character'
          }
        }
      },
      interpolation: { escapeValue: false }
    });
  });

  it('renders the public summary and supported destinations', () => {
    const character = characterSummarySchema.parse({
      id: 'character_1',
      displayName: 'Nara',
      personalitySummary: 'Quiet and observant.',
      intendedUses: ['fashion', 'scene_story'],
      destinationCapabilities: ['fashion_blueprint', 'scene_builder'],
      ownerUsername: 'mint',
      handoffAvailable: true,
      displayImageUrl: '/nara.jpg',
      stats: { totalOutputs: 12 },
      rightsDeclarationAcceptedAt: 'private-value-must-not-render'
    });

    render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <CharacterDiscoveryCard character={character} />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByRole('link', { name: 'Nara' })).toHaveAttribute('href', '/characters/character_1');
    expect(screen.getAllByText('Ready')).toHaveLength(2);
    expect(screen.getByText('12')).toBeVisible();
    expect(screen.queryByText('private-value-must-not-render')).not.toBeInTheDocument();
  });

  it('keeps a no-media Character usable as a detail link', () => {
    const character = characterSummarySchema.parse({
      id: 'character_2',
      displayName: 'Mali',
      handoffAvailable: false
    });

    render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <CharacterDiscoveryCard character={character} />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByText('Image unavailable')).toBeVisible();
    expect(screen.getByText('View only')).toBeVisible();
    expect(screen.getByRole('link', { name: 'View Character' })).toHaveAttribute('href', '/characters/character_2');
  });
});
