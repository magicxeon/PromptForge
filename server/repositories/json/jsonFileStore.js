import { promises as fs } from 'fs';
import path from 'path';

export async function ensureJsonFile(filePath, fallbackValue) {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeJsonFileAtomic(filePath, fallbackValue);
  }
}

export async function readJsonFile(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return structuredClone(fallbackValue);
    throw error;
  }
}

export async function writeJsonFileAtomic(filePath, data, options = {}) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });

  const tempPath = path.join(
    directory,
    `.${path.basename(filePath)}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );

  try {
    const content = `${JSON.stringify(data, null, 2)}\n`;
    await fs.writeFile(tempPath, content, 'utf8');
  } catch (err) {
    await fs.unlink(tempPath).catch(() => {});
    throw err;
  }

  const attempts = options.attempts || 8;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await fs.rename(tempPath, filePath);
      return;
    } catch (err) {
      const isRetryable = ['EPERM', 'EBUSY'].includes(err.code);
      if (!isRetryable || attempt === attempts - 1) {
        await fs.unlink(tempPath).catch(() => {});
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 35 * (attempt + 1)));
    }
  }
}

// Map of active mutation chains per file path to prevent race conditions
const fileMutexes = new Map();

export async function mutateJsonFile(filePath, fallbackValue, operation) {
  let chain = fileMutexes.get(filePath) || Promise.resolve();

  const mutation = chain.then(async () => {
    await ensureJsonFile(filePath, fallbackValue);
    const data = await readJsonFile(filePath, fallbackValue);
    const result = await operation(data);
    await writeJsonFileAtomic(filePath, data);
    return result;
  });

  fileMutexes.set(filePath, mutation.catch(() => {}));
  return mutation;
}
