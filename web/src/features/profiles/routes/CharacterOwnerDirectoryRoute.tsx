import { useInfiniteQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, LockKeyhole } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { useActor } from '../../../lib/auth/ActorProvider';
import { createReturnNavigationState } from '../../../lib/navigation/returnNavigation';
import { listOwnedCharacters } from '../api/profileApi';

export function CharacterOwnerDirectoryRoute() {
  const { t } = useTranslation(['character-profiles', 'common']);
  const { actor } = useActor();
  const location = useLocation();
  const characters = useInfiniteQuery({
    queryKey: ['owned-characters', actor?.userId || 'loading'],
    queryFn: ({ pageParam }) => listOwnedCharacters(pageParam),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor || undefined
  });
  const items = characters.data?.pages.flatMap(page => page.items) || [];

  return (
    <main>
      <header className="mb-5 border-b border-[var(--mpf-border)] pb-5">
        <span className="text-xs font-bold uppercase text-cyan-300">
          {t('character-profiles.view.owner')}
        </span>
        <h1 className="mb-1 mt-2 text-3xl">
          {t('character-profiles.community.myCharacters')}
        </h1>
        <p className="m-0 text-sm text-[var(--mpf-text-muted)]">
          {t('character-profiles.fields.personalityHelp')}
        </p>
      </header>

      {characters.isLoading ? <LoadingState label={t('common.status.loading', { ns: 'common' })} /> : null}
      {characters.isError ? (
        <ErrorState
          title={t('character-profiles.states.unavailable')}
          description={characters.error.message}
          onRetry={() => void characters.refetch()}
        />
      ) : null}
      {!characters.isLoading && !items.length ? (
        <EmptyState title={t('character-profiles.community.empty')} />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map(character => {
          const approved = character.status === 'approved';
          return (
            <Link
              key={character.id}
              to={`/creator/characters/${encodeURIComponent(character.id)}`}
              state={createReturnNavigationState(location)}
              className="overflow-hidden rounded-[var(--mpf-radius-md)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] text-inherit no-underline transition hover:border-cyan-400/55"
            >
              <div className="grid aspect-[4/5] place-items-center overflow-hidden bg-black">
                <AuthenticatedMediaImage
                  src={character.thumbnailUrl || character.displayImageUrl}
                  alt={character.displayName}
                  className="h-full w-full object-contain"
                  fallback={<LockKeyhole className="size-9 text-[var(--mpf-text-muted)]" />}
                />
              </div>
              <div className="p-4">
                <strong className="block text-base">{character.displayName}</strong>
                <span className={`mt-3 inline-flex items-center gap-2 text-xs ${approved ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {approved ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}
                  {approved
                    ? t('character-profiles.status.available')
                    : t('character-profiles.status.draft')}
                </span>
              </div>
            </Link>
          );
        })}
      </section>
      {characters.hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <Button
            disabled={characters.isFetchingNextPage}
            onClick={() => void characters.fetchNextPage()}
          >
            {t('common.action.loadMore', { ns: 'common' })}
          </Button>
        </div>
      ) : null}
    </main>
  );
}
