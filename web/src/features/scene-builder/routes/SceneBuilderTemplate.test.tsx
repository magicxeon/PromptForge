import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SceneBuilderRoute } from './SceneBuilderRoute';
import { writeHandoff } from '../../../lib/persistence/handoffStorage';
import { writeActorScopedDraft } from '../../../lib/persistence/actorScopedStorage';
import { createStudioCustomColors } from '../../studio/attributes/customColorModel';
const mocks = vi.hoisted(() => ({ props: {} as Record<string, unknown>, actorId: 'alice', navigationState: null as unknown, handoff: vi.fn() }));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: mocks.actorId } }) }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => mocks.actorId }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../generation/api/generationApi', () => ({ getAttributesBundle: async () => ({ schema: [], library: [] }) }));
vi.mock('../../studio/api/visualManifestApi', () => ({ loadStudioVisualManifests: async () => ({}) }));
vi.mock('../../profiles/api/profileApi', () => ({ getMyCreatorProfile: async () => null, getCharacter: async () => null, requestCharacterHandoff: mocks.handoff }));
vi.mock('../../community/api/communityApi', () => ({ getCommunityPost: async () => ({ title: 'Original template', imageUrl: '/assets/original.jpg', creator: { displayName: 'Creator' } }) }));
vi.mock('../components/HistoryReferencePicker', () => ({ HistoryReferencePicker: () => <div>Normal history picker</div> }));
vi.mock('../components/SharedTemplatePanel', () => ({ SharedTemplatePanel: () => <div>Shared Templates</div> }));
vi.mock('../components/ScenePoseControlPanel', () => ({ ScenePoseControlPanel: () => <div>Pose and Camera</div> }));
vi.mock('../../studio/components/GuidedAttributeForm', () => ({ GuidedAttributeForm: ({ editableFields }: { editableFields?: Set<string> }) => <div data-testid="fields">{editableFields ? [...editableFields].join(',') : 'all-fields'}</div> }));
vi.mock('../../profiles/components/CharacterLibraryPicker', () => ({ CharacterLibraryPicker: ({ open, onSelect, onOpenChange }: { open: boolean; onSelect: (item: Record<string, unknown>) => Promise<void>; onOpenChange: (value: boolean) => void }) => open ? <button onClick={async () => {
  await onSelect({ id: 'nara', displayName: 'Nara', handoffAvailable: true, characterProfileVersionId: 'v1', destinationCapabilities: ['scene_builder'], characterType: 'reusable_model', outfitBehavior: 'replaceable' });
  onOpenChange(false);
}}>Select Nara</button> : null }));
vi.mock('../../../components/generation/GenerationExperience', () => ({ GenerationExperience: (props: Record<string, unknown>) => {
  mocks.props = props;
  return <>{props.studioModeSelector as ReactNode}{props.studioBuilder as ReactNode}{props.studioConfigActions as ReactNode}{props.studioQueueExtra as ReactNode}<div>Existing result preview</div></>;
} }));
const snapshot = { sceneTemplateVersion: 1, authoringMode: 'guided', structuredSelectionsSnapshot: {}, finalPromptSnapshot: 'Original', referenceSlotMapping: {}, replaceableVariables: [] };
function seed({ role = 'character_reference', manual = false, editableManual = false, session = 'session' } = {}) {
  writeHandoff({ actorId: 'alice', kind: 'scene-template', payload: { postId: 'original-post', sceneTemplateSnapshot: { ...snapshot, ...(manual ? { authoringMode: 'manual' } : {}) }, templateUseContext: {
    templateId: 'template', templateVersionId: 'v1', templateUseSessionId: session, expiresAt: new Date(Date.now() + 60000).toISOString(), pricing: { accessCredits: 3 },
    publicInputSchema: { inputs: [{ id: 'character', sourceFieldName: role, type: 'reference_image', required: true, replacementPolicy: 'replaceable' }, { id: 'lighting', sourceFieldName: 'Lighting', type: 'text', replacementPolicy: 'replaceable' }, { id: 'camera', sourceFieldName: 'Lens', type: 'text', replacementPolicy: 'locked' }, ...(editableManual ? [{ id: 'manual', sourceFieldName: 'manualPromptSnapshot', type: 'text', replacementPolicy: 'replaceable' }] : [])] }
  } } });
}
const approvedHandoff = { destination: 'scene_builder', characterProfileId: 'nara', characterProfileVersionId: 'v1', characterReferenceUrl: '/authorized-character', outfitBehavior: 'replaceable', characterType: 'reusable_model', characterProfileContext: { purpose: 'character_usage', characterProfileId: 'nara', characterProfileVersionId: 'v1' } };
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); mocks.actorId = 'alice'; mocks.navigationState = null; mocks.handoff.mockReset().mockResolvedValue(approvedHandoff); Element.prototype.scrollIntoView = vi.fn(); });
function NavigationProbe() { const navigate = useNavigate(); return <button onClick={() => navigate('/create/studio/scene#studio-configurator-title', { state: mocks.navigationState })}>Navigate probe</button>; }
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><SceneBuilderRoute /><NavigationProbe /></MemoryRouter></QueryClientProvider>); }
it('shows source and schema fields instead of normal authoring without injecting source as a reference', async () => {
  seed(); mount();
  expect(await screen.findByText('Original template')).toBeInTheDocument();
  expect(screen.queryByText('Pose and Camera')).not.toBeInTheDocument();
  expect(screen.queryByText('Shared Templates')).not.toBeInTheDocument();
  expect(screen.getByTestId('fields')).toHaveTextContent('Lighting');
  expect(screen.getByTestId('fields')).not.toHaveTextContent('Lens');
  expect(mocks.props.references).toEqual({});
  expect(mocks.props.templateUseContext).toEqual({ templateUseSessionId: 'session', replacements: {} });
  expect(screen.getByText('Existing result preview')).toBeInTheDocument();
});
it('does not expose Character picker for a face-only template or manual prompt when locked', async () => {
  seed({ role: 'face_reference', manual: true }); mount();
  await screen.findByText('Original template');
  expect(screen.queryByText('ui.templateScene.chooseCharacter')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(mocks.props.referenceRoles).toEqual(['face_reference']);
});
it('confirms exit, preserves normal draft while using Template and restores it', async () => {
  writeActorScopedDraft({ actorId: 'alice', feature: 'scene-builder', schemaVersion: 3, payload: { mode: 'manual', manualPrompt: 'My original draft', selections: {}, customColors: createStudioCustomColors(), lockedFields: [], additionalDirection: '', poseControlMode: 'simple', scenePoseRecipeId: null, scenePoseRecipeVersion: null } });
  const draft = localStorage.getItem('mpf.react.draft:scene-builder:alice');
  seed(); mount(); await screen.findByText('Original template');
  expect(localStorage.getItem('mpf.react.draft:scene-builder:alice')).toBe(draft);
  fireEvent.click(screen.getByRole('button', { name: 'ui.templateScene.exit' }));
  fireEvent.click(screen.getByRole('button', { name: 'ui.action.cancel' }));
  expect(screen.getByText('Original template')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ui.templateScene.exit' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'ui.templateScene.exit' }).at(-1)!);
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('My original draft'));
  expect(mocks.props.templateUseContext).toBeNull(); expect(sessionStorage.getItem('mpf.react.handoff:scene-template')).toBeNull();
});
it('retains normal Scene controls without a Template handoff', async () => {
  mount(); expect(await screen.findByText('Pose and Camera')).toBeInTheDocument();
  expect(screen.getByText('Shared Templates')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'ui.templateScene.chooseCharacter' })).toBeInTheDocument();
  expect(screen.queryByText('ui.templateScene.exit')).not.toBeInTheDocument();
});
it('normal Scene picker persists only Character IDs and clears lineage with its reference', async () => {
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'ui.templateScene.chooseCharacter' }));
  fireEvent.click(screen.getByRole('button', { name: 'Select Nara' }));
  await waitFor(() => expect(mocks.props.characterProfileContext).toEqual(approvedHandoff.characterProfileContext));
  const saved = JSON.parse(localStorage.getItem('mpf.react.draft:scene-builder:alice')!);
  expect(saved.payload.characterSelection).toEqual({ profileId: 'nara', versionId: 'v1' });
  expect(JSON.stringify(saved)).not.toContain('/authorized-character');
  fireEvent.click(screen.getByRole('button', { name: 'ui.templateScene.removeCharacter' }));
  await waitFor(() => expect(mocks.props.characterProfileContext).toBeNull());
  expect(JSON.parse(localStorage.getItem('mpf.react.draft:scene-builder:alice')!).payload.characterSelection).toBeNull();
});
it('reload reauthorizes the saved version before applying Character identity', async () => {
  writeActorScopedDraft({ actorId: 'alice', feature: 'scene-builder', schemaVersion: 3, payload: { characterSelection: { profileId: 'nara', versionId: 'v1' } } });
  mount();
  await waitFor(() => expect(mocks.props.characterProfileContext).toEqual(approvedHandoff.characterProfileContext));
  expect(mocks.handoff).toHaveBeenCalledWith('nara', 'scene_builder');
});
it('reload rejects version drift instead of replacing the saved identity silently', async () => {
  writeActorScopedDraft({ actorId: 'alice', feature: 'scene-builder', schemaVersion: 3, payload: { characterSelection: { profileId: 'nara', versionId: 'old-version' } } });
  mount();
  await waitFor(() => expect(mocks.handoff).toHaveBeenCalled());
  await waitFor(() => expect(mocks.props.blockedReason).toBeNull());
  expect(mocks.props.characterProfileContext).toBeNull();
  expect(mocks.props.references).toEqual({});
});
it('Template reload reauthorizes its own selection without consuming the normal Scene draft', async () => {
  seed();
  const stored = JSON.parse(sessionStorage.getItem('mpf.react.handoff:scene-template')!);
  stored.payload.characterSelection = { profileId: 'nara', versionId: 'v1' };
  sessionStorage.setItem('mpf.react.handoff:scene-template', JSON.stringify(stored));
  mount();
  await waitFor(() => expect(mocks.props.characterProfileContext).toEqual(approvedHandoff.characterProfileContext));
  expect(mocks.props.templateUseContext).toEqual({ templateUseSessionId: 'session', replacements: { character: '/authorized-character' } });
  expect(localStorage.getItem('mpf.react.draft:scene-builder:alice')).toBeNull();
  expect(JSON.parse(sessionStorage.getItem('mpf.react.handoff:scene-template')!).payload.characterSelection).toEqual({ profileId: 'nara', versionId: 'v1' });
});
it('preserves an exposed Template edit during same-session hash navigation', async () => {
  seed({ manual: true, editableManual: true }); mount(); await screen.findByText('Original template');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My template edit' } });
  fireEvent.click(screen.getByRole('button', { name: 'Navigate probe' }));
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('My template edit'));
});
it('drops prior reference values and authority when navigating into another Template session', async () => {
  seed(); mount(); await screen.findByText('Original template');
  const change = mocks.props.onReferencesChange as (refs: Record<string, string>) => void;
  const { act } = await import('@testing-library/react');
  act(() => change({ character_reference: '/previous-character' }));
  seed({ session: 'new-session' }); fireEvent.click(screen.getByRole('button', { name: 'Navigate probe' }));
  await waitFor(() => expect(mocks.props.references).toEqual({}));
  expect(mocks.props.characterProfileContext).toBeNull();
  expect(mocks.props.templateUseContext).toEqual({ templateUseSessionId: 'new-session', replacements: {} });
});
it('accepts an explicit compatible Character navigation handoff without clearing Template', async () => {
  seed(); mount(); await screen.findByText('Original template');
  mocks.navigationState = { mpfCharacterHandoff: { destination: 'scene_builder', characterReferenceUrl: '/authorized-character', outfitBehavior: 'replaceable', characterType: 'reusable_model', characterProfileContext: { purpose: 'character_usage', characterProfileId: 'nara', characterProfileVersionId: 'v1' } } };
  fireEvent.click(screen.getByRole('button', { name: 'Navigate probe' }));
  await waitFor(() => expect(mocks.props.references).toEqual({ character_reference: '/authorized-character', face_reference: undefined }));
  expect(mocks.props.templateUseContext).toEqual({ templateUseSessionId: 'session', replacements: { character: '/authorized-character' } });
});
