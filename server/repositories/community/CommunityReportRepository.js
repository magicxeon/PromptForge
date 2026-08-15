import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import {
  assertActorContext,
  createPage,
  normalizeListQuery,
  RepositoryContractError
} from '../repositoryContracts.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';

const REPORT_FALLBACK = [];

export class CommunityReportRepository {
  constructor({
    reportsFile = resolveDataFile('communityReports'),
    cursorSecret = process.env.COMMUNITY_REPORT_CURSOR_SECRET || 'local-community-report-cursor'
  } = {}) {
    this.reportsFile = reportsFile;
    this.cursorSecret = cursorSecret;
  }

  async readAll() {
    const reports = await readJsonFile(this.reportsFile, REPORT_FALLBACK);
    return Array.isArray(reports) ? reports.map(normalizeReport) : [];
  }

  async createWithRateLimit(reportInput = {}, actorContext, {
    sinceTimestamp = 0,
    maxReports = 5
  } = {}) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.reportsFile, REPORT_FALLBACK, async reports => {
      assertReportStore(reports);
      const targetType = normalizeTargetType(reportInput.targetType);
      const targetId = String(reportInput.targetId || '').trim();
      const reason = String(reportInput.reason || '');
      if (!targetId) {
        throw new RepositoryContractError(
          'community_report_target_required',
          'A report target is required.',
          400
        );
      }
      const duplicate = reports.find(report => {
        const normalized = normalizeReport(report);
        return normalized.reporterUserId === actor.userId
          && normalized.targetType === targetType
          && normalized.targetId === targetId
          && normalized.reason === reason
          && normalized.status === 'open';
      });
      if (duplicate) {
        return { report: normalizeReport(duplicate), created: false };
      }

      const recentCount = reports.filter(report => {
        const normalized = normalizeReport(report);
        return normalized.reporterUserId === actor.userId
          && (Date.parse(normalized.createdAt || '') || 0) >= Number(sinceTimestamp || 0);
      }).length;
      if (recentCount >= maxReports) {
        throw new RepositoryContractError(
          'community_report_rate_limited',
          'Too many reports were submitted. Please try again later.',
          429
        );
      }

      const record = createReportRecord({ ...reportInput, targetType, targetId, reason }, actor);
      reports.push(record);
      return { report: normalizeReport(record), created: true };
    });
  }

  async listForBackoffice(query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const status = typeof query.status === 'string' ? query.status.trim() : '';
    const targetType = typeof query.targetType === 'string' ? query.targetType.trim() : '';
    const targetId = typeof query.targetId === 'string' ? query.targetId.trim() : '';
    const reports = (await this.readAll())
      .filter(report => !status || report.status === status)
      .filter(report => !targetType || report.targetType === targetType)
      .filter(report => !targetId || report.targetId === targetId);
    const scope = JSON.stringify({ status, targetType, targetId, sort: normalizedQuery.sort });
    const page = paginateRepositoryRecords(
      reports,
      normalizedQuery,
      scope,
      this.cursorSecret
    );
    return createPage(page.items, page);
  }
}

function normalizeReport(value = {}) {
  return {
    id: String(value.id || ''),
    schemaVersion: Number(value.schemaVersion) || 1,
    reporterUserId: String(value.reporterUserId || value.ownerUserId || ''),
    targetType: normalizeTargetType(value.targetType),
    targetId: String(value.targetId || ''),
    reason: String(value.reason || ''),
    details: String(value.details || ''),
    visibility: 'admin_only',
    status: ['open', 'resolved', 'dismissed'].includes(value.status) ? value.status : 'open',
    resolution: value.resolution || null,
    resolvedByUserId: value.resolvedByUserId || null,
    resolvedAt: value.resolvedAt || null,
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || value.createdAt || null
  };
}

function normalizeTargetType(value) {
  const targetType = String(value || 'community_post');
  if (!['community_post', 'community_comment'].includes(targetType)) {
    throw new RepositoryContractError(
      'community_report_target_type_invalid',
      'Community report target type is invalid.',
      400
    );
  }
  return targetType;
}

function createReportRecord(reportInput, actor) {
  const now = new Date().toISOString();
  return applyRecordDefaults({
    reporterUserId: actor.userId,
    targetType: String(reportInput.targetType || 'community_post'),
    targetId: String(reportInput.targetId || ''),
    reason: String(reportInput.reason || ''),
    details: String(reportInput.details || '').trim().slice(0, 1000),
    resolution: null,
    resolvedByUserId: null,
    resolvedAt: null
  }, {
    idPrefix: 'report',
    ownerUserId: actor.userId,
    ownerUsername: actor.username,
    visibility: 'admin_only',
    status: 'open',
    now
  });
}

function assertReportStore(reports) {
  if (!Array.isArray(reports)) throw new TypeError('Community report data must be an array.');
}

export const communityReportRepo = new CommunityReportRepository();
