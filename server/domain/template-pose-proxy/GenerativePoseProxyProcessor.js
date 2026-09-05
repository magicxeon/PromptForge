import {
  compileGenerationContext
} from '../generation/generationRequestService.js';
import { prepareGenerationReferences } from '../generation/prepareGenerationReferences.js';

export class GenerativePoseProxyProcessor {
  constructor({ providerRegistry, generationApplicationService }) {
    this.providerRegistry = providerRegistry;
    this.generationApplicationService = generationApplicationService;
  }

  async enqueue({ record, policy, sourceImageUrl, sourceGenerationId, actorContext, reservation }) {
    const { provider, model } = this.providerRegistry.resolveSelection(
      policy.providerId,
      policy.modelId,
      { workflow: 'internal.template_pose_proxy' }
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
    await this.generationApplicationService.enqueueReservedOperation({
      jobId: record.operationId,
      providerId: provider.id,
      modelId: model.id,
      payerUserId: actorContext.userId,
      payerUsername: actorContext.username,
      context,
      compiledPrompt: policy.prompt,
      modelConfig: model,
      providerConfig: provider,
      reservation,
      estimateId: record.estimateId,
      requestId: record.requestId,
      streamRequested: false,
      refundOnFailure: false,
      providerWorkflow: 'internal.template_pose_proxy',
      queueOptionOverrides: {
        routingSnapshot: {
          operationPurpose: policy.operationPurpose,
          policyVersion: policy.policyVersion,
          strategyVersion: policy.processorStrategyVersion
        }
      }
    });
    return record.operationId;
  }
}
