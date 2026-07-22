import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import { assertActorContext, RepositoryContractError } from '../repositoryContracts.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const DB_FALLBACK = { users: {}, creditLedger: [] };
const CREDIT_OPERATIONS = new Set([
  'generation_charge',
  'generation_refund',
  'lost_job_refund',
  'recharge',
  'adjustment'
]);
const PRIVILEGED_ROLES = new Set(['admin', 'support', 'system']);

export class CreditAccountRepository {
  constructor({
    databaseFile = resolveDataFile('database'),
    userRepository = mockUserRepo
  } = {}) {
    this.databaseFile = databaseFile;
    this.userRepository = userRepository;
  }

  async readRaw() {
    const data = await readJsonFile(this.databaseFile, DB_FALLBACK);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new TypeError('Credit database must be an object.');
    }
    return {
      users: data.users && typeof data.users === 'object' ? data.users : {},
      creditLedger: Array.isArray(data.creditLedger) ? data.creditLedger : []
    };
  }

  async findByUserId(userId) {
    if (!userId) return null;
    const user = await this.userRepository.findById(userId);
    if (!user) return null;
    const data = await this.readRaw();
    const account = data.users[user.username] || { credits: 0, role: user.role || 'user' };
    return toAccountRecord(user, account, new Date().toISOString());
  }

  async findByActor(actorContext) {
    const actor = assertActorContext(actorContext);
    return this.findByUserId(actor.userId);
  }

  async updateBalance(userId, deltaCredits, operationType, metadata = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const amount = Number(deltaCredits);
    if (!Number.isFinite(amount) || amount === 0) {
      throw new RepositoryContractError('invalid_credit_amount', 'Credit amount must be a non-zero finite number.');
    }
    if (!CREDIT_OPERATIONS.has(operationType)) {
      throw new RepositoryContractError('invalid_credit_operation', 'Credit operation type is invalid.');
    }
    const isPrivileged = PRIVILEGED_ROLES.has(actor.role);
    if (actor.userId !== userId && !isPrivileged) {
      throw new RepositoryContractError('credit_account_forbidden', 'Credit account access is not allowed.', 403);
    }
    if (operationType !== 'generation_charge' && !isPrivileged) {
      throw new RepositoryContractError('credit_operation_forbidden', 'This credit operation requires an elevated role.', 403);
    }
    if (operationType === 'generation_charge' && amount >= 0) {
      throw new RepositoryContractError('invalid_credit_amount', 'Generation charges must deduct credits.');
    }
    if (['generation_refund', 'lost_job_refund', 'recharge'].includes(operationType) && amount <= 0) {
      throw new RepositoryContractError('invalid_credit_amount', 'Refunds and recharges must add credits.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new RepositoryContractError('user_not_found', 'Target user account not found.', 404);
    }

    const now = new Date().toISOString();
    return mutateJsonFile(this.databaseFile, DB_FALLBACK, async data => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new TypeError('Credit database must be an object.');
      }
      if (!data.users) data.users = {};
      if (!Array.isArray(data.creditLedger)) data.creditLedger = [];

      const requestId = typeof metadata.requestId === 'string' ? metadata.requestId.trim() : '';
      const duplicate = requestId
        ? data.creditLedger.find(entry => entry.userId === userId && entry.requestId === requestId)
        : null;
      if (duplicate) {
        const duplicateAccount = data.users[user.username] || {};
        return toAccountRecord(user, duplicateAccount, duplicate.createdAt || now);
      }

      const current = data.users[user.username] || { credits: 0, role: user.role || 'user' };
      const previousBalance = Number(current.credits || 0);
      if (!Number.isFinite(previousBalance)) {
        throw new RepositoryContractError('invalid_credit_balance', 'Stored credit balance is invalid.', 500);
      }
      const newBalance = previousBalance + amount;

      if (newBalance < 0) {
        throw new RepositoryContractError('insufficient_credits', 'Insufficient credit balance for this operation.', 402);
      }

      current.credits = newBalance;
      current.updatedAt = now;
      if (amount < 0) {
        current.lifetimeSpentCredits = (Number(current.lifetimeSpentCredits) || 0) + Math.abs(amount);
      } else if (operationType === 'recharge') {
        current.lifetimePurchasedCredits = (Number(current.lifetimePurchasedCredits) || 0) + amount;
      }

      data.users[user.username] = current;

      const ledgerEntry = {
        id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId: user.id,
        username: user.username,
        operationType,
        amountCredits: amount,
        balanceAfter: newBalance,
        relatedJobId: metadata.jobId || null,
        relatedTemplateId: metadata.templateId || null,
        relatedPostId: metadata.postId || null,
        providerId: metadata.providerId || null,
        modelId: metadata.modelId || null,
        pricingPolicyVersion: metadata.pricingPolicyVersion || '1.0',
        reason: metadata.reason || null,
        requestId: requestId || null,
        createdAt: now,
        metadata: metadata.extra && typeof metadata.extra === 'object' ? structuredClone(metadata.extra) : {}
      };
      data.creditLedger.push(ledgerEntry);

      return toAccountRecord(user, current, now);
    });
  }
}

function toAccountRecord(user, account, updatedAt) {
  return {
    userId: user.id,
    username: user.username,
    availableCredits: Number(account.credits || 0),
    reservedCredits: Number(account.reservedCredits || 0),
    lifetimePurchasedCredits: Number(account.lifetimePurchasedCredits || 0),
    lifetimeSpentCredits: Number(account.lifetimeSpentCredits || 0),
    updatedAt: account.updatedAt || updatedAt,
    metadata: account.metadata && typeof account.metadata === 'object'
      ? structuredClone(account.metadata)
      : {}
  };
}

export const creditAccountRepo = new CreditAccountRepository();
