import { BookOpen, ChevronLeft, ChevronRight, Clapperboard, Pencil, Plus, Search, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { catalogPaths, getContent, listCatalog, type CatalogKind, type CatalogLimits } from '../api/contentCatalogApi';
import { useCatalogAccess } from '../hooks/useCatalogAccess';
import { ContentDraftEditor } from '../components/ContentDraftEditor';
import '../../../styles/content-catalog.css';

export function ContentCatalogRoute({ kind }: { kind: CatalogKind }) {
  const access = useCatalogAccess();
  const { t } = useTranslation('tutorials');
  if (access.resolvingActor) return <LoadingState label={t('loading')} />;
  if (!access.authorized) return <ErrorState title={t('denied')} />;
  if (access.config.isPending) return <LoadingState label={t('loading')} />;
  if (access.config.isError) return <ErrorState title={t('error')} onRetry={() => void access.config.refetch()} retryLabel={t('retry')} />;
  if (!access.enabled || !access.actor || !access.config.data) return <EmptyState title={t('disabled')} />;
  return <CatalogWorkspace key={`${access.actor.userId}:${kind}`} kind={kind} actorId={access.actor.userId} defaultFreeCount={access.config.data.defaultFreeCount} limits={access.config.data.limits} />;
}

function CatalogWorkspace({ kind, actorId, defaultFreeCount, limits }: { kind: CatalogKind; actorId: string; defaultFreeCount: number; limits: CatalogLimits }) {
  const { t } = useTranslation('tutorials');
  const location = useLocation();
  const { contentId } = useParams();
  const paths = catalogPaths(kind);
  const editing = Boolean(contentId) || location.pathname === paths.create;
  const managing = location.pathname.startsWith(paths.manage);
  const [search, setSearch] = useState('');
  const [querySearch, setQuerySearch] = useState('');
  const [page, setPage] = useState(1);
  const [editorVersion, setEditorVersion] = useState(0);
  const list = useQuery({
    queryKey: ['content-catalog', actorId, 'list', kind, managing, querySearch, page],
    queryFn: ({ signal }) => listCatalog(kind, { includeDrafts: managing, search: querySearch, page }, signal),
    enabled: !editing, retry: false
  });
  const detail = useQuery({
    queryKey: ['content-catalog', actorId, kind, contentId],
    queryFn: ({ signal }) => getContent(contentId!, kind, signal), enabled: Boolean(contentId),
    retry: false, refetchOnWindowFocus: false
  });
  const Icon = kind === 'tutorial' ? BookOpen : Clapperboard;
  function submitSearch(event: FormEvent) { event.preventDefault(); setPage(1); setQuerySearch(search.trim()); }
  if (editing) {
    if (contentId && detail.isPending) return <LoadingState label={t('loading')} />;
    if (contentId && detail.isError) return <ErrorState title={t('error')} onRetry={() => void detail.refetch()} retryLabel={t('retry')} />;
    return <ContentDraftEditor key={`${contentId || 'new'}:${editorVersion}`} actorId={actorId} kind={kind} initial={detail.data?.item} defaultFreeCount={defaultFreeCount} limits={limits}
      onReload={() => { void detail.refetch().then(result => { if (result.isSuccess) setEditorVersion(version => version + 1); }); }} />;
  }
  return <main className="content-catalog">
    <header className="content-catalog__header"><div><span className="content-authoring__badge"><ShieldCheck size={14} />{t('adminOnly')}</span><h1><Icon aria-hidden="true" />{t(kind === 'tutorial' ? 'tutorials.title' : 'cinema.title')}</h1></div>
      <Link className="content-catalog__primary" to={paths.create}><Plus size={18} />{t(`create.${kind}`)}</Link></header>
    <nav className="content-catalog__navigation" aria-label={t(kind === 'tutorial' ? 'tutorials.title' : 'cinema.title')}>
      <Link to={paths.root} aria-current={!managing ? 'page' : undefined} onClick={() => setPage(1)}>{t('catalog')}</Link>
      <Link to={paths.manage} aria-current={managing ? 'page' : undefined} onClick={() => setPage(1)}>{t(kind === 'tutorial' ? 'teach' : 'manage')}</Link>
    </nav>
    <form className="content-catalog__search" onSubmit={submitSearch}><label><Search size={18} aria-hidden="true" /><span className="sr-only">{t('search')}</span><input type="search" placeholder={t('search')} maxLength={200} value={search} onChange={event => setSearch(event.target.value)} /></label><Button type="submit">{t('search')}</Button></form>
    {list.isPending ? <LoadingState label={t('loading')} /> : list.isError ? <ErrorState title={t('error')} onRetry={() => void list.refetch()} retryLabel={t('retry')} /> : <>
      {list.data.items.length ? <div className="content-catalog__list">{list.data.items.map(item => <article key={item.id} className="content-catalog__item">
        <Icon className="content-catalog__item-icon" aria-hidden="true" />
        <div><span className="content-catalog__meta">{t(`format.${item.format}`)} · {t(`status.${item.status}`)}</span><h2><Link to={paths.edit(item.id)}>{item.title}</Link></h2><p>{item.description}</p>
          <span className={item.access.mode === 'free' ? 'is-free' : 'content-catalog__meta'}>{item.access.mode === 'free' ? t('access.free') : item.access.mode === 'preview_then_paid' ? t(kind === 'tutorial' ? 'freeFirst' : 'freeFirstEpisodes', { count: item.access.freeCount }) : t('credits', { count: item.access.priceCredits })}</span>
        </div>
        <span className="content-catalog__meta">{item.format === 'film' ? t('format.film') : t(kind === 'tutorial' ? 'units' : 'episodeCount', { count: kind === 'tutorial' ? item.chapters.length : item.episodes.length })}</span>
        <Link className="content-catalog__edit" to={paths.edit(item.id)}><Pencil size={16} />{t('edit')}</Link>
      </article>)}</div> : <EmptyState title={t(querySearch ? 'emptySearch' : managing ? 'emptyDrafts' : 'emptyCatalog')} />}
      <footer className="content-catalog__pagination"><span>{t('count', { count: list.data.total })}</span><Button variant="ghost" disabled={page <= 1} icon={<ChevronLeft size={16} />} onClick={() => setPage(value => value - 1)}>{t('previous')}</Button><span>{t('page', { number: page })}</span><Button variant="ghost" disabled={page * 12 >= list.data.total} icon={<ChevronRight size={16} />} onClick={() => setPage(value => value + 1)}>{t('next')}</Button></footer>
    </>}
  </main>;
}
