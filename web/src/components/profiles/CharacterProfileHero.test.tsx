import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CharacterProfileHero } from './CharacterProfileHero';

const reusableCharacter = {
  displayName: 'Lina',
  personalitySummary: 'Calm and confident.',
  intendedUses: ['fashion', 'scene_story'],
  characterType: 'reusable_model' as const,
  handoffAvailable: true,
  reusePolicy: 'public_reuse',
  ownerUsername: 'user_alice',
  displayImageUrl: '/api/community/character-profiles/lina/image',
  stats: {
    totalOutputs: 128,
    byUseCase: { fashion: 90, sceneStory: 30, other: 8 }
  },
  visibility: 'public',
  updatedAt: '2026-08-01T00:00:00.000Z'
};

describe('CharacterProfileHero', () => {
  it('prioritizes supported creation actions and Creator navigation', () => {
    const onFashion = vi.fn();
    render(
      <MemoryRouter>
        <CharacterProfileHero
          character={reusableCharacter}
          ownerAccess={false}
          handoffPending={false}
          onFashion={onFashion}
          onScene={vi.fn()}
          onShare={vi.fn()}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', {
      name: 'character-profiles.actions.useFashion'
    }));
    expect(onFashion).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', {
      name: 'character-profiles.creator.viewProfile'
    })).toHaveAttribute('href', '/profiles/user-alice');
  });

  it('does not invent a creation action for a view-only Character', () => {
    render(
      <MemoryRouter>
        <CharacterProfileHero
          character={{
            ...reusableCharacter,
            handoffAvailable: false,
            reusePolicy: 'view_only'
          }}
          ownerAccess={false}
          handoffPending={false}
          onShare={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', {
      name: 'character-profiles.actions.useFashion'
    })).not.toBeInTheDocument();
    expect(screen.getAllByText('character-profiles.status.viewOnly')).not.toHaveLength(0);
  });

  it('puts owner approval in the summary for a draft Character', () => {
    const onApprove = vi.fn();
    render(
      <MemoryRouter>
        <CharacterProfileHero
          character={{ ...reusableCharacter, status: 'review' }}
          ownerAccess
          handoffPending={false}
          approvalPending={false}
          onApprove={onApprove}
          onShare={vi.fn()}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'ui.action.approve' }));
    expect(onApprove).toHaveBeenCalledOnce();
    expect(screen.getByText('ui.character.approvalRequired')).toBeVisible();
  });
});
