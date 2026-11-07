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
  getVideoPaidActivationDurations(model);
  return { ...model, paidRoutingEnabled: true, pricingStatus: 'priced', qualificationStatus: 'qualified',
    paidUsageActivationVersion: activation.version,
    providerRateVersion: `${model.providerRateVersion}:${activation.version}`,
    supportsCinematicLookReferences: true,
    inputModes: [...new Set([...(model.inputModes || []), 'multimodal_reference'])] };
}

export function getVideoPaidActivationDurations(model) {
  const activation = model.paidUsageActivation;
  const range = activation?.durationRange;
  if (range === undefined) return [...new Set((activation?.measuredCases || []).map(row => row.durationSeconds))];
  if (!range || !Number.isSafeInteger(range.minimum) || !Number.isSafeInteger(range.maximum)
    || range.minimum < 4 || range.maximum > 30 || range.minimum > range.maximum || range.step !== 1
    || range.evidenceBasis !== 'provider_documented_duration_range_user_authorized') {
    throw new TypeError('Video paid duration range is invalid.');
  }
  const durations = Array.from({ length: range.maximum - range.minimum + 1 }, (_, index) => range.minimum + index);
  if (!durations.every(value => model.durations?.includes(value))) {
    throw new TypeError('Video paid duration range exceeds model capabilities.');
  }
  return durations;
}

export function assertVideoPaidActivationRequest(model, request) {
  const activation = model.paidUsageActivation;
  if (!activation) return;
  const duration = Number(request.durationSeconds);
  const rangeDuration = activation.durationRange !== undefined
    && getVideoPaidActivationDurations(model).includes(duration);
  const matched = Array.isArray(activation.measuredCases) && activation.measuredCases.some(row =>
    row.resolution === request.resolution && (row.durationSeconds === duration || rangeDuration)
    && row.audioMode === request.audioMode
    && row.referenceCounts?.includes(Number(request.referenceImageCount)));
  if (activation.enabled !== true || model.paidUsageActivationVersion !== activation.version
    || request.inputMode !== 'multimodal_reference' || request.aspectRatio !== '9:16'
    || Number(request.fps ?? 24) !== 24 || Number(request.inputVideoSeconds ?? 0) !== 0
    || Number(request.outputCount ?? 1) !== 1 || (request.serviceTier && request.serviceTier !== 'online')
    || !Number.isInteger(duration) || !model.durations?.includes(duration)
    || (activation.durationRange !== undefined && !rangeDuration)
    || !matched) throw new TypeError('Video request is outside the authorized paid activation profile.');
}
