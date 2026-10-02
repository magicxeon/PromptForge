import { z } from 'zod';
import { apiRequest } from '../../../lib/api/apiClient';
import { ApiError } from '../../../lib/api/apiError';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { i18n } from '../../../lib/i18n/i18n';
import { cinematicWritingRequestFingerprint, readCinematicWritingReceipts, removeCinematicWritingReceipt, saveCinematicWritingReceipt } from '../state/cinematicWritingRecovery';

export const cinematicWritingOperationSchema = z.enum([
  'brief', 'full_story', 'characters', 'chapter_outline', 'chapters', 'scenes', 'shots', 'environment', 'wardrobe', 'story_plan', 'scene_direction'
]);
export const cinematicWritingQuoteSchema = z.object({
  id: z.string().min(1).nullable(),
  operation: cinematicWritingOperationSchema,
  credits: z.number().int().nonnegative(),
  expiresAt: z.iso.datetime().nullable(),
  billingStatus: z.enum(['paid', 'free', 'pending'])
}).refine(value => value.billingStatus !== 'free' || value.credits === 0)
  .refine(value => value.billingStatus !== 'paid' || (value.credits > 0 && value.id !== null && value.expiresAt !== null));

export type CinematicWritingOperation = z.infer<typeof cinematicWritingOperationSchema>;
export type CinematicWritingQuote = z.infer<typeof cinematicWritingQuoteSchema>;
export type WritingConsentRequest = {
  actorId: string;
  projectId: string | null;
  quote: CinematicWritingQuote;
  mandatory: boolean;
  title?: string;
  description?: string;
  scope?: string;
  signal?: AbortSignal;
  trigger?: HTMLElement | null;
  recovery?: { status: 'succeeded' | 'delivered'; artifactExpiresAt: string; result: unknown };
};
type ConsentHandler = (request: WritingConsentRequest) => Promise<boolean>;
export type WritingSettlement = { actorId: string; operationId: string; status: 'succeeded' | 'failed' | 'refunded' };
type SettlementHandler = (settlement: WritingSettlement) => void | Promise<void>;
let consentHandler: ConsentHandler | null = null;
let settlementHandler: SettlementHandler | undefined;
let busy = false;
let consentScope: Pick<WritingConsentRequest, 'title' | 'description' | 'scope' | 'signal' | 'trigger'> | null = null;

export function withCinematicWritingConsentScope(scope: NonNullable<typeof consentScope>, action: () => void) {
  const previous = consentScope;
  consentScope = scope;
  try { action(); } finally { consentScope = previous; }
}

export class CinematicWritingCancelled extends Error {
  constructor() {
    super('');
    this.name = 'CinematicWritingCancelled';
  }
}

export function registerCinematicWritingConsent(handler: ConsentHandler, options?: { onSettled?: SettlementHandler }) {
  consentHandler = handler;
  settlementHandler = options?.onSettled;
  return () => { if (consentHandler === handler) { consentHandler = null; settlementHandler = undefined; } };
}

function billingError(key: string) {
  return new Error(String(i18n.t(`cinematic:cinematic.writingBilling.${key}`)));
}

