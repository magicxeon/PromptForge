import { ArrowRight, BookOpen, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { catalogPaths, listCatalog } from '../api/contentCatalogApi';
import '../../../styles/content-catalog.css';

export function TutorialLandingSection({ actorId }: { actorId: string }) {
  const { t } = useTranslation('tutorials');
  const paths = catalogPaths('tutorial');
  const list = useQuery({ queryKey: ['content-catalog', actorId, 'list', 'tutorial', 'featured'], queryFn: ({ signal }) => listCatalog('tutorial', {}, signal), retry: false });
  return <section className="content-catalog__landing" aria-labelledby="tutorial-landing-title">
    <header><h2 id="tutorial-landing-title"><BookOpen size={21} />{t('landingTitle')}</h2><Link to={paths.root}>{t('viewAll')}<ArrowRight size={18} /></Link></header>
    {list.isPending ? <LoadingState label={t('loading')} /> : list.isError ? <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={() => void list.refetch()} /> : list.data.items.length ? <div className="content-catalog__featured">{list.data.items.slice(0, 4).map(item => <article key={item.id}><h3><Link to={paths.edit(item.id)}>{item.title}</Link></h3><p>{item.description}</p><span>{item.access.mode === 'free' ? t('access.free') : t('credits', { count: item.access.priceCredits })}</span></article>)}</div> : <div className="content-catalog__landing-empty"><p>{t('landingEmpty')}</p><Link to={paths.create}><Plus size={16} />{t('create.tutorial')}</Link></div>}
  </section>;
}
