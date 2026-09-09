import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComparisonExportDialog } from './ComparisonExportDialog';
import { ApiError } from '../../lib/api/apiError';

const mocks = vi.hoisted(() => ({ actorId: 'owner', request: vi.fn(), create: vi.fn(), revoke: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: mocks.actorId } }) }));
vi.mock('../../lib/auth/actorStore', () => ({ getActiveActorId: () => mocks.actorId }));
vi.mock('../../lib/api/mediaExportApi', () => ({ requestComparisonExport: mocks.request }));
const items = ['A', 'B'].map(id => ({ id, model: `Model ${id}`, provider: 'OpenAI' }));
const request = { kind: 'comparison' as const, setId: 'set', runId: 'run', layout: 'auto' as const };
const result = { blob: new Blob(['image'], { type: 'image/png' }), width: 1504, height: 1144,
  count: 2, mimeType: 'image/png', layoutVersion: 'comparison-black-v1', presetId: 'portrait-2', warnings: [],
  filename: 'momelo-comparison-2-portrait-2-20260909-120000.png' };
function open() { fireEvent.click(screen.getByRole('button', { name: 'comparisons.export.open' })); }
function decode() {
  const image = screen.getByAltText('comparisons.export.preview');
  Object.defineProperties(image, { naturalWidth: { value: 1504, configurable: true }, naturalHeight: { value: 1144, configurable: true } });
  fireEvent.load(image); return image;
}
describe('ComparisonExportDialog', () => {
  beforeEach(() => {
    mocks.actorId = 'owner'; mocks.request.mockReset(); mocks.create.mockReset().mockReturnValue('blob:final'); mocks.revoke.mockReset();
    Object.defineProperties(URL, { createObjectURL: { configurable: true, value: mocks.create }, revokeObjectURL: { configurable: true, value: mocks.revoke } });
  });
  it('previews the exact encoded blob before download, preserves labels, and makes only the comparison action gold', async () => {
    mocks.request.mockResolvedValue(result);
    const view = render(<ComparisonExportDialog request={request} items={items} />); open();
    expect(screen.getByRole('button', { name: 'comparisons.export.download' })).toBeDisabled();
    expect(view.container.querySelector('button')).toHaveClass('comparison-export-action');
    expect(screen.getByRole('dialog').querySelector('[data-processing-spinner]')).not.toBeNull();
    await screen.findByAltText('comparisons.export.preview');
    expect(mocks.create).toHaveBeenCalledWith(result.blob);
    expect(mocks.request.mock.calls[0]![0]).toMatchObject({ outputIds: ['A', 'B'], format: 'png', size: 'standard', layout: 'auto' });
    expect(decode()).toHaveAttribute('src', 'blob:final');
    expect(screen.getByRole('button', { name: 'comparisons.export.download' })).toBeEnabled();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function(this: HTMLAnchorElement) {
      expect(this.href).toBe('blob:final'); expect(this.download).toBe(result.filename);
    });
    fireEvent.click(screen.getByRole('button', { name: 'comparisons.export.download' }));
    expect(click).toHaveBeenCalledTimes(1); expect(mocks.request).toHaveBeenCalledTimes(1); click.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'comparisons.export.close' }));
    expect(mocks.revoke).toHaveBeenCalledWith('blob:final');
  });
  it('ignores late results after settings changes and actor switch', async () => {
    let resolve!: (data: typeof result) => void;
    mocks.request.mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValue(result);
    const view = render(<ComparisonExportDialog request={request} items={items} />); open();
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
    const signal = mocks.request.mock.calls[0]![1] as AbortSignal;
    fireEvent.change(screen.getByLabelText('comparisons.export.format'), { target: { value: 'jpeg' } });
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve(result); });
    expect(mocks.create).not.toHaveBeenCalled();
    await screen.findByAltText('comparisons.export.preview'); decode();
    mocks.actorId = 'other'; view.rerender(<ComparisonExportDialog request={request} items={items} />);
    expect(screen.getByRole('button', { name: 'comparisons.export.download' })).toBeDisabled();
    expect(mocks.revoke).toHaveBeenCalledWith('blob:final');
    view.unmount();
  });
  it('requires explicit 2-4 selection for larger runs and retries failures without generation', async () => {
    mocks.request.mockRejectedValueOnce(new ApiError({ status: 429, code: 'export_busy', message: 'busy' })).mockResolvedValue(result);
    render(<ComparisonExportDialog request={request} items={[...items, ...['C', 'D', 'E'].map(id => ({ id, provider: 'Other', model: id }))]} />); open();
    expect(screen.getByText('comparisons.export.choose')).toBeVisible();
    const boxes = within(screen.getByRole('dialog')).getAllByRole('checkbox');
    fireEvent.click(boxes[0]!); fireEvent.click(boxes[1]!);
    await screen.findByRole('alert');
    expect(screen.getByText('comparisons.export.error.export_busy')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'comparisons.export.retry' }));
    await screen.findByAltText('comparisons.export.preview');
    fireEvent.error(screen.getByAltText('comparisons.export.preview'));
    expect(screen.getByRole('button', { name: 'comparisons.export.download' })).toBeDisabled();
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });
});
