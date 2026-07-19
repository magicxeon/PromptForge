import { sendComparisonError } from '../routeErrors.js';

export function registerComparisonRoutes(app, { comparisonOrchestrator, resolveRequestUsername }) {
  const getComparisonUsername = req => resolveRequestUsername(req);

  app.post('/api/comparisons/estimate', async (req, res) => {
    try {
      res.json(await comparisonOrchestrator.estimate({ ...req.body, userRole: req.userRole }, getComparisonUsername(req)));
    } catch (error) {
      sendComparisonError(res, error);
    }
  });

  app.post('/api/comparisons', async (req, res) => {
    try {
      const result = await comparisonOrchestrator.create({ ...req.body, userRole: req.userRole }, getComparisonUsername(req));
      res.status(result.idempotentReplay ? 200 : 201).json(result);
    } catch (error) {
      sendComparisonError(res, error);
    }
  });

  app.get('/api/comparisons', async (req, res) => {
    try {
      res.json(await comparisonOrchestrator.list(getComparisonUsername(req), req.query));
    } catch (error) {
      sendComparisonError(res, error);
    }
  });

  app.get('/api/comparisons/:setId', async (req, res) => {
    try {
      res.json(await comparisonOrchestrator.get(req.params.setId, getComparisonUsername(req)));
    } catch (error) {
      sendComparisonError(res, error);
    }
  });

  app.patch('/api/comparisons/:setId', async (req, res) => {
    try {
      res.json(await comparisonOrchestrator.update(req.params.setId, getComparisonUsername(req), req.body));
    } catch (error) {
      sendComparisonError(res, error);
    }
  });

  app.patch('/api/comparisons/:setId/winner', async (req, res) => {
    try {
      res.json(await comparisonOrchestrator.setWinner(
        req.params.setId,
        getComparisonUsername(req),
        req.body.jobId
      ));
    } catch (error) {
      sendComparisonError(res, error);
    }
  });

  app.delete('/api/comparisons/:setId', async (req, res) => {
    try {
      res.json(await comparisonOrchestrator.remove(req.params.setId, getComparisonUsername(req)));
    } catch (error) {
      sendComparisonError(res, error);
    }
  });
}
