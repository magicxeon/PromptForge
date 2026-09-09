import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterLookDialog, type CharacterLookSuggestion } from './CharacterLookDialog';
import type { CharacterLook } from '../schemas/profileSchemas';

const api = vi.hoisted(() => ({
  upload: vi.fn(),
  compose: vi.fn(),
  create: vi.fn(),
  importGenerated: vi.fn(),
  review: vi.fn(),
  approve: vi.fn(),
  plan: vi.fn(),
  reviewGenerated: vi.fn()
}));

vi.mock('../../../components/generation/GenerationExperience', () => ({
  GenerationExperience: (props: { initialPrompt?: string; additionalDirection?: string; referenceRoles?: string[]; sceneTemplateSnapshot?: Record<string, unknown>; fixedOutputCount?: number; allowPromptRefinement?: boolean; layoutVariant?: string; showRecentGenerations?: boolean; onCompleted?: (jobId: string) => void; renderResultActions?: (job: { id: string; status: string; result: { imageUrl: string } }) => ReactNode }) => <section aria-label="shared-generation-experience" data-prompt={props.initialPrompt} data-additional-direction={props.additionalDirection} data-reference-roles={props.referenceRoles?.join(',')} data-has-additional-snapshot={String(Boolean(props.sceneTemplateSnapshot?.additionalDirectionSnapshot))} data-fixed-output-count={props.fixedOutputCount} data-prompt-refinement={String(props.allowPromptRefinement)} data-layout-variant={props.layoutVariant} data-show-recent={String(props.showRecentGenerations)}>
    <button type="button" onClick={() => props.onCompleted?.('job_look_sheet')}>complete-look-generation</button>
    {props.renderResultActions?.({ id: 'job_look_sheet', status: 'completed', result: { imageUrl: '/outputs/look.png' } })}
  </section>
}));

vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({
  AuthenticatedMediaImage: (props: { src: string; alt?: string; fallback?: ReactNode; renderResolved?: (resolvedSrc: string) => ReactNode }) => props.renderResolved ? props.renderResolved(props.src) : <img src={props.src} alt={props.alt || ''} />
}));

vi.mock('../../generation/api/generationApi', () => ({
  uploadGenerationReference: (...args: unknown[]) => api.upload(...args),
  composeGenerationReferences: (...args: unknown[]) => api.compose(...args)
}));

vi.mock('../api/profileApi', () => ({
  importGeneratedCharacterLook: (...args: unknown[]) => api.importGenerated(...args),
  createCharacterLookDraft: (...args: unknown[]) => api.create(...args),
  reviewCharacterLookVersion: (...args: unknown[]) => api.review(...args),
  approveCharacterLookVersion: (...args: unknown[]) => api.approve(...args),
  getCharacterLookGenerationPlan: (...args: unknown[]) => api.plan(...args),
  reviewGeneratedCharacterLookVersion: (...args: unknown[]) => api.reviewGenerated(...args)
}));

const testI18n = i18next.createInstance();

