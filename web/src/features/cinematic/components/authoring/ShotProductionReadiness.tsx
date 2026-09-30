import { useTranslation } from 'react-i18next';
import type { CinematicProject, CinematicScene, CinematicShot } from '../../schemas/cinematicSchemas';
import { resolveStoryboardShotCast, resolveStoryboardShotCastIds, selectedCharacterLook } from '../storyboardGenerationAdapter';

type Props = {
  project: CinematicProject; scene: CinematicScene; shot: CinematicShot; dirty: boolean;
  promptStale?: boolean; dialogueIssues?: number; timingIssues?: number;
};

// Advisory projection only. Render's canonical quote/reference checks still decide eligibility.
export function ShotProductionReadiness({ project, scene, shot, dirty, promptStale, dialogueIssues = 0, timingIssues = 0 }: Props) {
  const { t } = useTranslation('cinematic');
  const warnings: string[] = [];
  if (dirty) warnings.push(t('cinematic.flowReadiness.unsaved'));
  if (scene.sourceChapterRevisionId && scene.sourceChapterRevisionId !== project.activeChapterVersionId) warnings.push(t('cinematic.flowReadiness.chapterChanged'));
  if (promptStale) warnings.push(t('cinematic.flowReadiness.promptChanged'));
  if (shot.approvedStoryboardSource && shot.storyboardStatus === 'draft') warnings.push(t('cinematic.flowReadiness.frameChanged'));
  if (dialogueIssues) warnings.push(t('cinematic.flowReadiness.dialogue', { count: dialogueIssues }));
  if (timingIssues) warnings.push(t('cinematic.flowReadiness.timing'));
  if (!shot.approvedStoryboardSource) warnings.push(t('cinematic.flowReadiness.optionalFrame'));
  const cast = resolveStoryboardShotCast(project, scene, shot);
  for (const character of cast) {
    const selected = selectedCharacterLook(character, scene, shot);
    if (!selected.look || selected.ambiguous || character.identityReady !== true) warnings.push(t('cinematic.flowReadiness.look', { name: character.displayName }));
  }
  const missingCast = resolveStoryboardShotCastIds(scene, shot).length - cast.length;
  if (missingCast > 0) warnings.push(t('cinematic.flowReadiness.castUnavailable'));
  const selectedTake = project.generationAttempts?.find((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && 'id' in value && value.id === shot.approvedVideoAttemptId));
  if (selectedTake?.downstreamSourceStatus && selectedTake.downstreamSourceStatus !== 'current') warnings.push(t('cinematic.flowReadiness.takeChanged'));
  return <details className="cinematic-flow-readiness" open={warnings.length ? true : undefined}>
    <summary>{t('cinematic.flowReadiness.title', { count: warnings.length })}</summary>
    {warnings.length ? <ul>{warnings.map((message, index) => <li key={`${index}:${message}`}>{message}</li>)}</ul> : <p>{t('cinematic.flowReadiness.ready')}</p>}
    <small>{t('cinematic.flowReadiness.serverCheck')}</small>
  </details>;
}
