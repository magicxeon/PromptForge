import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../../repositories/json/jsonFileStore.js';

export class CreditError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'CreditError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class CreditManager {
  constructor({ databaseFile = resolveDataFile('database') } = {}) {
    this.databaseFile = databaseFile;
  }

  async readData() {
    const data = await readJsonFile(this.databaseFile, { users: {}, creditLedger: [] });
    if (!data.users || typeof data.users !== 'object') data.users = {};
    if (!Array.isArray(data.creditLedger)) data.creditLedger = [];
    return data;
  }

  mutate(operation) {
    return mutateJsonFile(this.databaseFile, { users: {}, creditLedger: [] }, async (data) => {
      if (!data.users || typeof data.users !== 'object') data.users = {};
      if (!Array.isArray(data.creditLedger)) data.creditLedger = [];
      return operation(data);
    });
  }

  getUserOrThrow(data, username) {
    const user = data.users[username];
    if (!user) throw new CreditError('user_not_found', 'User not found.', 404);
    return user;
  }

  async getUserInfo(username) {
    try {
      const data = await this.readData();
      const user = data.users[username];
      return user
        ? { credits: Number(user.credits || 0), role: user.role || 'user' }
        : { credits: 0, role: 'user' };
    } catch {
      return { credits: 0, role: 'user' };
    }
  }

  async assertBalance(username, amount) {
    const info = await this.getUserInfo(username);
    if (info.credits < amount) {
      throw new CreditError(
        'insufficient_credits',
        `Insufficient credits. This operation requires ${amount} credit(s).`,
        402
      );
    }
    return info;
  }

  async deduct(username, amount = 1, metadata = {}) {
    return this.mutate(async data => {
      const user = this.getUserOrThrow(data, username);
      if (Number(user.credits || 0) < amount) {
        throw new CreditError('insufficient_credits', 'Insufficient credits.', 402);
      }
      user.credits -= amount;
      data.creditLedger.push(this.createLedgerEntry(username, -amount, 'generation_charge', metadata));
      return user.credits;
    });
  }

  async refund(username, amount = 1, metadata = {}) {
    return this.mutate(async data => {
      const user = this.getUserOrThrow(data, username);
      user.credits += amount;
      data.creditLedger.push(this.createLedgerEntry(username, amount, 'generation_refund', metadata));
      return user.credits;
    });
  }

  async refundLostJob(username, jobId, metadata = {}) {
    return this.mutate(async data => {
      const user = this.getUserOrThrow(data, username);
      const netCost = data.creditLedger
        .filter(entry => entry.jobId === jobId)
        .reduce((total, entry) => total - Number(entry.amount || 0), 0);
      if (netCost <= 0) return { refunded: false, credits: user.credits };
      user.credits += netCost;
      data.creditLedger.push(this.createLedgerEntry(username, netCost, 'lost_job_refund', {
        ...metadata,
        jobId
      }));
      return { refunded: true, amount: netCost, credits: user.credits };
    });
  }

  async recharge(username, amount = 10) {
    return this.mutate(async data => {
      const user = this.getUserOrThrow(data, username);
      user.credits += amount;
      data.creditLedger.push(this.createLedgerEntry(username, amount, 'recharge', {}));
      return { credits: user.credits, role: user.role || 'user' };
    });
  }

  async getNetJobCosts(jobIds) {
    const requested = new Set(jobIds);
    const data = await this.readData();
    const totals = new Map([...requested].map(jobId => [jobId, 0]));
    data.creditLedger.forEach(entry => {
      if (!requested.has(entry.jobId)) return;
      totals.set(entry.jobId, (totals.get(entry.jobId) || 0) - Number(entry.amount || 0));
    });
    return totals;
  }

  createLedgerEntry(username, amount, type, metadata) {
    return {
      id: `credit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      username,
      amount,
      type,
      jobId: metadata.jobId || null,
      comparisonSetId: metadata.comparisonSetId || null,
      comparisonRunId: metadata.comparisonRunId || null,
      createdAt: Date.now()
    };
  }
}

export const creditManager = new CreditManager();
