import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CreatorPage } from '../../features/profiles/schemas/profileSchemas';
import { CreatorProfileHero } from './CreatorProfileHero';

const page = {
  profile: {
    handle: 'alice',
    displayName: 'Alice Creator',
    badgeCodes: [],
    creatorRoles: [],
    headline: null,
    bio: '',
    locationText: null,
    websiteUrl: null,
    avatarUrl: null,
    coverImageUrl: null
  },
  counts: {},
  viewer: {
    canEditProfile: true,
    canFollow: false,
    isFollowing: false
  }
} as unknown as CreatorPage;

describe('CreatorProfileHero scoped actions', () => {
  it('uses Creator-theme action classes for Edit and Share', () => {
    render(
      <CreatorProfileHero
        page={page}
        followLabel="Follow"
        followingLabel="Following"
        editLabel="Edit profile"
        shareLabel="Share profile"
        followerLabel="Followers"
        worksLabel="Works"
        charactersLabel="Characters"
        templatesLabel="Templates"
        onFollow={vi.fn()}
        onEdit={vi.fn()}
        onShare={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Edit profile' }))
      .toHaveClass('creator-profile-hero__action--secondary');
    expect(screen.getByRole('button', { name: 'Share profile' }))
      .toHaveClass('creator-profile-hero__action--secondary');
  });
});
