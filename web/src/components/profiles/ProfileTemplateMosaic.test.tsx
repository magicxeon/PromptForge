import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { CommunityPost } from '../../features/community/schemas/communitySchemas';
import { ProfileTemplateMosaic } from './ProfileTemplateMosaic';

function template(id: string): CommunityPost {
  return {
    id,
    postType: 'template',
    status: 'published',
    visibility: 'public',
    title: `Template ${id}`,
    imageUrl: `/images/${id}.jpg`,
    thumbnailUrl: `/images/${id}-thumb.jpg`,
    presentationUrls: {
      profileTemplateSquare: `/api/templates/${id}/profile-square`
    },
    creator: { id: 'creator_alice', handle: 'alice', displayName: 'Alice' },
    engagementSummary: {
      likeCount: 0,
      commentCount: 0,
      remixSuccessCount: 0,
      comparisonVoteCount: 0,
      viewCount: 0,
      saveCount: 0,
      shareCount: 0
    },
    viewerState: {},
    ranking: {}
  } as unknown as CommunityPost;
}

describe('ProfileTemplateMosaic', () => {
  it('renders one lead and three compact templates plus the view-all tile', () => {
    const { container } = render(
      <MemoryRouter>
        <ProfileTemplateMosaic
          posts={[template('one'), template('two'), template('three'), template('four'), template('five')]}
          viewAllHref="/profiles/alice/templates"
          viewAllLabel="View all"
        />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.queryByRole('link', { name: 'Template five' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/profiles/alice/templates'
    );
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/api/templates/one/profile-square'
    );
  });
});
