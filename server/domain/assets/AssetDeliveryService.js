import path from 'node:path';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { GenerationExportSourceService } from '../generation/GenerationExportSourceService.js';

const unavailable = () => Object.assign(new Error('Output unavailable.'), { code: 'output_unavailable', statusCode: 404 });
const contained = (root, file) => {
  const relative = path.relative(root, file);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
};

export function validatePrivateOutputUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/outputs/')) throw unavailable();
  const key = value.slice('/outputs/'.length);
  // URLs produced by the owning storage modules are already canonical paths.
  // Reject encoded separators/dot aliases rather than normalizing them to authority.
  if (!key || /[%\\\x00-\x1f\x7f?#:]/.test(key)
    || key.split('/').some(segment => !segment || segment === '.' || segment === '..'
      || segment.endsWith('.') || segment.endsWith(' '))) throw unavailable();
  return key;
}

export class AssetDeliveryService {
  constructor({ outputsDirectory = OUTPUTS_DIR, assetRepository = assetRepo,
    generationSources = new GenerationExportSourceService() } = {}) {
    this.outputsDirectory = outputsDirectory;
    this.assetRepository = assetRepository;
    this.generationSources = generationSources;
  }

  async authorize(outputUrl, actor) {
    if (!actor?.userId) throw Object.assign(new Error('Authentication required.'), { code: 'auth_session_expired', statusCode: 401 });
    const asset = await this.assetRepository.findOutputByUrlForOwner(outputUrl, actor.userId);
    if (asset) return { id: asset.id, ownerUserId: actor.userId };
    const generation = await this.generationSources.getOwnedOutputByUrl(outputUrl, actor);
    if (!generation) throw unavailable();
    return generation;
  }

  async openOwnedOutput({ outputUrl, actor, reauthorize }) {
    const key = validatePrivateOutputUrl(outputUrl);
    if (typeof reauthorize !== 'function') throw Object.assign(new Error('Authentication required.'), {
      code: 'auth_session_expired', statusCode: 401,
    });
    await this.authorize(outputUrl, actor);
    let handle;
    try {
      const root = await fs.realpath(this.outputsDirectory);
      const candidate = path.resolve(root, ...key.split('/'));
      if (!contained(root, candidate)) throw unavailable();
      const resolved = await fs.realpath(candidate);
      if (!contained(root, resolved)) throw unavailable();
      // A pinned descriptor prevents a later path rename from changing delivered bytes.
      handle = await fs.open(resolved, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      const stat = await handle.stat();
      const currentPath = await fs.realpath(candidate);
      const currentStat = await fs.stat(currentPath);
      if (!stat.isFile() || !contained(root, currentPath) || currentPath !== resolved
        || currentStat.dev !== stat.dev || currentStat.ino !== stat.ino) throw unavailable();
      const verifyActor = async () => {
        const current = await reauthorize();
        if (!current || current.userId !== actor.userId) throw Object.assign(new Error('Authentication required.'), {
          code: 'auth_session_expired', statusCode: 401,
        });
        return current;
      };
      const current = await verifyActor();
      await this.authorize(outputUrl, current);
      await verifyActor();
      return { handle, stat, extension: path.extname(key).toLowerCase(), reauthorize: verifyActor };
    } catch (error) {
      await handle?.close().catch(() => {});
      if (error.code === 'auth_session_expired') throw error;
      if (error.code === 'output_unavailable') throw error;
      if (['ENOENT', 'ENOTDIR', 'ELOOP', 'EACCES', 'EPERM'].includes(error.code)) throw unavailable();
      throw error;
    }
  }
}
