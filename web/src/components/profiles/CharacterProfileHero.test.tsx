import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CharacterProfileHero } from './CharacterProfileHero';

const testI18n = i18n.createInstance();

const reusableCharacter = {
  displayName: 'Lina',
  personalitySummary: 'Calm and confident.',
  intendedUses: ['fashion', 'scene_story'],
  characterType: 'reusable_model' as const,
  handoffAvailable: true,
  reusePolicy: 'public_reusable',
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
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          'character-profiles': {},
          'react-ui': {}
        }
      },
      ns: ['character-profiles', 'react-ui'],
      interpolation: { escapeValue: false }
    });
  });

  it('prioritizes supported creation actions and Creator navigation', () => {
    const onFashion = vi.fn();
    renderHero(
      <CharacterProfileHero
        character={reusableCharacter}
        ownerAccess={false}
        handoffPending={false}
        onFashion={onFashion}
        onScene={vi.fn()}
        onShare={vi.fn()}
      />
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
    renderHero(
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
    );

    expect(screen.queryByRole('button', {
      name: 'character-profiles.actions.useFashion'
    })).not.toBeInTheDocument();
    expect(screen.getAllByText('character-profiles.status.viewOnly')).not.toHaveLength(0);
  });

  it('shows persisted owner-only reuse rights even though the owner can use the Character', () => {
    renderHero(
      <CharacterProfileHero
        character={{
          ...reusableCharacter,
          displayImageUrl: null,
          handoffAvailable: true,
          reusePolicy: 'owner_only'
        }}
        ownerAccess
        handoffPending={false}
        onScene={vi.fn()}
        onShare={vi.fn()}
      />
    );

    expect(screen.getAllByText('character-profiles.status.ownerOnly')).not.toHaveLength(0);
    expect(screen.queryByText('character-profiles.status.available')).not.toBeInTheDocument();
  });

  it('puts owner approval in the summary for a draft Character', () => {
    const onApprove = vi.fn();
    renderHero(
      <CharacterProfileHero
        character={{ ...reusableCharacter, displayImageUrl: null, status: 'review' }}
        ownerAccess
        handoffPending={false}
        approvalPending={false}
        onApprove={onApprove}
        onShare={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'ui.action.approve' }));
    expect(onApprove).toHaveBeenCalledOnce();
    expect(screen.getByText('ui.character.approvalRequired')).toBeVisible();
  });
});

function renderHero(component: ReactNode) {
  return render(
    <I18nextProvider i18n={testI18n}>
      <MemoryRouter>{component}</MemoryRouter>
    </I18nextProvider>
  );
}
