import assert from 'node:assert/strict';
import test from 'node:test';
import { FashionBlueprintService } from '../server/domain/fashion-blueprint/FashionBlueprintService.js';
import { fashionDirectionResolver } from '../server/domain/fashion-blueprint/FashionDirectionResolver.js';
import { fashionRoutingPolicyService } from '../server/domain/fashion-blueprint/FashionRoutingPolicyService.js';
import { FashionQuoteService } from '../server/domain/fashion-blueprint/FashionQuoteService.js';
import { FashionRunService } from '../server/domain/fashion-blueprint/FashionRunService.js';

function createRegistry() {
  const providers = [{
    id: 'gemini',
    models: [
      {
        id: 'gemini-3.1-flash-lite-image',
        capabilities: {
          aspectRatios: ['6:8'],
          resolutions: ['1K'],
          imageReferences: true,
          maxReferenceImages: 6
        },
        defaults: { resolution: '1K' }
      },
      {
        id: 'gemini-3.1-flash-image',
        capabilities: {
          aspectRatios: ['6:8'],
          resolutions: ['1K'],
          imageReferences: true,
          maxReferenceImages: 6
        },
        defaults: { resolution: '1K' }
      }
    ]
  }];
  return {
    getPublicCatalog: () => ({ providers }),
    resolveSelection(providerId, modelId) {
      const provider = providers.find(item => item.id === providerId);
      const model = provider?.models.find(item => item.id === modelId);
      if (!provider || !model) throw new Error('selection_missing');
      return { provider, model };
    },
    validateRequest() {}
  };
}

test('Fashion policies are versioned and resolve deterministic directions', () => {
  const routing = fashionRoutingPolicyService.getPolicy();
  const direction = fashionDirectionResolver.resolve({
    poseDirection: 'natural_walking_pose',
    environmentDirection: 'clean_white_ecommerce_studio'
  });
  assert.match(routing.policyVersion, /^fashion-routing-/);
  assert.equal(routing.defaultTier, 'selling_quality');
  assert.match(direction.policyVersion, /^fashion-directions-/);
  assert.equal(direction.pose.id, 'natural_walking_pose');
  assert.match(direction.pose.directive, /garment silhouette/i);
});

test('Fashion plan carries stable product and operation contracts', () => {
  const service = new FashionBlueprintService({
    providerRegistry: createRegistry()
  });
  const plan = service.resolvePlan({
    templateId: 'post_1',
    templateUseSessionId: 'tuse_1',
    characterProfileContext: {
      characterProfileId: 'char_1',
      characterProfileVersionId: 'charv_1'
    },
    qualityTier: 'selling_quality',
    productItems: [{
      key: 'product_1',
      clientKey: 'client_product_1',
      name: 'Linen set',
      sku: 'LINEN-001',
      productType: 'clothing_set',
      outfitScope: 'full_look',
      colorNotes: 'warm ivory',
      integrityLevel: 'strict',
      references: {
        outfit_front: {
          assetId: 'ast_front',
          imageUrl: '/outputs/fashion-references/usr_demo/front.jpg'
        }
      }
    }]
  }, { userId: 'usr_demo' });
  assert.equal(plan.schemaVersion, 2);
  assert.equal(plan.productItems[0].clientKey, 'client_product_1');
  assert.equal(plan.productItems[0].references.outfit_front.assetId, 'ast_front');
  assert.equal(plan.productItems[0].operations[0].shotKey, 'cover');
  assert.equal(plan.route.routingPolicyVersion, 'fashion-routing-2026-08-01-v2');
  assert.equal(plan.route.qualificationStatus, 'qualified');
  assert.equal(plan.route.promptStrategyVersion, 'GNB2-S6');
});

test('Fashion Advanced routes bind the same approved Pose Proxy as Simple routes', async () => {
  const service = new FashionQuoteService({
    blueprintService: {},
    providerRegistry: {},
    templatePoseProxyService: {
      async requireActive(templateVersionId) {
        assert.equal(templateVersionId, 'tmplv_1');
        return {
          id: 'proxy_1',
          templateVersionId,
          poseVariantId: 'default',
          proxyImageUrl: '/outputs/job_pose_proxy_1.jpg',
          operationId: 'job_pose_proxy_1',
          processorPolicyVersion: 'proxy-policy-v1',
          processorStrategyVersion: 'proxy-strategy-v1',
          outputRepresentation: 'matte_mannequin'
        };
      }
    }
  });
  const plan = await service.bindPoseProxy(
    { routingMode: 'advanced' },
    { session: { version: { id: 'tmplv_1' } } }
  );
  assert.equal(plan.templatePoseProxy.id, 'proxy_1');
  assert.equal(plan.templatePoseProxy.sourceGenerationId, 'job_pose_proxy_1');
});

test('Fashion run hydration persists terminal queue state for restart recovery', async () => {
  let persisted = null;
  const service = new FashionRunService({
    quoteService: {},
    providerRegistry: {},
    queueManager: {
      async getJobStatusForUser() {
        return {
          status: 'completed',
          result: { imageUrl: '/outputs/job_fashion_1.jpg' },
          error: null
        };
      }
    },
    runRepository: {
      async update(id, actorUserId, updater) {
        persisted = updater({
          id,
          actorUserId,
          status: 'queued',
          operations: [{ operationId: 'op_1', jobId: 'job_fashion_1', status: 'queued' }]
        });
        return persisted;
      }
    }
  });
  const hydrated = await service.hydrateRun({
    id: 'run_1',
    actorUserId: 'usr_1',
    status: 'queued',
    approvedProofRunId: null,
    operations: [{ operationId: 'op_1', jobId: 'job_fashion_1', status: 'queued' }]
  }, { userId: 'usr_1', username: 'user_1' });
  assert.equal(hydrated.status, 'completed');
  assert.equal(persisted.status, 'completed');
  assert.equal(persisted.operations[0].result.imageUrl, '/outputs/job_fashion_1.jpg');
});
