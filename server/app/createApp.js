import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { CLIENT_ROOT, WEB_DIST_ROOT } from '../config/paths.js';
import { collectionManager } from '../domain/collections/CollectionManager.js';
import { getProviderRegistry } from '../providers/ProviderRegistry.js';
import { queueManager } from '../domain/generation/QueueManager.js';
import { creditManager } from '../domain/credits/CreditManager.js';
import { creditApplicationService } from '../domain/credits/CreditApplicationService.js';
import { lookSheetEnhancementService } from '../domain/generation/LookSheetEnhancementService.js';
import { cinematicWritingOperationService } from '../domain/generation/CinematicWritingOperationService.js';
import { ComparisonOrchestrator } from '../domain/comparisons/ComparisonOrchestrator.js';
import { historyRepository } from '../repositories/generation/HistoryRepository.js';
import { communityShareService } from '../domain/community/CommunityShareService.js';
import { createRealActorContextMiddleware } from '../middleware/actorContextMiddleware.js';
import { getAuthRuntime } from '../config/authPolicy.js';
import { IdentityDevelopmentService } from '../domain/identity/IdentityDevelopmentService.js';
import { registerAuthRoutes } from './routes/authRoutes.js';
import { createIdentityAccessMiddleware } from '../middleware/identityAccessMiddleware.js';
import { isIdentityRuntimeDeploymentReady } from '../domain/identity/createIdentityRuntime.js';
import { mockUserRepo } from '../repositories/identity/MockUserRepository.js';
import { createAttributesBundleLoader, registerAttributesRoutes } from './routes/attributesRoutes.js';
import { registerIdentityRoutes } from './routes/identityRoutes.js';
import { registerLearningRoutes } from './routes/learningRoutes.js';
import { registerCreditRoutes } from './routes/creditRoutes.js';
import { registerCollectionRoutes } from './routes/collectionRoutes.js';
import { registerGenerationRoutes } from './routes/generationRoutes.js';
import { registerMediaExportRoutes } from './routes/mediaExportRoutes.js';
import { MediaExportService } from '../domain/assets/MediaExportService.js';
import { AssetDeliveryService } from '../domain/assets/AssetDeliveryService.js';
import { registerAssetRoutes } from './routes/assetRoutes.js';
import { GenerationExportSourceService } from '../domain/generation/GenerationExportSourceService.js';
import { registerHistoryRoutes } from './routes/historyRoutes.js';
import { registerComparisonRoutes } from './routes/comparisonRoutes.js';
import { registerSceneTemplateRoutes } from './routes/sceneTemplateRoutes.js';
import { registerAdminRoutes } from './routes/adminRoutes.js';
import { registerAdminFinanceRoutes } from './routes/adminFinanceRoutes.js';
import { registerAdminAttributeCatalogRoutes } from './routes/adminAttributeCatalogRoutes.js';
import { registerPromptComposerRoutes } from './routes/promptComposerRoutes.js';
import { registerCommunityTaxonomyRoutes } from './routes/communityTaxonomyRoutes.js';
import { registerCommunityShareRoutes } from './routes/communityShareRoutes.js';
import { communityClassificationService } from '../domain/community/CommunityClassificationService.js';
import { communityFeaturePolicyService } from '../domain/community/CommunityFeaturePolicyService.js';
import { creatorProfileService } from '../domain/community/CreatorProfileService.js';
import { creatorProfilePageService } from '../domain/community/CreatorProfilePageService.js';
import { registerCommunityCreatorRoutes } from './routes/communityCreatorRoutes.js';
import { communityModerationService } from '../domain/community/CommunityModerationService.js';
import { registerCommunityModerationRoutes } from './routes/communityModerationRoutes.js';
import { communityEngagementService } from '../domain/community/CommunityEngagementService.js';
import { communityRankingService } from '../domain/community/CommunityRankingService.js';
import { registerCommunityEngagementRoutes } from './routes/communityEngagementRoutes.js';
import { communityGalleryService } from '../domain/community/CommunityGalleryService.js';
import { registerCommunityGalleryRoutes } from './routes/communityGalleryRoutes.js';
import { communityLaunchReadinessService } from '../domain/community/CommunityLaunchReadinessService.js';
import { registerCommunityReadinessRoutes } from './routes/communityReadinessRoutes.js';
import { CommunityComparisonShareService } from '../domain/community/CommunityComparisonShareService.js';
import { communityPostAccessService } from '../domain/community/CommunityPostAccessService.js';
import { registerCommunityComparisonRoutes } from './routes/communityComparisonRoutes.js';
import { communityCollectionShareService } from '../domain/community/CommunityCollectionShareService.js';
import { registerCommunityCollectionRoutes } from './routes/communityCollectionRoutes.js';
import { registerCharacterProfileRoutes } from './routes/characterProfileRoutes.js';
import { characterProfileService } from '../domain/character-profiles/CharacterProfileService.js';
import { characterCastingExportService } from '../domain/character-profiles/CharacterCastingExportService.js';
import { characterProfileSharingService } from '../domain/character-profiles/CharacterProfileSharingService.js';
import { characterLookService } from '../domain/character-profiles/CharacterLookService.js';
import { resolveFrontendRoute } from './frontendRouteOwnership.js';
import { registerFashionBlueprintRoutes } from './routes/fashionBlueprintRoutes.js';
import { registerReferenceRoutes } from './routes/referenceRoutes.js';
import { registerReferenceHandoffRoutes } from './routes/referenceHandoffRoutes.js';
import { faceReferenceHandoffService } from '../domain/generation/FaceReferenceHandoffService.js';
import { imagePresentationService } from '../domain/assets/ImagePresentationService.js';
import { templateCoreService } from '../domain/templates/TemplateCoreService.js';
import { registerTemplateRoutes } from './routes/templateRoutes.js';
import { TemplatePoseProxyService } from '../domain/template-pose-proxy/TemplatePoseProxyService.js';
import { GenerationApplicationService } from '../domain/generation/GenerationApplicationService.js';
import { requestPerformanceMiddleware } from '../middleware/requestPerformanceMiddleware.js';
import { AttributeCatalogApplicationService } from '../domain/attribute-catalog/AttributeCatalogApplicationService.js';
import { cinematicApplicationService } from '../domain/cinematic/CinematicApplicationService.js';
import { registerCinematicRoutes } from './routes/cinematicRoutes.js';
import { registerVideoGenerationRoutes } from './routes/videoGenerationRoutes.js';
import { videoGenerationApplicationService } from '../domain/generation/VideoGenerationApplicationService.js';
import { communityVideoShareService } from '../domain/community/CommunityVideoShareService.js';
import { generationGroupRepository } from '../repositories/generation/GenerationGroupRepository.js';
import { GenerationJobCenterService } from '../domain/generation/GenerationJobCenterService.js';
import { registerGenerationJobCenterRoutes } from './routes/generationJobCenterRoutes.js';
import { AdminInvestigationService } from '../domain/admin/AdminInvestigationService.js';
import { ProviderControlApplicationService } from '../domain/admin-configuration/ProviderControlApplicationService.js';

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

  if (!contextUser) throw Object.assign(new Error('Authentication required.'), { statusCode: 401 });
  return contextUser;
}

