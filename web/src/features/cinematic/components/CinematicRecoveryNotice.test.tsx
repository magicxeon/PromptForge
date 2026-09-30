import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, Link, MemoryRouter, RouterProvider, useParams } from 'react-router-dom';
import { writeActorScopedDraft } from '../../../lib/persistence/actorScopedStorage';
import { fullStoryRecoverySchema, RECOVERY_LIMITS, useCinematicTextRecovery } from '../state/useCinematicTextRecovery';
import { CinematicRecoveryNotice } from './CinematicRecoveryNotice';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('CinematicRecoveryNotice', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  function Writer() {
    const { documentId = 'one' } = useParams();
    const recovery = useCinematicTextRecovery({ actorId: 'actor-a', projectId: 'project-a', documentId,
      revision: 'revision-1', serverValue: { content: 'Saved', instruction: '' }, schema: fullStoryRecoverySchema });
    return <main><CinematicRecoveryNotice recovery={recovery} />
      <textarea aria-label="Document" value={recovery.value.content} onChange={event => recovery.setValue(value => ({ ...value, content: event.target.value }))} />
      <Link to="/writer/two">Next document</Link><Link to="/away">Leave writer</Link>
    </main>;
  }

  it('keeps a capacity-failed draft visible on cancelled SPA navigation and only leaves with consent', async () => {
    writeActorScopedDraft({ actorId: 'actor-a', feature: 'cinematic-text-recovery', schemaVersion: 1,
      payload: Array.from({ length: RECOVERY_LIMITS.documents }, (_, index) => ({
        projectId: 'other-project', documentId: String(index), revision: '1', updatedAt: Date.now(),
        base: { content: 'Saved', instruction: '' }, value: { content: 'Draft', instruction: '' }
      })) });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const router = createMemoryRouter([{ path: '/writer/:documentId', element: <Writer /> },
      { path: '/away', element: <h1>Away</h1> }], { initialEntries: ['/writer/one'] });
    const view = render(<RouterProvider router={router} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Document' }), { target: { value: 'Keep this draft' } });
    expect(screen.getByRole('alert')).toHaveTextContent('cinematic.recovery.unavailable');
    fireEvent.click(screen.getByRole('link', { name: 'Next document' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith('cinematic.recovery.leaveConfirm'));
    expect(router.state.location.pathname).toBe('/writer/one');
    expect(screen.getByRole('textbox', { name: 'Document' })).toHaveValue('Keep this draft');
    fireEvent.click(screen.getByRole('link', { name: 'Leave writer' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('textbox', { name: 'Document' })).toHaveValue('Keep this draft');
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('link', { name: 'Next document' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/writer/two'));
    expect(screen.getByRole('textbox', { name: 'Document' })).toHaveValue('Saved');
    expect(screen.queryByText('Unexpected Application Error!')).not.toBeInTheDocument();
    view.unmount(); router.dispose();
  });

  it('blocks browser Back for quota-failed work without breaking the current editor', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const router = createMemoryRouter([{ path: '/writer/:documentId', element: <Writer /> },
      { path: '/away', element: <h1>Away</h1> }], { initialEntries: ['/away', '/writer/one'], initialIndex: 1 });
    const view = render(<RouterProvider router={router} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Document' }), { target: { value: 'Quota draft' } });
    await act(async () => { await router.navigate(-1); });
    expect(confirm).toHaveBeenCalledOnce();
    expect(router.state.location.pathname).toBe('/writer/one');
    expect(screen.getByRole('textbox', { name: 'Document' })).toHaveValue('Quota draft');
    confirm.mockReturnValue(true);
    await act(async () => { await router.navigate(-1); });
    expect(await screen.findByRole('heading', { name: 'Away' })).toBeVisible();
    view.unmount(); router.dispose();
  });

  it('does not block route changes when the draft was successfully persisted', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const router = createMemoryRouter([{ path: '/writer/:documentId', element: <Writer /> },
      { path: '/away', element: <h1>Away</h1> }], { initialEntries: ['/writer/one'] });
    const view = render(<RouterProvider router={router} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Document' }), { target: { value: 'Stored draft' } });
    fireEvent.click(screen.getByRole('link', { name: 'Leave writer' }));
    expect(await screen.findByRole('heading', { name: 'Away' })).toBeVisible();
    expect(confirm).not.toHaveBeenCalled();
    view.unmount(); router.dispose();
  });

  it('renders safely in an isolated MemoryRouter without a data-router blocker', () => {
    render(<MemoryRouter><Writer /></MemoryRouter>);
    expect(screen.getByRole('textbox', { name: 'Document' })).toHaveValue('Saved');
  });
  it('requires an accessible acknowledgement for stale recovery and returns focus to the editor', async () => {
    const recovery = { pending: true, stale: true, unavailable: false, restore: vi.fn(), discard: vi.fn() };
    render(<main><CinematicRecoveryNotice recovery={recovery} /><textarea aria-label="Document" /></main>);
    expect(screen.getByRole('alert')).toHaveTextContent('cinematic.recovery.stale');
    const restore = screen.getByRole('button', { name: 'cinematic.recovery.restore' });
    expect(restore).toBeDisabled();
    fireEvent.click(restore);
    expect(recovery.restore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'cinematic.recovery.acknowledge' }));
    expect(restore).toBeEnabled();
    fireEvent.click(restore);
    expect(recovery.restore).toHaveBeenCalledWith(true);
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Document' })).toHaveFocus());
  });

  it('keeps Restore and Discard disabled while an existing operation is pending', () => {
    const recovery = { pending: true, stale: false, unavailable: false, restore: vi.fn(), discard: vi.fn() };
    render(<CinematicRecoveryNotice recovery={recovery} disabled />);
    expect(screen.getByRole('button', { name: 'cinematic.recovery.restore' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'cinematic.recovery.discard' })).toBeDisabled();
  });

  it('announces storage failure without offering a nonexistent recovery', () => {
    const recovery = { pending: false, stale: false, unavailable: true, restore: vi.fn(), discard: vi.fn() };
    render(<CinematicRecoveryNotice recovery={recovery} />);
    expect(screen.getByRole('alert')).toHaveTextContent('cinematic.recovery.unavailableDescription');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
