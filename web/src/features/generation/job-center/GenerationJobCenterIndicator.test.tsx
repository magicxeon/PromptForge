import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerationJobCenterIndicator } from './GenerationJobCenterIndicator';

const mocks = vi.hoisted(() => ({
  useGenerationJobCenter: vi.fn(),
  showToast: vi.fn(),
  actor: { userId: 'usr_alice' }
}));
vi.mock('../../../components/ui/toastStore', () => ({ showToast: mocks.showToast }));

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
    mocks.actor.userId = 'usr_alice';
    mocks.showToast.mockClear();
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

  it('retains known work and processing during a connection error without a fetch spinner', () => {
    const state = mocks.useGenerationJobCenter();
    mocks.useGenerationJobCenter.mockReturnValue({ ...state, isError: true, isFetching: true });
    const { container } = render(<MemoryRouter><GenerationJobCenterIndicator /></MemoryRouter>);
    expect(screen.getByLabelText('shell.jobCenter.label')).toHaveTextContent('1');
    expect(screen.getByText('shell.jobCenter.unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /shell.jobCenter.video/ })).toBeInTheDocument();
    expect(container.querySelector('.generation-job-center__heading svg')).toBeNull();
  });

  it('stops generation spinners at review cutoff and sends one honest warning', () => {
    const state = mocks.useGenerationJobCenter();
    const { container, rerender } = render(<MemoryRouter><GenerationJobCenterIndicator /></MemoryRouter>);
    const review = { ...state, isFetching: true, data: { ...state.data, activeCount: 0, reviewRequiredCount: 1,
      items: state.data.items.map((item: object) => ({ ...item, status: 'reconciliation_required', terminal: true })) } };
    mocks.useGenerationJobCenter.mockReturnValue(review);
    rerender(<MemoryRouter><GenerationJobCenterIndicator /></MemoryRouter>);
    expect(screen.getByLabelText('shell.jobCenter.label')).toHaveTextContent('shell.jobCenter.reviewRequired');
    expect(screen.queryByText('shell.jobCenter.failed')).not.toBeInTheDocument();
    expect(container.querySelector('.generation-job-center__spinner')).toBeNull();
    expect(mocks.showToast).toHaveBeenCalledOnce();
    expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ tone: 'warning', title: 'shell.jobCenter.reviewRequired' }));
    mocks.useGenerationJobCenter.mockReturnValue({ ...review, data: { ...review.data } });
    rerender(<MemoryRouter><GenerationJobCenterIndicator /></MemoryRouter>);
    expect(mocks.showToast).toHaveBeenCalledOnce();
  });

  it('resets terminal notifications on actor switch and keeps off-page review discoverable', () => {
    const state = mocks.useGenerationJobCenter();
    const { rerender } = render(<MemoryRouter><GenerationJobCenterIndicator /></MemoryRouter>);
    mocks.actor.userId = 'usr_bob';
    mocks.useGenerationJobCenter.mockReturnValue({ ...state, data: { ...state.data, activeCount: 0, reviewRequiredCount: 3,
      items: [{ ...state.data.items[0], status: 'completed', terminal: true }] } });
    rerender(<MemoryRouter><GenerationJobCenterIndicator /></MemoryRouter>);
    expect(mocks.showToast).not.toHaveBeenCalled();
    expect(screen.getByLabelText('shell.jobCenter.label')).toHaveTextContent('shell.jobCenter.reviewRequired');
  });
});
