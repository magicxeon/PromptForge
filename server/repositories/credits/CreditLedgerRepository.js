import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile } from '../json/jsonFileStore.js';
import { createPage, normalizeListQuery } from '../repositoryContracts.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const DB_FALLBACK = { users: {}, creditLedger: [] };

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
    if (!data || typeof data !== 'object' || !Array.isArray(data.creditLedger)) {
      throw new TypeError('Credit database must contain a creditLedger array.');
    }
    return Array.isArray(data.creditLedger) ? data.creditLedger : [];
  }

  async findByUserId(userId, query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const user = await this.userRepository.findById(userId);
    if (!user) return createPage([]);
    const all = await this.readAll();
    const userEntries = all.filter(entry => entry.userId === userId || entry.username === user.username);
    const page = paginateRepositoryRecords(
      userEntries,
      normalizedQuery,
      JSON.stringify({ userId, sort: normalizedQuery.sort }),
      this.cursorSecret
    );

    return createPage(page.items, page);
  }

  async getNetJobCosts(jobIds = []) {
    const requested = new Set(jobIds);
    const all = await this.readAll();
    const totals = new Map([...requested].map(jobId => [jobId, 0]));

    all.forEach(entry => {
      const jobId = entry.relatedJobId || entry.jobId;
      if (!requested.has(jobId)) return;
      const amount = Number(entry.amountCredits ?? entry.amount ?? 0);
      if (Number.isFinite(amount)) totals.set(jobId, (totals.get(jobId) || 0) - amount);
    });
    return totals;
  }
}

export const creditLedgerRepo = new CreditLedgerRepository();
