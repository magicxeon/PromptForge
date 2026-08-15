import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContextBackLink } from './ContextBackLink';

describe('ContextBackLink', () => {
  beforeEach(() => {
    localStorage.setItem('mpf_active_mock_user_id', 'usr_demo');
  });

  it('returns to the explicit same-actor parent context', () => {
    render(
      <MemoryRouter initialEntries={[{
        pathname: '/community/post_1',
        state: { mpfReturn: { to: '/creators/mint/gallery', actorId: 'usr_demo' } }
      }]}>
        <ContextBackLink fallbackTo="/community">Back</ContextBackLink>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Back' }))
      .toHaveAttribute('href', '/creators/mint/gallery');
  });

  it('uses the safe fallback for direct links and actor-mismatched context', () => {
    render(
      <MemoryRouter initialEntries={[{
        pathname: '/community/post_1',
        state: { mpfReturn: { to: '/creators/private', actorId: 'usr_other' } }
      }]}>
        <ContextBackLink fallbackTo="/community">Back</ContextBackLink>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Back' }))
      .toHaveAttribute('href', '/community');
  });
});
