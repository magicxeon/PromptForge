import {
  readActorScopedDraft,
  writeActorScopedDraft
} from '../../../lib/persistence/actorScopedStorage';
import type { FashionReferenceAsset } from '../api/fashionBlueprintApi';

export const FASHION_DRAFT_SCHEMA_VERSION = 1;
const FEATURE = 'fashion-blueprint';

export type FashionProductDraft = {
  key: string;
  clientKey: string;
  name: string;
  sku: string;
  productType: 'top' | 'bottom' | 'dress' | 'clothing_set';
  outfitScope: 'full_look' | 'top_only' | 'bottom_only' | 'single_item';
  colorNotes: string;
  integrityLevel: 'creative' | 'balanced' | 'strict';
  references: Partial<Record<string, FashionReferenceAsset>>;
};

export type FashionDraft = {
  step: number;
  templatePostId: string | null;
  templateUseSessionId: string | null;
  characterProfileId: string | null;
  characterProfileContext: Record<string, unknown> | null;
  products: FashionProductDraft[];
  activeProductKey: string;
  qualityTier: 'draft' | 'selling_quality' | 'premium_campaign';
  routingMode: 'simple' | 'advanced';
  poseDirection: string;
  environmentDirection: string;
  runId: string | null;
};

export function readFashionDraft(actorId: string, fallback: FashionDraft) {
  return readActorScopedDraft({
    actorId,
    feature: FEATURE,
    schemaVersion: FASHION_DRAFT_SCHEMA_VERSION,
    fallback
  });
}

export function writeFashionDraft(actorId: string, payload: FashionDraft) {
  writeActorScopedDraft({
    actorId,
    feature: FEATURE,
    schemaVersion: FASHION_DRAFT_SCHEMA_VERSION,
    payload
  });
}
