import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, 'mockUsers.json');

export class MockUserRepository {
  async readAll() {
    try {
      const data = await fs.readFile(USERS_FILE, 'utf8');
      return JSON.parse(data) || [];
    } catch (err) {
      console.error('[MockUserRepository] Failed to read mockUsers.json:', err);
      return [];
    }
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
