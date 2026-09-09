import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { UserRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GenerationExperience } from '../../../components/generation/GenerationExperience';
import { CharacterLookSheetForm } from '../../../components/profiles/CharacterLookSheetForm';
import { Button } from '../../../components/ui/Button';
import { apiRequest } from '../../../lib/api/apiClient';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { readActorScopedDraft, writeActorScopedDraft } from '../../../lib/persistence/actorScopedStorage';
import { CharacterLibraryPicker } from './CharacterLibraryPicker';
import { requestCharacterHandoff, getCharacter, getOwnedCharacter } from '../api/profileApi';
import type { CharacterHandoff, CharacterSummary } from '../schemas/profileSchemas';
import { characterSummarySchema } from '../schemas/profileSchemas';
import { lookSheetDefinitionSchema, lookSheetDraftSchema, lookSheetPresetSchema, type LookSheetDefinition } from '../schemas/lookSheetDefinitionSchemas';
import { LookSheetEnhancementPanel } from './LookSheetEnhancementPanel';
import type { EnhancementSelection } from '../../generation/hooks/useLookSheetRender';
import '../../../styles/character-look-sheet-form.css';

export function CharacterLookSheetExperience({ surface }: { surface: 'studio' | 'playground' }) {
  const { actor } = useActor();
  return <LookSheetEditor key={`${actor?.userId}:${surface}`} surface={surface} actorId={actor?.userId} />;
}

