import { HistoryCursorError } from '../../repositories/generation/HistoryRepository.js';

export function registerHistoryRoutes(app, {
  historyRepository,
  queueManager,
  collectionManager,
  comparisonOrchestrator,
  resolveRequestUsername
}) {
  app.get('/api/history', async (req, res) => {
    try {
      const collectionId = req.query.collectionId || 'all';
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
        username
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
    if (!item) return res.status(404).json({ error: 'History entry not found' });
    if ((item.username || 'user_demo') !== username) {
      return res.status(404).json({ error: 'History entry not found' });
    }
    return res.json(item);
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
