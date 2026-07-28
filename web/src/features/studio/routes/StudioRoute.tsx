import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ChevronRight,
  FileUser,
  History,
  Save
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GenerationExperience } from '../../../components/generation/GenerationExperience';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
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
import { StudioConfiguratorActions } from '../components/StudioConfiguratorActions';
import { StudioModeSelector, type StudioMode } from '../components/StudioModeSelector';
import { CreateCharacterProfileDialog } from '../../../components/profiles/CreateCharacterProfileDialog';
import { useActor } from '../../../lib/auth/ActorProvider';
import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../../lib/persistence/actorScopedStorage';
import { loadStudioVisualManifests } from '../api/visualManifestApi';
import {
  filterStudioSelections,
  randomizeStudioSelections,
  visibleStudioGroups
} from '../studioModePolicy';
import { downloadStudioConfig } from '../studioConfigFile';
import { scheduleHashTargetScroll } from '../../../lib/navigation/hashScroll';

const STUDIO_DRAFT_FEATURE = 'studio';
const STUDIO_DRAFT_VERSION = 2;
type StudioCreationMode = Exclude<StudioMode, 'scene'>;

type StudioDraft = {
  selections: Record<string, AttributeSelection>;
  references: Partial<Record<GenerationReferenceRole, string>>;
  characterType: 'reusable_model' | 'styled_character';
  lockedFields: string[];
};

const emptyDraft: StudioDraft = {
  selections: {},
  references: {},
  characterType: 'reusable_model',
  lockedFields: []
};

