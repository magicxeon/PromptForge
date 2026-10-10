import { LEARNING_LIMITS } from '../../config/learningPolicy.js';

export class LearningError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function invalid() {
  throw new LearningError('learning_invalid_input', 'Invalid catalog metadata or query.');
}

export function notFound() {
  throw new LearningError('learning_not_found', 'Catalog title not found.', 404);
}

export function strictObject(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Object.keys(value).some(key => !allowed.includes(key))) invalid();
}

function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max
    || (required && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) invalid();
  return value.trim();
}

const TYPES = ['tutorial', 'film', 'series'];
const MODES = ['free', 'preview_then_paid', 'paid'];
const METADATA_FIELDS = ['type', 'title', 'description', 'language', 'accessMode', 'freeCount', 'priceCredits', 'chapters', 'episodes'];
const UNIT_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const TITLE_ID = /^(tutorial|film|series)_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function typeForId(id) {
  if (typeof id !== 'string' || !TITLE_ID.test(id)) notFound();
  return id.slice(0, id.indexOf('_'));
}

export function assertRevision(value) {
  if (!Number.isSafeInteger(value) || value < 1) invalid();
  return value;
}

export function revisionCommand(input) {
  strictObject(input, ['revision']);
  return assertRevision(input.revision);
}

export function matchRevision(record, revision) {
  if (record.revision !== revision) {
    throw new LearningError('learning_revision_conflict', 'Catalog title changed. Reload before saving.', 409);
  }
}

export function assertDraft(record) {
  if (record.status !== 'draft') {
    throw new LearningError('learning_draft_required', 'Only draft metadata can be changed in this increment.', 409);
  }
}

export function validateMetadata(input, allowedTypes) {
  strictObject(input, METADATA_FIELDS);
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > LEARNING_LIMITS.metadataBytes) invalid();
  if (!TYPES.includes(input.type) || !allowedTypes.includes(input.type) || !MODES.includes(input.accessMode)) invalid();
  const tutorial = input.type === 'tutorial';
  const language = input.language === undefined ? 'th' : input.language;
  if (!['th', 'en'].includes(language)) invalid();
  if (Object.hasOwn(input, tutorial ? 'episodes' : 'chapters')) invalid();
  const ids = new Set();
  const unit = (value, chapter = false) => {
    strictObject(value, chapter ? ['id', 'title', 'description', 'lessons']
      : tutorial ? ['id', 'title', 'description'] : ['id', 'title', 'description', 'season']);
    if (Object.hasOwn(value, 'id')) {
      if (typeof value.id !== 'string' || !UNIT_ID.test(value.id) || ids.has(value.id)) invalid();
      ids.add(value.id);
    }
    const season = !tutorial ? (value.season === undefined ? 1 : value.season) : undefined;
    if (!tutorial && (!Number.isSafeInteger(season) || season < 1)) invalid();
    return {
      ...(value.id === undefined ? {} : { id: value.id }),
      title: text(value.title, LEARNING_LIMITS.titleLength, true),
      description: text(value.description === undefined ? '' : value.description, LEARNING_LIMITS.descriptionLength),
      ...(!tutorial ? { season } : {})
    };
  };
  const array = (value, max) => {
    if (!Array.isArray(value) || value.length > max) invalid();
    return value;
  };
  let curriculum;
  if (tutorial) {
    let lessonCount = 0;
    curriculum = array(input.chapters, LEARNING_LIMITS.chapters).map(chapter => {
      const metadata = unit(chapter, true);
      const lessons = array(chapter.lessons, LEARNING_LIMITS.lessonsPerChapter).map(lesson => unit(lesson));
      lessonCount += lessons.length;
      if (lessonCount > LEARNING_LIMITS.totalLessons) invalid();
      return { ...metadata, lessons };
    });
  } else {
    curriculum = array(input.episodes, input.type === 'film' ? 1 : LEARNING_LIMITS.episodes).map(episode => unit(episode));
    if (curriculum.some((episode, index) => index > 0 && episode.season < curriculum[index - 1].season)) invalid();
  }
  const count = input.freeCount;
  if (!Number.isSafeInteger(count) || count < 0) invalid();
  if (input.accessMode === 'preview_then_paid') {
    if (input.type === 'film' || count < 1 || count >= curriculum.length) invalid();
  } else if (count !== 0) invalid();
  // Draft authoring intent only; no offer, quote or billable price is created here.
  const priceCredits = input.priceCredits === undefined && input.accessMode === 'free' ? 0 : input.priceCredits;
  if (!Number.isSafeInteger(priceCredits) || priceCredits < 0
    || (input.accessMode === 'free' ? priceCredits !== 0 : priceCredits < 1)) invalid();
  return {
    type: input.type,
    title: text(input.title, LEARNING_LIMITS.titleLength, true),
    description: text(input.description, LEARNING_LIMITS.descriptionLength),
    language,
    accessMode: input.accessMode,
    freeCount: count,
    priceCredits,
    [tutorial ? 'chapters' : 'episodes']: curriculum
  };
}

export function validatePatch(input, record, allowedTypes) {
  strictObject(input, ['revision', ...METADATA_FIELDS.filter(field => field !== 'type')]);
  assertRevision(input.revision);
  if (Object.keys(input).length < 2) invalid();
  const metadata = Object.fromEntries(METADATA_FIELDS.filter(field => Object.hasOwn(record, field))
    .map(field => [field, record[field]]));
  const { revision, ...changes } = input;
  return validateMetadata({ ...metadata, ...changes }, allowedTypes);
}

// Ordering is represented only by arrays; IDs survive reorder/rename and are title-scoped.
export function assignUnitIds(metadata, newId) {
  const unit = value => ({ ...value, id: value.id ?? newId() });
  return metadata.type === 'tutorial'
    ? { ...metadata, chapters: metadata.chapters.map(chapter => ({ ...unit(chapter), lessons: chapter.lessons.map(unit) })) }
    : { ...metadata, episodes: metadata.episodes.map(unit) };
}

export function validateListQuery(query, kind) {
  strictObject(query, ['kind', 'includeDrafts', 'search', 'limit', 'offset']);
  if (!['tutorial', 'cinema'].includes(query.kind) || query.kind !== kind) invalid();
  if (query.includeDrafts !== undefined && !['true', 'false'].includes(query.includeDrafts)) invalid();
  const integer = (value, fallback, min, max) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) invalid();
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result < min || result > max) invalid();
    return result;
  };
  return {
    includeDrafts: query.includeDrafts === 'true',
    search: query.search === undefined ? '' : text(query.search, LEARNING_LIMITS.titleLength).toLowerCase(),
    limit: integer(query.limit, 20, 1, LEARNING_LIMITS.pageSize),
    offset: integer(query.offset, 0, 0, 10000)
  };
}

export function catalogPage(records, query) {
  const items = records.filter(item => (item.status === 'published' || (query.includeDrafts && item.status === 'draft'))
    && (!query.search || `${item.title}\n${item.description}`.toLowerCase().includes(query.search)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  return {
    items: items.slice(query.offset, query.offset + query.limit),
    total: items.length,
    limit: query.limit,
    offset: query.offset
  };
}
