import { mockUserRepo } from '../../repositories/identity/MockUserRepository.js';
import { historyRepository } from '../../repositories/generation/HistoryRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { creditAccountRepo } from '../../repositories/credits/CreditAccountRepository.js';
import { creditLedgerRepo } from '../../repositories/credits/CreditLedgerRepository.js';
import { auditLogRepo } from '../../repositories/audit/AuditLogRepository.js';
import { videoProviderTaskRepository } from '../../repositories/generation/VideoProviderTaskRepository.js';
import { normalizeListQuery } from '../../repositories/repositoryContracts.js';
import { paginateRepositoryRecords } from '../../repositories/RepositoryCursor.js';
import { adminPolicyService } from './AdminPolicyService.js';
import { adminOperationPresentationRepository } from '../../repositories/admin/AdminOperationPresentationRepository.js';

const ACTIVE_GENERATION_STATUSES = new Set(['accepted', 'queued', 'processing', 'provider_queued', 'provider_processing']);
const ATTENTION_GENERATION_STATUSES = new Set(['failed', 'expired', 'reconciliation_required']);
const SUCCESS_GENERATION_STATUSES = new Set(['completed', 'succeeded', 'provider_succeeded']);
const ANALYTICS_WINDOWS = new Set([7, 14, 30]);

export class AdminBackofficeService {
  constructor({
    userRepository = mockUserRepo,
    historyRepo = historyRepository,
    postRepository = communityPostRepo,
    accountRepository = creditAccountRepo,
    ledgerRepository = creditLedgerRepo,
    auditRepository = auditLogRepo,
    videoTaskRepository = videoProviderTaskRepository,
    policy = adminPolicyService,
    operationPresentationRepository = adminOperationPresentationRepository
  } = {}) {
    this.userRepository = userRepository;
    this.historyRepo = historyRepo;
    this.postRepository = postRepository;
    this.accountRepository = accountRepository;
    this.ledgerRepository = ledgerRepository;
    this.auditRepository = auditRepository;
    this.videoTaskRepository = videoTaskRepository;
    this.policy = policy;
    this.operationPresentationRepository = operationPresentationRepository;
  }

  async listUsers(actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    const users = await this.userRepository.readAll();
    return Promise.all(users.map(async user => {
      const account = await this.accountRepository.getAccountByUserId(user.id);
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        credits: account ? { availableCredits: account.availableCredits, reservedCredits: account.reservedCredits } : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    }));
  }