export function StudioRoute() {
  const { t } = useTranslation(['react-ui', 'shell']);
  const { actor } = useActor();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const mode: StudioCreationMode = params.get('mode') === 'character-sheet'
    ? 'character-sheet'
    : 'headshot';
  const [characterType, setCharacterType] =
    useState<StudioDraft['characterType']>('reusable_model');
  const [selections, setSelections] =
    useState<Record<string, AttributeSelection>>({});
  const [references, setReferences] =
    useState<Partial<Record<GenerationReferenceRole, string>>>({});
  const [lockedFields, setLockedFields] = useState<string[]>([]);
  const hydratedActor = useRef<string | null>(null);
  const referenceJobId = params.get('referenceJobId') || '';

  const referenceJob = useQuery({
    queryKey: ['history-item', actor?.userId || 'loading', referenceJobId],
    queryFn: () => getHistoryItem(referenceJobId),
    enabled: Boolean(referenceJobId && actor)
  });
  const bundle = useQuery({
    queryKey: ['attribute-bundle'],
    queryFn: getAttributesBundle,
    staleTime: 10 * 60_000
  });
  const visualManifests = useQuery({
    queryKey: ['studio-visual-manifests', mode],
    queryFn: ({ signal }) => loadStudioVisualManifests(mode, signal),
    staleTime: 30 * 60_000,
    retry: false
  });

  useEffect(() => {
    if (!actor?.userId || hydratedActor.current === actor.userId) return;
    const actorChanged = Boolean(
      hydratedActor.current && hydratedActor.current !== actor.userId
    );
    const draft = readActorScopedDraft<StudioDraft>({
      actorId: actor.userId,
      feature: STUDIO_DRAFT_FEATURE,
      schemaVersion: STUDIO_DRAFT_VERSION,
      fallback: emptyDraft
    });
    setSelections(draft.selections || {});
    setReferences(removeInlineReferences(draft.references || {}));
    setCharacterType(draft.characterType || 'reusable_model');
    setLockedFields(Array.isArray(draft.lockedFields) ? draft.lockedFields : []);
    hydratedActor.current = actor.userId;
    if (actorChanged) {
      setParams(current => {
        const next = new URLSearchParams(current);
        next.delete('referenceJobId');
        return next;
      }, { replace: true });
    }
  }, [actor?.userId, setParams]);

  useEffect(() => {
    if (!actor?.userId || hydratedActor.current !== actor.userId) return;
    const timer = window.setTimeout(() => {
      writeActorScopedDraft({
        actorId: actor.userId,
        feature: STUDIO_DRAFT_FEATURE,
        schemaVersion: STUDIO_DRAFT_VERSION,
        payload: {
          selections,
          references: removeInlineReferences(references),
          characterType,
          lockedFields
        }
      });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [actor?.userId, characterType, lockedFields, references, selections]);

  useEffect(() => {
    if (!bundle.isLoading && location.hash === '#studio-configurator-title') {
      scheduleHashTargetScroll(location.hash);
    }
  }, [bundle.isLoading, location.hash, mode]);

  const groups = useMemo(
    () => bundle.data ? normalizeAttributeGroups(bundle.data) : [],
    [bundle.data]
  );
  const visibleGroups = useMemo(
    () => visibleStudioGroups(groups, mode, characterType),
    [characterType, groups, mode]
  );
  const compatibleSelections = useMemo(
    () => filterStudioSelections(selections, mode, characterType),
    [characterType, mode, selections]
  );
  const compatibleReferences = useMemo(() => {
    const next = { ...references };
    if (mode === 'character-sheet' && characterType === 'reusable_model') {
      delete next.outfit_front;
      delete next.outfit_back;
    }
    if (mode === 'character-sheet' && referenceJob.data?.imageUrl) {
      next.face_reference = next.face_reference || referenceJob.data.imageUrl;
    }
    return next;
  }, [characterType, mode, referenceJob.data?.imageUrl, references]);
  const preview = useMemo(
    () => compileSelectionPreview(compatibleSelections, mode, characterType),
    [characterType, compatibleSelections, mode]
  );
  const referenceRoles = useMemo<GenerationReferenceRole[]>(() => {
    if (mode === 'headshot') return ['face_reference', 'style_reference'];
    if (characterType === 'reusable_model') {
      return ['face_reference', 'character_reference', 'style_reference'];
    }
    return [
      'face_reference',
      'character_reference',
      'style_reference',
      'outfit_front',
      'outfit_back'
    ];
  }, [characterType, mode]);

  if (bundle.isLoading) {
    return <LoadingState label={t('ui.studio.loading')} />;
  }
  if (bundle.isError) {
    return (
      <ErrorState
        title={t('ui.studio.unavailable')}
        description={bundle.error.message}
        onRetry={() => void bundle.refetch()}
      />
    );
  }

  function saveDraft() {
    if (!actor?.userId) return;
    writeActorScopedDraft({
      actorId: actor.userId,
      feature: STUDIO_DRAFT_FEATURE,
      schemaVersion: STUDIO_DRAFT_VERSION,
      payload: {
        selections,
        references: removeInlineReferences(references),
        characterType,
        lockedFields
      }
    });
  }

  return (
    <main className="studio-screen">
      <header className="studio-screen__header">
        <div className="studio-screen__title">
          <strong>{t('shell.navigation.items.studio', { ns: 'shell' })}</strong>
          <ChevronRight aria-hidden="true" />
          <span>
            {mode === 'headshot'
              ? t('ui.studio.faceCreator')
              : t('ui.studio.characterSheet')}
          </span>
        </div>
        <div className="studio-screen__header-actions">
          <Button
            size="sm"
            variant="ghost"
            icon={<Save aria-hidden="true" />}
            onClick={saveDraft}
          >
            {t('ui.studio.saveDraft')}
          </Button>
          <Link to="/history">
            <History aria-hidden="true" />
            {t('ui.studio.history')}
          </Link>
        </div>
      </header>

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
        layoutVariant="studio"
        references={compatibleReferences}
        onReferencesChange={setReferences}
        referenceRoles={referenceRoles}
        studioModeSelector={(
          <StudioModeSelector
            mode={mode}
            onChange={next => {
              if (next === 'scene') {
                navigate('/studio/scene');
                return;
              }
              setParams(next === 'headshot' ? {} : { mode: next });
            }}
          />
        )}
        studioBuilder={(
          <>
            <div className="studio-builder-panel__heading">
              <h1>{t('ui.studio.buildTitle')}</h1>
              <p>{t('ui.studio.description')}</p>
            </div>
          {mode === 'character-sheet' ? (
            <section className="studio-character-type">
              <h2>{t('ui.studio.characterOutput')}</h2>
              <p>{t('ui.studio.characterOutputHelp')}</p>
              <div>
                <Button
                  size="sm"
                  variant={characterType === 'reusable_model' ? 'primary' : 'secondary'}
                  icon={<FileUser aria-hidden="true" />}
                  onClick={() => setCharacterType('reusable_model')}
                >
                  {t('ui.studio.reusable')}
                </Button>
                <Button
                  size="sm"
                  variant={characterType === 'styled_character' ? 'primary' : 'secondary'}
                  onClick={() => setCharacterType('styled_character')}
                >
                  {t('ui.studio.styled')}
                </Button>
              </div>
            </section>
          ) : null}
          {visualManifests.isError ? (
            <p className="studio-visual-warning" role="status">
              {t('ui.studio.visualFallback')}
            </p>
          ) : null}
          <GuidedAttributeForm
            groups={groups}
            mode={mode}
            characterType={characterType}
            manifests={visualManifests.data}
            selections={compatibleSelections}
            lockedFields={lockedFields}
            onLockChange={(fieldName, locked) => {
              setLockedFields(current => locked
                ? [...new Set([...current, fieldName])]
                : current.filter(item => item !== fieldName));
            }}
            onChange={setSelections}
          />
          </>
        )}
        studioConfigActions={(
          <StudioConfiguratorActions
            onReset={() => {
              setSelections({});
              setReferences({});
              setLockedFields([]);
            }}
            onRandomize={() => {
              setSelections(randomizeStudioSelections(
                visibleGroups,
                new Set(lockedFields),
                compatibleSelections
              ));
            }}
            onExport={() => downloadStudioConfig({
              mode,
              characterType,
              selections: compatibleSelections,
              references: removeInlineReferences(compatibleReferences),
              lockedFields
            })}
          />
        )}
        renderResultActions={job => mode === 'headshot' && (job.jobId || job.id) ? (
          <Link
            to={`/studio?mode=character-sheet&referenceJobId=${encodeURIComponent(job.jobId || job.id || '')}`}
            className="studio-result-action"
          >
            {t('ui.studio.buildCharacter')} <ArrowRight aria-hidden="true" />
          </Link>
        ) : mode === 'character-sheet' && (job.jobId || job.id) ? (
          <>
            <CreateCharacterProfileDialog jobId={job.jobId || job.id || ''} />
            <Link to="/studio/scene" className="studio-result-action">
              {t('ui.studio.buildScene')} <ArrowRight aria-hidden="true" />
            </Link>
          </>
        ) : null}
      />
    </main>
  );
}

function removeInlineReferences(
  references: Partial<Record<GenerationReferenceRole, string>>
) {
  return Object.fromEntries(
    Object.entries(references)
      .filter(([, value]) => value && !value.startsWith('data:'))
  ) as Partial<Record<GenerationReferenceRole, string>>;
}
