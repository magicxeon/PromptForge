import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { ApiError } from '../../../lib/api/apiError';
import { estimateGeneration, generationPayload, submitGeneration, type GenerationRequestDraft } from '../api/generationApi';
import { executeLookSheetEnhancement, quoteLookSheetEnhancement, readLookSheetEnhancement } from '../api/lookSheetEnhancementApi';

export type EnhancementSelection = { id: string; requestKey: string;
  imageRequest?: { requestId: string; estimateId: string } };
export type LookSheetEnhancementControl = {
  enabled: boolean; operation: EnhancementSelection | null;
  onEnabledChange: (value: boolean) => void;
  onOperation: (value: EnhancementSelection | null) => void;
};
export const lookSheetRenderKey = (draft: GenerationRequestDraft | null) => draft
  ? JSON.stringify(generationPayload({ ...draft, lookSheetEnhancementId: null })) : '';

export function useLookSheetRender({ draft, pricedDraft, valid, control }: {
  draft: GenerationRequestDraft; pricedDraft: GenerationRequestDraft | null;
  valid: boolean; control?: LookSheetEnhancementControl;
}) {
  const { t } = useTranslation('playground');
  const client = useQueryClient();
  const actorId = getActiveActorId();
  const ownsDocument = Boolean(control && draft.lookSheetDefinition);
  const key = ownsDocument ? lookSheetRenderKey(draft) : '';
  const pricedKey = ownsDocument ? lookSheetRenderKey(pricedDraft) : '';
  const operation = control?.operation?.requestKey === key ? control.operation : null;
  const enabled = Boolean(control?.enabled && draft.lookSheetDefinition);
  const [stage, setStage] = useState<'idle' | 'enhancing' | 'rendering'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [rejectedId, setRejectedId] = useState<string | null>(null);
  const busy = useRef(false);
  const latest = useRef({ key, actorId, mounted: true });
  latest.current.key = key; latest.current.actorId = actorId;
  useEffect(() => { latest.current.mounted = true; return () => { latest.current.mounted = false; }; }, []);
  useEffect(() => { setError(null); }, [key, enabled]);
  const saved = useQuery({ queryKey: ['look-sheet-enhancement', actorId, operation?.id],
    queryFn: () => readLookSheetEnhancement(operation!.id), enabled: Boolean(operation),
    staleTime: Infinity, retry: false });
  const record = saved.data;
  const readyId = record?.status === 'succeeded' && record.id !== rejectedId && Date.parse(record.artifactExpiresAt) > Date.now() ? record.id : null;
  const price = useQuery({ queryKey: ['look-sheet-enhancement-price', actorId, pricedKey],
    queryFn: () => quoteLookSheetEnhancement(pricedDraft!),
    enabled: enabled && valid && Boolean(pricedDraft?.provider) && key === pricedKey && !operation,
    staleTime: 20_000, retry: false, gcTime: 60_000 });
  const resumableQuote = record?.status === 'quoted' && Date.parse(record.expiresAt) > Date.now() ? record : null;
  const activeQuote = operation ? resumableQuote : price.data;
  const fee = !enabled || readyId ? 0 : activeQuote?.credits;
  const blocked = enabled && (!valid || key !== pricedKey || saved.isFetching
    || (!readyId && (price.isFetching || !activeQuote || Date.parse(activeQuote.expiresAt) <= Date.now())));
  const fail = (reason: string) => Object.assign(new Error(t(`lookSheet.auto.${reason}`)), { code: `look_sheet_${reason}` });

  async function submit(source: GenerationRequestDraft, displayedImageCredits: number | undefined) {
    if (busy.current) throw fail('busy');
    if (blocked || displayedImageCredits === undefined || !control) throw fail('priceRequired');
    busy.current = true;
    setError(null);
    const assertCurrent = () => {
      if (!latest.current.mounted || latest.current.key !== key || getActiveActorId() !== actorId) throw fail('changed');
    };
    let selected = operation;
    let newImageRequest = false;
    try {
      assertCurrent();
      // Unknown image-submit outcomes replay the exact accepted request, never a new purchase.
      if (selected?.imageRequest && readyId) {
        setStage('rendering');
        const response = await submitGeneration({ ...source, lookSheetEnhancementId: readyId },
          selected.imageRequest.estimateId, selected.imageRequest.requestId);
        assertCurrent();
        control.onOperation({ id: selected.id, requestKey: key });
        return response;
      }
      const before = await estimateGeneration({ ...source, lookSheetEnhancementId: readyId });
      assertCurrent();
      if (before.estimate.estimatedCredits > displayedImageCredits) throw fail('priceChanged');
      const textFee = readyId ? 0 : activeQuote?.credits;
      if (textFee === undefined || before.account.availableCredits < before.estimate.estimatedCredits + textFee) throw fail('insufficient');
      let artifactId = readyId;
      if (!artifactId) {
        const quote = activeQuote;
        if (!quote || Date.parse(quote.expiresAt) <= Date.now()) throw fail('priceRequired');
        selected = { id: quote.id, requestKey: key };
        control.onOperation(selected);
        setStage('enhancing');
        const result = await executeLookSheetEnhancement(source, quote.id);
        assertCurrent();
        await client.cancelQueries({ queryKey: ['look-sheet-enhancement', actorId, quote.id] });
        client.setQueryData(['look-sheet-enhancement', actorId, quote.id], result);
        if (result.status !== 'succeeded') throw fail('enhancementStopped');
        artifactId = result.id;
      }
      assertCurrent();
      setStage('rendering');
      const enhanced = { ...source, lookSheetEnhancementId: artifactId };
      const estimate = await estimateGeneration(enhanced);
      assertCurrent();
      if (estimate.estimate.estimatedCredits > displayedImageCredits) throw fail('priceChanged');
      if (!estimate.account.canAfford) throw fail('insufficient');
      const request = { requestId: `gen_${crypto.randomUUID()}`, estimateId: estimate.estimate.estimateId };
      selected = { id: artifactId!, requestKey: key, imageRequest: request };
      control.onOperation(selected);
      newImageRequest = true;
      const response = await submitGeneration(enhanced, request.estimateId, request.requestId);
      assertCurrent();
      control.onOperation({ id: artifactId!, requestKey: key });
      return response;
    } catch (cause) {
      if (newImageRequest && selected && cause instanceof ApiError
        && ['credit_estimate_expired', 'credit_estimate_stale', 'credit_insufficient'].includes(cause.code)
        && latest.current.mounted && latest.current.key === key && getActiveActorId() === actorId) {
        control.onOperation({ id: selected.id, requestKey: key });
      }
      if (latest.current.mounted && getActiveActorId() === actorId) setError(cause as Error);
      throw cause;
    } finally {
      busy.current = false;
      if (latest.current.mounted && getActiveActorId() === actorId) {
        setStage('idle');
        void client.invalidateQueries({ queryKey: ['credits'] });
        void client.invalidateQueries({ queryKey: ['generation-estimate', actorId] });
      }
    }
  }
  return { enabled, fee, readyId, blocked, stage, record, error: error || saved.error || price.error,
    stale: Boolean(record && record.id === rejectedId),
    invalidate: () => setRejectedId(record?.id || null),
    pricing: price.isFetching, refreshing: saved.isFetching, submit,
    refresh: async () => { if (operation) await saved.refetch(); else await price.refetch(); },
    retry: () => { if (!busy.current) { control?.onOperation(null); setError(null); void price.refetch(); } }
  };
}
export type LookSheetRenderState = ReturnType<typeof useLookSheetRender>;
