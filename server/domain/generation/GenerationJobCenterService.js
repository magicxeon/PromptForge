const ACTIVE_STATUSES = new Set([
  'accepted',
  'queued',
  'processing',
  'running',
  'submitted',
  'polling',
  'provider_submitting',
  'provider_queued'
]);

export class GenerationJobCenterService {
  constructor({
    queueManager,
    historyRepository,
    generationGroupRepository,
    generationApplicationService,
    videoGenerationService
  }) {
    this.queueManager = queueManager;
    this.historyRepository = historyRepository;
    this.generationGroupRepository = generationGroupRepository;
    this.generationApplicationService = generationApplicationService;
    this.videoGenerationService = videoGenerationService;
  }

  async list(actorContext, { scope = 'all', limit = 24 } = {}) {
    assertActor(actorContext);
    const safeScope = normalizeScope(scope);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 24));
    const sourceLimit = Math.min(50, Math.max(safeLimit, 24));
    const [queueJobs, groups, historyPage, videoPage] = await Promise.all([
      Promise.resolve(this.queueManager.listActiveJobSnapshotsForUser(
        actorContext.username,
        { limit: sourceLimit }
      )),
      this.generationGroupRepository.listForActor(actorContext.userId, { limit: sourceLimit }),
      this.historyRepository.listPage({
        username: actorContext.username,
        limit: sourceLimit,
        includeInternalArtifacts: false,
        filterKey: 'generation-job-center'
      }),
      this.videoGenerationService.listRecent(actorContext, { limit: Math.min(24, sourceLimit) })
    ]);

    const resolvedGroups = this.generationApplicationService
      ? (await Promise.all(groups.map(group =>
        this.generationApplicationService.getGroupStatusForActor(group.id, actorContext)
      ))).filter(Boolean)
      : groups;
    const groupChildIds = new Set(groups.flatMap(group => group.childJobIds || []));
    const items = [
      ...resolvedGroups.map(projectGroup),
      ...queueJobs.filter(job => !groupChildIds.has(job.id)).map(projectQueueJob),
      ...historyPage.items.filter(item => !item.generationGroupId).map(projectHistoryItem),
      ...videoPage.items.map(projectVideoTask)
    ]
      .filter(item => matchesScope(item, safeScope))
      .sort(compareNewestFirst)
      .slice(0, safeLimit);

    return {
      items,
      activeCount: items.filter(item => !item.terminal).length,
      terminalCount: items.filter(item => item.terminal).length,
      polledAt: new Date().toISOString()
    };
  }
}

function projectQueueJob(job) {
  const resumeHref = resumeHrefForImage(job.generationSurface, job.generationMode);
  return baseItem({
    id: job.id,
    kind: 'image_job',
    mediaType: 'image',
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    providerId: job.providerId,
    modelId: job.modelId,
    estimatedCredits: job.estimatedCredits,
    resumeHref
  });
}

function projectGroup(group) {
  const completedCount = Number(group.completedCount || 0);
  const failedCount = Number(group.failedCount || 0);
  return baseItem({
    id: group.id,
    kind: 'image_group',
    mediaType: 'image',
    status: group.status,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    completedAt: group.completedAt || null,
    resumeHref: resumeHrefForImage(group.generationSurface, group.generationMode),
    progress: {
      completed: completedCount + failedCount,
      total: Number(group.requestedOutputCount || group.childJobIds?.length || 1),
      succeeded: completedCount,
      failed: failedCount
    }
  });
}

function projectHistoryItem(item) {
  const resultUrl = safeMediaUrl(item.imageUrl);
  return baseItem({
    id: item.id,
    kind: 'image_result',
    mediaType: 'image',
    status: 'completed',
    createdAt: new Date(Number(item.timestamp || Date.now())).toISOString(),
    updatedAt: new Date(Number(item.timestamp || Date.now())).toISOString(),
    completedAt: new Date(Number(item.timestamp || Date.now())).toISOString(),
    providerId: item.provider || null,
    modelId: item.submodel || null,
    resultUrl,
    thumbnailUrl: safeMediaUrl(item.thumbnailUrl) || resultUrl,
    detailHref: `/library/recent/${encodeURIComponent(item.id)}`,
    resumeHref: `/library/recent/${encodeURIComponent(item.id)}`,
    estimatedCredits: Number(item.creditCost || 0)
  });
}

function projectVideoTask(task) {
  const resultUrl = safeMediaUrl(task.outputAsset?.url || task.outputAsset?.videoUrl);
  return baseItem({
    id: task.id,
    kind: 'video_task',
    mediaType: 'video',
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt || null,
    providerId: task.providerId,
    modelId: task.modelId,
    resultUrl,
    detailHref: '/create/playground?media=video',
    resumeHref: '/create/playground?media=video',
    billingStatus: task.billingStatus,
    estimatedCredits: Number(task.estimatedCredits || 0),
    error: sanitizeError(task.providerError)
  });
}

function baseItem(input) {
  const status = String(input.status || 'unknown');
  return {
    id: String(input.id),
    kind: input.kind,
    mediaType: input.mediaType,
    status,
    terminal: !ACTIVE_STATUSES.has(status),
    createdAt: input.createdAt || null,
    updatedAt: input.updatedAt || input.createdAt || null,
    completedAt: input.completedAt || null,
    providerId: input.providerId || null,
    modelId: input.modelId || null,
    resultUrl: input.resultUrl || null,
    thumbnailUrl: input.thumbnailUrl || null,
    detailHref: input.detailHref || null,
    resumeHref: input.resumeHref || input.detailHref || null,
    billingStatus: input.billingStatus || null,
    estimatedCredits: Number(input.estimatedCredits || 0),
    progress: input.progress || null,
    error: input.error || null
  };
}

function resumeHrefForImage(surface, mode) {
  if (surface === 'playground') return '/create/playground';
  if (surface === 'fashion') return '/create/fashion';
  if (surface === 'cinematic') return '/create/cinematic';
  if (mode === 'face') return '/create/studio/face';
  if (mode === 'character-sheet') return '/create/studio/character';
  return '/create/studio/scene';
}

function sanitizeError(error) {
  if (!error) return null;
  if (typeof error === 'string') return { code: null, message: error.slice(0, 240) };
  return {
    code: error.code ? String(error.code) : null,
    message: error.message ? String(error.message).slice(0, 240) : null
  };
}

function safeMediaUrl(value) {
  const url = String(value || '');
  return url.startsWith('/outputs/') || url.startsWith('/api/') ? url : null;
}

function matchesScope(item, scope) {
  if (scope === 'active') return !item.terminal;
  if (scope === 'recent') return item.terminal;
  return true;
}

function compareNewestFirst(left, right) {
  return Date.parse(right.updatedAt || right.createdAt || 0)
    - Date.parse(left.updatedAt || left.createdAt || 0);
}

function normalizeScope(scope) {
  const value = String(scope || 'all').toLowerCase();
  if (!['all', 'active', 'recent'].includes(value)) {
    throw Object.assign(new Error('Job Center scope must be all, active, or recent.'), {
      code: 'generation_job_center_scope_invalid',
      statusCode: 400
    });
  }
  return value;
}

function assertActor(actorContext) {
  if (!actorContext?.userId || !actorContext?.username) {
    throw Object.assign(new Error('An authenticated actor is required.'), {
      code: 'actor_required',
      statusCode: 401
    });
  }
}
