import { z } from 'zod';

const nullableAmount = z.number().int().nonnegative().nullable();
const rateSchema = z.object({ dimension: z.string(), value: z.string() });
export const financeModelSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  providerName: z.string(),
  modelId: z.string(),
  displayName: z.string(),
  mediaType: z.string(),
  enabled: z.boolean(),
  workflows: z.array(z.string()),
  coverage: z.string(),
  rates: z.array(rateSchema),
  retail: z.array(rateSchema),
  rateVersion: z.string().nullable(),
  effectiveAt: z.string().nullable(),
  billingMetric: z.string().nullable(),
  sourceDate: z.string().nullable(),
  source: z.string().nullable(),
});
export const financeInventorySchema = z.object({
  revision: z.string(),
  retailPolicyVersion: z.string(),
  effectiveAt: z.string().nullable(),
  pricingFxThbPerUsd: z.string(),
  creditsPerThbAssumption: z.string(),
  rows: z.array(financeModelSchema),
});
export const financeReportSchema = z.object({
  asOf: z.string(),
  revision: z.string(),
  timezone: z.string(),
  year: z.number(),
  month: z.number(),
  page: z.number(),
  pageSize: z.number(),
  sourceStatus: z.string(),
  invalidCount: z.number(),
  unallocatedCount: z.number(),
  totals: z.object({
    capturedCredits: nullableAmount,
    returnedCredits: nullableAmount,
    eventCount: z.number(),
  }),
  periods: z.array(
    z.object({
      period: z.string(),
      status: z.string(),
      capturedCredits: nullableAmount,
      returnedCredits: nullableAmount,
      eventCount: z.number(),
      cashReceived: z.null(),
      supplierPayments: z.null(),
      usageCost: z.null(),
      profit: z.null(),
      closingBalance: z.null(),
    }),
  ),
  events: z.array(
    z.object({
      ledgerEntryId: z.string(),
      operationType: z.string(),
      amountCredits: z.number(),
      createdAt: z.union([z.string(), z.number()]),
      period: z.string(),
      relatedJobId: z.string().nullable().optional(),
      reservationId: z.string().nullable().optional(),
      estimateId: z.string().nullable().optional(),
      providerId: z.string().nullable(),
      modelId: z.string().nullable(),
      pricingPolicyVersion: z.string().nullable().optional(),
    }),
  ),
  hasMore: z.boolean(),
  sources: z.record(z.string(), z.string()),
});
export const financeDraftSchema = z.object({
  id: z.string(),
  scope: z.string(),
  status: z.string(),
  createdAt: z.string(),
  values: z.record(z.string(), z.string()),
});
export const financeDraftsSchema = z.object({
  publicationAvailable: z.literal(false),
  reason: z.string(),
  revisions: z.array(financeDraftSchema),
});
export type FinanceModel = z.infer<typeof financeModelSchema>;
export type FinanceInventory = z.infer<typeof financeInventorySchema>;
export type FinanceReport = z.infer<typeof financeReportSchema>;
