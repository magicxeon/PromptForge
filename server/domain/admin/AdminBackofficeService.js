import { mockUserRepo } from '../../repositories/identity/MockUserRepository.js';
import { historyRepository } from '../../repositories/generation/HistoryRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { creditAccountRepo } from '../../repositories/credits/CreditAccountRepository.js';
import { creditLedgerRepo } from '../../repositories/credits/CreditLedgerRepository.js';
import { auditLogRepo } from '../../repositories/audit/AuditLogRepository.js';
import { adminPolicyService } from './AdminPolicyService.js';

export class AdminBackofficeService {
  constructor({
    userRepository = mockUserRepo,
    historyRepo = historyRepository,
    postRepository = communityPostRepo,
    accountRepository = creditAccountRepo,
    ledgerRepository = creditLedgerRepo,
    auditRepository = auditLogRepo,
    policy = adminPolicyService
  } = {}) {
    this.userRepository = userRepository;
    this.historyRepo = historyRepo;
    this.postRepository = postRepository;
    this.accountRepository = accountRepository;
    this.ledgerRepository = ledgerRepository;
    this.auditRepository = auditRepository;
    this.policy = policy;
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

  async listGenerationJobs(query, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    return this.historyRepo.listPage({ cursor: query.cursor || null, limit: query.limit || 24, collectionId: 'all' });
  }

  async listCommunityPosts(query, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    return this.postRepository.listForBackoffice(query);
  }

  async getCreditLedger(userId, query, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    return this.ledgerRepository.findByUserId(userId, query);
  }

  async listAuditEvents(query, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    return this.auditRepository.listForBackoffice(query);
  }

  async getOverview(actorContext) {
    const [users, history, posts, auditEvents] = await Promise.all([
      this.listUsers(actorContext),
      this.historyRepo.readAll(),
      this.listCommunityPosts({ limit: 1 }, actorContext),
      this.listAuditEvents({ limit: 1 }, actorContext)
    ]);
    return {
      users: { total: users.length, active: users.filter(user => user.status === 'active').length },
      generationJobs: { totalApprox: history.length },
      communityPosts: { totalApprox: posts.totalApprox ?? posts.items.length },
      auditEvents: { totalApprox: auditEvents.totalApprox ?? auditEvents.items.length }
    };
  }
}

export const adminBackofficeService = new AdminBackofficeService();