vi.mock('./GeneratedLookSourceField', () => ({ GeneratedLookSourceField: (props: {
  onChange: (value: unknown) => void; onPreviewReady: (value: boolean) => void;
}) => <button type="button" onClick={() => {
  props.onChange({ id: 'seedream-sheet', eligible: true, expiresAt: new Date(Date.now() + 86400000).toISOString() });
  props.onPreviewReady(true);
}}>select-owned-generated-sheet</button> }));

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
    api.compose.mockReset().mockResolvedValue({ referenceId: 'asset_wardrobe_composite' });
    api.create.mockReset().mockResolvedValue(look('review'));
    api.importGenerated.mockReset().mockResolvedValue(reviewReadyLook());
    api.review.mockReset().mockResolvedValue(reviewReadyLook());
    api.approve.mockReset().mockResolvedValue(look('approved'));
    api.plan.mockReset().mockResolvedValue({
      operation: 'character_look_sheet',
      recipe: { id: 'character-look-sheet', version: 1, fingerprint: 'recipe123' },
      prompt: 'Create one compact Character Look Sheet.',
      references: {},
      characterProfileContext: {
        purpose: 'character_usage', characterProfileId: 'char_1',
        characterProfileVersionId: 'charver_1', sourceId: 'look_1'
      },
      output: { aspectRatio: '1:1', outputCount: 1 },
      source: {
        characterProfileId: 'char_1', characterProfileVersionId: 'charver_1',
        lookId: 'look_1', lookVersionId: 'lookver_1'
      }
    });
    api.reviewGenerated.mockReset().mockResolvedValue(reviewReadyLook());
  });

  it('imports an owned generated sheet only after confirmation, retaining review and approval', async () => {
    const onSaved = vi.fn();
    renderDialog(<CharacterLookDialog open onOpenChange={vi.fn()} characterProfileId="char_1"
      characterProfileVersionId="charver_1" characterDisplayName="Lalin" onSaved={onSaved} />);
    expect(within(screen.getByRole('radiogroup', { name: /sourceMode/ })).getAllByRole('radio')).toHaveLength(4);
    fireEvent.click(screen.getByRole('radio', { name: /generatedSheet/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Garden Look' } });
    expect(screen.getByRole('button', { name: /continueToReview/i })).toBeDisabled();
    fireEvent.click(screen.getByText('select-owned-generated-sheet'));
    expect(screen.getByRole('button', { name: /continueToReview/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    api.importGenerated.mockRejectedValueOnce(new Error('Source expired; choose a current image.'));
    fireEvent.click(screen.getByRole('button', { name: /continueToReview/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Source expired');
    expect(screen.getByRole('textbox')).toHaveValue('Garden Look');
    fireEvent.click(screen.getByRole('button', { name: /continueToReview/i }));
    await waitFor(() => expect(api.importGenerated).toHaveBeenCalledWith('char_1', {
      characterProfileVersionId: 'charver_1', name: 'Garden Look', generationResultId: 'seedream-sheet', identityAndViewsConfirmed: true
    }));
    const approve = await screen.findByRole('button', { name: /approveUse/i });
    expect(approve).toBeDisabled();
    expect(api.approve).not.toHaveBeenCalled();
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
    expect(api.plan).not.toHaveBeenCalled();
    fireEvent.load(screen.getByAltText(/reviewPreviewAlt/i));
    fireEvent.click(approve);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ lifecycleStatus: 'approved' })));
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
    expect(screen.getByRole('checkbox')).toBeDisabled();
    fireEvent.load(screen.getByAltText(/previewAlt/i));
    fireEvent.click(screen.getByRole('checkbox'));
    const continueButton = screen.getByRole('button', { name: /continueToReview/i });
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.submit(continueButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(api.review).toHaveBeenCalledTimes(1));
    expect(api.approve).not.toHaveBeenCalled();
    const approveButton = screen.getByRole('button', { name: /approveUse/i });
    expect(approveButton).toBeDisabled();
    fireEvent.load(screen.getByAltText(/reviewPreviewAlt/i));
    fireEvent.click(approveButton);
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
    fireEvent.click(screen.getByRole('button', { name: /saveAsDraft/i }));

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
    const saveButton = screen.getByRole('button', { name: /saveAsDraft/i });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.submit(saveButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(api.create).toHaveBeenCalledWith('char_1', expect.objectContaining({
      sourceMode: 'uploaded',
      garmentAuthorities: { full_look: { front: 'asset_full' } }
    })));
    expect(api.review).not.toHaveBeenCalled();
  });

  it('prepares an existing source-ready Look without creating a duplicate Look', async () => {
    const onSaved = vi.fn();
    const draft = sourceReadySheetLook();
    renderDialog(<CharacterLookDialog
      open
      lookToPrepare={draft}
      onOpenChange={vi.fn()}
      characterProfileId="char_1"
      characterProfileVersionId="charver_1"
      onSaved={onSaved}
    />);

    expect(screen.getByRole('dialog', { name: /prepareTitle/i })).toBeVisible();
    expect(screen.getByText(/sheetFile$/i)).toBeVisible();
    expect(screen.queryByText(/aiGenerationPending$/i)).not.toBeInTheDocument();
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [new File(['sheet'], 'prepared-look.png', { type: 'image/png' })] }
    });
    fireEvent.load(screen.getByAltText(/previewAlt/i));
    fireEvent.click(screen.getByRole('checkbox'));
    const submit = screen.getByRole('button', { name: /continueToReview/i });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.submit(submit.closest('form') as HTMLFormElement);

    await waitFor(() => expect(api.review).toHaveBeenCalledTimes(1));
    expect(api.approve).not.toHaveBeenCalled();
    const approveButton = screen.getByRole('button', { name: /approveUse/i });
    fireEvent.load(screen.getByAltText(/reviewPreviewAlt/i));
    fireEvent.click(approveButton);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ lifecycleStatus: 'approved' })));
    expect(api.create).not.toHaveBeenCalled();
    expect(api.review).toHaveBeenCalledWith('char_1', draft.id, draft.activeVersionId, expect.objectContaining({
      sheetAssetId: 'asset_sheet', rightsDeclarationAccepted: true
    }));
    expect(api.approve).toHaveBeenCalledWith('char_1', draft.id, draft.activeVersionId);
  });

  it('uses a separate Generation modal and returns an adopted result to explicit review', async () => {
    const onSaved = vi.fn();
    const draft = sourceReadyLook();
    renderDialog(<CharacterLookDialog
      open
      lookToPrepare={draft}
      onOpenChange={vi.fn()}
      characterProfileId="char_1"
      characterProfileVersionId="charver_1"
      characterDisplayName="Nara"
      onSaved={onSaved}
    />);

    fireEvent.click(screen.getByRole('button', { name: /openAiGeneration/i }));
    const generation = await screen.findByLabelText('shared-generation-experience');
    expect(generation).toBeVisible();
    expect(generation).toHaveAttribute('data-prompt', 'Create one compact Character Look Sheet.');
    expect(generation).toHaveAttribute('data-additional-direction', '');
    expect(generation).toHaveAttribute('data-reference-roles', '');
    expect(generation).toHaveAttribute('data-has-additional-snapshot', 'false');
    expect(generation).toHaveAttribute('data-fixed-output-count', '1');
    expect(generation).toHaveAttribute('data-prompt-refinement', 'false');
    expect(generation).toHaveAttribute('data-layout-variant', 'playground');
    expect(generation).toHaveAttribute('data-show-recent', 'false');
    expect(screen.getByText('Nara')).toBeVisible();
    expect(screen.queryByRole('dialog', { name: /prepareTitle/i })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /aiGenerationWorkspace/i })).toBeVisible();
    expect(api.plan).toHaveBeenCalledWith('char_1', draft.id, draft.activeVersionId);
    fireEvent.click(screen.getByRole('button', { name: /useGeneratedSheet/i }));
    await waitFor(() => expect(api.reviewGenerated).toHaveBeenCalledWith(
      'char_1', draft.id, draft.activeVersionId, 'job_look_sheet'
    ));
    expect(await screen.findByRole('dialog', { name: /prepareTitle/i })).toBeVisible();
    expect(screen.queryByLabelText('shared-generation-experience')).not.toBeInTheDocument();
    expect(screen.getByText(/reviewTitle/i)).toBeVisible();
    expect(screen.getByLabelText(/cropPreviews/i)).toBeVisible();
    expect(screen.getByText('Nara')).toBeVisible();
    expect(screen.getByText(/checkCanonicalFace/i)).toBeVisible();
    expect(screen.getByText(/checkCleanSheet/i)).toBeVisible();
    expect(onSaved).not.toHaveBeenCalled();
    expect(api.approve).not.toHaveBeenCalled();

    const approveButton = screen.getByRole('button', { name: /approveUse/i });
    expect(approveButton).toBeDisabled();
    fireEvent.load(screen.getByAltText(/reviewPreviewAlt/i));
    fireEvent.click(approveButton);
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith('char_1', draft.id, draft.activeVersionId));
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ lifecycleStatus: 'approved' }));
  });

  it('surfaces the completed candidate action without requiring the image viewer', async () => {
    const draft = sourceReadyLook();
    renderDialog(<CharacterLookDialog
      open
      lookToPrepare={draft}
      onOpenChange={vi.fn()}
      characterProfileId="char_1"
      characterProfileVersionId="charver_1"
      onSaved={vi.fn()}
    />);

    fireEvent.click(screen.getByRole('button', { name: /openAiGeneration/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'complete-look-generation' }));
    expect(await screen.findByText(/candidateReady$/i)).toBeVisible();
    const useActions = screen.getAllByRole('button', { name: /useGeneratedSheet/i });
    fireEvent.click(useActions[0]!);
    await waitFor(() => expect(api.reviewGenerated).toHaveBeenCalledWith(
      'char_1', draft.id, draft.activeVersionId, 'job_look_sheet'
    ));
  });

  it('returns from Generation to the same source-ready Look without adopting media', async () => {
    const onSaved = vi.fn();
    const draft = sourceReadyLook();
    renderDialog(<CharacterLookDialog
      open
      lookToPrepare={draft}
      onOpenChange={vi.fn()}
      characterProfileId="char_1"
      characterProfileVersionId="charver_1"
      onSaved={onSaved}
    />);

    fireEvent.click(screen.getByRole('button', { name: /openAiGeneration/i }));
    expect(await screen.findByRole('dialog', { name: /aiGenerationWorkspace/i })).toBeVisible();
    const backButton = screen.getAllByRole('button', { name: /backToPreparation/i })
      .find(button => button.textContent?.includes('backToPreparation'));
    fireEvent.click(backButton as HTMLButtonElement);

    expect(await screen.findByRole('dialog', { name: /prepareTitle/i })).toBeVisible();
    expect(screen.getByText(draft.name)).toBeVisible();
    expect(api.reviewGenerated).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('switches one saved AI direction to complete-Sheet upload without creating another Look', () => {
    const draft = sourceReadyLook();
    renderDialog(<CharacterLookDialog
      open
      lookToPrepare={draft}
      onOpenChange={vi.fn()}
      characterProfileId="char_1"
      characterProfileVersionId="charver_1"
      onSaved={vi.fn()}
    />);

    fireEvent.click(screen.getByRole('button', { name: /uploadCompleteInstead/i }));
    expect(screen.getByText(/sheetFile$/i)).toBeVisible();
    expect(screen.queryByText(/aiGenerationPending$/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /backToAiGeneration/i }));
    expect(screen.getByText(/aiGenerationPending$/i)).toBeVisible();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('publishes an adopted Review state when the user closes before approval', async () => {
    const onSaved = vi.fn();
    const onOpenChange = vi.fn();
    const draft = sourceReadyLook();
    renderDialog(<CharacterLookDialog
      open
      lookToPrepare={draft}
      onOpenChange={onOpenChange}
      characterProfileId="char_1"
      characterProfileVersionId="charver_1"
      onSaved={onSaved}
    />);

    fireEvent.click(screen.getByRole('button', { name: /openAiGeneration/i }));
    fireEvent.click(await screen.findByRole('button', { name: /useGeneratedSheet/i }));
    await screen.findByText(/reviewTitle/i);
    const cancelButton = screen.getAllByRole('button', { name: /cinematic.actions.cancel/i })
      .find(button => button.textContent?.includes('cinematic.actions.cancel'));
    fireEvent.click(cancelButton as HTMLButtonElement);

    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ lifecycleStatus: 'review' }));
    expect(api.approve).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('requires upper and lower references for Separate Pieces and keeps optional roles', async () => {
    api.upload.mockResolvedValueOnce({ referenceId: 'asset_upper' }).mockResolvedValueOnce({ referenceId: 'asset_lower' });
    renderDialog(<CharacterLookDialog open onOpenChange={vi.fn()} characterProfileId="char_1" characterProfileVersionId="charver_1" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Separate station look' } });
    fireEvent.click(screen.getByRole('radio', { name: /separatePieces/i }));
    const fileInputs = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')];
    fireEvent.change(fileInputs[0]!, { target: { files: [new File(['upper'], 'upper.png', { type: 'image/png' })] } });
    expect(screen.getByRole('button', { name: /saveAsDraft/i })).toBeDisabled();
    fireEvent.change(fileInputs[1]!, { target: { files: [new File(['lower'], 'lower.png', { type: 'image/png' })] } });
    const saveButton = screen.getByRole('button', { name: /saveAsDraft/i });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.submit(saveButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(api.create).toHaveBeenCalledWith('char_1', expect.objectContaining({
      garmentAuthorities: {
        upper: { front: 'asset_upper' },
        lower: { front: 'asset_lower' },
        full_look: { front: 'asset_wardrobe_composite' }
      }
    })));
    expect(api.compose).toHaveBeenCalledWith(
      ['asset_upper', 'asset_lower'],
      'outfit_front',
      'character-look-separate-pieces'
    );
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
    fireEvent.click(screen.getByRole('button', { name: /saveAsDraft/i }));
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

function sourceReadyLook(): CharacterLook {
  return {
    ...look('review'),
    lifecycleStatus: 'draft',
    approvedVersionId: null,
    versions: [{
      id: 'lookver_1', versionNumber: 1, sourceMode: 'ai_suggestion',
      garmentAuthorities: {}, canonicalFaceAssetId: null, status: 'source_ready',
      approvedViewAssets: null, createdAt: '2026-08-29T00:00:00.000Z',
      updatedAt: '2026-08-29T00:00:00.000Z', approvedAt: null
    }]
  } as CharacterLook;
}

function sourceReadySheetLook(): CharacterLook {
  const draft = sourceReadyLook();
  draft.versions[0]!.sourceMode = 'uploaded_character_sheet';
  draft.versions[0]!.sourceSheetAssetId = 'asset_sheet';
  return draft;
}

function reviewReadyLook(): CharacterLook {
  return {
    ...look('review'),
    approvedVersionId: null,
    versions: [{
      id: 'lookver_1', versionNumber: 1, sourceMode: 'ai_suggestion',
      garmentAuthorities: {}, canonicalFaceAssetId: null, status: 'review',
      approvedViewAssets: { front: {}, side: {}, back: {} },
      approvedSheetAsset: { assetId: 'asset_generated_sheet', contentHash: 'hash_sheet' },
      cropManifest: {
        layoutVersion: 'character-look-sheet-v1',
        regions: {
          front: { x: 0.02, y: 0.02, width: 0.3, height: 0.62 },
          side: { x: 0.35, y: 0.02, width: 0.3, height: 0.62 },
          back: { x: 0.68, y: 0.02, width: 0.3, height: 0.62 },
          face: { x: 0.35, y: 0.67, width: 0.3, height: 0.3 }
        }
      },
      reviewMediaUrl: '/api/character-profiles/char_1/looks/look_1/versions/lookver_1/media/sheet',
      provenance: {
        kind: 'system_generated', characterProfileId: 'char_1',
        characterProfileVersionId: 'charver_1', sourceAssetIds: ['asset_generated_sheet'],
        generationResultId: 'job_look_sheet', generationJobId: 'job_look_sheet',
        recipeId: 'character-look-sheet', recipeVersion: 1, recipeFingerprint: 'recipe123',
        provider: 'gemini', model: 'image-model', recordedAt: '2026-08-29T00:00:00.000Z'
      },
      identityAssurance: {
        status: 'unverified', characterProfileVersionId: 'charver_1',
        validationEvidenceId: null, updatedAt: '2026-08-29T00:00:00.000Z'
      },
      rightsDeclaration: null,
      createdAt: '2026-08-29T00:00:00.000Z',
      updatedAt: '2026-08-29T00:00:00.000Z', approvedAt: null
    }]
  } as CharacterLook;
}
