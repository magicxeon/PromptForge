export function resolveVideoPaidActivation(model, runtimeEnvironment) {
  const activation = model.paidUsageActivation;
  if (!activation) return model;
  const enabled = activation.enabled === true
    && Array.isArray(activation.runtimeEnvironments)
    && activation.runtimeEnvironments.includes(runtimeEnvironment)
    && model.providerId === 'modelark' && model.modelId === 'dreamina-seedance-2-5-260628';
  if (!enabled) return { ...model, paidRoutingEnabled: false };
  if (!activation.version || !Array.isArray(activation.measuredCases) || !activation.measuredCases.length
    || activation.rateEvidenceBasis !== 'configured_rate_user_authorized_provisional') {
    throw new TypeError('Video paid activation evidence is invalid.');
  }
  return { ...model, paidRoutingEnabled: true, pricingStatus: 'priced', qualificationStatus: 'qualified',
    paidUsageActivationVersion: activation.version,
    providerRateVersion: `${model.providerRateVersion}:${activation.version}`,
    supportsCinematicLookReferences: true,
    inputModes: [...new Set([...(model.inputModes || []), 'multimodal_reference'])] };
}

export function assertVideoPaidActivationRequest(model, request) {
  const activation = model.paidUsageActivation;
  if (!activation) return;
  const matched = Array.isArray(activation.measuredCases) && activation.measuredCases.some(row =>
    row.resolution === request.resolution && row.durationSeconds === Number(request.durationSeconds)
    && row.audioMode === request.audioMode
    && row.referenceCounts?.includes(Number(request.referenceImageCount)));
  if (activation.enabled !== true || model.paidUsageActivationVersion !== activation.version
    || request.inputMode !== 'multimodal_reference' || request.aspectRatio !== '9:16'
    || Number(request.fps ?? 24) !== 24 || Number(request.inputVideoSeconds ?? 0) !== 0
    || Number(request.outputCount ?? 1) !== 1 || (request.serviceTier && request.serviceTier !== 'online')
    || !matched) throw new TypeError('Video request is outside the measured paid activation profile.');
}
