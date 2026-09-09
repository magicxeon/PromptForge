import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaExportButton } from './MediaExportButton';

const mocks = vi.hoisted(() => ({ actorId: 'owner', request: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: mocks.actorId } }) }));
vi.mock('../../lib/auth/actorStore', () => ({ getActiveActorId: () => mocks.actorId }));
vi.mock('../../lib/api/mediaExportApi', () => ({ requestMediaExport: mocks.request }));
const request = { kind: 'look_sheet' as const, jobId: 'job' };
describe('MediaExportButton', () => {
  beforeEach(() => { mocks.actorId = 'owner'; mocks.request.mockReset(); });
  it('prevents a duplicate request and aborts on cancellation', () => {
    mocks.request.mockImplementation(() => new Promise(() => {}));
    render(<MediaExportButton request={request} />);
    const button = screen.getByRole('button', { name: 'mediaExport.download' });
    fireEvent.click(button); fireEvent.click(button);
    expect(mocks.request).toHaveBeenCalledTimes(1);
    const signal = mocks.request.mock.calls[0]![1] as AbortSignal;
    fireEvent.click(screen.getByRole('button', { name: 'mediaExport.cancel' }));
    expect(signal.aborted).toBe(true);
  });
  it('retries only export after an error', async () => {
    mocks.request.mockRejectedValue(new Error('unavailable'));
    render(<MediaExportButton request={request} />);
    fireEvent.click(screen.getByRole('button', { name: 'mediaExport.download' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'mediaExport.download' }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2));
  });
  it('aborts a previous actor request and suppresses its late download', async () => {
    let resolve!: (value: Blob) => void;
    mocks.request.mockImplementation(() => new Promise<Blob>(done => { resolve = done; }));
    const view = render(<MediaExportButton request={request} />);
    fireEvent.click(screen.getByRole('button', { name: 'mediaExport.download' }));
    const signal = mocks.request.mock.calls[0]![1] as AbortSignal;
    mocks.actorId = 'other';
    view.rerender(<MediaExportButton request={request} />);
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve(new Blob(['private'])); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'mediaExport.download' })).toBeEnabled();
  });
});
