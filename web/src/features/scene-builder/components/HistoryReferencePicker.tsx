import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HorizontalMediaCarousel } from '../../../components/media/HorizontalMediaCarousel';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { listHistory } from '../../history/api/historyApi';
import type { HistoryItem } from '../../history/schemas/historySchemas';
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
  onPick: (role: GenerationReferenceRole, imageUrl: string, item: HistoryItem) => void;
  viewAllHref?: string | null;
}) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const availableRoles = useMemo(() => [...new Set(roles)], [roles]);
  const effectiveRole = availableRoles.includes(selectedRole)
    ? selectedRole
    : availableRoles[0];
  const history = useQuery({
    queryKey: ['history-reference-picker', actor?.userId || 'loading', effectiveRole || 'none'],
    queryFn: () => listHistory(null, 'all', effectiveRole),
    enabled: Boolean(actor && effectiveRole)
  });
  const eligibleItems = history.data?.items ?? [];
  useEffect(() => {
    if (effectiveRole && effectiveRole !== selectedRole) onRoleChange(effectiveRole);
  }, [effectiveRole, onRoleChange, selectedRole]);
  if (!roles.length) return null;
  return (
    <section className="mt-3 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-4">
      <HorizontalMediaCarousel
        heading={<h2 className="m-0 flex items-center gap-2 text-lg"><History className="size-5 text-cyan-300" />{t('ui.scene.historyReference')}</h2>}
        toolbar={<select value={effectiveRole} onChange={event => onRoleChange(event.target.value as GenerationReferenceRole)} className="h-9 border border-[var(--mpf-border)] bg-[var(--theme-bg-raised)] px-3 text-sm text-[var(--theme-text)]">{availableRoles.map(role => <option key={role} value={role}>{t(`ui.scene.referenceRole.${role}`)}</option>)}</select>}
        ariaLabel={t('ui.scene.historyReference')}
        previousLabel={t('ui.carousel.previous')}
        nextLabel={t('ui.carousel.next')}
        itemClassName="w-24"
        viewAll={viewAllHref ? { href: viewAllHref, label: t('ui.carousel.viewProfileImages') } : null}
      >
        {eligibleItems.slice(0, HISTORY_PREVIEW_LIMIT).map(item => (
          <button
            key={item.id}
            type="button"
            className="h-24 overflow-hidden border border-[var(--mpf-border)] bg-black"
            title={t('ui.scene.useAsReference', { role: t(`ui.scene.referenceRole.${effectiveRole}`) })}
            onClick={() => effectiveRole && onPick(effectiveRole, item.imageUrl, item)}
          >
            <img src={apiMediaUrl(item.thumbnailUrl || item.imageUrl) || ''} alt="" className="h-full w-full object-cover object-top" />
          </button>
        ))}
        {!history.isLoading && !eligibleItems.length ? (
          <p className="m-0 min-w-56 text-xs text-[var(--mpf-text-muted)]">
            {t('ui.scene.historyReferenceEmpty', { role: effectiveRole ? t(`ui.scene.referenceRole.${effectiveRole}`) : '' })}
          </p>
        ) : null}
      </HorizontalMediaCarousel>
    </section>
  );
}
