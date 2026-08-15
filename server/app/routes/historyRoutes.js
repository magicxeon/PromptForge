import {
  HistoryCursorError,
  isCustomerVisibleHistoryItem
} from '../../repositories/generation/HistoryRepository.js';
import {
  HISTORY_REFERENCE_ROLES,
  isHistoryEligibleForReferenceRole
} from '../../domain/generation/historyReferenceEligibility.js';

export function registerHistoryRoutes(app, {
  historyRepository,
  queueManager,
  collectionManager,
  comparisonOrchestrator,
  resolveRequestUsername,
  imagePresentationService
}) {
  app.get('/api/history', async (req, res) => {
    try {
      const collectionId = req.query.collectionId || 'all';
      const referenceRole = req.query.referenceRole || null;
      if (referenceRole && !HISTORY_REFERENCE_ROLES.has(referenceRole)) {
        return res.status(400).json({
          error: { code: 'invalid_history_reference_role', message: 'History reference role is invalid.' }
        });
      }
      const username = resolveRequestUsername(req, { allowBody: false });
      let allowedJobIds = null;
      if (collectionId !== 'all') {
        const collections = await collectionManager.list(username);
        const collection = collections.collections.find(item => item.id === collectionId);
        if (!collection) return res.status(404).json({ error: 'Collection not found' });
        allowedJobIds = new Set(collection.jobIds);
      }
      res.json(await historyRepository.listPage({
        cursor: req.query.cursor || null,
        limit: req.query.limit,
        collectionId,
        allowedJobIds,
        username,
        filterKey: referenceRole ? `reference:${referenceRole}` : null,
        itemFilter: referenceRole
          ? item => isHistoryEligibleForReferenceRole(item, referenceRole)
          : null
      }));
    } catch (error) {
      if (error instanceof HistoryCursorError) {
        return res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      }
      console.error('[History] Pagination failed:', error);
      return res.status(500).json({ error: 'Could not load image history.' });
    }
  });

  app.get('/api/history/:id', async (req, res) => {
    const username = resolveRequestUsername(req, { allowBody: false });
    const item = await historyRepository.getById(req.params.id);
    if (!item || !isCustomerVisibleHistoryItem(item)) {
      return res.status(404).json({ error: 'History entry not found' });
    }
    if ((item.username || 'user_demo') !== username) {
      return res.status(404).json({ error: 'History entry not found' });
    }
    return res.json(item);
  });

  app.get('/api/history/:id/presentations/:profileId', async (req, res) => {
    try {
      const item = await historyRepository.getById(req.params.id);
      if (
        !item
        || !isCustomerVisibleHistoryItem(item)
        || !isHistoryOwnedByActor(item, req.actorContext)
      ) {
        return res.status(404).json({
          error: {
            code: 'history_entry_not_found',
            message: 'History entry not found.'
          }
        });
      }
      const presentation = await imagePresentationService.renderOutputUrl(
        item.thumbnailUrl || item.imageUrl,
        req.params.profileId
      );
      return sendPresentation(req, res, presentation);
    } catch (error) {
      return res.status(error.statusCode || 404).json({
        error: {
          code: error.code || 'history_presentation_unavailable',
          message: error.message || 'History presentation is unavailable.'
        }
      });
    }
  });

  app.delete('/api/history/:id', async (req, res) => {
    const username = resolveRequestUsername(req, { allowBody: false });
    const success = await queueManager.deleteHistoryEntryForUser(req.params.id, username);
    if (!success) {
      return res.status(404).json({ error: 'History entry not found' });
    }
    await comparisonOrchestrator.removeHistoryJob(req.params.id);
    return res.json({ success: true });
  });
}

function isHistoryOwnedByActor(item, actor) {
  if (item.ownerUserId && actor?.userId) return item.ownerUserId === actor.userId;
  const username = item.ownerUsername || item.username || 'user_demo';
  return Boolean(actor?.username && username === actor.username);
}

function sendPresentation(req, res, presentation) {
  if (req.headers?.['if-none-match'] === presentation.etag) {
    return res.status(304).end();
  }
  res.setHeader('Content-Type', presentation.contentType);
  res.setHeader('Content-Length', String(presentation.contentLength));
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('ETag', presentation.etag);
  return res.send(presentation.buffer);
}
