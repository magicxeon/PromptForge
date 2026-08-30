import { CinematicError } from '../../domain/cinematic/CinematicApplicationService.js';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';

export function registerCinematicRoutes(app, { cinematicService }) {
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

  app.get('/api/cinematic/projects', async (req, res) => {
    try {
      res.json(await cinematicService.listProjects(req.actorContext, req.query));
    } catch (error) {
      sendCinematicError(res, error);
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

  app.get('/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/produce-context', async (req, res) => {
    try {
      res.json(await cinematicService.getProduceShotContext(
        req.params.projectId,
        req.params.sceneId,
        req.params.shotId,
        req.actorContext
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
  if (error instanceof CinematicError || error instanceof RepositoryContractError || error?.code) {
    return res.status(error.statusCode || 400).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {})
      }
    });
  }
  console.error('[Cinematic] Unexpected error:', error);
  return res.status(500).json({
    error: { code: 'cinematic_internal_error', message: 'Cinematic operation failed.' }
  });
}