export function createApp({ authRuntime = getAuthRuntime(), identityRuntime, identityApplicationService = identityRuntime?.identityApplicationService,
  billableRecoveryReady = false } = {}) {
  const app = express();
  const providerRegistry = getProviderRegistry();
  const generationApplicationService = new GenerationApplicationService({
    providerRegistry,
    queueManager,
    templateCoreService,
    creditService: creditApplicationService
  });
  const generationJobCenterService = new GenerationJobCenterService({
    queueManager,
    historyRepository,
    generationGroupRepository,
    generationApplicationService,
    videoGenerationService: videoGenerationApplicationService
  });
  const templatePoseProxyService = new TemplatePoseProxyService({
    providerRegistry,
    generationApplicationService,
    onActivated: (input, actorContext) =>
      communityShareService.activatePreparedTemplate(input, actorContext)
  });
  const comparisonOrchestrator = new ComparisonOrchestrator({
    providerRegistry,
    queueManager,
    creditManager,
    creditReservation: creditApplicationService,
    generationApplicationService,
    templateCoreService
  });
  const communityComparisonShareService = new CommunityComparisonShareService({
    comparisonOrchestrator
  });
  const getAttributesBundle = createAttributesBundleLoader();
  const attributeCatalogApplicationService = new AttributeCatalogApplicationService({
    generationService: generationApplicationService,
    legacyBundleLoader: getAttributesBundle
  });
  const adminInvestigationService = new AdminInvestigationService({ providerRegistry });
  const providerControlService = new ProviderControlApplicationService({ imageRegistry: providerRegistry });

  app.locals.authRuntimeReady = !authRuntime.enabled && isIdentityRuntimeDeploymentReady(identityRuntime)
    && identityApplicationService === identityRuntime.identityApplicationService;
  app.locals.billableRecoveryReady = app.locals.authRuntimeReady && billableRecoveryReady === true;
  let beginRecovery;
  const startupCreditReconciliation = app.locals.billableRecoveryReady
    ? new Promise((resolve, reject) => {
      beginRecovery = () => {
        beginRecovery = undefined;
        lookSheetEnhancementService.recover().then(() => cinematicWritingOperationService.recover()).then(() =>
          creditApplicationService.reconcileStartupOrphanReservations({
            shouldPreserveReservation: reservation => reservation.metadata?.kind === 'look_sheet_enhancement'
              || reservation.metadata?.kind === 'cinematic_text'
              || videoGenerationApplicationService.hasDurableTaskForReservation(reservation)
          })).then(resolve, reject);
      };
    }) : Promise.resolve();
  const startBillableRecovery = () => { beginRecovery?.(); return startupCreditReconciliation; };

  if (authRuntime.enabled || !identityApplicationService)
    app.use(new IdentityDevelopmentService({runtime:authRuntime,userRepository:mockUserRepo}).middleware());
  app.use(cors({ origin: false }));
  if (!authRuntime.enabled && identityApplicationService) {
    app.use(createRealActorContextMiddleware({identityApplicationService}));
    app.use('/api/auth', express.json({ limit: '32kb' }));
    app.use('/api/auth', express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 16 }));
    app.use('/api/auth', (error, req, res, next) => {
      if (!error) return next();
      res.setHeader('Cache-Control', 'no-store');
      return res.status(error.type === 'entity.too.large' ? 413 : 400)
        .json({ error: 'Authentication unavailable.', code: 'auth_forbidden' });
    });
    registerAuthRoutes(app,{identityApplicationService});
    app.use(createIdentityAccessMiddleware({identityApplicationService}));
  }
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '20mb' }));
  app.use(requestPerformanceMiddleware);
  app.use('/react-assets', express.static(path.join(WEB_DIST_ROOT, 'react-assets')));
  // React retains only runtime data/media boundaries from the former client
  // tree. Legacy scripts, HTML and styles are intentionally not web-served.
  app.use('/assets', express.static(path.join(CLIENT_ROOT, 'assets')));
  app.use('/i18n', express.static(path.join(CLIENT_ROOT, 'i18n')));
  registerAssetRoutes(app, { assetDeliveryService: new AssetDeliveryService() });

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
    creditApplicationService,
    generationApplicationService,
    collectionManager,
    comparisonOrchestrator,
    historyRepository,
    mockUserRepo,
    templateCoreService,
    templatePoseProxyService,
    resolveRequestUsername
  };

  registerAttributesRoutes(app, {
    providerRegistry,
    getAttributesBundle,
    getRuntimeAttributesBundle: () => attributeCatalogApplicationService.resolvePublicRuntimeBundle()
  });
  registerPromptComposerRoutes(app, { getAttributesBundle });
  registerIdentityRoutes(app, {
    identityApplicationService: authRuntime.enabled ? undefined : identityApplicationService,
    mockUserRepo,
    communityFeaturePolicyService
  });
  registerCreditRoutes(app, sharedDependencies);
  registerLearningRoutes(app);
  registerCollectionRoutes(app, sharedDependencies);
  registerGenerationRoutes(app, sharedDependencies);
  registerMediaExportRoutes(app, { mediaExportService: new MediaExportService({ generationSources: new GenerationExportSourceService(), comparisons: comparisonOrchestrator }) });
  registerGenerationJobCenterRoutes(app, { generationJobCenterService });
  registerFashionBlueprintRoutes(app, sharedDependencies);
  registerReferenceRoutes(app, sharedDependencies);
  registerReferenceHandoffRoutes(app, { faceReferenceHandoffService });
  registerHistoryRoutes(app, {
    ...sharedDependencies,
    imagePresentationService
  });
  registerComparisonRoutes(app, sharedDependencies);
  registerAdminRoutes(app, {
    communityFeaturePolicyService,
    adjustmentService: creditApplicationService,
    investigationService: adminInvestigationService,
    providerControlService
  });
  registerAdminAttributeCatalogRoutes(app, { catalogService: attributeCatalogApplicationService });
  registerAdminFinanceRoutes(app);
  registerCommunityTaxonomyRoutes(app, {
    communityClassificationService,
    communityFeaturePolicyService
  });
  registerCommunityShareRoutes(app, {
    communityShareService,
    communityFeaturePolicyService,
    postAccessService: communityPostAccessService,
    videoShareService: communityVideoShareService
  });
  registerCommunityCreatorRoutes(app, {
    creatorProfileService,
    creatorProfilePageService,
    communityFeaturePolicyService
  });
  registerCommunityModerationRoutes(app, {
    moderationService: communityModerationService,
    communityFeaturePolicyService
  });
  registerCommunityEngagementRoutes(app, {
    engagementService: communityEngagementService,
    rankingService: communityRankingService,
    moderationService: communityModerationService,
    communityFeaturePolicyService
  });
  registerCharacterProfileRoutes(app, {
    profileService: characterProfileService,
    lookService: characterLookService,
    castingExportService: characterCastingExportService,
    sharingService: characterProfileSharingService,
    communityFeaturePolicyService
  });
  registerCommunityGalleryRoutes(app, {
    galleryService: communityGalleryService,
    communityFeaturePolicyService
  });
  registerCommunityReadinessRoutes(app, {
    readinessService: communityLaunchReadinessService,
    communityFeaturePolicyService
  });
  registerCommunityComparisonRoutes(app, {
    comparisonShareService: communityComparisonShareService,
    postAccessService: communityPostAccessService,
    communityFeaturePolicyService,
    imagePresentationService
  });
  registerCommunityCollectionRoutes(app, {
    collectionShareService: communityCollectionShareService,
    postAccessService: communityPostAccessService,
    communityFeaturePolicyService
  });
  registerSceneTemplateRoutes(app, {
    communityShareService,
    communityFeaturePolicyService,
    imagePresentationService,
    templateCoreService,
    templatePoseProxyService
  });
  registerTemplateRoutes(app, { templateCoreService, templatePoseProxyService });
  registerCinematicRoutes(app, {
    cinematicService: cinematicApplicationService,
    generationApplicationService
  });
  registerVideoGenerationRoutes(app, {
    videoGenerationService: videoGenerationApplicationService,
    communityFeaturePolicyService
  });

  // All registered browser routes are owned by the React SPA.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    const frontendRoute = resolveFrontendRoute(req.path);
    if (!frontendRoute.matched) return next();
    const indexPath = path.join(WEB_DIST_ROOT, 'index.html');
    if (!fs.existsSync(indexPath)) return next();
    res.setHeader('x-mpf-frontend-runtime', frontendRoute.runtime);
    return res.sendFile(indexPath);
  });

  app.locals.modelPromptForge = {
    collectionManager,
    comparisonOrchestrator,
    getAttributesBundle,
    startupCreditReconciliation,
    startBillableRecovery,
    videoGenerationApplicationService
  };

  return app;
}
