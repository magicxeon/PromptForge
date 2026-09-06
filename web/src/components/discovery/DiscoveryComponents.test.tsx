import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Camera, Search } from 'lucide-react';
import { DiscoveryPageHero } from './DiscoveryPageHero';
import {
  DiscoverySegmentedControl,
  DiscoveryToolbar
} from './DiscoveryToolbar';
import { DiscoveryMetricRow } from './DiscoveryMetricRow';
import { DiscoverySteps } from './DiscoverySteps';
import { EditorialTutorialRail } from './EditorialTutorialRail';
import { DiscoveryLoadMore } from './DiscoveryLoadMore';

describe('discovery presentation components', () => {
  it('renders a media-first hero with navigable actions', () => {
    render(
      <MemoryRouter>
        <DiscoveryPageHero
          eyebrow="Discover"
          title="Template gallery"
          description="Find a reusable starting point."
          media={<img src="/preview.jpg" alt="Featured work" />}
          actions={[{ label: 'Create', to: '/create/playground', variant: 'primary' }]}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Template gallery' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/create/playground');
    expect(screen.getByRole('img', { name: 'Featured work' })).toBeVisible();
  });

  it('keeps search controlled and submits only when requested', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    const onSubmit = vi.fn();
    render(
      <DiscoveryToolbar
        searchValue="portrait"
        searchLabel="Search templates"
        searchPlaceholder="Search"
        clearLabel="Clear search"
        onSearchChange={onChange}
        onSearchClear={onClear}
        onSearchSubmit={onSubmit}
      />
    );

    fireEvent.submit(screen.getByRole('search'));
    expect(onSubmit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('reports the selected segmented option without owning filter state', () => {
    const onChange = vi.fn();
    render(
      <DiscoverySegmentedControl
        label="Period"
        value="latest"
        options={[{ label: 'Latest', value: 'latest' }, { label: 'Week', value: 'week' }]}
        onChange={onChange}
      />
    );

    expect(screen.getByRole('button', { name: 'Latest' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Week' }));
    expect(onChange).toHaveBeenCalledWith('week');
  });

  it('omits unavailable metadata instead of inventing fallback values', () => {
    const { container } = render(
      <DiscoveryMetricRow metrics={[
        { id: 'camera', icon: <Camera />, label: 'Camera', value: '50mm' },
        { id: 'missing', icon: <Search />, label: 'Unavailable', value: null }
      ]} />
    );

    expect(screen.getByText('50mm')).toBeVisible();
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.discovery-metric-row > div')).toHaveLength(1);
  });

  it('renders workflow and tutorial content as static presentation', () => {
    render(<>
      <DiscoverySteps title="How it works" steps={[
        { id: 'find', icon: <Search />, title: 'Find', description: 'Browse public work.' }
      ]} />
      <EditorialTutorialRail
        eyebrow="Guide"
        title="Learn the workflow"
        sampleLabel="Sample"
        items={[{
          id: 'guide',
          title: 'Build a scene',
          description: 'A short walkthrough.',
          imageUrl: '/assets/guide.jpg'
        }]}
      />
    </>);

    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
    expect(screen.getByText('Build a scene')).toBeVisible();
    expect(screen.queryByRole('iframe')).not.toBeInTheDocument();
  });

  it('exposes explicit loading and load-more states', () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <DiscoveryLoadMore
        hasMore
        loading={false}
        loadLabel="Load more"
        loadingLabel="Loading"
        onLoadMore={onLoadMore}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalledOnce();
    rerender(
      <DiscoveryLoadMore
        hasMore
        loading
        loadLabel="Load more"
        loadingLabel="Loading"
        onLoadMore={onLoadMore}
      />
    );
    expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled();
  });
});
