export function reconcileVideoDuration({
  model,
  plannedDurationSeconds,
  requestedDurationSeconds,
  resolution,
  referenceImageCount = 0
} = {}) {
  if (!model) throw new TypeError('Video model is required for duration reconciliation.');
  const planned = positiveNumber(plannedDurationSeconds, 'Planned video duration');
  const supportedDurations = eligibleDurations(model, { resolution, referenceImageCount });
  if (!supportedDurations.length) {
    throw durationError('video_duration_unavailable', 'The selected video model has no eligible duration for this request.');
  }
  const maximum = supportedDurations.at(-1);
  const durationControlMode = model.durationControlMode === 'prompted' ? 'prompted' : 'exact';
  if (planned > maximum) {
    throw durationError(
      'video_duration_split_required',
      `This ${planned}-second Shot exceeds the selected model's ${maximum}-second maximum. Split the Shot in Story Plan before generating video.`,
      409,
      { plannedDurationSeconds: planned, maximumDurationSeconds: maximum, supportedDurations }
    );
  }

  const requested = Number(requestedDurationSeconds);
  const requestedCanCover = supportedDurations.includes(requested) && requested >= planned;
  const renderDurationSeconds = requestedCanCover
    ? requested
    : supportedDurations.find(duration => duration >= planned);
  const trimDurationSeconds = durationControlMode === 'exact'
    ? roundDuration(renderDurationSeconds - planned)
    : 0;
  const exact = renderDurationSeconds === planned;

  return {
    plannedDurationSeconds: planned,
    renderDurationSeconds,
    trimDurationSeconds,
    durationControlMode,
    strategy: durationControlMode === 'prompted'
      ? 'prompt_target'
      : exact ? 'exact' : 'pad_and_trim',
    supportedDurations,
    requiresSplit: false,
    reasonCode: durationControlMode === 'prompted'
      ? 'video_duration_prompt_target'
      : exact ? 'video_duration_exact' : 'video_duration_padded_for_provider'
  };
}

export function eligibleDurations(model, { resolution, referenceImageCount = 0 } = {}) {
  const durations = [...new Set((model?.durations || [])
    .map(Number)
    .filter(value => Number.isFinite(value) && value > 0))]
    .sort((left, right) => left - right);
  if (model?.providerId === 'gemini'
    && String(model?.modelId || '').startsWith('veo-')
    && (resolution !== '720p' || Number(referenceImageCount) > 0)) {
    return durations.filter(duration => duration === 8);
  }
  return durations;
}

function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new TypeError(`${label} must be positive.`);
  return roundDuration(number);
}

function roundDuration(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function durationError(code, message, statusCode = 400, details = null) {
  return Object.assign(new Error(message), { code, statusCode, details });
}
