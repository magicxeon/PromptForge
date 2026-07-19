import { compileGenerationContext, createQueueOptions } from '../../domain/generation/generationRequestService.js';

export function registerGenerationRoutes(app, {
  providerRegistry,
  queueManager,
  creditManager,
  resolveRequestUsername
}) {
  app.post('/api/generate', async (req, res) => {
    const { provider, submodel } = req.body;

    try {
      const targetUser = resolveRequestUsername(req, { allowQuery: false });
      const { provider: providerConfig, model: modelConfig } = providerRegistry.resolveSelection(provider, submodel);
      const activeProvider = providerConfig.id;
      const activeSubmodel = modelConfig.id;
      const creditCost = Number(modelConfig.creditCost || 1);

      await creditManager.assertBalance(targetUser, creditCost);
      const { context, compiledPrompt } = compileGenerationContext({ ...req.body, userRole: req.userRole });
      providerRegistry.validateRequest(modelConfig, {
        aspectRatio: context.aspectRatio,
        referenceCount: context.referenceCount,
        imageResolution: context.imageResolution || modelConfig.defaults?.resolution || null
      });

      const stream = providerRegistry.shouldStream(providerConfig, modelConfig, req.body.stream !== false);

      console.log(`[API Generate] Enqueueing Job. Provider: ${activeProvider}, Model: ${activeSubmodel}, User: ${targetUser}, Stream: ${stream}`);

      const jobId = queueManager.enqueue(activeProvider, activeSubmodel, compiledPrompt, createQueueOptions(context, {
        username: targetUser,
        stream,
        modelConfig,
        providerConfigVersion: providerRegistry.getConfigVersion(),
        creditCost
      }));

      res.json({
        jobId,
        status: 'queued',
        providerStreaming: stream
      });
    } catch (error) {
      console.error('Generation enqueuing error:', error);
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  app.get('/api/jobs/:id', async (req, res) => {
    const username = resolveRequestUsername(req, { allowBody: false });
    const status = await queueManager.getJobStatusForUser(req.params.id, username);
    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.json(status);
  });

  app.get('/api/jobs/:id/stream', (req, res) => {
    const jobId = req.params.id;
    const username = resolveRequestUsername(req, { allowBody: false });
    const success = queueManager.addListener(jobId, res, username);
    if (!success) {
      return res.status(404).json({ error: 'Job not found or closed' });
    }

    req.on('close', () => {
      queueManager.removeListener(jobId, res);
    });
  });
}
