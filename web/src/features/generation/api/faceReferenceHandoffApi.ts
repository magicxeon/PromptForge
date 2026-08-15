import { z } from 'zod';
import { apiRequest } from '../../../lib/api/apiClient';

export const faceReferenceDestinationSchema = z.enum([
  'character_sheet',
  'scene_builder',
  'playground'
]);

export const faceReferenceHandoffSchema = z.object({
  handoffVersion: z.literal(1),
  destination: faceReferenceDestinationSchema,
  referenceRole: z.literal('face_reference'),
  referenceValue: z.object({
    source: z.literal('history'),
    jobId: z.string(),
    imageUrl: z.string(),
    referenceId: z.string().nullable()
  }),
  source: z.object({
    type: z.enum(['generation', 'community_post']),
    id: z.string(),
    ownerUserId: z.string(),
    ownerUsername: z.string().nullable()
  }),
  attribution: z.object({
    creatorDisplayName: z.string().nullable(),
    communityPostId: z.string().nullable()
  }),
  authorizationToken: z.string(),
  expiresAt: z.string()
});

export type FaceReferenceDestination = z.infer<typeof faceReferenceDestinationSchema>;
export type FaceReferenceHandoff = z.infer<typeof faceReferenceHandoffSchema>;
export type FaceReferenceSource = {
  sourceType: 'generation' | 'community_post';
  sourceId: string;
};

export function requestFaceReferenceHandoff(
  source: FaceReferenceSource,
  destination: FaceReferenceDestination
) {
  return apiRequest('/api/reference-handoffs/face', {
    method: 'POST',
    body: { ...source, destination },
    schema: faceReferenceHandoffSchema
  });
}
