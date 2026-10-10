import { ArrowLeft, LockKeyhole, Save, ShieldCheck, Unlock } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useBeforeUnload, useBlocker, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ApiError } from '../../../lib/api/apiError';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { catalogPaths, draftFromContent, saveContent, validateDraft, type CatalogContent, type CatalogDraft, type CatalogKind, type CatalogLimits } from '../api/contentCatalogApi';
import { ContentOutlineEditor } from './ContentOutlineEditor';

export function ContentDraftEditor({ kind, actorId, initial, defaultFreeCount, limits, onReload }: {
  kind: CatalogKind; actorId: string; initial?: CatalogContent; defaultFreeCount: number; limits: CatalogLimits; onReload: () => void;
}) {
  const { t } = useTranslation('tutorials');
  const navigate = useNavigate();
  const client = useQueryClient();
  const [savedItem, setSavedItem] = useState(initial);
  const [draft, setDraft] = useState<CatalogDraft>(() => initial ? draftFromContent(initial) : {
    kind, format: kind === 'tutorial' ? 'course' : 'film', title: '', description: '', language: 'th',
    access: { mode: 'free', freeCount: 0, priceCredits: 0 }, chapters: [], episodes: []
  });
  const [baseline, setBaseline] = useState(JSON.stringify(draft));
  const [validation, setValidation] = useState<string | null>(null);
  const [confirmAccess, setConfirmAccess] = useState(false);
  const [reloadConfirm, setReloadConfirm] = useState(false);
  const skipBlock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const dirty = JSON.stringify(draft) !== baseline;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !skipBlock.current && currentLocation.pathname !== nextLocation.pathname);
  useBeforeUnload(useCallback(event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }, [dirty]));
  const save = useMutation({
    mutationFn: () => {
      if (getActiveActorId() !== actorId) throw new Error('Actor changed.');
      return saveContent(draft, savedItem);
    },
    onSuccess: ({ item }) => {
      if (!mounted.current || getActiveActorId() !== actorId) return;
      const next = draftFromContent(item);
      setDraft(next); setBaseline(JSON.stringify(next)); setSavedItem(item); setValidation(null);
      client.setQueryData(['content-catalog', actorId, kind, item.id], { item });
      void client.invalidateQueries({ queryKey: ['content-catalog', actorId, 'list'] });
      if (!initial) { skipBlock.current = true; navigate(catalogPaths(kind).edit(item.id), { replace: true }); }
    }
  });
  const units = kind === 'tutorial' ? draft.chapters : draft.episodes;
  function update(next: CatalogDraft) { setDraft(next); setValidation(null); save.reset(); }
  function submit(event: FormEvent) {
    event.preventDefault();
    const issue = validateDraft(draft);
    if (issue) { setValidation(issue); return; }
    const previous = savedItem && draftFromContent(savedItem);
    const boundaryChanged = previous && (JSON.stringify(previous.access) !== JSON.stringify(draft.access)
      || JSON.stringify((kind === 'tutorial' ? previous.chapters : previous.episodes).slice(0, previous.access.freeCount).map(unit => unit.id)) !== JSON.stringify(units.slice(0, draft.access.freeCount).map(unit => unit.id)));
    if (boundaryChanged) setConfirmAccess(true); else save.mutate();
  }
  const conflict = save.error instanceof ApiError && save.error.status === 409;
  return <form className="content-authoring" onSubmit={submit}>
    <header className="content-authoring__header">
      <Button type="button" variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => navigate(catalogPaths(kind).manage)}>{t('back')}</Button>
      <div><h1>{initial ? t('edit') : t('new')}</h1><span className="content-authoring__badge"><ShieldCheck size={14} />{t('adminOnly')}</span></div>
      <div className="content-authoring__save"><span role="status">{dirty ? t('unsaved') : savedItem ? t('saved') : ''}</span><Button type="submit" variant="primary" loading={save.isPending} disabled={!dirty} icon={<Save size={16} />}>{t('save')}</Button></div>
    </header>
    {(validation || save.isError) && <div className="content-authoring__error" role="alert"><p>{t(validation || (conflict ? 'conflict' : 'saveError'))}</p>{conflict && <Button type="button" onClick={() => setReloadConfirm(true)}>{t('reload')}</Button>}</div>}
    <fieldset disabled={save.isPending} className="content-authoring__layout">
      <div className="content-authoring__document">
        <section className="content-authoring__section" aria-labelledby="content-details-title">
          <h2 id="content-details-title">{t('details')}</h2>
          <label>{t('title')}<input autoFocus required maxLength={limits.titleLength} value={draft.title} onChange={event => update({ ...draft, title: event.target.value })} /></label>
          <label>{t('description')}<textarea rows={6} maxLength={limits.descriptionLength} value={draft.description} onChange={event => update({ ...draft, description: event.target.value })} /></label>
          <div className="content-authoring__pair">
            {kind === 'cinema' && <label>{t('type')}<select disabled={Boolean(initial) || draft.episodes.length > 0} value={draft.format} onChange={event => update({ ...draft, format: event.target.value as 'film' | 'series', episodes: [], access: { mode: 'free', freeCount: 0, priceCredits: 0 } })}><option value="film">{t('format.film')}</option><option value="series">{t('format.series')}</option></select></label>}
            <label>{t('language')}<select value={draft.language} onChange={event => update({ ...draft, language: event.target.value })}><option value="th">{t('language.th')}</option><option value="en">{t('language.en')}</option></select></label>
          </div>
        </section>
        <ContentOutlineEditor draft={draft} onChange={update} limits={limits} />
      </div>
      <aside className="content-authoring__settings" aria-labelledby="content-access-title">
        <h2 id="content-access-title"><LockKeyhole size={18} />{t('access')}</h2>
        <label>{t('access')}<select value={draft.access.mode} onChange={event => {
          const mode = event.target.value as CatalogDraft['access']['mode'];
          update({ ...draft, access: { mode, freeCount: mode === 'preview_then_paid' ? defaultFreeCount : 0, priceCredits: mode === 'free' ? 0 : draft.access.priceCredits } });
        }}><option value="free">{t('access.free')}</option>{draft.format !== 'film' && <option value="preview_then_paid">{t(kind === 'tutorial' ? 'access.preview_then_paid' : 'access.previewEpisodes')}</option>}<option value="paid">{t('access.paid')}</option></select></label>
        {draft.access.mode === 'preview_then_paid' && <label>{t(kind === 'tutorial' ? 'freeCount' : 'freeEpisodes')}<input type="number" min={1} max={Math.max(1, units.length - 1)} step={1} required value={draft.access.freeCount} onChange={event => update({ ...draft, access: { ...draft.access, freeCount: event.target.valueAsNumber || 0 } })} /></label>}
        {draft.access.mode !== 'free' && <label>{t('price')}<input type="number" min={1} max={1000000} step={1} required value={draft.access.priceCredits || ''} onChange={event => update({ ...draft, access: { ...draft.access, priceCredits: event.target.valueAsNumber || 0 } })} /></label>}
        {units.length > 0 && <section className="content-authoring__access-preview"><h3>{t('accessPreview')}</h3><ol>{units.map((unit, index) => {
          const free = draft.access.mode === 'free' || (draft.access.mode === 'preview_then_paid' && index < draft.access.freeCount);
          return <li key={unit.id}><span>{unit.title || t(kind === 'tutorial' ? 'chapter' : 'episode', { number: index + 1 })}</span><small className={free ? 'is-free' : ''}>{free ? <Unlock size={13} /> : <LockKeyhole size={13} />}{t(free ? 'access.free' : 'locked')}</small></li>;
        })}</ol></section>}
        <p className="content-authoring__muted">{t('billingPending')}</p>
        <Button disabled type="button" aria-describedby="content-publish-pending">{t('publish')}</Button>
        <p id="content-publish-pending" className="content-authoring__muted">{t('publishPending')}</p>
      </aside>
    </fieldset>
    <ConfirmDialog trigger={<span hidden />} open={confirmAccess} onOpenChange={setConfirmAccess} title={t('boundaryTitle')} description={t('boundaryDescription')} confirmLabel={t('confirmSave')} onConfirm={() => { setConfirmAccess(false); save.mutate(); }} />
    <ConfirmDialog trigger={<span hidden />} open={blocker.state === 'blocked'} onOpenChange={open => { if (!open && blocker.state === 'blocked') blocker.reset(); }} title={t('leaveTitle')} description={t('leaveDescription')} confirmLabel={t('leave')} onConfirm={() => { if (blocker.state === 'blocked') blocker.proceed(); }} />
    <ConfirmDialog trigger={<span hidden />} open={reloadConfirm} onOpenChange={setReloadConfirm} title={t('leaveTitle')} description={t('leaveDescription')} confirmLabel={t('reload')} onConfirm={() => { setReloadConfirm(false); onReload(); }} />
  </form>;
}
