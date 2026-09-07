import * as Tabs from '@radix-ui/react-tabs';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Coins, FileClock, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Button } from '../../../components/ui/Button';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getFinanceInventory } from '../api/financeApi';
import { AdminWorkspaceLayout } from '../components/AdminWorkspaceLayout';
import { FinanceReports } from '../components/FinanceReports';
import { FinanceRates } from '../components/FinanceRates';
import { FinanceDrafts } from '../components/FinanceDrafts';
import '../../../styles/admin-finance.css';

export function AdminFinanceRoute() {
  const { actor } = useActor();
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState('reports');
  const [model, setModel] = useState('');
  const [dirty, setDirty] = useState(false);
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm(t('finance.discardDraft'))) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, t]);
  const allowed = actor?.role === 'admin';
  const query = useQuery({
    queryKey: ['admin', 'finance', actor?.userId, 'inventory'],
    queryFn: getFinanceInventory,
    enabled: allowed,
    retry: false,
  });
  if (!allowed) return <ErrorState title={t('finance.accessRequired')} />;
  const tabs = [
    { id: 'reports', icon: BarChart3 },
    { id: 'rates', icon: Coins },
    { id: 'versions', icon: FileClock },
    { id: 'accounts', icon: Wallet },
  ];
  return (
    <AdminWorkspaceLayout
      eyebrow={t('admin.navigation.label')}
      title={t('finance.title')}
    >
      <div className="admin-finance">
        <Tabs.Root
          value={tab}
          onValueChange={(next) => {
            if (dirty && !window.confirm(t('finance.discardDraft'))) return;
            setDirty(false);
            setTab(next);
          }}
        >
          <Tabs.List className="finance-tabs" aria-label={t('finance.title')}>
            {tabs.map((item) => (
              <Tabs.Trigger key={item.id} value={item.id}>
                <item.icon size={16} aria-hidden="true" />
                {t(`finance.tabs.${item.id}`)}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {query.isLoading ? (
            <LoadingState label={t('finance.loading')} />
          ) : query.isError || !query.data ? (
            <>
              <ErrorState
                title={t('finance.loadFailed')}
                description={t('finance.accessGate')}
              />
              <Button onClick={() => void query.refetch()}>
                {t('finance.refresh')}
              </Button>
            </>
          ) : (
            <>
              <Tabs.Content value="reports">
                <FinanceReports inventory={query.data} />
              </Tabs.Content>
              <Tabs.Content value="rates">
                <FinanceRates
                  inventory={query.data}
                  onDraft={(key) => {
                    setModel(key);
                    setTab('versions');
                  }}
                />
              </Tabs.Content>
              <Tabs.Content value="versions">
                <FinanceDrafts
                  inventory={query.data}
                  modelKey={model}
                  onModel={setModel}
                  onDirty={setDirty}
                />
              </Tabs.Content>
              <Tabs.Content value="accounts">
                <FinanceDrafts
                  agreement
                  inventory={query.data}
                  modelKey={model}
                  onModel={setModel}
                  onDirty={setDirty}
                />
              </Tabs.Content>
            </>
          )}
        </Tabs.Root>
      </div>
    </AdminWorkspaceLayout>
  );
}
