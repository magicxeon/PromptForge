import { fireEvent, render, screen, within } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createCinematicSetupDraft } from '../state/cinematicDraftStorage';
import { CinematicSetupForm } from './CinematicSetupForm';

const testI18n = i18next.createInstance();

describe('CinematicSetupForm', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en', resources: { en: { cinematic: {} } }, keySeparator: false,
      returnNull: false, interpolation: { escapeValue: false }
    });
  });

  it('renders the approved Setup hierarchy without replacing canonical controls', () => {
    renderForm({
      projectName: 'Last train',
      storyBrief: 'A final choice at midnight.',
      storyRoleSlots: [{ id: 'role_lead', label: 'Lead', importance: 'required', storyFunction: '', relationshipHint: '' }]
    });
    expect(screen.getByRole('heading', { name: 'cinematic.setup.foundationTitle' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'cinematic.setup.storySourceTitle' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'cinematic.setup.intentTitle' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'cinematic.setup.rolePlanTitle' })).toBeVisible();
    expect(screen.getByText('cinematic.setup.shortFilm')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.actions.continueToCast' })).toBeEnabled();
  });

  it('keeps authoring mode in the page header and delegates the canonical draft update', () => {
    const onUpdate = vi.fn();
    renderForm({}, { onUpdate });
    const mode = screen.getByLabelText('cinematic.setup.authoringMode');
    fireEvent.click(within(mode).getByRole('button', { name: 'cinematic.mode.advanced' }));
    expect(onUpdate).toHaveBeenCalledWith('mode', 'advanced');
  });

  it('keeps Setup actions in the normal document flow', () => {
    renderForm();
    expect(screen.getByRole('button', { name: 'cinematic.actions.continueToCast' }).closest('footer'))
      .toHaveClass('cinematic-setup-actions--inline');
  });

  it('does not allow Enhance Story before a Story Brief exists', () => {
    renderForm({ storyBrief: '' });
    expect(screen.getByRole('button', { name: 'cinematic.setup.enhanceStory' })).toBeDisabled();
  });

  it('renders role cards and keeps manual blank roles from continuing', () => {
    renderForm({
      projectName: 'Last train',
      storyBrief: 'A final choice at midnight.',
      castPlanningMode: 'manual',
      storyRoleSlots: [{ id: 'role_1', label: '', importance: 'required', storyFunction: '', relationshipHint: '' }]
    });
    expect(screen.getByText('cinematic.setup.characterSelectedInCast')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.actions.continueToCast' })).toBeDisabled();
  });

  it('requires AI role analysis before continuing and delegates the analysis action', () => {
    const onAnalyzeRoles = vi.fn();
    renderForm({
      projectName: 'Last train',
      storyBrief: 'One visible woman chooses to leave the platform.',
      castPlanningMode: 'ai-recommended',
      storyRoleSlots: []
    }, { onAnalyzeRoles });
    expect(screen.getByRole('button', { name: 'cinematic.actions.continueToCast' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.setup.analyzeStoryRoles' }));
    expect(onAnalyzeRoles).toHaveBeenCalledOnce();
  });

  it('offers a bounded manual Character count and delegates resizing', () => {
    const onManualRoleCountChange = vi.fn();
    const onUpdateRole = vi.fn();
    renderForm({
      castPlanningMode: 'manual',
      storyRoleSlots: [{ id: 'role_lead', label: 'Lead', importance: 'required', storyFunction: '', relationshipHint: '' }]
    }, { onManualRoleCountChange, onUpdateRole });
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onManualRoleCountChange).toHaveBeenCalledWith(3);
    fireEvent.change(screen.getByPlaceholderText('cinematic.setup.storyFunctionPlaceholder'), { target: { value: 'Makes the final choice' } });
    expect(onUpdateRole).toHaveBeenCalledWith(0, { storyFunction: 'Makes the final choice' });
    expect(screen.queryByRole('button', { name: 'cinematic.actions.remove' })).not.toBeInTheDocument();
  });
});

function renderForm(
  patch: Partial<ReturnType<typeof createCinematicSetupDraft>> = {},
  handlers: {
    onUpdate?: ReturnType<typeof vi.fn>;
    onAnalyzeRoles?: ReturnType<typeof vi.fn>;
    onManualRoleCountChange?: ReturnType<typeof vi.fn>;
    onUpdateRole?: ReturnType<typeof vi.fn>;
  } = {}
) {
  const draft = { ...createCinematicSetupDraft(new Date('2026-08-29T00:00:00.000Z')), ...patch };
  return render(
    <I18nextProvider i18n={testI18n}>
      <CinematicSetupForm
        draft={draft}
        saveState="saved"
        pending={false}
        onUpdate={handlers.onUpdate || vi.fn()}
        onPlanningModeChange={vi.fn()}
        onAddRole={vi.fn()}
        onUpdateRole={handlers.onUpdateRole || vi.fn()}
        onRemoveRole={vi.fn()}
        onEnhance={vi.fn()}
        onAnalyzeRoles={handlers.onAnalyzeRoles || vi.fn()}
        onManualRoleCountChange={handlers.onManualRoleCountChange || vi.fn()}
        onSave={vi.fn()}
        onContinue={vi.fn()}
      />
    </I18nextProvider>
  );
}
