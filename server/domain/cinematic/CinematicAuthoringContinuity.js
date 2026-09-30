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
