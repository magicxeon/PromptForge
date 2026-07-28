import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { listHistory } from '../../history/api/historyApi';
import type { GenerationReferenceRole } from '../../generation/api/generationApi';
import { useActor } from '../../../lib/auth/ActorProvider';

export function HistoryReferencePicker({
  roles,
  selectedRole,
  onRoleChange,
  onPick
}: {
  roles: GenerationReferenceRole[];
  selectedRole: GenerationReferenceRole;
  onRoleChange: (role: GenerationReferenceRole) => void;
  onPick: (role: GenerationReferenceRole, imageUrl: string) => void;
}) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const history = useQuery({
    queryKey: ['history-reference-picker', actor?.userId || 'loading'],
    queryFn: () => listHistory(null, 'all'),
    enabled: Boolean(actor)
  });
  if (!roles.length) return null;
  return (
    <section className="border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="m-0 flex items-center gap-2 text-lg"><History className="size-5 text-cyan-300" />{t('ui.scene.historyReference')}</h2><select value={selectedRole} onChange={event => onRoleChange(event.target.value as GenerationReferenceRole)} className="h-10 border border-[var(--mpf-border)] bg-black/35 px-3 text-sm">{roles.map(role => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></div>
      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {history.data?.items.map(item => <button key={item.id} type="button" className="h-24 w-20 shrink-0 overflow-hidden border border-[var(--mpf-border)] bg-black" title={t('ui.scene.useAsReference', { role: selectedRole })} onClick={() => onPick(selectedRole, item.imageUrl)}><img src={apiMediaUrl(item.thumbnailUrl || item.imageUrl) || ''} alt="" className="h-full w-full object-cover object-top" /></button>)}
      </div>
    </section>
  );
}
