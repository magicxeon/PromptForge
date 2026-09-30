import crypto from 'node:crypto';
import { cinematicWorkflowPolicy } from '../../config/cinematicRewampConfiguration.js';

export function chapterOutlineSettings(setup) {
  return { format: setup.format, durationSeconds: setup.durationSeconds,
    seasonEnabled: Boolean(setup.seasonEnabled), seasonCount: setup.seasonEnabled ? setup.seasonCount : 1 };
}

export function chapterOutlineSourceKey(project) {
  return crypto.createHash('sha256').update(JSON.stringify({ revision: project.confirmedFullStoryVersionId,
    settings: chapterOutlineSettings(project.setup) })).digest('hex');
}

export function normalizeChapterOutlineRows(rows, setup) {
  const maximum = Math.min(cinematicWorkflowPolicy.authoring.generatedChapterMaximum,
    cinematicWorkflowPolicy.projectCreation.maximumChapterCount);
  const seasons = setup.seasonEnabled ? setup.seasonCount : 1;
  if (!Array.isArray(rows) || !rows.length || rows.length > maximum || (setup.format === 'short-film' && rows.length !== 1)) {
    fail('cinematic_chapter_outline_invalid', 'The Chapter plan has an invalid Chapter count.');
  }
  const counters = new Map();
  let lastSeason = 1;
  const result = rows.map(row => {
    const title = typeof row?.title === 'string' ? row.title.trim() : '';
    const synopsis = typeof row?.synopsis === 'string' ? row.synopsis.trim() : '';
    const season = row?.seasonNumber;
    if (!title || title.length > 120 || !synopsis || synopsis.length > cinematicWorkflowPolicy.authoring.chapterOutlineSynopsisMaximumCharacters
      || !Number.isInteger(season) || season < lastSeason || season > lastSeason + 1 || season > seasons) {
      fail('cinematic_chapter_outline_invalid', 'Every Chapter needs a title, synopsis and ordered Season assignment.');
    }
    lastSeason = season;
    counters.set(season, (counters.get(season) || 0) + 1);
    return { title, synopsis, seasonNumber: season, chapterNumber: counters.get(season) };
  });
  if (counters.size !== seasons || !counters.has(1)) fail('cinematic_chapter_outline_invalid', 'Include every configured Season in the Chapter plan.');
  return result;
}

export function assertCurrentChapterOutline(project, outline = project.chapterOutline) {
  if (!outline || project.activeFullStoryVersionId !== project.confirmedFullStoryVersionId || outline.sourceKey !== chapterOutlineSourceKey(project)) {
    fail('cinematic_chapter_outline_stale', 'Full Story or production settings changed. Prepare and review a new Chapter plan.', 409);
  }
}

export function approvedChapterOutline(project) {
  if (!project.chapterOutline) return null;
  assertCurrentChapterOutline(project);
  if (project.chapterOutline.status !== 'approved') fail('cinematic_chapter_outline_review_required', 'Approve the Chapter plan before generating Chapters.', 409);
  const rows = normalizeChapterOutlineRows(project.chapterOutline.chapters, project.setup);
  const counts = Array.from({ length: project.setup.seasonEnabled ? project.setup.seasonCount : 1 },
    (_, index) => rows.filter(row => row.seasonNumber === index + 1).length);
  if (rows.length !== project.setup.chapterCount || JSON.stringify(counts) !== JSON.stringify(project.setup.chaptersPerSeason)) {
    fail('cinematic_chapter_outline_stale', 'The Chapter target changed. Review and approve the Chapter plan again.', 409);
  }
  return rows;
}

function fail(code, message, statusCode = 400) {
  throw Object.assign(new Error(message), { code, statusCode });
}
