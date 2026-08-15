import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { CharacterSummary } from '../../features/profiles/schemas/profileSchemas';
import { CharacterCard } from './CharacterCard';

const character: CharacterSummary = {
  id: 'charprof_alice',
  displayName: 'Alice Model',
  personalitySummary: 'Friendly',
  intendedUses: ['fashion'],
  characterType: 'reusable_model',
  destinationCapabilities: ['fashion_blueprint'],
  reusePolicy: 'view_only',
  reuseStatus: 'view_only',
  handoffAvailable: false,
  imageUrl: '/api/community/character-profiles/charprof_alice/image',
  thumbnailUrl: '/api/community/character-profiles/charprof_alice/thumbnail',
  displayImageUrl: null,
  featuredImageMode: 'auto',
  featuredImageSourceType: null,
  featuredGenerationResultId: null,
  featuredWorkPostId: null,
  characterProfileVersionId: 'charver_alice',
  stats: {
    totalOutputs: 0,
    byUseCase: { fashion: 0, sceneStory: 0, other: 0 }
  }
};

describe('CharacterCard', () => {
  it('renders the public thumbnail when a projection has no displayImageUrl', () => {
    render(
      <MemoryRouter>
        <CharacterCard character={character} />
      </MemoryRouter>
    );

    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      '/api/community/character-profiles/charprof_alice/thumbnail'
    );
  });

  it('exposes the owner management route when requested by the profile surface', () => {
    render(
      <MemoryRouter>
        <CharacterCard
          character={character}
          detailHref="/me/characters/charprof_alice"
          managementLabel="Manage Character"
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Manage Character' })).toHaveAttribute(
      'href',
      '/me/characters/charprof_alice'
    );
  });
});
