import { validateProfitMarkup } from '../credits/CostPlusPricing.js';

export function validatePricingDraft(input = {}) {
  const values = input.values;
  const errors = [];
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return { valid: false, errors: [{ path: ['values'], code: 'object_required' }], warnings: [] };
  }
  const fields = new Set(['profitMarkupPercentByMedia', 'baseActiveRevisionId', 'commandId', 'reason']);
  for (const key of Object.keys(values)) if (!fields.has(key)) errors.push({ path: ['values', key], code: 'unsupported_field' });
  try { validateProfitMarkup(values.profitMarkupPercentByMedia); }
  catch { errors.push({ path: ['values', 'profitMarkupPercentByMedia'], code: 'percentages_0_to_1000_required' }); }
  if (values.baseActiveRevisionId !== null && (typeof values.baseActiveRevisionId !== 'string'
    || !/^cfgrev_[a-zA-Z0-9_-]{1,150}$/.test(values.baseActiveRevisionId))) {
    errors.push({ path: ['values', 'baseActiveRevisionId'], code: 'active_revision_required' });
  }
  if (typeof values.reason !== 'string' || values.reason.trim().length < 3 || values.reason.length > 500) {
    errors.push({ path: ['values', 'reason'], code: 'bounded_reason_required' });
  }
  if (typeof values.commandId !== 'string' || !/^[a-zA-Z0-9:_-]{8,160}$/.test(values.commandId)) {
    errors.push({ path: ['values', 'commandId'], code: 'invalid_command' });
  }
  return { valid: errors.length === 0, errors, warnings: ['New quotes only; existing accepted prices remain unchanged.'] };
}
