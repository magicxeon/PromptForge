import { z } from 'zod';

export const fashionQuoteSchema = z.object({
  quote: z.object({
    id: z.string(),
    estimatedCredits: z.number(),
    maximumCredits: z.number(),
    operationCount: z.number(),
    outputCount: z.number(),
    expiresAt: z.string(),
    routeSnapshot: z.object({ providerId: z.string(), modelId: z.string() })
  }).passthrough(),
  resolvedPlan: z.object({
    productCount: z.number(),
    outputCount: z.number(),
    route: z.object({ providerId: z.string(), modelId: z.string() })
  }).passthrough()
});

const fashionOperationSchema = z.object({
  operationId: z.string(),
  productItemKey: z.string(),
  productName: z.string().optional(),
  jobId: z.string(),
  status: z.string(),
  result: z.object({ imageUrl: z.string().nullable().optional() }).nullable().optional(),
  error: z.union([z.string(), z.object({ message: z.string().optional() }).passthrough()]).nullable().optional()
}).passthrough();

export const fashionRunSchema = z.object({
  id: z.string(),
  status: z.string(),
  operations: z.array(fashionOperationSchema)
}).passthrough();

export const fashionAssetSchema = z.object({
  assetId: z.string(),
  imageUrl: z.string()
});

export type FashionQuote = z.infer<typeof fashionQuoteSchema>['quote'];
export type FashionRun = z.infer<typeof fashionRunSchema>;
