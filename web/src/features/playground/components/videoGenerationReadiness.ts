export type VideoGenerationReadinessReason =
  | 'submitting'
  | 'active_task'
  | 'prompt_required'
  | 'source_required'
  | 'model_unavailable'
  | 'quote_loading'
  | 'quote_failed'
  | 'quote_required'
  | 'insufficient_credits'
  | null;

export function getVideoGenerationReadiness(input: {
  submitting: boolean;
  hasActiveTask: boolean;
  hasPrompt: boolean;
  sourceReady: boolean;
  modelCanQuote: boolean;
  quoteFetching: boolean;
  quoteFailed: boolean;
  quoteAvailable: boolean;
  canAfford: boolean;
}) {
  let reason: VideoGenerationReadinessReason = null;
  if (input.submitting) reason = 'submitting';
  else if (input.hasActiveTask) reason = 'active_task';
  else if (!input.hasPrompt) reason = 'prompt_required';
  else if (!input.sourceReady) reason = 'source_required';
  else if (!input.modelCanQuote) reason = 'model_unavailable';
  else if (input.quoteFetching) reason = 'quote_loading';
  else if (input.quoteFailed) reason = 'quote_failed';
  else if (!input.quoteAvailable) reason = 'quote_required';
  else if (!input.canAfford) reason = 'insufficient_credits';
  return { ready: reason === null, reason };
}
