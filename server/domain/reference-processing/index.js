import { ReferencePolicyRegistry } from './ReferencePolicyRegistry.js';
import { ReferenceProcessorRegistry } from './ReferenceProcessorRegistry.js';
import { ReferenceProcessingService } from './ReferenceProcessingService.js';

export const referenceProcessorRegistry = new ReferenceProcessorRegistry();
export const referencePolicyRegistry = new ReferencePolicyRegistry({
  knownProcessorIds: referenceProcessorRegistry.getKnownProcessorIds()
});
export const referenceProcessingService = new ReferenceProcessingService({
  policyRegistry: referencePolicyRegistry,
  processorRegistry: referenceProcessorRegistry
});
