import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';

export class MockUserRepository {
  constructor({ usersFile = resolveDataFile('mockUsers') } = {}) {
    this.usersFile = usersFile;
  }

  async readAll() {
    const users = await readJsonFile(this.usersFile, []);
    return Array.isArray(users) ? users.map(user => structuredClone(user)) : [];
  }

  async listActiveUsers() {
    const all = await this.readAll();
    return all.filter(u => u.status === 'active');
  }

  async findById(userId) {
    const all = await this.readAll();
    return all.find(u => u.id === userId) || null;
  }

  async findByUsername(username) {
    const all = await this.readAll();
    return all.find(u => u.username === username) || null;
  }

  async updateStatus(userId, { status, expectedStatus, idempotencyKey }) {
    return mutateJsonFile(this.usersFile, [], users => {
      if (!Array.isArray(users)) throw new TypeError('Mock users data must be an array.');
      const user = users.find(item => item.id === userId);
      if (!user) throw userError('admin_user_not_found', 'User not found.', 404);
      if (user.lastAdminStatusCommand?.idempotencyKey === idempotencyKey) {
        return { user: structuredClone(user), duplicate: true };
      }
      if (expectedStatus && user.status !== expectedStatus) {
        throw userError('admin_user_status_conflict', 'User status changed in another session.', 409);
      }
      const previousStatus = user.status;
      user.status = status;
      user.updatedAt = new Date().toISOString();
      user.lastAdminStatusCommand = { idempotencyKey, previousStatus, status, appliedAt: user.updatedAt };
      return { user: structuredClone(user), duplicate: false, previousStatus };
    });
  }

  toActorContext(mockUser, requestId = null) {
    if (!mockUser) return null;
    return {
      userId: mockUser.id,
      username: mockUser.username,
      displayName: mockUser.displayName,
      role: mockUser.role,
      activeCreatorProfileId: mockUser.activeCreatorProfileId,
      isMockActor: true,
      authProvider: 'mock',
      requestId: requestId || 'req_' + Math.random().toString(36).substring(2, 9),
      originalRequesterUserId: null
    };
  }
}

function userError(code, message, statusCode) { return Object.assign(new Error(message), { code, statusCode }); }

export const mockUserRepo = new MockUserRepository();
