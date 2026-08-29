import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createCinematicSetupDraft } from '../state/cinematicDraftStorage';
import { StoryEnhanceDialog } from './CinematicDialogs';

const enhance = vi.fn();
vi.mock('../api/cinematicApi', () => ({
  enhanceCinematicStory: (...args: unknown[]) => enhance(...args)
}));

const testI18n = i18next.createInstance();

describe('StoryEnhanceDialog', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en', resources: { en: { cinematic: {} } }, keySeparator: false,
      returnNull: false, interpolation: { escapeValue: false }
    });
  });

  it('keeps the original unchanged until the generated preview is applied', async () => {
    enhance.mockResolvedValueOnce({
      enhancementId: 'cineenh_1', enhancedStoryBrief: 'A clear enhanced brief.',
      creativeDirection: 'Restrained and visual.', premise: 'A choice', conflict: 'Time runs out',
      emotionalArc: 'Guarded to hopeful', ending: 'They meet', candidateScenes: ['Platform'],
      recommendedRoles: [{ id: 'role_lead', label: 'Lead', importance: 'required', storyFunction: 'Makes the choice', relationshipHint: '' }],
      warnings: [], provenance: { provider: 'openai', model: 'test', responseId: null },
      billingStatus: 'qualification_no_charge'
    });
    const draft = { ...createCinematicSetupDraft(), storyBrief: 'Original station story.' };
    const onApply = vi.fn();
    render(<I18nextProvider i18n={testI18n}><StoryEnhanceDialog open onOpenChange={vi.fn()} draft={draft} onApply={onApply} /></I18nextProvider>);

    expect(screen.getByText('Original station story.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.enhance.generate' }));
    await waitFor(() => expect(screen.getByDisplayValue('A clear enhanced brief.')).toBeVisible());
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.enhance.apply' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      enhancedStoryBrief: 'A clear enhanced brief.',
      recommendedRoles: [expect.objectContaining({ label: 'Lead' })]
    }));
  });
});
