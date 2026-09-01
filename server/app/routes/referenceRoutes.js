import { referenceAssetService } from '../../domain/assets/ReferenceAssetService.js';
import { normalizeGenerationContext } from '../../domain/generation/generationRequestService.js';
import { referencePolicyRegistry } from '../../domain/reference-processing/index.js';
import { prepareGenerationReferences } from '../../domain/generation/prepareGenerationReferences.js';

export function registerReferenceRoutes(app, {
  providerRegistry,
  templateCoreService
} = {}) {
  app.post('/api/references', async (req, res) => {
    try {
      const reference = await referenceAssetService.storeReference(req.body || {}, req.actorContext);
      res.status(201).json(reference);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'reference_upload_failed',
          message: error.message
        }
      });
    }
  });

  app.post('/api/references/composites', async (req, res) => {
    try {
      const reference = await referenceAssetService.composeReference(req.body || {}, req.actorContext);
      res.status(201).json(reference);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'reference_composite_failed',
          message: error.message
        }
      });
    }
  });

  app.get('/api/references/processing-policy', (req, res) => {
    res.json({
      schemaVersion: 1,
      policyVersion: referencePolicyRegistry.getPolicyVersion(),
      roles: referencePolicyRegistry.getPublicRoleCatalog()
    });
  });

  app.post('/api/references/processing-plan', async (req, res) => {
    try {
      const request = req.body?.generationRequest || req.body || {};
      const { provider, model } = providerRegistry.resolveSelection(
        request.provider,
        request.submodel
      );
      const templateExecution = request.templateUseSessionId
        ? await templateCoreService.resolveSession(
          request.templateUseSessionId,
          req.actorContext,
          request.templateReplacements || {}
        )
        : null;
      const payload = templateExecution
        ? {
          ...request,
          sceneTemplateSnapshot: templateExecution.executionSnapshot,
          selections: templateExecution.executionSnapshot.structuredSelectionsSnapshot || {},
          templateBaselineReference: templateExecution.baselineReference?.imageUrl || null
        }
        : request;
      const context = normalizeGenerationContext(payload, req.actorContext);
      const result = await prepareGenerationReferences(context, {
        actorContext: req.actorContext,
        providerId: provider.id,
        modelId: model.id,
        modelConfig: model
      });
      res.json({
        status: result.status,
        policyVersion: result.policyVersion,
        planFingerprint: result.planFingerprint,
        publicAuthorityProjection: result.publicAuthorityProjection,
        effectiveSelections: result.effectiveSelections,
        providerPlan: {
          referenceCount: result.providerPlan.referenceCount,
          executionMode: result.providerPlan.executionMode
        }
      });
    } catch (error) {
      if (error.toJSON) {
        res.status(error.statusCode || 400).json(error.toJSON());
      } else {
        res.status(error.statusCode || 500).json({
          error: {
            code: error.code || 'reference_processing_failed',
            message: error.message
          }
        });
      }
    }
  });
}