  async listUsersPage(query, actorContext) {
    const normalized = normalizeListQuery(query, { defaultLimit: 25, maxLimit: 50 });
    const search = String(query.search || '').trim().toLowerCase();
    const status = String(query.status || '').trim();
    const role = String(query.role || '').trim();
    const users = (await this.listUsers(actorContext))
      .filter(user => !status || user.status === status)
      .filter(user => !role || user.role === role)
      .filter(user => !search || [user.id, user.username, user.displayName]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(search)))
      .map(user => ({ ...user, createdAt: user.createdAt || user.updatedAt || '1970-01-01T00:00:00.000Z' }));
    return paginateRepositoryRecords(users, normalized, JSON.stringify({ search, status, role, sort: normalized.sort }));
  }

  async getUserDetail(userId, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    const user = await this.userRepository.findById(userId);
    if (!user) throw Object.assign(new Error('User not found.'), { code: 'admin_user_not_found', statusCode: 404 });
    const [account, images, videos, posts] = await Promise.all([
      this.accountRepository.getAccountByUserId(userId),
      this.historyRepo.readAll().then(items => items.filter(item => item.ownerUserId === userId || item.username === user.username)),
      this.videoTaskRepository.listOperational({ search: userId, limit: 100 }),
      this.postRepository.listForBackoffice({ search: userId, limit: 1 })
    ]);
    return {
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, status: user.status, createdAt: user.createdAt || null, updatedAt: user.updatedAt || null },
      credits: account ? { availableCredits: account.availableCredits, reservedCredits: account.reservedCredits } : null,
      activity: {
        imageJobs: images.length,
        videoJobs: videos.filter(item => item.ownerUserId === userId).length,
        communityPosts: posts.totalApprox ?? posts.items.length
      }
    };
  }

  async listGenerationJobs(query, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    const search = String(query.search || '').trim().toLowerCase();
    const status = String(query.status || '').trim();
    const page = await this.historyRepo.listPage({
      cursor: query.cursor || null,
      limit: query.limit || 24,
      collectionId: 'all',
      includeInternalArtifacts: true,
      filterKey: JSON.stringify({ search, status }),
      itemFilter: record => (
        (!status || (record.status || 'completed') === status)
        && (!search || [record.id, record.jobId, record.ownerUserId, record.ownerUsername, record.username, record.providerId, record.provider, record.modelId, record.submodel]
          .filter(Boolean).some(value => String(value).toLowerCase().includes(search)))
      )
    });
    return {
      ...page,
      items: page.items.map(toGenerationSummary)
    };
  }

  async listCommunityPosts(query, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    const page = await this.postRepository.listForBackoffice(query);
    return {
      ...page,
      items: page.items.map(toCommunityPostSummary)
    };
  }

  async getCreditLedger(userId, query, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    return this.ledgerRepository.findByUserId(userId, query);
  }

  async listAuditEvents(query, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    return this.auditRepository.listForBackoffice(query);
  }

  async listGenerationOperations(query, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    const mediaType = ['image', 'video'].includes(query.mediaType) ? query.mediaType : 'all';
    const status = String(query.status || '').trim();
    const search = String(query.search || '').trim().toLowerCase();
    const normalized = normalizeListQuery(query, { defaultLimit: 25, maxLimit: 50 });
    const [images, videos] = await Promise.all([
      mediaType === 'video' ? [] : this.historyRepo.listPage({ limit: 50, collectionId: 'all', includeInternalArtifacts: true }).then(page => page.items),
      mediaType === 'image' ? [] : this.videoTaskRepository.listOperational({ search, status: status === 'attention' ? '' : status, limit: 100 })
    ]);
    const dismissedIds = new Set((await this.operationPresentationRepository.listDismissals())
      .filter(item => item.restoredAt == null).map(item => item.operationId));
    const visibility = query.visibility === 'dismissed' ? 'dismissed' : 'active';
    const items = [
      ...images.map(record => ({ ...toGenerationSummary(record), mediaType: 'image' })),
      ...videos.map(record => toVideoOperationSummary(record))
    ]
      .filter(item => visibility === 'dismissed' ? dismissedIds.has(item.id) : !dismissedIds.has(item.id))
      .filter(item => !status || (status === 'attention' ? ATTENTION_GENERATION_STATUSES.has(item.status) : item.status === status))
      .filter(item => !search || [item.id, item.ownerUsername, item.ownerUserId, item.providerId, item.modelId, item.supportReference]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(search)))
      .sort((left, right) => timestampOf(right.updatedAt || right.createdAt) - timestampOf(left.updatedAt || left.createdAt));
    return paginateRepositoryRecords(items, normalized, JSON.stringify({ mediaType, status, search, visibility, sort: normalized.sort }));
  }

  async getOverview(actorContext, query = {}) {
    this.policy.assertCanAccessBackoffice(actorContext);
    const generatedAt = new Date().toISOString();
    const windowDays = ANALYTICS_WINDOWS.has(Number(query.window)) ? Number(query.window) : 7;
    const [usersSource, imageSource, videoSource, postsSource, auditSource] = await Promise.all([
      readOverviewSource('users', async () => {
        const users = await this.listUsers(actorContext);
        return { count: users.length, activeCount: users.filter(user => user.status === 'active').length };
      }),
      readOverviewSource('imageGeneration', async () => {
        const records = await this.historyRepo.readAll();
        return { ...summarizeGenerationRecords(records), analyticsRecords: records.map(toAnalyticsRecord) };
      }),
      readOverviewSource('videoGeneration', async () => {
        const records = await this.videoTaskRepository.listOperational({ limit: 100 });
        return { ...summarizeGenerationRecords(records), analyticsRecords: records.map(toAnalyticsRecord) };
      }),
      readOverviewSource('community', async () => {
        const posts = await this.listCommunityPosts({ limit: 1 }, actorContext);
        return { count: posts.totalApprox ?? posts.items.length };
      }),
      readOverviewSource('audit', async () => {
        const auditEvents = await this.listAuditEvents({ limit: 1 }, actorContext);
        return { count: auditEvents.totalApprox ?? auditEvents.items.length };
      })
    ]);
    const analytics = buildDailyAnalytics(
      [...(imageSource.analyticsRecords || []), ...(videoSource.analyticsRecords || [])],
      windowDays,
      generatedAt
    );
    const sources = Object.fromEntries([usersSource, imageSource, videoSource, postsSource, auditSource].map(source => {
      const { analyticsRecords: _analyticsRecords, ...publicSource } = source;
      return [source.id, publicSource];
    }));
    const partial = Object.values(sources).some(source => source.status !== 'ready');
    const priorityItems = buildPriorityItems(sources);
    return {
      generatedAt,
      status: partial ? 'partial' : 'ready',
      analytics,
      sources,
      priorityItems,
      users: { total: usersSource.count || 0, active: usersSource.activeCount || 0 },
      generationJobs: { totalApprox: (imageSource.count || 0) + (videoSource.count || 0) },
      communityPosts: { totalApprox: postsSource.count || 0 },
      auditEvents: { totalApprox: auditSource.count || 0 }
    };
  }
}

