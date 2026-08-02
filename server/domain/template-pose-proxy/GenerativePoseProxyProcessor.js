import {
  compileGenerationContext,
  createQueueOptions
} from '../generation/generationRequestService.js';
import { prepareGenerationReferences } from '../generation/prepareGenerationReferences.js';

export class GenerativePoseProxyProcessor {
  constructor({ providerRegistry, queueManager }) {
    this.providerRegistry = providerRegistry;
    this.queueManager = queueManager;
  }

  async enqueue({ record, policy, sourceImageUrl, sourceGenerationId, actorContext, reservation }) {
    const { provider, model } = this.providerRegistry.resolveSelection(
      policy.providerId,
      policy.modelId
    );
    const payload = {
      provider: provider.id,
      submodel: model.id,
      imageResolution: policy.resolution,
      aspectRatio: policy.aspectRatio,
      outputCount: 1,
      mode: 'normal',
      generationMode: 'scene',
      generationSurface: 'template_pose_proxy',
      template: 'portrait',
      templateBaselineReference: sourceImageUrl,
      authorizedTemplateReferenceJobIds: sourceGenerationId ? [sourceGenerationId] : [],
      imageReferences: {},
      sceneBuilder: {
        authoringMode: 'manual',
        manualPromptText: policy.prompt
      },
      selections: {}
    };
    const { context } = compileGenerationContext(payload, actorContext);
    await prepareGenerationReferences(context, {
      actorContext,
      providerId: provider.id,
      modelId: model.id,
      modelConfig: model
    });
    this.queueManager.enqueue(
      provider.id,
      model.id,
      policy.prompt,
      createQueueOptions(context, {
        jobId: record.operationId,
        username: actorContext.username,
        stream: this.providerRegistry.shouldStream(provider, model, false),
        modelConfig: model,
        providerConfigVersion: this.providerRegistry.getConfigVersion(),
        reservationId: reservation.reservationId,
        pricingSnapshot: reservation.pricingSnapshot,
        payerUserId: actorContext.userId,
        estimateId: record.estimateId,
        requestId: record.requestId,
        routingSnapshot: {
          operationPurpose: policy.operationPurpose,
          policyVersion: policy.policyVersion,
          strategyVersion: policy.processorStrategyVersion
        }
      })
    );
    return record.operationId;
  }
}
