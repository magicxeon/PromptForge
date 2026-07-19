import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveDataFile } from './config/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class HistoryCursorError extends Error {
  constructor(message) {
    super(message);
    this.name = 'HistoryCursorError';
    this.statusCode = 400;
    this.code = 'invalid_history_cursor';
  }
}

export class HistoryRepository {
  constructor({
    historyFile = resolveDataFile('history'),
    cursorSecret = process.env.HISTORY_CURSOR_SECRET || 'local-history-cursor'
  } = {}) {
    this.historyFile = historyFile;
    this.cursorSecret = cursorSecret;
  }

  async readAll() {
    try {
      const raw = await fs.readFile(this.historyFile, 'utf8');
      const history = JSON.parse(raw);
      return Array.isArray(history) ? history : [];
    } catch {
      return [];
    }
  }

  async getById(jobId) {
    return (await this.readAll()).find(item => item.id === jobId) || null;
  }

  async listPage({ cursor = null, limit = 24, collectionId = 'all', allowedJobIds = null, username = null } = {}) {
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 24));
    const scope = JSON.stringify({ collectionId: collectionId || 'all', username: username || 'all' });
    const decodedCursor = cursor ? this.decodeCursor(cursor, scope) : null;
    let items = await this.readAll();
    if (username) {
      items = items.filter(item => {
        if (!item.username) return username === 'user_demo';
        return item.username === username;
      });
    }
    if (allowedJobIds instanceof Set) items = items.filter(item => allowedJobIds.has(item.id));
    items.sort(compareHistoryItems);
    if (decodedCursor) {
      items = items.filter(item => compareHistoryItems(item, decodedCursor) > 0);
    }
    const pageItems = items.slice(0, safeLimit);
    const hasMore = items.length > safeLimit;
    const lastItem = pageItems.at(-1);
    return {
      items: pageItems,
      nextCursor: hasMore && lastItem ? this.encodeCursor(lastItem, scope) : null,
      hasMore
    };
  }

  encodeCursor(item, scope) {
    const payload = Buffer.from(JSON.stringify({
      timestamp: Number(item.timestamp || 0),
      id: item.id,
      scope
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', this.cursorSecret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  decodeCursor(cursor, scope) {
    try {
      const [payload, signature] = String(cursor).split('.');
      if (!payload || !signature) throw new Error('Malformed cursor');
      const expected = crypto.createHmac('sha256', this.cursorSecret).update(payload).digest('base64url');
      const actualBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);
      if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
        throw new Error('Invalid signature');
      }
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (decoded.scope !== scope || typeof decoded.id !== 'string') throw new Error('Cursor scope changed');
      return decoded;
    } catch {
      throw new HistoryCursorError('History cursor is invalid for the current view.');
    }
  }
}

function compareHistoryItems(a, b) {
  const timestampDifference = Number(b.timestamp || 0) - Number(a.timestamp || 0);
  if (timestampDifference !== 0) return timestampDifference;
  return String(b.id || '').localeCompare(String(a.id || ''));
}

export const historyRepository = new HistoryRepository();
