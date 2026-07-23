import express from 'express';
import cors from 'cors';
import path from 'path';
import { CLIENT_ROOT, PROJECT_ROOT } from '../config/paths.js';
import { collectionManager } from '../domain/collections/CollectionManager.js';
import { getProviderRegistry } from '../providers/ProviderRegistry.js';
import { queueManager } from '../domain/generation/QueueManager.js';
import { creditManager } from '../domain/credits/CreditManager.js';
import { creditReservationService } from '../domain/credits/CreditReservationService.js';
import { ComparisonOrchestrator } from '../domain/comparisons/ComparisonOrchestrator.js';
import { historyRepository } from '../repositories/generation/HistoryRepository.js';
import { communityShareService } from '../domain/community/CommunityShareService.js';
import { actorContextMiddleware } from '../middleware/actorContextMiddleware.js';
import { mockUserRepo } from '../repositories/identity/MockUserRepository.js';
import { createAttributesBundleLoader, registerAttributesRoutes } from './routes/attributesRoutes.js';
import { registerIdentityRoutes } from './routes/identityRoutes.js';
import { registerCreditRoutes } from './routes/creditRoutes.js';
import { registerCollectionRoutes } from './routes/collectionRoutes.js';
import { registerGenerationRoutes } from './routes/generationRoutes.js';
import { registerHistoryRoutes } from './routes/historyRoutes.js';
import { registerComparisonRoutes } from './routes/comparisonRoutes.js';
import { registerSceneTemplateRoutes } from './routes/sceneTemplateRoutes.js';

export function resolveRequestUsername(req, {
  allowQuery = true,
  allowBody = true,
  rejectMismatch = true
} = {}) {
  const contextUser = req.actorContext?.username || null;
  const bodyUser = allowBody ? req.body?.username : null;
  const queryUser = allowQuery ? req.query?.user || req.query?.username : null;
  const legacyUser = bodyUser || queryUser || null;

  if (rejectMismatch && contextUser && legacyUser && contextUser !== legacyUser) {
    const err = new Error(`Identity mismatch: actor is ${contextUser} but request specified ${legacyUser}`);
    err.statusCode = 400;
    throw err;
  }

  return contextUser || legacyUser || 'user_demo';
}

export function createApp() {
  const app = express();
  const providerRegistry = getProviderRegistry();
  const comparisonOrchestrator = new ComparisonOrchestrator({
    providerRegistry,
    queueManager,
    creditManager
  });
  const getAttributesBundle = createAttributesBundleLoader();

  creditReservationService.reconcileStartupOrphanReservations().catch(err => {
    console.warn('[Startup] Credit reservation reconciliation failed:', err.message);
  });

  app.use(cors());
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '20mb' }));
  app.use(actorContextMiddleware);
  app.use(express.static(CLIENT_ROOT));
  app.use('/sub-app-game-character', express.static(path.join(PROJECT_ROOT, 'sub-app-game-character')));

  app.use((req, res, next) => {
    req.userRole = req.actorContext?.role || 'user';
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  const sharedDependencies = {
    providerRegistry,
    queueManager,
    creditManager,
    collectionManager,
    comparisonOrchestrator,
    historyRepository,
    mockUserRepo,
    resolveRequestUsername
  };

  registerAttributesRoutes(app, { providerRegistry, getAttributesBundle });
  registerIdentityRoutes(app, { mockUserRepo });
  registerCreditRoutes(app, sharedDependencies);
  registerCollectionRoutes(app, sharedDependencies);
  registerGenerationRoutes(app, sharedDependencies);
  registerHistoryRoutes(app, sharedDependencies);
  registerComparisonRoutes(app, sharedDependencies);
  registerSceneTemplateRoutes(app, {
    communityShareService
  });

  app.get(['/studio', '/history', '/comparisons', '/comparisons/:setId'], (req, res) => {
    res.sendFile(path.join(CLIENT_ROOT, 'index.html'));
  });

  app.locals.modelPromptForge = {
    collectionManager,
    comparisonOrchestrator,
    getAttributesBundle
  };

  return app;
}
