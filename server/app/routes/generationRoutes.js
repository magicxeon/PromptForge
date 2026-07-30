import {
  compileGenerationContext,
  compilePromptFromGenerationContext,
  createQueueOptions
} from '../../domain/generation/generationRequestService.js';
import { creditReservationService } from '../../domain/credits/CreditReservationService.js';
import { characterCastingExportService } from '../../domain/character-profiles/CharacterCastingExportService.js';
import { prepareGenerationReferences } from '../../domain/generation/prepareGenerationReferences.js';

export function registerGenerationRoutes(app, {
  providerRegistry,
  queueManager,
  resolveRequestUsername,
  templateCoreService
}) {
  app.post('/api/generate', async (req, res) => {
    const { provider, submodel, estimateId, requestId } = req.body;

    try {
      const payerUserId = req.actorContext?.userId || resolveRequestUsername(req, { allowQuery: false });
      const payerUsername = req.actorContext?.username || resolveRequestUsername(req, { allowQuery: false });
      const { provider: providerConfig, model: modelConfig } = providerRegistry.resolveSelection(provider, submodel);
      const activeProvider = providerConfig.id;
      const activeSubmodel = modelConfig.id;

      const templateExecution = req.body.templateUseSessionId
        ? await templateCoreService.resolveSession(
          req.body.templateUseSessionId,
          req.actorContext,
          req.body.templateReplacements || {}
        )
        : null;
      const requestPayload = templateExecution
        ? {
          ...req.body,
          sceneTemplateSnapshot: templateExecution.executionSnapshot,
          selections: templateExecution.executionSnapshot.structuredSelectionsSnapshot || {},
          additionalDirection:
            templateExecution.executionSnapshot.additionalDirectionSnapshot || '',
          sceneBuilder: {
            ...(req.body.sceneBuilder || {}),
            authoringMode: templateExecution.executionSnapshot.authoringMode || 'guided',
            manualPromptText: templateExecution.executionSnapshot.manualPromptSnapshot
              || templateExecution.executionSnapshot.finalPromptSnapshot
              || ''
          },
          templateBaselineReference: templateExecution.baselineReference?.imageUrl || null,
          authorizedTemplateReferenceJobIds:
            templateExecution.baselineReference?.sourceGenerationId
              ? [templateExecution.baselineReference.sourceGenerationId]
              : [],
          userRole: req.userRole
        }
        : { ...req.body, userRole: req.userRole };
      const { context } = compileGenerationContext(
        requestPayload,
        req.actorContext
      );
      await characterCastingExportService.validateGenerationContext(
        context.characterProfileContext,
        req.actorContext
      );
      await prepareGenerationReferences(context, {
        actorContext: req.actorContext,
        providerId: activeProvider,
        modelId: activeSubmodel,
        modelConfig
      });
      const compiledPrompt = compilePromptFromGenerationContext(context);

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
          referenceProcessingPlanFingerprint:
            context.referenceProcessing?.planFingerprint || null,
          outputCount: context.outputCount,
          routingMode: req.body.routingMode || 'advanced',
          qualityTier: req.body.qualityTier || 'standard',
          generationMode: req.body.generationMode
            || (context.generationSurface === 'playground' ? 'playground' : req.body.mode || 'scene'),
          templateUseSessionId: req.body.templateUseSessionId || null,
          requestId: reqId
        },
        metadata: {
          requestId: reqId,
          jobId,
          relatedTemplateId: templateExecution?.template.id || context.sceneTemplateSnapshot?.id || null,
          templateVersionId: templateExecution?.version.id || null,
          templateUseSessionId: templateExecution?.session.id || null,
          sourceCommunityPostId: templateExecution?.session.sourceCommunityPostId || null
        }
      });

      const stream = providerRegistry.shouldStream(providerConfig, modelConfig, req.body.stream !== false);

      console.log(`[API Generate] Enqueueing Job. Provider: ${activeProvider}, Model: ${activeSubmodel}, Payer: ${payerUserId}, Stream: ${stream}, Reservation: ${reservationResult.reservation.reservationId}`);

      try {
        if (templateExecution) {
          await templateCoreService.attachGeneration(
            templateExecution.session.id,
            req.actorContext,
            jobId
          );
        }
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
          requestId: reqId,
          templateUseContext: templateExecution
            ? {
              templateId: templateExecution.template.id,
              templateVersionId: templateExecution.version.id,
              templateTitle: templateExecution.template.title,
              templateOwnerUsername: templateExecution.template.ownerUsername,
              templateUseSessionId: templateExecution.session.id,
              sourceCommunityPostId: templateExecution.session.sourceCommunityPostId,
              replacementSummary: templateExecution.replacementSummary
            }
            : null
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
        res.status(error.statusCode || 500).json({
          error: error.message,
          ...(error.code ? { code: error.code } : {})
        });
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
