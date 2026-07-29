import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HorizontalMediaCarousel } from '../../../components/media/HorizontalMediaCarousel';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { listHistory } from '../../history/api/historyApi';
import type { GenerationReferenceRole } from '../../generation/api/generationApi';
import { useActor } from '../../../lib/auth/ActorProvider';

const HISTORY_PREVIEW_LIMIT = 8;

export function HistoryReferencePicker({
  roles,
  selectedRole,
  onRoleChange,
  onPick,
  viewAllHref
}: {
  roles: GenerationReferenceRole[];
  selectedRole: GenerationReferenceRole;
  onRoleChange: (role: GenerationReferenceRole) => void;
  onPick: (role: GenerationReferenceRole, imageUrl: string) => void;
  viewAllHref?: string | null;
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
    <section className="mt-3 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-4">
      <HorizontalMediaCarousel
        heading={<h2 className="m-0 flex items-center gap-2 text-lg"><History className="size-5 text-cyan-300" />{t('ui.scene.historyReference')}</h2>}
        toolbar={<select value={selectedRole} onChange={event => onRoleChange(event.target.value as GenerationReferenceRole)} className="h-9 border border-[var(--mpf-border)] bg-black/70 px-3 text-sm">{roles.map(role => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select>}
        ariaLabel={t('ui.scene.historyReference')}
        previousLabel={t('ui.carousel.previous')}
        nextLabel={t('ui.carousel.next')}
        itemClassName="w-24"
        viewAll={viewAllHref ? { href: viewAllHref, label: t('ui.carousel.viewProfileImages') } : null}
      >
        {history.data?.items.slice(0, HISTORY_PREVIEW_LIMIT).map(item => (
          <button
            key={item.id}
            type="button"
            className="h-24 overflow-hidden border border-[var(--mpf-border)] bg-black"
            title={t('ui.scene.useAsReference', { role: selectedRole })}
            onClick={() => onPick(selectedRole, item.imageUrl)}
          >
            <img src={apiMediaUrl(item.thumbnailUrl || item.imageUrl) || ''} alt="" className="h-full w-full object-cover object-top" />
          </button>
        ))}
      </HorizontalMediaCarousel>
    </section>
  );
}
