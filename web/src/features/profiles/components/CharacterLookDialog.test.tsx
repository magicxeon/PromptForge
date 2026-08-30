import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterLookDialog, type CharacterLookSuggestion } from './CharacterLookDialog';

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

  it('uploads one Full Look authority and preserves the source-ready draft workflow', async () => {
    api.upload.mockResolvedValueOnce({ referenceId: 'asset_full' });
    renderDialog(<CharacterLookDialog open onOpenChange={vi.fn()} characterProfileId="char_1" characterProfileVersionId="charver_1" onSaved={vi.fn()} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Complete station look' } });
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [new File(['look'], 'look.png', { type: 'image/png' })] } });
    const saveButton = screen.getByRole('button', { name: /save$/i });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.submit(saveButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(api.create).toHaveBeenCalledWith('char_1', expect.objectContaining({
      sourceMode: 'uploaded',
      garmentAuthorities: { full_look: { front: 'asset_full' } }
    })));
    expect(api.review).not.toHaveBeenCalled();
  });

  it('requires upper and lower references for Separate Pieces and keeps optional roles', async () => {
    api.upload.mockResolvedValueOnce({ referenceId: 'asset_upper' }).mockResolvedValueOnce({ referenceId: 'asset_lower' });
    renderDialog(<CharacterLookDialog open onOpenChange={vi.fn()} characterProfileId="char_1" characterProfileVersionId="charver_1" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Separate station look' } });
    fireEvent.click(screen.getByRole('radio', { name: /separatePieces/i }));
    const fileInputs = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')];
    fireEvent.change(fileInputs[0]!, { target: { files: [new File(['upper'], 'upper.png', { type: 'image/png' })] } });
    expect(screen.getByRole('button', { name: /save$/i })).toBeDisabled();
    fireEvent.change(fileInputs[1]!, { target: { files: [new File(['lower'], 'lower.png', { type: 'image/png' })] } });
    const saveButton = screen.getByRole('button', { name: /save$/i });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.submit(saveButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(api.create).toHaveBeenCalledWith('char_1', expect.objectContaining({
      garmentAuthorities: { upper: { front: 'asset_upper' }, lower: { front: 'asset_lower' } }
    })));
  });

  it('requests a project-aware AI suggestion and persists its recipe provenance', async () => {
    const suggestion = {
      lookName: 'AI station look', wardrobeDirection: 'A practical navy coat.',
      garments: { upper: 'knit', lower: 'trousers', outerwear: 'coat', footwear: 'boots', accessories: [] },
      palette: ['navy'], materials: ['wool'], sceneScope: 'film_wide' as const, recommendedSceneIds: [],
      rationale: 'Supports continuity.', movementConstraints: [], continuityNotes: [], warnings: [],
      provenance: { recipeId: 'wardrobe', recipeVersion: 1 }, billingStatus: 'qualification_no_charge' as const
    };
    renderDialog(<CharacterLookDialog open initialMode="ai" onOpenChange={vi.fn()} characterProfileId="char_1" characterProfileVersionId="charver_1" requestAiSuggestion={vi.fn().mockResolvedValue(suggestion)} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /generateSuggestion/i }));
    await waitFor(() => expect(screen.getByDisplayValue('AI station look')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /saveAiDirection/i }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('char_1', expect.objectContaining({
      description: 'A practical navy coat.', suggestionSnapshot: suggestion
    })));
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('shows analysis progress and blocks duplicate requests', async () => {
    let resolveSuggestion!: (value: CharacterLookSuggestion) => void;
    const requestAiSuggestion = vi.fn(() => new Promise<CharacterLookSuggestion>(resolve => {
      resolveSuggestion = resolve;
    }));
    renderDialog(<CharacterLookDialog
      open
      initialMode="ai"
      onOpenChange={vi.fn()}
      characterProfileId="char_1"
      characterProfileVersionId="charver_1"
      requestAiSuggestion={requestAiSuggestion}
      onSaved={vi.fn()}
    />);

    fireEvent.click(screen.getByRole('button', { name: /generateSuggestion/i }));
    const progressButton = screen.getByRole('button', { name: /analyzingSuggestion/i });
    expect(progressButton).toBeDisabled();
    fireEvent.click(progressButton);
    expect(requestAiSuggestion).toHaveBeenCalledTimes(1);

    resolveSuggestion({
      lookName: 'Ready Look',
      wardrobeDirection: 'A movement-safe tailored Look.',
      garments: { upper: 'shirt', lower: 'trousers', outerwear: '', footwear: 'shoes', accessories: [] },
      palette: [], materials: [], sceneScope: 'film_wide', recommendedSceneIds: [],
      rationale: '', movementConstraints: [], continuityNotes: [], warnings: [],
      provenance: { recipeId: 'wardrobe', recipeVersion: 1 },
      billingStatus: 'qualification_no_charge'
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /regenerateSuggestion/i })).toBeEnabled());
  });

  it('preserves edited direction and offers retry when story analysis fails', async () => {
    const suggestion = {
      lookName: 'Recovered station look', wardrobeDirection: 'A practical charcoal travel coat.',
      garments: { upper: 'knit', lower: 'trousers', outerwear: 'coat', footwear: 'boots', accessories: [] },
      palette: ['charcoal'], materials: ['wool'], sceneScope: 'film_wide' as const, recommendedSceneIds: [],
      rationale: 'Supports movement.', movementConstraints: [], continuityNotes: [], warnings: [],
      provenance: { recipeId: 'wardrobe', recipeVersion: 1 }, billingStatus: 'qualification_no_charge' as const
    };
    const requestAiSuggestion = vi.fn()
      .mockRejectedValueOnce(new Error('Analysis is temporarily unavailable.'))
      .mockResolvedValueOnce(suggestion);
    renderDialog(<CharacterLookDialog
      open
      initialMode="ai"
      onOpenChange={vi.fn()}
      characterProfileId="char_1"
      characterProfileVersionId="charver_1"
      requestAiSuggestion={requestAiSuggestion}
      onSaved={vi.fn()}
    />);

    const [nameInput, directionInput] = screen.getAllByRole('textbox');
    fireEvent.change(nameInput!, { target: { value: 'My retained Look' } });
    fireEvent.change(directionInput!, { target: { value: 'Keep this manual direction.' } });
    fireEvent.click(screen.getByRole('button', { name: /generateSuggestion/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Analysis is temporarily unavailable.');
    expect(nameInput).toHaveValue('My retained Look');
    expect(directionInput).toHaveValue('Keep this manual direction.');

    fireEvent.click(screen.getByRole('button', { name: /retrySuggestion/i }));
    await waitFor(() => expect(nameInput).toHaveValue('Recovered station look'));
    expect(directionInput).toHaveValue('A practical charcoal travel coat.');
    expect(requestAiSuggestion).toHaveBeenCalledTimes(2);
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
