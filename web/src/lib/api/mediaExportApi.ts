import { z } from 'zod';
import { apiRequest } from './apiClient';

export type MediaExportRequest = { kind: 'look_sheet'; jobId: string } | {
  kind: 'comparison'; setId: string; runId: string; layout: 'auto' | 'side_by_side' | 'stacked';
  outputIds?: string[]; format?: 'png' | 'jpeg'; size?: 'standard' | 'high'; locale?: 'en' | 'th';
};
export type ComparisonExportRequest = Extract<MediaExportRequest, { kind: 'comparison' }>;
const comparisonExportMetadata = z.object({
  width: z.number().int().positive().max(8192), height: z.number().int().positive().max(8192),
  count: z.number().int().min(2).max(4), mimeType: z.enum(['image/png', 'image/jpeg']),
  presetId: z.enum(['portrait-2', 'portrait-3', 'portrait-4', 'landscape-2', 'landscape-3', 'landscape-4']),
  layoutVersion: z.literal('comparison-black-v1'),
  filename: z.string().regex(/^momelo-comparison-[2-4]-(portrait|landscape)-[2-4]-\d{8}-\d{6}\.(png|jpg)$/),
  warnings: z.array(z.object({ code: z.enum(['LOW_RESOLUTION', 'MIXED_RATIOS', 'MISSING_LABEL']), index: z.number().int().min(0).max(3).optional() })).max(12)
});
export type ComparisonExportMetadata = z.infer<typeof comparisonExportMetadata>;
export async function requestComparisonExport(body: ComparisonExportRequest, signal: AbortSignal) {
  let metadata: unknown;
  const blob = await apiRequest('/api/media/exports', { method: 'POST', body, signal,
    responseType: 'blob', schema: z.instanceof(Blob), onResponseHeaders: headers => {
      metadata = JSON.parse(headers.get('X-Momelo-Export') || 'null');
    } });
  const details = comparisonExportMetadata.parse(metadata);
  if (!blob.size || blob.type !== details.mimeType || details.width * details.height > 24_000_000) throw new Error('Invalid export image');
  return { blob, ...details };
}
export function requestMediaExport(body: MediaExportRequest, signal: AbortSignal) {
  return apiRequest('/api/media/exports', { method: 'POST', body, signal,
    responseType: 'blob', schema: z.instanceof(Blob) });
}
