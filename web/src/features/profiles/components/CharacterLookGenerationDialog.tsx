import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, Check, LoaderCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GenerationExperience } from '../../../components/generation/GenerationExperience';
import { Button } from '../../../components/ui/Button';
import type { GenerationReferenceRole } from '../../generation/api/generationApi';
import type { CharacterLookGenerationPlan } from '../schemas/profileSchemas';

type Props = {
  open: boolean;
  plan: CharacterLookGenerationPlan;
  characterName?: string;
  lookName: string;
  adoptingResultId: string | null;
  error: string | null;
  onBack: () => void;
  onAdopt: (generationResultId: string) => void;
};

export function CharacterLookGenerationDialog({
  open,
  plan,
  characterName,
  lookName,
  adoptingResultId,
  error,
  onBack,
  onAdopt
}: Props) {
  const { t } = useTranslation('cinematic');
  const [completedCandidateId, setCompletedCandidateId] = useState<string | null>(null);
  const candidateActionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setCompletedCandidateId(null);
  }, [plan.source.lookId, plan.source.lookVersionId]);

  useEffect(() => {
    if (!completedCandidateId) return;
    window.requestAnimationFrame(() => {
      const action = candidateActionRef.current;
      if (typeof action?.scrollIntoView === 'function') {
        action.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      action?.focus({ preventScroll: true });
    });
  }, [completedCandidateId]);

  return <Dialog.Root open={open} onOpenChange={nextOpen => { if (!nextOpen) onBack(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="character-look-dialog__overlay" />
      <Dialog.Content className="character-look-generation-dialog__content">
        <header className="character-look-generation-dialog__header">
          <Button
            ref={candidateActionRef}
            type="button"
            size="sm"
            variant="ghost"
            icon={<ArrowLeft aria-hidden="true" />}
            onClick={onBack}
          >{t('cinematic.lookDraft.backToPreparation')}</Button>
          <div>
            <Dialog.Title>{t('cinematic.lookDraft.aiGenerationWorkspace')}</Dialog.Title>
            <Dialog.Description>{t('cinematic.lookDraft.aiGenerationModalDescription')}</Dialog.Description>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            icon={<X aria-hidden="true" />}
            aria-label={t('cinematic.lookDraft.closeGeneration')}
            onClick={onBack}
          />
        </header>
        <div className="character-look-generation-dialog__context">
          <dl>
            {characterName ? <div>
              <dt>{t('cinematic.lookDraft.character')}</dt>
              <dd>{characterName}</dd>
            </div> : null}
            <div>
              <dt>{t('cinematic.lookDraft.name')}</dt>
              <dd>{lookName}</dd>
            </div>
          </dl>
          <small>{t('cinematic.lookDraft.recipeVersion', { version: plan.recipe.version })}</small>
        </div>
        {completedCandidateId ? <section className="character-look-generation-dialog__candidate" role="status">
          <div>
            <strong>{t('cinematic.lookDraft.candidateReady')}</strong>
            <p>{t('cinematic.lookDraft.candidateReadyHint')}</p>
          </div>
          <Button
            type="button"
            variant="primary"
            disabled={Boolean(adoptingResultId)}
            icon={adoptingResultId === completedCandidateId
              ? <LoaderCircle className="animate-spin" aria-hidden="true" />
              : <Check aria-hidden="true" />}
            onClick={() => onAdopt(completedCandidateId)}
          >{t(adoptingResultId === completedCandidateId
            ? 'cinematic.lookDraft.adoptingGeneratedSheet'
            : 'cinematic.lookDraft.useGeneratedSheet')}</Button>
        </section> : null}
        {error ? <p role="alert" className="character-look-generation-dialog__error">{error}</p> : null}
        <div className="character-look-generation-dialog__workspace">
          <GenerationExperience
            surface="cinematic"
            generationMode="character-sheet"
            initialPrompt={plan.prompt}
            additionalDirection=""
            sceneTemplateSnapshot={{
              id: `character-look:${plan.source.lookId}:${plan.source.lookVersionId}`,
              promptRecipeSnapshot: plan.recipe,
              characterLookSource: plan.source
            }}
            references={plan.references}
            referencesReadOnly
            referenceRoles={Object.keys(plan.references) as GenerationReferenceRole[]}
            characterProfileContext={plan.characterProfileContext}
            characterReferenceOutfitBehavior="replaceable"
            characterType="styled_character"
            allowComparison={false}
            fixedOutputCount={plan.output.outputCount}
            allowPromptRefinement={false}
            showPromptEditor={false}
            layoutVariant="playground"
            showRecentGenerations={false}
            fixedAspectRatio={plan.output.aspectRatio}
            persistenceScope={`character-look:${plan.source.lookId}:${plan.source.lookVersionId}`}
            onCompleted={setCompletedCandidateId}
            renderResultActions={(job) => {
              const resultId = job.jobId || job.id;
              return resultId && job.result?.imageUrl ? <Button
                type="button"
                variant="primary"
                disabled={Boolean(adoptingResultId)}
                icon={adoptingResultId === resultId
                  ? <LoaderCircle className="animate-spin" aria-hidden="true" />
                  : <Check aria-hidden="true" />}
                onClick={() => onAdopt(resultId)}
              >{t(adoptingResultId === resultId
                ? 'cinematic.lookDraft.adoptingGeneratedSheet'
                : 'cinematic.lookDraft.useGeneratedSheet')}</Button> : null;
            }}
          />
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
