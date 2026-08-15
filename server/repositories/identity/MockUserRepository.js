import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile } from '../json/jsonFileStore.js';

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

export const mockUserRepo = new MockUserRepository();
