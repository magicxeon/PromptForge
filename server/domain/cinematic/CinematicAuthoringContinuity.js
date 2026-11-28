import crypto from 'node:crypto';
import { cinematicWorkflowPolicy } from '../../config/cinematicRewampConfiguration.js';

export function assertSiblingOrder(ids, siblings) {
  const allowed = new Set(siblings.map(item => item.id));
  if (!Array.isArray(ids) || ids.length !== allowed.size || new Set(ids).size !== ids.length
    || ids.some(id => !allowed.has(id))) {
    throw Object.assign(new Error('Supply each sibling ID exactly once.'), { code: 'cinematic_order_invalid', statusCode: 400 });
  }
}

export function continuitySourceKey(items) {
  return crypto.createHash('sha256').update(JSON.stringify(items.map(item => [
    item.id || item.projectId, 'activeChapterVersionId' in item ? item.activeChapterVersionId : item.version,
    item.story || item.chapterStory || item.storyBrief || item.shotDocument || item.synopsis || '',
    item.entryState, item.exitState, item.continuityEntry, item.continuityExit,
    item.location, item.time, item.weather, item.propContinuity, item.castAssignmentIds, item.wardrobeLookIds
  ]))).digest('hex');
}

export function shotContinuityItems(project, selectedShotId) {
  const scenes = project.scenes.slice().sort((a, b) => a.orderKey - b.orderKey);
  return selectedShotId ? scenes.flatMap(scene => scene.shots.slice().sort((a, b) => a.orderKey - b.orderKey)) : scenes;
}

export function isChapterProductionComplete(project) {
  return Boolean(project.scenes?.length && project.scenes.every(scene =>
    scene.shots?.length && scene.shots.every(shot => shot.completed === true)));
}

// Persist the review queue with the same atomic series write as the source edit.
// Derive both episode boundaries from the exact excerpts supplied to the writer.
export function markChapterContinuityChanges(ordered, changes, now) {
  const changedIds = new Set(changes.map(change => change.project.id));
  const affected = new Set();
  const limit = cinematicWorkflowPolicy.authoring.continuityExcerptCharacters;
  for (const {project, previousStory} of changes) {
    const text = project.chapterStory || '';
    const index = ordered.findIndex(item => item.id === project.id);
    if (index < 0 || previousStory === text) continue;
    if (previousStory.slice(0, limit) !== text.slice(0, limit) && index > 0) affected.add(ordered[index - 1]);
    for (const later of ordered.slice(index + 1)) affected.add(later);
  }
  for (const project of affected) {
    if (changedIds.has(project.id) || !project.chapterStory?.trim() || isChapterProductionComplete(project)) continue;
    project.continuityReviewRequired = true;
    project.version += 1;
    project.updatedAt = now;
  }
}

export function buildAuthoringContinuity(items, targetId) {
  const limit = cinematicWorkflowPolicy.authoring.continuityExcerptCharacters;
  const index = items.findIndex(item => (item.id || item.projectId) === targetId);
  const excerpt = (item, end) => {
    if (!item) return null;
    const prose = String(item.story || item.chapterStory || item.storyBrief || item.shotDocument || item.synopsis || '');
    return { id: item.id || item.projectId, revisionId: item.activeChapterVersionId || null,
      title: item.title || item.chapterTitle || '', excerpt: end ? prose.slice(-limit) : prose.slice(0, limit),
      excerptKind: end ? 'authored_ending_excerpt' : 'authored_opening_excerpt',
      entryState: item.entryState || item.continuityEntry || null,
      exitState: item.exitState || item.continuityExit || null,
      location: item.location || null, time: item.time || null, weather: item.weather || null,
      characterIds: item.castAssignmentIds || [], lookIds: item.wardrobeLookIds || [] };
  };
  return { sourceKey: continuitySourceKey(items), targetId, previous: index < 0 ? null : excerpt(items[index - 1], true),
    next: index < 0 ? null : excerpt(items[index + 1], false),
    priorStates: index < 0 ? [] : items.slice(Math.max(0, index - cinematicWorkflowPolicy.authoring.continuityHistoryDepth), index).map(item => ({
      sourceId: item.id || item.projectId, revisionId: item.activeChapterVersionId || null,
      exitState: String(item.exitState || item.continuityExit || '').slice(-limit) || null,
      propState: String(item.propContinuity || '').slice(-limit) || null,
      knowledge: null
    })),
    rule: 'Preserve causal continuity, explicit time jumps, character knowledge, wardrobe and prop state. Unknown facts stay unknown. The next opening is a destination constraint, not knowledge already held by characters. Revise only the requested target; never rewrite children or neighbors.' };
}
