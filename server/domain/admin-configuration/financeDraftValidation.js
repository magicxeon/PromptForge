const SCOPES = new Set(['finance_provider_cost', 'finance_supplier_agreement']);
const COMMON = [
  'baselineRevision',
  'modelKey',
  'providerId',
  'modelId',
  'retailPolicyVersion',
  'versionLabel',
  'announcedAt',
  'intendedEffectiveAt',
  'reason',
  'evidence',
  'commandId',
];
const COST = ['unitCostUsd', 'unitQuantity', 'billingMetric', 'dimension'];
const AGREEMENT = [
  'billingAccountKey',
  'fundingPoolKey',
  'billingMode',
  'currency',
];
export const isFinanceDraftScope = (scope) => SCOPES.has(scope);

export function validateFinanceDraft(input) {
  const errors = [];
  const values = input.values || {};
  if (
    typeof values !== 'object' ||
    Array.isArray(values) ||
    Object.keys(values).length > 24
  ) {
    return {
      valid: false,
      errors: [{ path: ['values'], code: 'bounded_object_required' }],
      warnings: [],
    };
  }
  const allowed = new Set([
    ...COMMON,
    ...(input.scope === 'finance_provider_cost' ? COST : AGREEMENT),
  ]);
  const add = (field, code) => errors.push({ path: ['values', field], code });
  for (const [key, value] of Object.entries(values)) {
    if (!allowed.has(key)) add(key, 'unsupported_field');
    if (typeof value !== 'string' || value.length > 1000)
      add(key, 'bounded_string_required');
  }
  const required = [
    ...COMMON.filter((key) => key !== 'announcedAt'),
    ...(input.scope === 'finance_provider_cost' ? COST : AGREEMENT),
  ];
  for (const key of required)
    if (typeof values[key] !== 'string' || !values[key].trim())
      add(key, 'required');
  for (const key of ['announcedAt', 'intendedEffectiveAt']) {
    if (
      values[key] &&
      (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(values[key]) ||
        !Number.isFinite(Date.parse(values[key])) ||
        new Date(values[key]).toISOString() !== values[key])
    )
      add(key, 'utc_date_required');
  }
  if (
    values.announcedAt &&
    Date.parse(values.announcedAt) > Date.parse(values.intendedEffectiveAt)
  )
    add('announcedAt', 'after_effective_date');
  if (!/^[a-f0-9]{64}$/.test(values.baselineRevision || ''))
    add('baselineRevision', 'invalid_revision');
  if (!/^[a-zA-Z0-9:_-]{8,160}$/.test(values.commandId || ''))
    add('commandId', 'invalid_command');
  if (typeof values.reason !== 'string' || values.reason.trim().length < 3)
    add('reason', 'meaningful_reason_required');
  if (input.scope === 'finance_provider_cost') {
    if (!/^[1-9]\d{0,11}$/.test(values.unitQuantity || ''))
      add('unitQuantity', 'positive_unit_quantity_required');
    if (!/^(0|[1-9]\d{0,7})(\.\d{1,12})?$/.test(values.unitCostUsd || ''))
      add('unitCostUsd', 'decimal_required');
    if (
      ![
        'returned_image',
        'output_second',
        'completion_token',
        'input_token',
        'output_token',
        'cached_input_token',
        'request',
      ].includes(values.billingMetric)
    )
      add('billingMetric', 'invalid_unit');
  } else {
    if (!['prepaid', 'postpaid', 'hybrid'].includes(values.billingMode))
      add('billingMode', 'invalid_billing_mode');
    if (!/^[A-Z]{3}$/.test(values.currency || ''))
      add('currency', 'currency_required');
    for (const key of ['billingAccountKey', 'fundingPoolKey'])
      if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(values[key] || ''))
        add(key, 'invalid_identifier');
  }
  return {
    valid: !errors.length,
    errors,
    warnings: ['finance_draft_only_no_runtime_change'],
  };
}
