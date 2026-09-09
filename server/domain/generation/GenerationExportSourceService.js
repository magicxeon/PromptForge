import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { isCustomerVisibleHistoryItem } from '../../repositories/generation/HistoryRepository.js';

export class GenerationExportSourceService {
  constructor({ repository = generationResultRepo } = {}) { this.repository = repository; }
  async getOwnedImage(id, actor) {
    if (!actor?.userId) throw Object.assign(new Error('Actor required.'), { statusCode: 401, code: 'actor_required' });
    const item = await this.repository.findByIdForOwner(id, actor.userId);
    if (!item || item.deletedAt || item.status !== 'completed' || !isCustomerVisibleHistoryItem(item)
      || item.mediaType === 'video' || !item.imageUrl) {
      throw Object.assign(new Error('Export source unavailable.'), { statusCode: 404, code: 'export_source_unavailable' });
    }
    return { id: item.id, imageUrl: item.imageUrl, width: item.width, height: item.height,
      lookSheetSnapshot: item.lookSheetSnapshot || null, model: item.submodel || '',
      comparisonSetId: item.comparisonSetId, comparisonRunId: item.comparisonRunId };
  }
}