export const adminBackofficeService = new AdminBackofficeService();

function toGenerationSummary(record = {}) {
  return {
    id: record.id || record.jobId || null,
    ownerUserId: record.ownerUserId || null,
    ownerUsername: record.ownerUsername || record.username || null,
    status: record.status || 'completed',
    providerId: record.providerId || record.provider || null,
    modelId: record.modelId || record.submodel || null,
    mode: record.mode || record.generationMode || null,
    errorCode: record.errorCode || record.error?.code || null,
    createdAt: record.createdAt || record.timestamp || null,
    updatedAt: record.updatedAt || null
  };
}

function toCommunityPostSummary(record = {}) {
  return {
    id: record.id || null,
    title: record.title || null,
    ownerUserId: record.ownerUserId || null,
    ownerUsername: record.ownerUsername || null,
    visibility: record.visibility || 'private',
    status: record.status || 'draft',
    moderationReason: record.moderationReason || null,
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null
  };
}

function toVideoOperationSummary(record = {}) {
  return {
    id: record.id || null,
    mediaType: 'video',
    ownerUserId: record.ownerUserId || null,
    ownerUsername: record.ownerUsername || null,
    status: record.status || 'accepted',
    providerId: record.providerId || null,
    modelId: record.modelId || null,
    mode: record.operation || record.mode || 'video',
    errorCode: record.providerError?.code || record.errorCode || null,
    supportReference: record.supportReference || null,
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null
  };
}

function summarizeGenerationRecords(records = []) {
  return {
    count: records.length,
    activeCount: records.filter(record => ACTIVE_GENERATION_STATUSES.has(record.status)).length,
    attentionCount: records.filter(record => ATTENTION_GENERATION_STATUSES.has(record.status)).length,
    oldestActiveAt: records
      .filter(record => ACTIVE_GENERATION_STATUSES.has(record.status))
      .map(record => record.createdAt || record.updatedAt)
      .filter(Boolean)
      .sort()[0] || null
  };
}

function toAnalyticsRecord(record = {}) {
  return {
    status: record.status || 'completed',
    occurredAt: record.updatedAt || record.createdAt || record.timestamp || null
  };
}

function buildDailyAnalytics(records, windowDays, generatedAt) {
  const today = startOfUtcDay(generatedAt);
  const daily = Array.from({ length: windowDays }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - (windowDays - index - 1));
    return { date: date.toISOString().slice(0, 10), success: 0, failed: 0, active: 0, other: 0, total: 0 };
  });
  const byDate = new Map(daily.map(bucket => [bucket.date, bucket]));
  for (const record of records) {
    const timestamp = timestampOf(record.occurredAt);
    if (!timestamp) continue;
    const bucket = byDate.get(new Date(timestamp).toISOString().slice(0, 10));
    if (!bucket) continue;
    const status = String(record.status || 'completed');
    if (SUCCESS_GENERATION_STATUSES.has(status)) bucket.success += 1;
    else if (ATTENTION_GENERATION_STATUSES.has(status)) bucket.failed += 1;
    else if (ACTIVE_GENERATION_STATUSES.has(status)) bucket.active += 1;
    else bucket.other += 1;
    bucket.total += 1;
  }
  const totals = daily.reduce((sum, bucket) => ({
    success: sum.success + bucket.success,
    failed: sum.failed + bucket.failed,
    active: sum.active + bucket.active,
    other: sum.other + bucket.other,
    total: sum.total + bucket.total
  }), { success: 0, failed: 0, active: 0, other: 0, total: 0 });
  return {
    windowDays,
    timezone: 'UTC',
    daily,
    totals: {
      ...totals,
      successRate: totals.success + totals.failed > 0
        ? Math.round((totals.success / (totals.success + totals.failed)) * 1000) / 10
        : null
    }
  };
}

function startOfUtcDay(value) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function readOverviewSource(id, loader) {
  try {
    return { id, status: 'ready', sourceUpdatedAt: new Date().toISOString(), ...(await loader()) };
  } catch {
    return { id, status: 'unavailable', sourceUpdatedAt: null, count: null, activeCount: null, attentionCount: null, oldestActiveAt: null };
  }
}

function buildPriorityItems(sources) {
  return ['imageGeneration', 'videoGeneration'].flatMap(id => {
    const source = sources[id];
    if (source?.status !== 'ready' || !source.attentionCount) return [];
    return [{
      id: `${id}:attention`,
      capability: id,
      severity: 'warning',
      count: source.attentionCount,
      href: `/admin/operations?mediaType=${id === 'videoGeneration' ? 'video' : 'image'}&status=attention`
    }];
  });
}

function timestampOf(value) {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}
