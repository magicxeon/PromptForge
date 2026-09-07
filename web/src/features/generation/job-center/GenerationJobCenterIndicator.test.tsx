import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerationJobCenterIndicator } from './GenerationJobCenterIndicator';

const mocks = vi.hoisted(() => ({
  useGenerationJobCenter: vi.fn(),
  actor: { userId: 'usr_alice' }
}));

vi.mock('./useGenerationJobCenter', () => ({
  useGenerationJobCenter: mocks.useGenerationJobCenter
}));
vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: mocks.actor })
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

describe('GenerationJobCenterIndicator', () => {
  beforeEach(() => {
    mocks.useGenerationJobCenter.mockReturnValue({
      data: {
        activeCount: 1,
        terminalCount: 0,
        polledAt: 'now',
        items: [{
          id: 'video_1', kind: 'video_task', mediaType: 'video', status: 'provider_processing', terminal: false,
          createdAt: null, updatedAt: null, completedAt: null, providerId: 'modelark', modelId: 'seedance',
          resultUrl: null, thumbnailUrl: null, detailHref: null, resumeHref: '/create/playground?media=video',
          billingStatus: 'reserved', estimatedCredits: 10, progress: null, error: null
        }]
      },
      isFetching: false,
      isError: false
    });
  });

  it('shows active work and links back to its owning surface', () => {
    render(<MemoryRouter><GenerationJobCenterIndicator /></MemoryRouter>);
    expect(screen.getByLabelText('shell.jobCenter.label')).toHaveTextContent('1');
    expect(screen.getByRole('link', { name: /shell.jobCenter.video shell.jobCenter.processing/i }))
      .toHaveAttribute('href', '/create/playground?media=video');
  });
});
