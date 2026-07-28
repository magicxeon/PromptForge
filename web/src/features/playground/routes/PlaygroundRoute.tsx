import { FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GenerationExperience } from '../../../components/generation/GenerationExperience';
import { useActor } from '../../../lib/auth/ActorProvider';
import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../../lib/persistence/actorScopedStorage';

const FEATURE = 'playground';
const SCHEMA_VERSION = 1;

export function PlaygroundRoute() {
  const { t } = useTranslation(['react-ui', 'shell']);
  const { actor } = useActor();
  const [prompt, setPrompt] = useState(() => loadPrompt(actor?.userId));

  useEffect(() => {
    setPrompt(loadPrompt(actor?.userId));
  }, [actor?.userId]);

  useEffect(() => {
    if (!actor?.userId) return;
    writeActorScopedDraft({
      actorId: actor.userId,
      feature: FEATURE,
      schemaVersion: SCHEMA_VERSION,
      payload: { prompt }
    });
  }, [actor?.userId, prompt]);

  return (
    <main>
      <header className="mb-5 border-b border-[var(--mpf-border)] pb-5">
        <span className="flex items-center gap-2 text-xs font-bold uppercase text-cyan-300"><FlaskConical className="size-4" />{t('shell.navigation.items.playground', { ns: 'shell' })}</span>
        <h1 className="mb-2 mt-2 text-3xl">{t('ui.playground.title')}</h1>
        <p className="m-0 text-sm text-[var(--mpf-text-muted)]">{t('ui.playground.description')}</p>
      </header>
      <GenerationExperience
        surface="playground"
        generationMode="playground"
        prompt={prompt}
        onPromptChange={setPrompt}
      />
    </main>
  );
}

function loadPrompt(actorId?: string) {
  if (!actorId) return '';
  const draft = readActorScopedDraft({
    actorId,
    feature: FEATURE,
    schemaVersion: SCHEMA_VERSION,
    fallback: { prompt: '' }
  });
  return typeof draft.prompt === 'string' ? draft.prompt : '';
}
