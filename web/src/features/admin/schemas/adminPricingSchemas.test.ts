import { describe, expect, it } from 'vitest';
import { adminConfigurationStateSchema, adminPricingRevisionSchema } from './adminSchemas';

describe('Admin Pricing response schemas', () => {
  const activePricing = { pricingPolicyVersion: 'policy-v1', revisionId: null,
    profitMarkupPercentByMedia: { text: 0, image: 30.5, video: 1000 } };
  it('retains active percentages and allows legacy non-pricing revision payloads', () => {
    const result = adminConfigurationStateSchema.parse({ activePricing, activeRevisionIds: {}, revisions: [
      { id: 'cfgrev_provider', scope: 'providers', status: 'draft', createdAt: '2026-10-02', createdByUserId: 'usr_admin', validation: {} }
    ] });
    expect(result.activePricing).toEqual(activePricing);
  });
  it.each([-1, 1001, '30', Infinity])('rejects invalid markup %s at the response boundary', text => {
    expect(adminConfigurationStateSchema.safeParse({ activePricing: { ...activePricing,
      profitMarkupPercentByMedia: { ...activePricing.profitMarkupPercentByMedia, text } },
    activeRevisionIds: {}, revisions: [] }).success).toBe(false);
  });
  it('requires the immutable pricing draft values and numeric version for mutation responses', () => {
    const row = { id: 'cfgrev_pricing', scope: 'pricing', status: 'active', version: 2,
      createdAt: '2026-10-02', createdByUserId: 'usr_admin', publishedAt: null, values: {
        profitMarkupPercentByMedia: activePricing.profitMarkupPercentByMedia,
        baseActiveRevisionId: null, commandId: 'pricing_command', reason: 'Retail review' } };
    expect(adminPricingRevisionSchema.parse(row).version).toBe(2);
    expect(adminPricingRevisionSchema.safeParse({ ...row, version: '2' }).success).toBe(false);
    expect(adminPricingRevisionSchema.safeParse({ ...row, values: {} }).success).toBe(false);
  });
});