function LookSheetEditor({ surface, actorId }: { surface: 'studio' | 'playground'; actorId?: string }) {
  const { t } = useTranslation('playground');
  const feature = `look-sheet-${surface}`;
  const preset = useQuery({ queryKey: ['look-sheet-preset'], queryFn: () => apiRequest('/api/generation/look-sheet-preset', { schema: lookSheetPresetSchema }), staleTime: Infinity, retry: false });
  const [saved] = useState(() => {
    const fallback: LookSheetDefinition = { schemaVersion: 1, name: '', ageYears: null, appearance: '', situation: '', outfit: '', personality: '' };
    const stored = actorId ? readActorScopedDraft<{ definition?: unknown; enhancementEnabled?: boolean; enhancementOperation?: EnhancementSelection | null; character?: { id: string; versionId: string; isOwner: boolean } | null }>({ actorId, feature, schemaVersion: 1, fallback: {} }) : {};
    const character = stored.character && typeof stored.character.id === 'string' && stored.character.id.length <= 160
      && typeof stored.character.versionId === 'string' && stored.character.versionId.length <= 160 ? stored.character : null;
    const operation = stored.enhancementOperation;
    return { definition: lookSheetDraftSchema.safeParse(stored.definition).data || fallback, character,
      enhancementEnabled: surface === 'playground' && stored.enhancementEnabled === true,
      operation: operation && typeof operation.id === 'string' && operation.id.length <= 100
        && typeof operation.requestKey === 'string' && operation.requestKey.length <= 40000 ? operation : null };
  });
  const [draft, setDraft] = useState<LookSheetDefinition>(saved.definition);
  const [selectedIdentity, setSelectedIdentity] = useState(saved.character);
  const [picked, setPicked] = useState<{ character: CharacterSummary; handoff: CharacterHandoff } | null>(null);
  const restored = useQuery({
    queryKey: ['look-sheet-character', actorId, selectedIdentity?.id, selectedIdentity?.versionId],
    enabled: Boolean(actorId && selectedIdentity && !picked), retry: false, staleTime: 0,
    queryFn: async () => {
      const identity = selectedIdentity!;
      const character = await (identity.isOwner ? getOwnedCharacter(identity.id) : getCharacter(identity.id));
      const handoff = await requestCharacterHandoff(identity.id, 'playground_image');
      if (getActiveActorId() !== actorId || handoff.characterProfileId !== identity.id
        || handoff.characterProfileVersionId !== identity.versionId || character.characterProfileVersionId !== identity.versionId) throw new Error(t('playground.imageCharacter.selectionChanged'));
      return { character: characterSummarySchema.parse(character), handoff };
    }
  });
  const selection = selectedIdentity ? picked || restored.data || null : null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [enhancementEnabled, setEnhancementEnabled] = useState(saved.enhancementEnabled);
  const [enhancementOperation, setEnhancementOperation] = useState<EnhancementSelection | null>(saved.operation);
  const value = { ...draft, outfit: draft.outfit || preset.data?.defaults.outfit || '', personality: draft.personality || preset.data?.defaults.personality || '' };
  const identity = selection?.handoff.characterProfileContext?.identityPack as { ageRange?: { minimum: number; maximum: number | null } } | undefined;
  const ageRange = identity?.ageRange;
  const ageLabel = selection ? (ageRange ? `${ageRange.minimum}-${ageRange.maximum ?? '+'}` : t('lookSheet.missingAge')) : undefined;
  const definition = { ...value, ageYears: selection ? null : value.ageYears };
  const adult = selectedIdentity ? Boolean(ageRange && ageRange.minimum >= 18) : value.ageYears === null || value.ageYears >= 18;
  const valid = adult && lookSheetDefinitionSchema.safeParse(definition).success && (selectedIdentity ? Boolean(selection && ageRange) : value.ageYears !== null);
  const outfitLocked = selection?.handoff.outfitBehavior === 'preserve';
  const rememberOperation = (operation: EnhancementSelection | null) => {
    if (!actorId || getActiveActorId() !== actorId) return;
    writeActorScopedDraft({ actorId, feature, schemaVersion: 1,
      payload: { definition: draft, character: selectedIdentity, enhancementEnabled, enhancementOperation: operation } });
    setEnhancementOperation(operation);
  };
  useEffect(() => {
    if (actorId && getActiveActorId() === actorId) writeActorScopedDraft({ actorId, feature, schemaVersion: 1,
      payload: { definition: draft, character: selectedIdentity, enhancementEnabled, enhancementOperation } });
  }, [actorId, draft, feature, selectedIdentity, enhancementEnabled, enhancementOperation]);

  if (!preset.data) return <p role="status">{t(preset.isError ? 'lookSheet.loadError' : 'lookSheet.loading')}</p>;
  const references = selection ? { character_reference: selection.handoff.characterReferenceUrl } : {};
  return <div className="look-sheet-experience"><GenerationExperience surface={surface} generationMode="character-sheet" layoutVariant="studio"
    persistenceScope={`document-sheet-${surface}`} fixedOutputCount={1}
    allowComparison={false} allowPromptRefinement={false} showPromptEditor={false}
    readOnlyPrompt={valid ? { label: t('lookSheet.promptPreview') } : null}
    prompt={valid ? `${preset.data.direction}\n${JSON.stringify(definition)}` : ''}
    lookSheetDefinition={definition}
    lookSheetEnhancement={surface === 'playground' ? { enabled: enhancementEnabled, operation: enhancementOperation,
      onEnabledChange: setEnhancementEnabled, onOperation: rememberOperation } : undefined}
    blockedReason={!adult ? t('lookSheet.adultRequired') : !valid ? t('lookSheet.incomplete') : null}
    references={references} referenceRoles={['character_reference']} referencesReadOnly
    characterProfileContext={selection?.handoff.characterProfileContext || null}
    studioBuilderTitle={t('lookSheet.title')}
    studioBuilder={(_generationDraft, enhancement) => <>
      <CharacterLookSheetForm value={value} onChange={setDraft} ageLabel={ageLabel} outfitLocked={outfitLocked}
      identitySlot={<div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon={<UserRound className="size-4" />} onClick={() => setPickerOpen(true)}>{selection?.character.displayName || t('lookSheet.chooseCharacter')}</Button>
        {selectedIdentity ? <Button size="icon" variant="ghost" title={t('lookSheet.clearCharacter')} icon={<X className="size-4" />} onClick={() => { setPicked(null); setSelectedIdentity(null); }} /> : null}
      </div>}
      enhancementSlot={surface === 'playground' ? <LookSheetEnhancementPanel state={enhancement} onEnabledChange={setEnhancementEnabled} /> : null} />
      {selectedIdentity && !selection ? <p role="status">{restored.isError ? t('playground.imageCharacter.selectionChanged') : t('lookSheet.loading')}</p> : null}
      <CharacterLibraryPicker open={pickerOpen} onOpenChange={setPickerOpen} current={selection?.character || null}
        unavailableReason={item => item.handoffAvailable && item.destinationCapabilities.includes('playground_image') ? undefined : t('playground.imageCharacter.unavailable')}
        onSelect={async character => {
          const handoff = await requestCharacterHandoff(character.id, 'playground_image');
          if (getActiveActorId() !== actorId || handoff.characterProfileVersionId !== character.characterProfileVersionId || handoff.characterProfileId !== character.id) throw new Error(t('playground.imageCharacter.selectionChanged'));
          setPicked({ character, handoff });
          setSelectedIdentity({ id: character.id, versionId: character.characterProfileVersionId, isOwner: character.isOwner === true });
          setDraft(current => ({ ...current, name: character.displayName, outfit: preset.data.defaults.outfit }));
        }} />
    </>}
  /></div>;
}
