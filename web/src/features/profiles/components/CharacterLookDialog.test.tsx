import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterLookDialog } from './CharacterLookDialog';

const api = vi.hoisted(() => ({
  upload: vi.fn(),
  create: vi.fn(),
  review: vi.fn(),
  approve: vi.fn()
}));

vi.mock('../../generation/api/generationApi', () => ({
  uploadGenerationReference: (...args: unknown[]) => api.upload(...args)
}));

vi.mock('../api/profileApi', () => ({
  createCharacterLookDraft: (...args: unknown[]) => api.create(...args),
  reviewCharacterLookVersion: (...args: unknown[]) => api.review(...args),
  approveCharacterLookVersion: (...args: unknown[]) => api.approve(...args)
}));

const testI18n = i18next.createInstance();

describe('CharacterLookDialog', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en', resources: { en: { cinematic: {} } }, keySeparator: false,
      returnNull: false, interpolation: { escapeValue: false }
    });
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:character-look-preview'),
      revokeObjectURL: vi.fn()
    });
  });

  beforeEach(() => {
    api.upload.mockReset().mockResolvedValue({ referenceId: 'asset_sheet' });
    api.create.mockReset().mockResolvedValue(look('review'));
    api.review.mockReset().mockResolvedValue(look('review'));
    api.approve.mockReset().mockResolvedValue(look('approved'));
  });

  it('approves one owned Character Look Sheet without starting Generation', async () => {
    const onSaved = vi.fn();
    renderDialog(<CharacterLookDialog
      open
      onOpenChange={vi.fn()}
      characterProfileId="char_1"
      characterProfileVersionId="charver_1"
      onSaved={onSaved}
    />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Station look' } });
    fireEvent.click(screen.getByRole('radio', { name: /completeSheet/i }));
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [new File(['sheet'], 'station-look.png', { type: 'image/png' })] }
    });
    fireEvent.click(screen.getByRole('checkbox'));
    const approveButton = screen.getByRole('button', { name: /approveSheet/i });
    await waitFor(() => expect(approveButton).toBeEnabled());
    fireEvent.submit(approveButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ lifecycleStatus: 'approved' })));
    expect(api.upload).toHaveBeenCalledTimes(1);
    expect(api.create).toHaveBeenCalledWith('char_1', expect.objectContaining({
      sourceMode: 'uploaded_character_sheet',
      sourceSheetAssetId: 'asset_sheet'
    }));
    expect(api.review).toHaveBeenCalledWith('char_1', 'look_1', 'lookver_1', expect.objectContaining({
      sheetAssetId: 'asset_sheet',
      rightsDeclarationAccepted: true,
      cropManifest: expect.objectContaining({ layoutVersion: 'character-look-sheet-v1' })
    }));
    expect(api.approve).toHaveBeenCalledTimes(1);
  });

  it('stores an AI wardrobe direction as an unapproved proposal without media dispatch', async () => {
    const onSaved = vi.fn();
    renderDialog(<CharacterLookDialog
      open
      initialMode="ai"
      onOpenChange={vi.fn()}
      characterProfileId="char_1"
      characterProfileVersionId="charver_1"
      onSaved={onSaved}
    />);

    const textboxes = screen.getAllByRole('textbox');
    expect(textboxes).toHaveLength(2);
    fireEvent.change(textboxes[0] as HTMLElement, { target: { value: 'Rain platform look' } });
    fireEvent.change(textboxes[1] as HTMLElement, { target: { value: 'A practical dark coat for a damp blue-hour station.' } });
    fireEvent.click(screen.getByRole('button', { name: /saveAiDirection/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(api.create).toHaveBeenCalledWith('char_1', expect.objectContaining({
      sourceMode: 'ai_suggestion',
      description: 'A practical dark coat for a damp blue-hour station.'
    }));
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.review).not.toHaveBeenCalled();
    expect(api.approve).not.toHaveBeenCalled();
  });
});

function renderDialog(dialog: ReactNode) {
  return render(<I18nextProvider i18n={testI18n}>{dialog}</I18nextProvider>);
}

function look(lifecycleStatus: 'review' | 'approved') {
  return {
    id: 'look_1',
    characterProfileId: 'char_1',
    sourceCharacterProfileVersionId: 'charver_1',
    name: 'Station look',
    description: '',
    tags: [],
    official: false,
    visibility: 'owner_only',
    lifecycleStatus,
    activeVersionId: 'lookver_1',
    approvedVersionId: lifecycleStatus === 'approved' ? 'lookver_1' : null,
    versions: [],
    createdAt: '2026-08-29T00:00:00.000Z',
    updatedAt: '2026-08-29T00:00:00.000Z',
    retiredAt: null
  };
}
