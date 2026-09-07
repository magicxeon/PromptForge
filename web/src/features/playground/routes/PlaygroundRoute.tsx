import { Film, FlaskConical, Image as ImageIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GenerationExperience } from '../../../components/generation/GenerationExperience';
import { useActor } from '../../../lib/auth/ActorProvider';
import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../../lib/persistence/actorScopedStorage';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { readFaceReferenceHandoff } from '../../../lib/persistence/faceReferenceHandoff';
import type { GenerationReferenceRole } from '../../generation/api/generationApi';
import {
  readPlaygroundUiPreferences,
  writePlaygroundUiPreferences
} from '../playgroundUiPreferences';
import { useSearchParams } from 'react-router-dom';
import { useFeaturePolicy } from '../../../lib/permissions/FeaturePolicyProvider';
import { Button } from '../../../components/ui/Button';
import { PlaygroundVideoExperience } from '../components/PlaygroundVideoWorkspace';
import {
  PlaygroundImageCharacterPanel,
  type PlaygroundImageCharacterSelection
} from '../components/PlaygroundImageCharacterPanel';
import { characterDisplayImages } from '../../profiles/characterDisplayImage';

const FEATURE = 'playground';
const SCHEMA_VERSION = 2;

export function PlaygroundRoute() {
  const { t } = useTranslation(['react-ui', 'shell']);
  const { actor } = useActor();
  const { isEnabled } = useFeaturePolicy();
  const [initialActorId] = useState(() => getActiveActorId());
  const [loadedActorId, setLoadedActorId] = useState(initialActorId);
  const previousActorId = useRef<string | undefined>(initialActorId);
  const [searchParams, setSearchParams] = useSearchParams();
  const videoEnabled = isEnabled('cinematic.playgroundVideoEnabled');
  const mediaMode = videoEnabled && searchParams.get('media') === 'video'
    ? 'video'
    : 'image';
  const initialComparisonActive = searchParams.get('compare') === '1';

  const [initialFaceHandoff] = useState(
    () => readFaceReferenceHandoff(initialActorId, 'playground')
  );
  const [prompt, setPrompt] = useState(() => loadDraft(initialActorId).prompt);
  const [recentExpanded, setRecentExpanded] = useState(
    () => readPlaygroundUiPreferences(initialActorId).recentExpanded
  );
  const [references, setReferences] = useState<
    Partial<Record<GenerationReferenceRole, string>>
  >(() => ({
    ...loadDraft(initialActorId).references,
    ...(initialFaceHandoff?.referenceValue.imageUrl
      ? { face_reference: initialFaceHandoff.referenceValue.imageUrl }
      : {})
  }));
  const [faceReferenceContext, setFaceReferenceContext] = useState<
    { authorizationToken: string; expiresAt?: string } | null
  >(initialFaceHandoff
    ? {
      authorizationToken: initialFaceHandoff.authorizationToken,
      expiresAt: initialFaceHandoff.expiresAt
    }
    : null);
  const [characterSelection, setCharacterSelection] = useState<PlaygroundImageCharacterSelection | null>(
    () => loadDraft(initialActorId).characterSelection
  );

  useEffect(() => {
    const actorId = actor?.userId;
    if (!actorId || previousActorId.current === actorId) return;
    previousActorId.current = actorId;
    const draft = loadDraft(actorId);
    setPrompt(draft.prompt);
    setReferences(draft.references);
    setFaceReferenceContext(draft.faceReferenceContext);
    setCharacterSelection(draft.characterSelection);
    setRecentExpanded(readPlaygroundUiPreferences(actorId).recentExpanded);
    setLoadedActorId(actorId);
  }, [actor?.userId]);

  useEffect(() => {
    if (!actor?.userId || loadedActorId !== actor.userId) return;
    writeActorScopedDraft({
      actorId: actor.userId,
      feature: FEATURE,
      schemaVersion: SCHEMA_VERSION,
      payload: { prompt, references, faceReferenceContext, characterSelection }
    });
  }, [actor?.userId, characterSelection, faceReferenceContext, loadedActorId, prompt, references]);

  useEffect(() => {
    if (!actor?.userId || loadedActorId !== actor.userId) return;
    writePlaygroundUiPreferences(actor.userId, { recentExpanded });
  }, [actor?.userId, loadedActorId, recentExpanded]);

  return (
    <main>
      <header className="mb-5 border-b border-[var(--mpf-border)] pb-5">
        <span className="flex items-center gap-2 text-xs font-bold uppercase text-cyan-300"><FlaskConical className="size-4" />{t('shell.navigation.items.playground', { ns: 'shell' })}</span>
        <h1 className="mb-1 mt-2 text-3xl">{t('playground.unified.title', { ns: 'playground' })}</h1>
        <p className="m-0 text-sm text-[var(--mpf-text-muted)]">{t('playground.unified.description', { ns: 'playground' })}</p>
        {videoEnabled ? (
          <div className="mt-4 inline-flex gap-1 rounded-[var(--mpf-radius-sm)] border border-[var(--theme-border)] bg-[var(--theme-bg-raised)] p-1" role="group" aria-label={t('playground.mediaMode.label', { ns: 'playground' })}>
            <Button
              size="sm"
              variant={mediaMode === 'image' ? 'primary' : 'ghost'}
              icon={<ImageIcon className="size-4" />}
              aria-pressed={mediaMode === 'image'}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('media');
                setSearchParams(next, { replace: true });
              }}
            >
              {t('playground.mediaMode.image', { ns: 'playground' })}
            </Button>
            <Button
              size="sm"
              variant={mediaMode === 'video' ? 'primary' : 'ghost'}
              icon={<Film className="size-4" />}
              aria-pressed={mediaMode === 'video'}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('media', 'video');
                setSearchParams(next, { replace: true });
              }}
            >
              {t('playground.mediaMode.video', { ns: 'playground' })}
            </Button>
          </div>
        ) : null}
      </header>
      {mediaMode === 'video' ? <PlaygroundVideoExperience /> : <GenerationExperience
        initialComparisonActive={initialComparisonActive}
        surface="playground"
        generationMode="playground"
        prompt={prompt}
        onPromptChange={setPrompt}
        references={references}
        referenceLead={<PlaygroundImageCharacterPanel
          selection={characterSelection}
          onChange={selection => {
            setCharacterSelection(selection);
            setFaceReferenceContext(null);
            setReferences(current => ({
              ...current,
              face_reference: undefined,
              character_reference: selection?.handoff.characterReferenceUrl
            }));
          }}
        />}
        referenceDisplayPreviews={characterSelection && references.character_reference === characterSelection.handoff.characterReferenceUrl ? {
          character_reference: {
            reference: characterSelection.handoff.characterReferenceUrl,
            sources: characterDisplayImages(characterSelection.character),
            label: t('playground.imageCharacter.preview', {
              ns: 'playground', name: characterSelection.character.displayName
            })
          }
        } : undefined}
        onReferencesChange={next => {
          if (next.face_reference !== references.face_reference) {
            setFaceReferenceContext(null);
          }
          if (next.character_reference !== characterSelection?.handoff.characterReferenceUrl) {
            setCharacterSelection(null);
          }
          setReferences(next);
        }}
        characterProfileContext={characterSelection?.handoff.characterProfileContext || null}
        characterReferenceOutfitBehavior={characterSelection?.handoff.outfitBehavior === 'preserve'
          ? 'preserve'
          : 'replaceable'}
        faceReferenceContext={faceReferenceContext}
        layoutVariant="playground"
        recentExpanded={recentExpanded}
        onRecentExpandedChange={setRecentExpanded}
      />}
    </main>
  );
}

