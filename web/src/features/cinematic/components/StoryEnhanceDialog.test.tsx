import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCinematicSetupDraft } from '../state/cinematicDraftStorage';
import { StoryEnhanceDialog } from './CinematicDialogs';
import type { CinematicStoryEnhancement } from '../schemas/cinematicSchemas';

const enhance = vi.fn();
vi.mock('../api/cinematicApi', () => ({
  enhanceCinematicStory: (...args: unknown[]) => enhance(...args)
}));

const testI18n = i18next.createInstance();
const draft = { ...createCinematicSetupDraft(), storyBrief: 'Original story', creativeDirection: 'Original direction', storyCountryStyle: 'japan' };
const result: CinematicStoryEnhancement = {
  enhancementId: 'test', enhancedStoryBrief: 'New story', creativeDirection: 'New direction',
  premise: '', conflict: 'Time', emotionalArc: 'Fear to hope', ending: '', candidateScenes: [], warnings: [],
  recommendedRoles: [{ id: 'lead', label: 'Mira', importance: 'required', storyFunction: 'Makes a choice', relationshipHint: 'A friend', objective: 'Leave', emotionalArc: 'Fear to hope', performanceDirection: 'A quiet breath' }],
  provenance: { provider: 'test', model: 'test', responseId: null }, billingStatus: 'qualification_no_charge'
};

describe('StoryEnhanceDialog', () => {
  beforeEach(() => { enhance.mockReset(); });
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
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.enhance.generateStory' }));
    await waitFor(() => expect(screen.getByDisplayValue('A clear enhanced brief.')).toBeVisible());
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByText('cinematic.enhance.recommendedCast')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.enhance.applyStory' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      enhancedStoryBrief: 'A clear enhanced brief.',
      recommendedRoles: [expect.objectContaining({ label: 'Lead' })]
    }));
  });

  it('shows role-only results with the current country and submits the role purpose', async () => {
    enhance.mockResolvedValue({ ...result, purpose: 'roles' });
    const apply = vi.fn();
    render(<I18nextProvider i18n={testI18n}><StoryEnhanceDialog open onOpenChange={vi.fn()} draft={draft} purpose="roles" onApply={apply} /></I18nextProvider>);
    expect(screen.queryByText('cinematic.enhance.preview')).not.toBeInTheDocument();
    expect(screen.queryByText('cinematic.enhance.operationTitle')).not.toBeInTheDocument();
    expect(screen.getByText('cinematic.countryStyle.japan')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.roles.generate' }));
    expect(await screen.findByText('Mira')).toBeVisible();
    expect(screen.getByText('A quiet breath')).toBeVisible();
    expect(screen.queryByText('New story')).not.toBeInTheDocument();
    expect(enhance).toHaveBeenCalledWith(draft, 'roles');
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.roles.apply' }));
    expect(apply).toHaveBeenCalledOnce();
  });

  it('prevents duplicate and stale Apply during retry and allows error recovery', async () => {
    let finish!: (value: CinematicStoryEnhancement) => void;
    enhance.mockResolvedValueOnce(result).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(result);
    render(<I18nextProvider i18n={testI18n}><StoryEnhanceDialog open onOpenChange={vi.fn()} draft={draft} onApply={vi.fn()} /></I18nextProvider>);
    const generate = screen.getByRole('button', { name: 'cinematic.enhance.generateStory' });
    const apply = screen.getByRole('button', { name: 'cinematic.enhance.applyStory' });
    fireEvent.click(generate);
    await waitFor(() => expect(apply).toBeEnabled());
    fireEvent.click(generate);
    expect(apply).toBeDisabled(); expect(generate).toBeDisabled();
    fireEvent.click(generate);
    expect(enhance).toHaveBeenCalledTimes(2);
    await act(async () => finish(result));
    fireEvent.click(generate);
    expect(await screen.findByRole('alert')).toHaveTextContent('offline');
    expect(apply).toBeDisabled();
    fireEvent.click(generate);
    await waitFor(() => expect(apply).toBeEnabled());
  });

  it('discards a late response after closing or changing operation purpose', async () => {
    let finish!: (value: CinematicStoryEnhancement) => void;
    enhance.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const apply = vi.fn();
    const props = { onOpenChange: vi.fn(), draft, onApply: apply };
    const view = render(<I18nextProvider i18n={testI18n}><StoryEnhanceDialog {...props} open /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.enhance.generateStory' }));
    view.rerender(<I18nextProvider i18n={testI18n}><StoryEnhanceDialog {...props} open={false} /></I18nextProvider>);
    await act(async () => finish(result));
    view.rerender(<I18nextProvider i18n={testI18n}><StoryEnhanceDialog {...props} open purpose="roles" /></I18nextProvider>);
    expect(screen.getByRole('button', { name: 'cinematic.roles.apply' })).toBeDisabled();
    expect(screen.queryByText('Mira')).not.toBeInTheDocument();
    expect(apply).not.toHaveBeenCalled();
  });
});
