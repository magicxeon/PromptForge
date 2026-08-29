import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CharacterPickerDialog } from './CinematicDialogs';

const owned = vi.fn(async (cursor?: string | null) => cursor ? page([candidate('char_b', 'Second Character')]) : page([candidate('char_a', 'First Character')], 'owned-next'));
const community = vi.fn(async () => page([]));

vi.mock('../../profiles/api/profileApi', () => ({
  listOwnedCharacters: (...args: unknown[]) => owned(...args as [string | null]),
  listCharacters: () => community(),
  createCharacterLookDraft: vi.fn()
}));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({
  AuthenticatedMediaImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />
}));

const testI18n = i18next.createInstance();

describe('CharacterPickerDialog', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en', resources: { en: { cinematic: {} } }, keySeparator: false,
      returnNull: false, interpolation: { escapeValue: false }
    });
  });

  it('shows a face-led selected state and keeps confirmation in the fixed footer', async () => {
    render(<I18nextProvider i18n={testI18n}><CharacterPickerDialog open onOpenChange={vi.fn()} onSelect={vi.fn()} /></I18nextProvider>);
    const option = await screen.findByRole('option', { name: /First Character/i });
    expect(option.querySelector('img')).toHaveAttribute('src', '/face-char_a.webp');
    fireEvent.click(option);
    expect(option).toHaveAttribute('aria-selected', 'true');
    expect(option).toHaveClass('is-selected');
    const useButton = screen.getByRole('button', { name: 'cinematic.picker.use' });
    expect(useButton).toBeEnabled();
    expect(useButton.closest('.cinematic-dialog__character-picker-footer')).not.toBeNull();
  });

  it('loads the next bounded cursor page without discarding the dialog', async () => {
    render(<I18nextProvider i18n={testI18n}><CharacterPickerDialog open onOpenChange={vi.fn()} /></I18nextProvider>);
    await screen.findByRole('option', { name: /First Character/i });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.picker.next' }));
    await waitFor(() => expect(screen.getByRole('option', { name: /Second Character/i })).toBeVisible());
    expect(screen.getByText('cinematic.picker.page')).toBeVisible();
  });

  it('waits for Cast persistence before closing the dialog', async () => {
    let resolveSelection: (() => void) | undefined;
    const onSelect = vi.fn(() => new Promise<void>(resolve => { resolveSelection = resolve; }));
    const onOpenChange = vi.fn();
    render(<I18nextProvider i18n={testI18n}><CharacterPickerDialog open onOpenChange={onOpenChange} onSelect={onSelect} /></I18nextProvider>);
    fireEvent.click(await screen.findByRole('option', { name: /First Character/i }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.picker.use' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'cinematic.save.saving' })).toBeDisabled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    resolveSelection?.();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('keeps the dialog open and reports a failed Cast mutation', async () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn().mockRejectedValue(new Error('Project version is stale.'));
    render(<I18nextProvider i18n={testI18n}><CharacterPickerDialog open onOpenChange={onOpenChange} onSelect={onSelect} /></I18nextProvider>);
    fireEvent.click(await screen.findByRole('option', { name: /First Character/i }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.picker.use' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Project version is stale.');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('does not offer a Character whose directory record has no pinned version', async () => {
    owned.mockResolvedValueOnce(page([candidate('char_unpinned', 'Unpinned Character', '')]));
    render(<I18nextProvider i18n={testI18n}><CharacterPickerDialog open onOpenChange={vi.fn()} /></I18nextProvider>);

    await waitFor(() => expect(owned).toHaveBeenCalled());
    expect(screen.queryByRole('option', { name: /Unpinned Character/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cinematic.picker.use' })).toBeDisabled();
  });
});

function candidate(id: string, displayName: string, characterProfileVersionId = `ver_${id}`) {
  return {
    id, displayName, personalitySummary: 'calm', intendedUses: [], characterType: 'reusable_model',
    destinationCapabilities: [], reusePolicy: 'public_reusable', reuseStatus: 'available', handoffAvailable: true,
    faceThumbnailUrl: `/face-${id}.webp`, thumbnailUrl: `/body-${id}.webp`, characterProfileVersionId,
    stats: { totalOutputs: 0, byUseCase: { fashion: 0, sceneStory: 0, other: 0 } }
  };
}

function page(items: ReturnType<typeof candidate>[], nextCursor: string | null = null) {
  return { items, nextCursor, hasMore: Boolean(nextCursor), totalApprox: items.length };
}
