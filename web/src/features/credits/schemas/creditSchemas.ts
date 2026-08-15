import { z } from 'zod';

export const creditAccountResponseSchema = z.object({
  account: z.object({
    userId: z.string(),
    availableCredits: z.number(),
    reservedCredits: z.number(),
    status: z.string()
  }).passthrough()
});

export const creditLedgerPageSchema = z.object({
  items: z.array(z.object({
    ledgerEntryId: z.string(),
    operationType: z.string(),
    amountCredits: z.number(),
    availableAfter: z.number().optional(),
    reservedAfter: z.number().optional(),
    reasonCode: z.string().optional(),
    createdAt: z.string()
  }).passthrough()).default([]),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean().default(false)
}).passthrough();
