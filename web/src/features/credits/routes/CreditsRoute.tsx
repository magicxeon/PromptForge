import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { getCreditAccount, grantMockCredits, listCreditLedger } from '../api/creditApi';
import { useActor } from '../../../lib/auth/ActorProvider';
import { queryKeys } from '../../../lib/api/queryKeys';

export function CreditsRoute() {
  const { t } = useTranslation('react-ui');
  const { actor, mockSwitcherEnabled } = useActor();
  const actorId = actor?.userId || 'loading';
  const queryClient = useQueryClient();
  const account = useQuery({ queryKey: queryKeys.credits(actorId), queryFn: getCreditAccount, enabled: Boolean(actor) });
  const ledger = useInfiniteQuery({
    queryKey: queryKeys.creditLedger(actorId),
    queryFn: ({ pageParam }) => listCreditLedger(pageParam),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor || undefined
  });
  const grant = useMutation({
    mutationFn: () => grantMockCredits(100),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.credits(actorId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.creditLedger(actorId) });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
    }
  });
  if (account.isLoading) return <LoadingState label={t('ui.credits.loading')} />;
  if (account.isError || !account.data) return <ErrorState title={t('ui.credits.unavailable')} description={account.error?.message} />;
  const entries = ledger.data?.pages.flatMap(page => page.items) || [];
  return (
    <main>
      <header className="mb-5 border-b border-[var(--mpf-border)] pb-5"><span className="text-xs font-bold uppercase text-cyan-300">{t('ui.credits.kicker')}</span><h1 className="mb-1 mt-2 text-3xl">{t('ui.credits.title')}</h1><p className="m-0 text-sm text-[var(--mpf-text-muted)]">{t('ui.credits.description')}</p></header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Surface className="p-5"><Coins className="size-7 text-amber-300" /><strong className="mt-5 block text-4xl">{account.data.account.availableCredits}</strong><span className="text-sm text-[var(--mpf-text-muted)]">{t('ui.credits.available')}</span></Surface>
        <Surface className="p-5"><strong className="block text-4xl">{account.data.account.reservedCredits}</strong>&nbsp;<span className="text-sm text-[var(--mpf-text-muted)]">{t('ui.credits.reserved')} </span> &nbsp;&nbsp; {actor?.isMockActor || mockSwitcherEnabled ? <Button className="mt-5" icon={<Plus className="size-4" />} disabled={grant.isPending} onClick={() => grant.mutate()}>{t('ui.credits.addMock')}</Button> : null}</Surface>
      </div>
      <h2 className="mt-8 text-xl">{t('ui.credits.ledger')}</h2>
      <div className="overflow-x-auto border border-[var(--mpf-border)]"><table className="w-full min-w-[680px] border-collapse text-left text-sm"><thead className="bg-white/5 text-[var(--mpf-text-muted)]"><tr><th className="p-3">{t('ui.credits.operation')}</th><th className="p-3">{t('ui.credits.title')}</th><th className="p-3">{t('ui.credits.reason')}</th><th className="p-3">{t('ui.credits.time')}</th></tr></thead><tbody>{entries.map(entry => <tr key={entry.ledgerEntryId} className="border-t border-[var(--mpf-border)]"><td className="p-3">{entry.operationType}</td><td className="p-3">{entry.amountCredits}</td><td className="p-3">{entry.reasonCode || '-'}</td><td className="p-3">{new Date(entry.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>
      {ledger.hasNextPage ? <div className="mt-4 flex justify-center"><Button onClick={() => void ledger.fetchNextPage()}>{t('ui.action.loadMore')}</Button></div> : null}
    </main>
  );
}
