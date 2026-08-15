import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile } from '../json/jsonFileStore.js';
import { createPage, normalizeListQuery } from '../repositoryContracts.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const DB_FALLBACK = {
  schemaVersion: 2,
  accounts: [],
  estimates: [],
  reservations: [],
  ledgerEntries: []
};

export class CreditLedgerRepository {
  constructor({
    databaseFile = resolveDataFile('database'),
    userRepository = mockUserRepo,
    cursorSecret = process.env.CREDIT_LEDGER_CURSOR_SECRET || 'local-credit-ledger-cursor'
  } = {}) {
    this.databaseFile = databaseFile;
    this.userRepository = userRepository;
    this.cursorSecret = cursorSecret;
  }

  async readAll() {
    const data = await readJsonFile(this.databaseFile, DB_FALLBACK);
    if (!data || typeof data !== 'object') return [];

    if (Array.isArray(data.ledgerEntries)) {
      return data.ledgerEntries;
    }
    if (Array.isArray(data.creditLedger)) {
      return data.creditLedger;
    }
    return [];
  }

  async findByUserId(userId, query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const user = await this.userRepository.findById(userId) || await this.userRepository.findByUsername(userId);
    const all = await this.readAll();

    const targetUserId = user ? user.id : userId;
    const targetUsername = user ? user.username : userId;

    const userEntries = all.filter(entry =>
      entry.userId === targetUserId ||
      entry.userId === userId ||
      entry.username === targetUsername
    );

    const page = paginateRepositoryRecords(
      userEntries,
      normalizedQuery,
      JSON.stringify({ userId, sort: normalizedQuery.sort }),
      this.cursorSecret
    );

    return createPage(page.items, page);
  }

  async findByIdempotencyKey(key) {
    if (!key) return null;
    const all = await this.readAll();
    return all.find(entry => entry.idempotencyKey === key) || null;
  }

  async getNetJobCosts(jobIds = []) {
    const requested = new Set(jobIds);
    const all = await this.readAll();
    const totals = new Map([...requested].map(jobId => [jobId, 0]));

    all.forEach(entry => {
      const jobId = entry.relatedJobId || entry.jobId;
      if (!requested.has(jobId)) return;
      const amount = Number(entry.amountCredits ?? entry.amount ?? 0);
      const op = entry.operationType || entry.type;
      if (op === 'capture' || op === 'generation_charge') {
        totals.set(jobId, (totals.get(jobId) || 0) + Math.abs(amount));
      } else if (op === 'refund' || op === 'generation_refund' || op === 'lost_job_refund') {
        totals.set(jobId, (totals.get(jobId) || 0) - Math.abs(amount));
      }
    });

    return totals;
  }
}

export const creditLedgerRepo = new CreditLedgerRepository();
