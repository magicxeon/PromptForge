import { getProviderRegistry } from '../../providers/ProviderRegistry.js';
import { normalizeProviderOutputProvenance } from '../generation/ProviderOutputProvenance.js';

export const SEEDANCE_2_COMPATIBILITY_ID = 'modelark-seedance-2';

export function deriveStoryboardVideoCompatibility({
  providerOutputProvenance,
  providerRegistry = getProviderRegistry()
} = {}) {
  const provenance = normalizeProviderOutputProvenance(providerOutputProvenance);
  const base = {
    targetId: SEEDANCE_2_COMPATIBILITY_ID,
    status: 'not_qualified',
    reasonCode: 'source_provenance_missing',
    sourceProviderId: provenance?.providerId || null,
    sourceModelId: provenance?.resolvedModelId || null,
    generatedAt: provenance?.generatedAt || null,
    validUntil: null,
    originalBytesPreserved: provenance?.originalBytesPreserved === true
  };
  if (!provenance) return base;
  const provider = providerRegistry.getProvider(provenance.providerId);
  const model = provider?.models?.find(candidate => candidate.id === provenance.resolvedModelId);
  const capability = model?.capabilities?.downstreamVideoCompatibility?.[SEEDANCE_2_COMPATIBILITY_ID];
  if (!capability || capability.status !== 'internal_testing') {
    return { ...base, reasonCode: 'source_model_not_qualified' };
  }
  if (capability.requiresOriginalBytes === true && provenance.originalBytesPreserved !== true) {
    return { ...base, reasonCode: 'source_bytes_not_preserved' };
  }
  if (capability.requiresSameCredentialScope === true && !provenance.credentialScope) {
    return { ...base, reasonCode: 'source_credential_scope_missing' };
  }
  return {
    ...base,
    status: 'eligible_internal_testing',
    reasonCode: null,
    validUntil: null
  };
}
