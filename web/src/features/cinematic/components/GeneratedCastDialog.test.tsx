import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GeneratedCastDialog } from './GeneratedCastDialog';
import type { TrustedVideoSource } from '../../generation/api/trustedVideoSources';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'owner' } }) }));
const source: TrustedVideoSource = { id: 'seedream-sheet', previewUrl: '/outputs/sheet.png', modelId: 'seedream-5-0-pro',
  eligible: true, expiresAt: null, reason: null, generatedAt: null, policyVersion: 'test', generationMode: 'text_to_image' };
vi.mock('../../../components/generation/GeneratedLookSourceField', () => ({ GeneratedLookSourceField: (props: {
  onChange: (value: TrustedVideoSource) => void; onPreviewReady: (value: boolean) => void;
}) => <button onClick={() => { props.onChange(source); props.onPreviewReady(true); }}>Select sheet</button> }));

describe('Direct Generated Cast dialog', () => {
  it('requires name, preview and review; submits only the sheet and name and retains work on failure', async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error('Source expired')).mockResolvedValueOnce(undefined);
    const close = vi.fn();
    render(<GeneratedCastDialog open onSelect={submit} onOpenChange={close} onCharacter={vi.fn()} />);
    const assign = screen.getByRole('button', { name: 'cinematic.castSource.assign' });
    expect(assign).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'cinematic.castSource.name' }), { target: { value: 'Mira' } });
    fireEvent.click(screen.getByText('Select sheet'));
    expect(assign).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(assign);
    expect(await screen.findByRole('alert')).toHaveTextContent('Source expired');
    expect(screen.getByRole('textbox')).toHaveValue('Mira');
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.castSource.assign' }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    expect(submit).toHaveBeenLastCalledWith(source, 'Mira');
  });

  it('shows shared processing feedback, blocks duplicate submit and switching while pending', async () => {
    let finish!: () => void;
    const submit = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<GeneratedCastDialog open onSelect={submit} onOpenChange={vi.fn()} onCharacter={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Mira' } });
    fireEvent.click(screen.getByText('Select sheet')); fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.castSource.assign' }));
    expect(screen.getByRole('button', { name: 'cinematic.save.saving' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'cinematic.castSource.character' })).toBeDisabled();
    expect(submit).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(screen.queryByText('cinematic.save.saving')).not.toBeInTheDocument());
  });
});