export async function withCinematicWritingQuote<T>({ projectId, operation, input, sceneId, assignmentId, mandatory = false, resultSchema }: {
  projectId: string | null;
  operation: CinematicWritingOperation;
  input: Record<string, unknown>;
  sceneId?: string;
  assignmentId?: string;
  mandatory?: boolean;
  resultSchema?: z.ZodType<T>;
}, execute: (body: Record<string, unknown>) => Promise<T>): Promise<T> {
  if (busy) throw billingError('busy');
  const snapshot = structuredClone(input);
  busy = true;
  const actorId = getActiveActorId();
  const handler = consentHandler;
  const onSettled = settlementHandler;
  const notified = new Set<string>();
  const notifySettled = async (operationId: string, status: WritingSettlement['status']) => {
    if (!onSettled || notified.has(operationId)) return;
    notified.add(operationId);
    // Refresh failure must not turn a delivered result into another billable attempt.
    try { await onSettled({ actorId, operationId, status }); } catch { /* Query invalidation is best effort. */ }
  };
  const scope = consentScope;
  const trigger = scope?.trigger ?? (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const assertActor = () => {
    if (getActiveActorId() !== actorId || consentHandler !== handler || scope?.signal?.aborted) throw new CinematicWritingCancelled();
  };
  try {
    const request = { actorId, projectId, operation, input: snapshot, sceneId: sceneId || null, assignmentId: assignmentId || null };
    const fingerprint = operation === 'full_story' ? null : await cinematicWritingRequestFingerprint(request);
    assertActor();
    let saved;
    try {
      saved = fingerprint ? readCinematicWritingReceipts(actorId).find(item => item.projectId === projectId
        && item.operation === operation && item.sceneId === (sceneId || null) && item.assignmentId === (assignmentId || null)) : undefined;
    } catch { throw billingError('storageUnavailable'); }
    async function recover(id: string, expectedFingerprint: string | null): Promise<{ result: T } | { quote: CinematicWritingQuote }> {
      assertActor();
      const receipt = await getCinematicWritingOperation(projectId, id, resultSchema ?? z.unknown());
      assertActor();
      if (receipt.id !== id || receipt.operation !== operation) throw billingError('pending');
      if (['succeeded', 'delivered'].includes(receipt.status) && receipt.result != null) {
        if (receipt.status === 'succeeded') await notifySettled(id, 'succeeded');
        assertActor();
        if (!resultSchema) throw billingError('pending');
        if (expectedFingerprint !== fingerprint) {
          if (!handler) throw billingError('consentUnavailable');
          if (!await handler({ actorId, projectId, quote: cinematicWritingQuoteSchema.parse(receipt), mandatory: true, trigger,
            recovery: { status: receipt.status as 'succeeded' | 'delivered', artifactExpiresAt: receipt.artifactExpiresAt, result: receipt.result }, signal: scope?.signal })) {
            throw new CinematicWritingCancelled();
          }
          assertActor();
          if (receipt.status === 'succeeded') removeCinematicWritingReceipt(actorId, id);
          throw new CinematicWritingCancelled();
        }
        if (receipt.status === 'succeeded') removeCinematicWritingReceipt(actorId, id);
        return { result: resultSchema.parse(receipt.result) };
      }
      if (receipt.status === 'failed') {
        await notifySettled(id, 'failed');
        assertActor();
        removeCinematicWritingReceipt(actorId, id);
        throw billingError('failed');
      }
      if (receipt.status === 'quoted') {
        if (Date.parse(receipt.expiresAt) <= Date.now()) {
          removeCinematicWritingReceipt(actorId, id);
          throw billingError('expired');
        }
        if (expectedFingerprint !== fingerprint) throw billingError('previousRequest');
        return { quote: cinematicWritingQuoteSchema.parse(receipt) };
      }
      throw billingError('pending');
    }
    const existing = saved ? await recover(saved.id, saved.fingerprint) : null;
    if (existing && 'result' in existing) return existing.result;
    const quote = existing?.quote ?? await apiRequest(`${writingPath(projectId)}/quotes`, {
      method: 'POST', cache: 'no-store', schema: cinematicWritingQuoteSchema,
      body: { operation, input: snapshot, ...(sceneId ? { sceneId } : {}), ...(assignmentId ? { assignmentId } : {}) }
    });
    const assertCurrent = () => {
      assertActor();
      if (quote.operation !== operation || (quote.expiresAt !== null && Date.parse(quote.expiresAt) <= Date.now())) throw billingError('expired');
    };
    assertCurrent();
    if (quote.billingStatus === 'pending') throw billingError('pending');
    if (quote.billingStatus === 'paid') {
      if (!handler) throw billingError('consentUnavailable');
      if (!await handler({ actorId, projectId, quote, mandatory, ...scope, trigger })) throw new CinematicWritingCancelled();
    }
    assertCurrent();
    if (quote.billingStatus === 'paid' && quote.id && fingerprint) {
      try { saveCinematicWritingReceipt(actorId, { id: quote.id, fingerprint, projectId, operation, sceneId: sceneId || null, assignmentId: assignmentId || null }); }
      catch { throw billingError('storageUnavailable'); }
    }
    try {
      const result = await execute({ ...snapshot, ...(quote.id ? { writingQuoteId: quote.id } : {}) });
      assertActor();
      if (quote.billingStatus === 'paid' && quote.id) {
        const settlement = z.object({ billingStatus: z.string().optional() }).passthrough().safeParse(result);
        if (settlement.data?.billingStatus !== 'settlement_pending') {
          await notifySettled(quote.id, settlement.data?.billingStatus === 'free' ? 'refunded' : 'succeeded');
          assertActor();
          removeCinematicWritingReceipt(actorId, quote.id);
        }
      }
      return result;
    } catch (error) {
      if (quote.billingStatus !== 'paid' || !quote.id) throw error;
      const recovered = await recover(quote.id, fingerprint);
      if ('result' in recovered) return recovered.result;
      if (error instanceof ApiError && error.code === 'enhancement_stale') {
        removeCinematicWritingReceipt(actorId, quote.id);
        throw billingError('expired');
      }
      throw billingError('pending');
    }
  } finally {
    busy = false;
  }
}

function writingPath(projectId: string | null) {
  return projectId === null ? '/api/cinematic/writing' : `/api/cinematic/projects/${encodeURIComponent(projectId)}/writing`;
}

export function getCinematicWritingOperation<TSchema extends z.ZodType>(projectId: string | null, operationId: string, resultSchema: TSchema) {
  return apiRequest(`${writingPath(projectId)}/operations/${encodeURIComponent(operationId)}`, {
    cache: 'no-store', schema: z.object({
      id: z.string().min(1), operation: cinematicWritingOperationSchema,
      status: z.enum(['quoted', 'accepted', 'dispatching', 'delivered', 'succeeded', 'refund_pending', 'failed', 'reconciliation_required']),
      billingStatus: z.literal('paid'), credits: z.number().int().positive(),
      expiresAt: z.iso.datetime(), artifactExpiresAt: z.iso.datetime(), errorCode: z.string().nullable(),
      result: resultSchema.nullable().optional()
    })
  });
}
