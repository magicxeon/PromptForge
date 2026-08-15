import { FlaskConical } from 'lucide-react';
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

const FEATURE = 'playground';
const SCHEMA_VERSION = 1;

export function PlaygroundRoute() {
  const { t } = useTranslation(['react-ui', 'shell']);
  const { actor } = useActor();
  const [initialActorId] = useState(() => getActiveActorId());
  const [loadedActorId, setLoadedActorId] = useState(initialActorId);
  const previousActorId = useRef<string | undefined>(initialActorId);
  const [searchParams] = useSearchParams();
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

  useEffect(() => {
    const actorId = actor?.userId;
    if (!actorId || previousActorId.current === actorId) return;
    previousActorId.current = actorId;
    const draft = loadDraft(actorId);
    setPrompt(draft.prompt);
    setReferences(draft.references);
    setFaceReferenceContext(draft.faceReferenceContext);
    setRecentExpanded(readPlaygroundUiPreferences(actorId).recentExpanded);
    setLoadedActorId(actorId);
  }, [actor?.userId]);

  useEffect(() => {
    if (!actor?.userId || loadedActorId !== actor.userId) return;
    writeActorScopedDraft({
      actorId: actor.userId,
      feature: FEATURE,
      schemaVersion: SCHEMA_VERSION,
      payload: { prompt, references, faceReferenceContext }
    });
  }, [actor?.userId, faceReferenceContext, loadedActorId, prompt, references]);

  useEffect(() => {
    if (!actor?.userId || loadedActorId !== actor.userId) return;
    writePlaygroundUiPreferences(actor.userId, { recentExpanded });
  }, [actor?.userId, loadedActorId, recentExpanded]);

  return (
    <main>
      <header className="mb-5 border-b border-[var(--mpf-border)] pb-5">
        <span className="flex items-center gap-2 text-xs font-bold uppercase text-cyan-300"><FlaskConical className="size-4" />{t('shell.navigation.items.playground', { ns: 'shell' })}</span>
        <h1 className="mb-1 mt-2 text-3xl">{t('ui.playground.title')}</h1>
        <p className="m-0 text-sm text-[var(--mpf-text-muted)]">{t('ui.playground.description')}</p>
      </header>
      <GenerationExperience
        initialComparisonActive={initialComparisonActive}
        surface="playground"
        generationMode="playground"
        prompt={prompt}
        onPromptChange={setPrompt}
        references={references}
        onReferencesChange={next => {
          if (next.face_reference !== references.face_reference) {
            setFaceReferenceContext(null);
          }
          setReferences(next);
        }}
        faceReferenceContext={faceReferenceContext}
        layoutVariant="playground"
        recentExpanded={recentExpanded}
        onRecentExpandedChange={setRecentExpanded}
      />
    </main>
  );
}

function loadDraft(actorId?: string): {
  prompt: string;
  references: Partial<Record<GenerationReferenceRole, string>>;
  faceReferenceContext: { authorizationToken: string; expiresAt?: string } | null;
} {
  const fallback = { prompt: '', references: {}, faceReferenceContext: null };
  if (!actorId) return fallback;
  const draft = readActorScopedDraft<{
    prompt?: string;
    references?: Partial<Record<GenerationReferenceRole, string>>;
    faceReferenceContext?: { authorizationToken: string; expiresAt?: string } | null;
  }>({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback
  });
  return {
    prompt: typeof draft.prompt === 'string' ? draft.prompt : '',
    references: draft.references && typeof draft.references === 'object'
      ? draft.references
      : {},
    faceReferenceContext: draft.faceReferenceContext
      && typeof draft.faceReferenceContext.authorizationToken === 'string'
      ? draft.faceReferenceContext
      : null
  };
}
