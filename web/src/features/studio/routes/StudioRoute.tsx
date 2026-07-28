import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FileUser, Images, UserRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GenerationExperience } from '../../../components/generation/GenerationExperience';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import {
  getAttributesBundle,
  type GenerationReferenceRole
} from '../../generation/api/generationApi';
import { getHistoryItem } from '../../history/api/historyApi';
import {
  compileSelectionPreview,
  normalizeAttributeGroups,
  type AttributeSelection
} from '../attributes/attributeModel';
import { GuidedAttributeForm } from '../components/GuidedAttributeForm';
import { CreateCharacterProfileDialog } from '../../../components/profiles/CreateCharacterProfileDialog';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../../lib/auth/actorStore';

type StudioMode = 'headshot' | 'character-sheet';

export function StudioRoute() {
  const { t } = useTranslation(['react-ui', 'shell']);
  const { actor } = useActor();
  const previousActorId = useRef(getActiveActorId());
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'character-sheet' ? 'character-sheet' : 'headshot';
  const [characterType, setCharacterType] = useState<'reusable_model' | 'styled_character'>('reusable_model');
  const [selections, setSelections] = useState<Record<string, AttributeSelection>>({});
  const referenceJobId = params.get('referenceJobId') || '';
  const referenceJob = useQuery({
    queryKey: ['history-item', actor?.userId || 'loading', referenceJobId],
    queryFn: () => getHistoryItem(referenceJobId),
    enabled: Boolean(referenceJobId && actor)
  });
  const [references, setReferences] = useState<Partial<Record<GenerationReferenceRole, string>>>({});
  const activeReferences = mode === 'character-sheet' && referenceJob.data?.imageUrl
    ? { ...references, face_reference: references.face_reference || referenceJob.data.imageUrl }
    : references;
  useEffect(() => {
    if (!actor?.userId || previousActorId.current === actor.userId) return;
    previousActorId.current = actor.userId;
    setSelections({});
    setReferences({});
    setCharacterType('reusable_model');
    setParams({});
  }, [actor?.userId, setParams]);
  const bundle = useQuery({ queryKey: ['attribute-bundle'], queryFn: getAttributesBundle, staleTime: 10 * 60_000 });
  const groups = useMemo(() => bundle.data ? normalizeAttributeGroups(bundle.data) : [], [bundle.data]);
  const compatibleSelections = useMemo(() => {
    if (mode !== 'character-sheet' || characterType !== 'reusable_model') return selections;
    return Object.fromEntries(Object.entries(selections).filter(([, selection]) => selection.group !== 'Clothing'));
  }, [characterType, mode, selections]);
  const preview = useMemo(
    () => compileSelectionPreview(compatibleSelections, mode, characterType),
    [characterType, compatibleSelections, mode]
  );
  if (bundle.isLoading) return <LoadingState label={t('ui.studio.loading')} />;
  if (bundle.isError) return <ErrorState title={t('ui.studio.unavailable')} description={bundle.error.message} onRetry={() => void bundle.refetch()} />;
  return (
    <main>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--mpf-border)] pb-5">
        <div><span className="text-xs font-bold uppercase text-cyan-300">{t('shell.navigation.items.studio', { ns: 'shell' })}</span><h1 className="mb-2 mt-2 text-3xl">{t('ui.studio.title')}</h1><p className="m-0 text-sm text-[var(--mpf-text-muted)]">{t('ui.studio.description')}</p></div>
        <div className="flex flex-wrap gap-2"><ModeButton mode="headshot" active={mode} icon={<UserRound className="size-4" />} onClick={() => setMode(setParams, 'headshot')}>{t('ui.studio.headshot')}</ModeButton><ModeButton mode="character-sheet" active={mode} icon={<Images className="size-4" />} onClick={() => setMode(setParams, 'character-sheet')}>{t('ui.studio.characterSheet')}</ModeButton><Link to="/studio/scene" className="inline-flex min-h-10 items-center border border-[var(--mpf-border-strong)] px-4 text-sm font-semibold text-white no-underline">{t('ui.studio.scene')}</Link></div>
      </header>
      {mode === 'character-sheet' ? (
        <Surface className="mb-4 p-4">
          <h2 className="m-0 text-lg">{t('ui.studio.characterOutput')}</h2>
          <p className="text-sm text-[var(--mpf-text-muted)]">{t('ui.studio.characterOutputHelp')}</p>
          <div className="flex flex-wrap gap-2"><Button variant={characterType === 'reusable_model' ? 'primary' : 'secondary'} icon={<FileUser className="size-4" />} onClick={() => setCharacterType('reusable_model')}>{t('ui.studio.reusable')}</Button><Button variant={characterType === 'styled_character' ? 'primary' : 'secondary'} onClick={() => setCharacterType('styled_character')}>{t('ui.studio.styled')}</Button></div>
        </Surface>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <section><GuidedAttributeForm groups={groups} mode={mode} characterType={characterType} selections={compatibleSelections} onChange={setSelections} /></section>
        <section className="min-w-0">
          <Surface className="mb-4 p-4"><span className="text-xs font-bold uppercase text-cyan-300">{t('ui.studio.preview')}</span><textarea readOnly value={preview} className="mt-3 h-44 w-full resize-y border border-[var(--mpf-border)] bg-black/35 p-3 text-xs leading-5 text-[var(--mpf-text-muted)]" /></Surface>
          <GenerationExperience
            surface="studio"
            generationMode={mode}
            prompt={preview}
            onPromptChange={() => {}}
            selections={compatibleSelections}
            authoringMode="guided"
            characterType={mode === 'character-sheet' ? characterType : null}
            allowComparison={mode === 'headshot'}
            showPromptEditor={false}
            references={activeReferences}
            onReferencesChange={setReferences}
            renderResultActions={job => mode === 'headshot' && (job.jobId || job.id) ? (
              <Link
                to={`/studio?mode=character-sheet&referenceJobId=${encodeURIComponent(job.jobId || job.id || '')}`}
                className="inline-flex min-h-10 items-center gap-2 border border-cyan-400/45 px-4 text-sm font-semibold text-cyan-200 no-underline"
              >
                {t('ui.studio.buildCharacter')} <ArrowRight className="size-4" />
              </Link>
            ) : mode === 'character-sheet' && (job.jobId || job.id) ? (
              <>
                <CreateCharacterProfileDialog jobId={job.jobId || job.id || ''} />
                <Link
                  to="/studio/scene"
                  className="inline-flex min-h-10 items-center gap-2 border border-cyan-400/45 px-4 text-sm font-semibold text-cyan-200 no-underline"
                >
                  {t('ui.studio.buildScene')} <ArrowRight className="size-4" />
                </Link>
              </>
            ) : null}
          />
        </section>
      </div>
    </main>
  );
}

function ModeButton({ mode, active, icon, onClick, children }: { mode: StudioMode; active: StudioMode; icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return <Button variant={mode === active ? 'primary' : 'secondary'} icon={icon} onClick={onClick}>{children}</Button>;
}

function setMode(setParams: ReturnType<typeof useSearchParams>[1], mode: StudioMode) {
  setParams(mode === 'headshot' ? {} : { mode });
}
