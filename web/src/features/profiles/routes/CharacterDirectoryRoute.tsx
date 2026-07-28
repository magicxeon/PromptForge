import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CharacterCard } from '../../../components/profiles/CharacterCard';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { listCharacters } from '../api/profileApi';
import { useActor } from '../../../lib/auth/ActorProvider';

export function CharacterDirectoryRoute() {
  const { t } = useTranslation('character-profiles');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => ({
    ...(params.get('creator') ? { creator: params.get('creator') || '' } : {}),
    ...(params.get('intendedUse') ? { intendedUse: params.get('intendedUse') || '' } : {}),
    ...(params.get('reusePolicy') ? { reusePolicy: params.get('reusePolicy') || '' } : {})
  }), [params]);
  const characters = useQuery({
    queryKey: ['characters', actorId, filters],
    queryFn: () => listCharacters(filters),
    enabled: Boolean(actor)
  });

  function setFilter(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  }

  return (
    <main>
      <header className="mb-5 border-b border-[var(--mpf-border)] pb-5">
        <span className="text-xs font-bold uppercase text-cyan-300">{t('character-profiles.community.kicker')}</span>
        <h1 className="mb-2 mt-2 text-3xl">{t('character-profiles.community.title')}</h1>
        <p className="m-0 text-sm text-[var(--mpf-text-muted)]">{t('character-profiles.community.description')}</p>
      </header>
      <section className="mb-6 grid gap-3 rounded-[var(--mpf-radius-md)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-4 sm:grid-cols-3">
        <FilterSelect label={t('character-profiles.community.useFilter')} value={params.get('intendedUse') || ''} onChange={value => setFilter('intendedUse', value)}>
          <option value="">{t('character-profiles.community.allUses')}</option>
          <option value="fashion">{t('character-profiles.uses.fashion')}</option>
          <option value="scene_story">{t('character-profiles.uses.scene')}</option>
          <option value="general">{t('character-profiles.uses.general')}</option>
        </FilterSelect>
        <FilterSelect label={t('character-profiles.community.availabilityFilter')} value={params.get('reusePolicy') || ''} onChange={value => setFilter('reusePolicy', value)}>
          <option value="">{t('character-profiles.community.allAvailability')}</option>
          <option value="public_reusable">{t('character-profiles.status.available')}</option>
          <option value="view_only">{t('character-profiles.status.viewOnly')}</option>
        </FilterSelect>
        <label className="grid gap-2 text-sm text-[var(--mpf-text-muted)]">
          {t('character-profiles.community.creatorFilter')}
          <input
            type="search"
            value={params.get('creator') || ''}
            onChange={event => setFilter('creator', event.target.value)}
            placeholder={t('character-profiles.community.creatorPlaceholder')}
            className="h-11 rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-bg)] px-3 text-white"
          />
        </label>
      </section>
      {characters.isLoading ? <LoadingState label={t('character-profiles.states.loading')} /> : null}
      {characters.isError ? <ErrorState title={t('character-profiles.states.unavailable')} description={characters.error.message} onRetry={() => void characters.refetch()} /> : null}
      {characters.data && !characters.data.items.length ? <EmptyState title={t('character-profiles.community.empty')} /> : null}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {characters.data?.items.map(character => <CharacterCard key={character.id} character={character} />)}
      </section>
      {characters.data?.hasMore ? <div className="mt-6 flex justify-center"><Button>{t('common.action.loadMore', { ns: 'common' })}</Button></div> : null}
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm text-[var(--mpf-text-muted)]">
      {label}
      <select value={value} onChange={event => onChange(event.target.value)} className="h-11 rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-bg)] px-3 text-white">
        {children}
      </select>
    </label>
  );
}
