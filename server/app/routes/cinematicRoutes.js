import { CinematicError } from '../../domain/cinematic/CinematicApplicationService.js';
import { normalizeCinematicCastReferences } from '../../domain/cinematic/CinematicImageCastReferences.js';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';

export function registerCinematicRoutes(app, {
  cinematicService,
  generationApplicationService
}) {
  app.get('/api/cinematic/video-capabilities', async (_req, res) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      const catalog = cinematicService.getVideoCapabilities();
      res.json({
        ...catalog,
        mediaType: 'video',
        comparison: { enabled: false, minimumSlots: 2, maximumSlots: 2 },
        launchStatus: catalog.models.length ? 'available' : 'qualification_blocked'
      });
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.get('/api/cinematic/authoring-manifest', async (_req, res) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      res.json(cinematicService.getAuthoringManifest());
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.get('/api/cinematic/projects', async (req, res) => {
    try {
      res.json(await cinematicService.listProjects(req.actorContext, req.query));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.get('/api/cinematic/projects/:projectId/series', async (req, res) => {
    try { res.set('Cache-Control', 'private, no-store').json(await cinematicService.getSeriesWorkspace(req.params.projectId, req.actorContext)); }
    catch (error) { sendCinematicError(res, error); }
  });
  app.post('/api/cinematic/projects/:projectId/series', async (req, res) => {
    try { res.set('Cache-Control', 'private, no-store').status(201).json(await cinematicService.createSeries(req.params.projectId, req.body || {}, req.actorContext)); }
    catch (error) { sendCinematicError(res, error); }
  });
  app.patch('/api/cinematic/series/:seriesId', async (req, res) => {
    try { res.set('Cache-Control', 'private, no-store').json(await cinematicService.updateSeries(req.params.seriesId, req.body || {}, req.actorContext)); }
    catch (error) { sendCinematicError(res, error); }
  });
  app.post('/api/cinematic/series/:seriesId/seasons', async (req, res) => {
    try { res.set('Cache-Control', 'private, no-store').status(201).json(await cinematicService.addSeriesSeason(req.params.seriesId, req.body || {}, req.actorContext)); }
    catch (error) { sendCinematicError(res, error); }
  });
  app.post('/api/cinematic/series/:seriesId/chapters', async (req, res) => {
    try { res.set('Cache-Control', 'private, no-store').status(201).json(await cinematicService.addSeriesChapter(req.params.seriesId, req.body || {}, req.actorContext)); }
    catch (error) { sendCinematicError(res, error); }
  });

  app.get('/api/cinematic/projects/:projectId/clip-bundle', async (req, res) => {
    try {
      const { manifest } = await cinematicService.prepareClipBundle(req.params.projectId, {}, req.actorContext);
      res.set('Cache-Control', 'private, no-store').json(manifest);
    } catch (error) { sendCinematicError(res, error); }
  });
  app.post('/api/cinematic/projects/:projectId/clip-bundle', async (req, res) => {
    try {
      await cinematicService.downloadClipBundle(req.params.projectId, req.body || {}, req.actorContext, res, () => {
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename="momelo-selected-clips.zip"');
        res.set('Cache-Control', 'private, no-store');
      });
    } catch (error) {
      if (res.headersSent) res.destroy(); else sendCinematicError(res, error);
    }
  });

  app.post('/api/cinematic/projects', async (req, res) => {
    try {
      res.status(201).json(await cinematicService.createProject(req.body, req.actorContext));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.post('/api/cinematic/story-enhancements', async (req, res) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      res.json(await cinematicService.enhanceStory(req.body, req.actorContext));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.post('/api/cinematic/projects/:projectId/cast/:assignmentId/wardrobe-suggestion', async (req, res) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      res.json(await cinematicService.suggestWardrobe(
        req.params.projectId,
        req.params.assignmentId,
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.get('/api/cinematic/projects/:projectId', async (req, res) => {
    try {
      res.json(await cinematicService.getProject(req.params.projectId, req.actorContext));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.get('/api/cinematic/projects/:projectId/data-lineage', async (req, res) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      res.json(await cinematicService.getDataLineage(
        req.params.projectId,
        { sceneId: req.query.sceneId || null, shotId: req.query.shotId || null },
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.patch('/api/cinematic/projects/:projectId/setup', async (req, res) => {
    try {
      res.json(await cinematicService.updateSetup(req.params.projectId, req.body, req.actorContext));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.put('/api/cinematic/projects/:projectId/stage', async (req, res) => {
    try {
      res.json(await cinematicService.setActiveStage(
        req.params.projectId,
        req.body?.stage,
        req.body?.expectedVersion,
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.put('/api/cinematic/projects/:projectId/cast/:assignmentId', async (req, res) => {
    try {
      res.json(await cinematicService.upsertCastAssignment(req.params.projectId, {
        ...req.body,
        assignmentId: req.params.assignmentId
      }, req.actorContext));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.delete('/api/cinematic/projects/:projectId/cast/:assignmentId', async (req, res) => {
    try {
      res.json(await cinematicService.removeCastAssignment(
        req.params.projectId,
        req.params.assignmentId,
        req.body,
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.put('/api/cinematic/projects/:projectId/cast/:assignmentId/looks/:lookId', async (req, res) => {
    try {
      res.json(await cinematicService.upsertWardrobeLook(
        req.params.projectId,
        req.params.assignmentId,
        { ...req.body, lookId: req.params.lookId },
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.put('/api/cinematic/projects/:projectId/story-plan', async (req, res) => {
    try {
      res.json(await cinematicService.saveStoryPlan(req.params.projectId, req.body, req.actorContext));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.post('/api/cinematic/projects/:projectId/story-plan/proposals', async (req, res) => {
    if (acceptsEventStream(req) && typeof res.write === 'function') {
      return streamStoryPlanProposal({ req, res, cinematicService });
    }
    try {
      res.set('Cache-Control', 'private, no-store');
      res.json(await cinematicService.generateStoryPlan(
        req.params.projectId,
        req.body || {},
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.post('/api/cinematic/projects/:projectId/scenes/:sceneId/direction-proposals', async (req, res) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      res.json(await cinematicService.generateSceneDirection(
        req.params.projectId,
        req.params.sceneId,
        req.body || {},
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.put('/api/cinematic/projects/:projectId/shots/:shotId/storyboard-source', async (req, res) => {
    try {
      res.json(await cinematicService.approveStoryboardSource(
        req.params.projectId,
        req.params.shotId,
        req.body,
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.get('/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/storyboard-generation-context', async (req, res) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      res.json(await cinematicService.getStoryboardGenerationContext(
        req.params.projectId,
        req.params.sceneId,
        req.params.shotId,
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.post('/api/cinematic/projects/:projectId/storyboard-generation-batches', async (req, res) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      const project = await cinematicService.getProject(req.params.projectId, req.actorContext);
      const input = req.body || {};
      assertStoryboardBatchInput(project, input);
      const operations = [];
      for (const operation of input.operations) {
        const context = await cinematicService.getStoryboardGenerationContext(
          project.id,
          operation.sceneId,
          operation.shotId,
          req.actorContext
        );
        assertStoryboardBatchOperation(project, operation, context);
        operations.push({
          operationId: operation.operationId || operation.shotId,
          sceneId: operation.sceneId,
          shotId: operation.shotId,
          expectedShotVersion: operation.expectedShotVersion,
          estimateId: operation.estimateId,
          body: operation.generationRequest,
          metadata: {
            keyframeContractFingerprint: context.keyframeContract.sourceFingerprint
          }
        });
      }
      const result = await generationApplicationService.submitBatch({
        operations,
        actorContext: req.actorContext,
        userRole: req.userRole,
        requestId: input.idempotencyKey,
        generationSurface: 'cinematic',
        generationMode: 'scene',
        metadata: {
          projectId: project.id,
          projectVersion: project.version,
          operation: 'cinematic_storyboard_generate_all',
          keyframeContractFingerprints: operations.map(operation => (
            operation.metadata.keyframeContractFingerprint
          ))
        },
        beforeEnqueue: ({ groupId, children }) => cinematicService.registerStoryboardBatchAttempts(
          project.id,
          {
            batchId: groupId,
            expectedVersion: input.expectedVersion,
            children
          },
          req.actorContext
        )
      });
      res.status(202).json(result);
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.get('/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/produce-context', async (req, res) => {
    try {
      res.json(await cinematicService.getProduceShotContext(
        req.params.projectId,
        req.params.sceneId,
        req.params.shotId,
        req.actorContext,
        req.query.referenceMode
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.post('/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/video-quote', async (req, res) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      res.json(await cinematicService.quoteVideoAttempt(
        req.params.projectId, req.params.sceneId, req.params.shotId, req.body || {}, req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.post('/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/video-attempts', async (req, res) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      res.status(202).json(await cinematicService.createVideoAttempt(
        req.params.projectId, req.params.sceneId, req.params.shotId, req.body || {}, req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.post('/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/video-attempts/:attemptId/approve', async (req, res) => {
    try {
      res.json(await cinematicService.approveVideoAttempt(
        req.params.projectId, req.params.sceneId, req.params.shotId, req.params.attemptId,
        req.body || {}, req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.patch('/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId', async (req, res) => {
    try {
      res.json(await cinematicService.updateShotDirection(
        req.params.projectId,
        req.params.sceneId,
        req.params.shotId,
        req.body,
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.patch('/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/motion-direction', async (req, res) => {
    try {
      res.json(await cinematicService.updateShotMotionDirection(
        req.params.projectId,
        req.params.sceneId,
        req.params.shotId,
        req.body || {},
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.patch('/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/video-references', async (req, res) => {
    try {
      res.json(await cinematicService.updateShotVideoReferences(
        req.params.projectId, req.params.sceneId, req.params.shotId, req.body || {}, req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.put('/api/cinematic/projects/:projectId/scenes/:sceneId/shot-order', async (req, res) => {
    try {
      res.json(await cinematicService.reorderSceneShots(
        req.params.projectId,
        req.params.sceneId,
        req.body,
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.put('/api/cinematic/projects/:projectId/timeline', async (req, res) => {
    try {
      res.json(await cinematicService.saveTimeline(req.params.projectId, req.body, req.actorContext));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.get('/api/cinematic/projects/:projectId/export-manifest', async (req, res) => {
    try {
      res.json(await cinematicService.getExportManifest(req.params.projectId, req.actorContext));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.get('/api/admin/cinematic/projects', async (req, res) => {
    try {
      res.json(await cinematicService.listOperationalProjects(req.query, req.actorContext));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.get('/api/admin/cinematic/projects/:projectId', async (req, res) => {
    try {
      res.json(await cinematicService.getOperationalProject(req.params.projectId, req.actorContext));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.get('/api/admin/cinematic/video-tasks', async (req, res) => {
    try {
      res.json(await cinematicService.listOperationalVideoTasks(req.query, req.actorContext));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.get('/api/admin/cinematic/video-capabilities', async (req, res) => {
    try {
      res.json(await cinematicService.getOperationalVideoCapabilities(req.actorContext));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });

  app.delete('/api/cinematic/projects/:projectId', async (req, res) => {
    try {
      res.json(await cinematicService.archiveProject(
        req.params.projectId,
        req.body?.expectedVersion,
        req.actorContext
      ));
    } catch (error) {
      sendCinematicError(res, error);
    }
  });
}

function sendCinematicError(res, error) {
  const response = serializeCinematicError(error);
  return res.status(response.statusCode).json(response.body);
}

async function streamStoryPlanProposal({ req, res, cinematicService }) {
  let streamOpen = true;
  res.status(200);
  res.set('Content-Type', 'text/event-stream; charset=utf-8');
  res.set('Cache-Control', 'private, no-store, no-transform');
  res.set('Connection', 'keep-alive');
  res.set('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.on?.('close', () => { streamOpen = false; });
  const writeEvent = (event, data) => {
    if (!streamOpen || res.writableEnded) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      res.flush?.();
    } catch {
      streamOpen = false;
    }
  };
  const heartbeat = setInterval(() => {
    if (!streamOpen || res.writableEnded) return;
    try {
      res.write(': keep-alive\n\n');
      res.flush?.();
    } catch {
      streamOpen = false;
    }
  }, 15_000);
  heartbeat.unref?.();
  try {
    const proposal = await cinematicService.generateStoryPlan(
      req.params.projectId,
      req.body || {},
      req.actorContext,
      { onProgress: progress => writeEvent('progress', progress) }
    );
    writeEvent('result', proposal);
  } catch (error) {
    const response = serializeCinematicError(error);
    writeEvent('error', { status: response.statusCode, ...response.body });
  } finally {
    clearInterval(heartbeat);
    if (streamOpen && !res.writableEnded) res.end();
  }
}

function acceptsEventStream(req) {
  const accept = req.get?.('accept') || req.headers?.accept || '';
  return String(accept).toLowerCase().includes('text/event-stream');
}

function serializeCinematicError(error) {
  if (error instanceof CinematicError || error instanceof RepositoryContractError || error?.code) {
    return {
      statusCode: error.statusCode || error.status || 400,
      body: { error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {})
      } }
    };
  }
  console.error('[Cinematic] Unexpected error:', error);
  return {
    statusCode: 500,
    body: { error: { code: 'cinematic_internal_error', message: 'Cinematic operation failed.' } }
  };
}

function assertStoryboardBatchInput(project, input) {
  if (Number(input.expectedVersion) !== project.version) {
    throw new CinematicError(
      'cinematic_version_conflict',
      'The Project changed in another session.',
      409,
      { currentVersion: project.version }
    );
  }
  if (!input.idempotencyKey || !Array.isArray(input.operations)
    || input.operations.length < 1 || input.operations.length > 100) {
    throw new CinematicError(
      'cinematic_storyboard_batch_invalid',
      'Storyboard batch requires 1 through 100 Shot operations and an idempotency key.'
    );
  }
  const shotKeys = input.operations.map(operation => `${operation?.sceneId || ''}:${operation?.shotId || ''}`);
  if (shotKeys.some(key => key === ':') || new Set(shotKeys).size !== shotKeys.length) {
    throw new CinematicError(
      'cinematic_storyboard_batch_duplicate_shot',
      'Each Storyboard Shot may appear only once in a batch.'
    );
  }
  const selectionKeys = new Set(input.operations.map(operation => {
    const request = operation?.generationRequest || {};
    return [
      request.provider,
      request.submodel,
      request.imageResolution || '',
      request.aspectRatio,
      request.cinematicCaptureProfileId === null
        ? 'none'
        : request.cinematicCaptureProfileId || 'photorealistic-cinematic'
    ].join(':');
  }));
  if (selectionKeys.size !== 1) {
    throw new CinematicError(
      'cinematic_storyboard_batch_engine_mismatch',
      'Every Storyboard Shot in this batch must use the same provider, model, resolution, aspect ratio and capture profile.'
    );
  }
}

function assertStoryboardBatchOperation(project, operation, context) {
  const scene = project.scenes.find(item => item.id === operation.sceneId);
  const shot = scene?.shots.find(item => item.id === operation.shotId);
  if (!scene || !shot) {
    throw new CinematicError(
      'cinematic_storyboard_shot_not_found',
      'A Storyboard Shot in this batch no longer exists.',
      404
    );
  }
  if (Number(operation.expectedShotVersion) !== shot.version) {
    throw new CinematicError(
      'cinematic_shot_version_conflict',
      'A Storyboard Shot changed before this batch was submitted.',
      409,
      { shotId: shot.id, currentVersion: shot.version }
    );
  }
  if (!context.generationEligible) {
    throw new CinematicError(
      context.blockingReason || 'cinematic_storyboard_generation_blocked',
      'This Storyboard Shot is not eligible for generation.',
      409,
      { shotId: shot.id }
    );
  }
  const request = operation.generationRequest || {};
  if (JSON.stringify(normalizeCinematicCastReferences(request.cinematicCastReferences)) !== JSON.stringify(normalizeCinematicCastReferences(context.cinematicCastReferences))
    || (context.cinematicContainsPeople !== undefined && request.cinematicContainsPeople !== context.cinematicContainsPeople)) {
    throw new CinematicError('cinematic_storyboard_reference_authority_mismatch', 'The Shot Cast reference plan changed.', 409);
  }
  if (![undefined, null, 'photorealistic-cinematic'].includes(request.cinematicCaptureProfileId)) {
    throw new CinematicError(
      'cinematic_capture_profile_invalid',
      'The selected Cinematic capture profile is unsupported.'
    );
  }
  if (String(operation.keyframeContractFingerprint || '') !== context.keyframeContract.sourceFingerprint) {
    throw new CinematicError(
      'cinematic_storyboard_contract_changed',
      'The Storyboard keyframe contract changed before submission.',
      409,
      { shotId: shot.id, currentFingerprint: context.keyframeContract.sourceFingerprint }
    );
  }
  if (
    request.generationSurface !== 'cinematic'
    || request.generationMode !== 'scene'
    || Number(request.outputCount) !== 1
    || request.aspectRatio !== project.aspectRatio
  ) {
    throw new CinematicError(
      'cinematic_storyboard_batch_request_mismatch',
      'Storyboard batch settings do not match the Project output contract.'
    );
  }
  const expectedReferences = {
    character_reference: context.references?.character_reference || null,
    outfit_front: context.references?.outfit_front || null,
    outfit_back: context.references?.outfit_back || null,
    style_reference: context.references?.style_reference || null
  };
  const submittedReferences = {
    character_reference: request.characterReferenceImageA || null,
    outfit_front: request.outfitReferenceImageFront || null,
    outfit_back: request.outfitReferenceImageBack || null,
    style_reference: request.styleReferenceImageA || null
  };
  if (request.characterReferenceImageB || request.faceReferenceImageA || request.faceReferenceImageB
    || request.styleReferenceImageB || JSON.stringify(submittedReferences) !== JSON.stringify(expectedReferences)) {
    throw new CinematicError(
      'cinematic_storyboard_reference_authority_mismatch',
      'Storyboard reference authority changed before batch submission.',
      409,
      { shotId: shot.id }
    );
  }
  if (String(request.sceneBuilder?.manualPromptText || '')
    !== context.keyframeContract.providerIndependentPrompt) {
    throw new CinematicError(
      'cinematic_storyboard_prompt_authority_mismatch',
      'The submitted Storyboard prompt does not match the server keyframe contract.',
      409,
      { shotId: shot.id }
    );
  }
  const submittedCharacter = request.characterProfileContext || null;
  const expectedCharacter = context.characterProfileContext || null;
  if (
    (submittedCharacter?.characterProfileId || null) !== (expectedCharacter?.characterProfileId || null)
    || (submittedCharacter?.characterProfileVersionId || null) !== (expectedCharacter?.characterProfileVersionId || null)
  ) {
    throw new CinematicError(
      'cinematic_storyboard_character_authority_mismatch',
      'Storyboard Character authority changed before batch submission.',
      409,
      { shotId: shot.id }
    );
  }
}
