import { compileGenerationContext, createQueueOptions } from '../../domain/generation/generationRequestService.js';
import { creditReservationService } from '../../domain/credits/CreditReservationService.js';

export function registerGenerationRoutes(app, {
  providerRegistry,
  queueManager,
  resolveRequestUsername
}) {
  app.post('/api/generate', async (req, res) => {
    const { provider, submodel, estimateId, requestId } = req.body;

    try {
      const payerUserId = req.actorContext?.userId || resolveRequestUsername(req, { allowQuery: false });
      const payerUsername = req.actorContext?.username || resolveRequestUsername(req, { allowQuery: false });
      const { provider: providerConfig, model: modelConfig } = providerRegistry.resolveSelection(provider, submodel);
      const activeProvider = providerConfig.id;
      const activeSubmodel = modelConfig.id;

      const { context, compiledPrompt } = compileGenerationContext(
        { ...req.body, userRole: req.userRole },
        req.actorContext
      );

      providerRegistry.validateRequest(modelConfig, {
        aspectRatio: context.aspectRatio,
        referenceCount: context.referenceCount,
        imageResolution: context.imageResolution || modelConfig.defaults?.resolution || null
      });

      // Credit estimate verification & reservation
      const reqId = requestId || req.requestId;
      const jobId = queueManager.createJobId();
      const reservationResult = await creditReservationService.validateAndReserveForRequest({
        userId: payerUserId,
        estimateId,
        generationRequest: {
          requestedProviderId: activeProvider,
          requestedModelId: activeSubmodel,
          resolution: context.imageResolution || modelConfig.defaults?.resolution || '1K',
          aspectRatio: context.aspectRatio,
          quality: req.body.quality || null,
          referenceCount: context.referenceCount,
          outputCount: Number(req.body.outputCount || 1),
          routingMode: req.body.routingMode || 'advanced',
          qualityTier: req.body.qualityTier || 'standard',
          generationMode: req.body.generationMode
            || (context.generationSurface === 'playground' ? 'playground' : req.body.mode || 'scene'),
          requestId: reqId
        },
        metadata: {
          requestId: reqId,
          jobId,
          relatedTemplateId: context.sceneTemplateSnapshot?.id || null
        }
      });

      const stream = providerRegistry.shouldStream(providerConfig, modelConfig, req.body.stream !== false);

      console.log(`[API Generate] Enqueueing Job. Provider: ${activeProvider}, Model: ${activeSubmodel}, Payer: ${payerUserId}, Stream: ${stream}, Reservation: ${reservationResult.reservation.reservationId}`);

      try {
        queueManager.enqueue(activeProvider, activeSubmodel, compiledPrompt, createQueueOptions(context, {
          jobId,
          username: payerUsername,
          stream,
          modelConfig,
          providerConfigVersion: providerRegistry.getConfigVersion(),
          reservationId: reservationResult.reservation.reservationId,
          pricingSnapshot: reservationResult.reservation.pricingSnapshot,
          payerUserId,
          estimateId: reservationResult.estimate?.estimateId || null,
          requestId: reqId
        }));
      } catch (enqueueErr) {
        // Immediate refund if enqueue fails after reserve
        await creditReservationService.refundForJob({
          userId: payerUserId,
          reservationId: reservationResult.reservation.reservationId,
          reasonCode: 'enqueue_failed'
        }).catch(err => console.error('[API Generate] Immediate refund failed:', err.message));
        throw enqueueErr;
      }

      res.json({
        jobId,
        status: 'queued',
        providerStreaming: stream,
        reservation: {
          reservationId: reservationResult.reservation.reservationId,
          amountCredits: reservationResult.reservation.amountCredits
        }
      });
    } catch (error) {
      console.error('Generation enqueuing error:', error);
      if (error.toJSON) {
        res.status(error.statusCode || 400).json(error.toJSON());
      } else {
        res.status(error.statusCode || 500).json({ error: error.message });
      }
    }
  });

  app.get('/api/jobs/:id', async (req, res) => {
    const username = resolveRequestUsername(req, { allowBody: false });
    const status = await queueManager.getJobStatusForUser(req.params.id, username);
    if (!status) {
      const knownStatus = await queueManager.getJobStatus(req.params.id);
      console.warn(
        `[Jobs] Status unavailable for ${req.params.id}: ${knownStatus ? 'owner mismatch' : 'job missing'} (requester: ${username})`
      );
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