function loadDraft(actorId?: string): {
  prompt: string;
  references: Partial<Record<GenerationReferenceRole, string>>;
  faceReferenceContext: { authorizationToken: string; expiresAt?: string } | null;
  characterSelection: PlaygroundImageCharacterSelection | null;
} {
  const fallback = { prompt: '', references: {}, faceReferenceContext: null, characterSelection: null };
  if (!actorId) return fallback;
  const draft = readActorScopedDraft<{
    prompt?: string;
    references?: Partial<Record<GenerationReferenceRole, string>>;
    faceReferenceContext?: { authorizationToken: string; expiresAt?: string } | null;
    characterSelection?: PlaygroundImageCharacterSelection | null;
  }>({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback,
    migrate: envelope => envelope.schemaVersion === 1 && envelope.payload && typeof envelope.payload === 'object'
      ? { ...fallback, ...(envelope.payload as Partial<typeof fallback>) }
      : null
  });
  return {
    prompt: typeof draft.prompt === 'string' ? draft.prompt : '',
    references: draft.references && typeof draft.references === 'object'
      ? draft.references
      : {},
    faceReferenceContext: draft.faceReferenceContext
      && typeof draft.faceReferenceContext.authorizationToken === 'string'
      ? draft.faceReferenceContext
      : null,
    characterSelection: validCharacterSelection(draft.characterSelection)
      ? draft.characterSelection
      : null
  };
}

function validCharacterSelection(value: unknown): value is PlaygroundImageCharacterSelection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const selection = value as Partial<PlaygroundImageCharacterSelection>;
  return Boolean(selection.character?.id
    && selection.handoff?.destination === 'playground_image'
    && selection.handoff.characterProfileId === selection.character.id
    && selection.handoff.characterProfileVersionId === selection.character.characterProfileVersionId
    && selection.handoff.characterReferenceUrl);
}
