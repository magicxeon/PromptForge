import { useMutation } from '@tanstack/react-query';
import { Check, RefreshCw, Save } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { createAdminPricingDraft, publishAdminPricingRevision } from '../api/adminApi';
import { adminPricingRevisionSchema, profitMarkupPercentByMediaSchema, type AdminConfigurationState, type AdminPricingRevision } from '../schemas/adminSchemas';

const categories = ['text', 'image', 'video'] as const;
const inputClass = 'h-11 min-w-0 w-full border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3';

export function AdminPricingConfiguration({ state, canEdit, canPublish, onRefresh }: {
  state: AdminConfigurationState; canEdit: boolean; canPublish: boolean; onRefresh: () => void;
}) {
  const { t } = useTranslation('admin');
  const active = state.activePricing;
  const [selectedId, setSelectedId] = useState('');
  const [saved, setSaved] = useState<AdminPricingRevision | null>(null);
  const [notice, setNotice] = useState('');
  const [invalid, setInvalid] = useState(false);
  const draftCommand = useRef({ signature: '', id: '' });
  const publishCommand = useRef({ signature: '', id: '' });
  const revisions = state.revisions.flatMap(row => {
    const parsed = adminPricingRevisionSchema.safeParse(row);
    return parsed.success && parsed.data.status === 'draft' ? [parsed.data] : [];
  });
  if (saved && !state.revisions.some(row => row.id === saved.id)) revisions.unshift(saved);
  const selected = revisions.find(row => row.id === selectedId);
  const stale = Boolean(selected && selected.values.baseActiveRevisionId !== active?.revisionId);
  const create = useMutation({ mutationFn: createAdminPricingDraft, onSuccess: result => {
    setSaved(result); setSelectedId(result.id); setNotice(t('admin.pricing.saved')); onRefresh();
  } });
  const publish = useMutation({ mutationFn: ({ id, command }: {
    id: string; command: Parameters<typeof publishAdminPricingRevision>[1];
  }) => publishAdminPricingRevision(id, command), onSuccess: () => {
    setSaved(null); setSelectedId(''); setNotice(t('admin.pricing.published')); onRefresh();
  } });
  const pending = create.isPending || publish.isPending;
  const editable = canEdit && Boolean(active?.profitMarkupPercentByMedia);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable || pending || !active) return;
    const form = new FormData(event.currentTarget);
    const profitMarkupPercentByMedia = Object.fromEntries(categories.map(category =>
      [category, String(form.get(category) || '').trim() ? Number(form.get(category)) : NaN]));
    const parsed = profitMarkupPercentByMediaSchema.safeParse(profitMarkupPercentByMedia);
    const reason = String(form.get('reason') || '').trim();
    if (!parsed.success || reason.length < 3 || reason.length > 500) { setInvalid(true); return; }
    setInvalid(false); setNotice('');
    const values = { profitMarkupPercentByMedia: parsed.data, baseActiveRevisionId: active.revisionId, reason };
    const signature = JSON.stringify(values);
    if (draftCommand.current.signature !== signature) draftCommand.current = { signature, id: `pricing_${crypto.randomUUID()}` };
    create.mutate({ ...values, commandId: draftCommand.current.id });
  }

  function activate() {
    if (!selected || !canPublish || stale || pending) return;
    setNotice('');
    const command = { expectedVersion: selected.version, baseActiveRevisionId: selected.values.baseActiveRevisionId,
      reason: selected.values.reason };
    const signature = JSON.stringify({ id: selected.id, ...command });
    if (publishCommand.current.signature !== signature) publishCommand.current = { signature, id: `pricing_publish_${crypto.randomUUID()}` };
    publish.mutate({ id: selected.id, command: { ...command, commandId: publishCommand.current.id } });
  }

  return <section className="grid min-w-0 gap-4" aria-label={t('admin.pricing.title')}>
    <header className="flex items-start justify-between gap-2">
      <h2 className="m-0 text-lg">{t('admin.pricing.title')}</h2>
      <Button size="icon" title={t('finance.refresh')} aria-label={t('finance.refresh')} onClick={onRefresh} disabled={pending} icon={<RefreshCw className="size-4" />} />
    </header>
    <div className="min-w-0 border-b border-[var(--mpf-border)] pb-3">
      <h3 className="m-0 text-sm">{t('admin.pricing.active')}</h3>
      <dl className="grid grid-cols-3 gap-2 text-sm">{categories.map(category => <div key={category} className="min-w-0">
        <dt className="break-words text-[var(--mpf-text-muted)]">{t(`admin.pricing.${category}`)}</dt>
        <dd className="m-0 tabular-nums">{active?.profitMarkupPercentByMedia?.[category] ?? t('finance.unavailable')}{active?.profitMarkupPercentByMedia ? '%' : ''}</dd>
      </div>)}</dl>
      <small className="block break-all text-[var(--mpf-text-muted)]">{active?.pricingPolicyVersion || t('finance.unavailable')}</small>
    </div>
    <p className="m-0 text-xs text-[var(--mpf-text-muted)]">{t('admin.pricing.basis')}</p>
    <p className="m-0 text-xs text-[var(--mpf-text-muted)]">{t('admin.pricing.fixedImage')}</p>
    {!editable ? <p className="m-0 text-sm" role="status">{t('admin.pricing.readOnly')}</p> : null}
    <form className="grid min-w-0 gap-3" onSubmit={save}>
      <fieldset disabled={!editable || pending} className="m-0 grid min-w-0 gap-3 border-0 p-0">
        <legend className="mb-3 text-sm font-semibold">{t('admin.control.newDraft')}</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{categories.map(category => <label key={category} className="grid min-w-0 gap-1 text-sm">
          {t(`admin.pricing.${category}`)} (%)
          <input name={category} type="number" required min={0} max={1000} step="any"
            defaultValue={active?.profitMarkupPercentByMedia?.[category]} className={inputClass} />
        </label>)}</div>
        <label className="grid min-w-0 gap-1 text-sm">{t('admin.providers.reason')}
          <textarea name="reason" required minLength={3} maxLength={500} className="min-h-20 w-full border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-3" />
        </label>
      </fieldset>
      <Button type="submit" disabled={!editable || pending} loading={create.isPending} icon={<Save className="size-4" />}>
        {t('admin.control.saveDraft')}
      </Button>
      {invalid ? <p role="alert" className="m-0 text-sm text-[var(--theme-danger)]">{t('admin.pricing.invalid')}</p> : null}
      {create.isError ? <p role="alert" className="m-0 break-words text-sm text-[var(--theme-danger)]">{create.error.message}</p> : null}
    </form>
    <div className="grid min-w-0 gap-3 border-t border-[var(--mpf-border)] pt-3">
      <label className="grid min-w-0 gap-1 text-sm">{t('admin.pricing.draft')}
        <select value={selectedId} onChange={event => { setSelectedId(event.target.value); publish.reset(); }} className={inputClass} disabled={pending}>
          <option value="">{t('admin.pricing.chooseDraft')}</option>
          {revisions.map(row => <option key={row.id} value={row.id}>{row.id} (v{row.version})</option>)}
        </select>
      </label>
      {selected ? <><dl className="grid grid-cols-1 gap-2 text-sm">{categories.map(category => <div key={category} className="flex flex-wrap justify-between gap-2">
        <dt>{t(`admin.pricing.${category}`)}</dt><dd className="m-0 tabular-nums">{active?.profitMarkupPercentByMedia?.[category]}% &rarr; {selected.values.profitMarkupPercentByMedia[category]}%</dd>
      </div>)}</dl><p className="m-0 break-words text-sm">{selected.values.reason}</p></> : null}
      {stale ? <p role="status" className="m-0 text-sm">{t('admin.pricing.stale')}</p> : null}
      {!canPublish ? <p role="status" className="m-0 text-xs text-[var(--mpf-text-muted)]">{t('admin.pricing.publishGated')}</p> : null}
      <ConfirmDialog title={t('admin.pricing.confirmTitle')} description={t('admin.pricing.newQuotesOnly')}
        confirmLabel={t('admin.pricing.publish')} onConfirm={activate} pending={pending}
        trigger={<Button disabled={!canPublish || !editable || !selected || stale || pending} loading={publish.isPending} icon={<Check className="size-4" />}>
          {t('admin.pricing.publish')}
        </Button>}>
        {selected ? <div className="mb-4 grid gap-2 text-sm"><small className="break-all">{selected.id} (v{selected.version})</small>
          {categories.map(category => <div key={category}>{t(`admin.pricing.${category}`)}: {active?.profitMarkupPercentByMedia?.[category]}% &rarr; {selected.values.profitMarkupPercentByMedia[category]}%</div>)}
          <p className="m-0 break-words">{selected.values.reason}</p>
        </div> : null}
      </ConfirmDialog>
      {publish.isError ? <p role="alert" className="m-0 break-words text-sm text-[var(--theme-danger)]">{publish.error.message}</p> : null}
      {notice ? <p role="status" className="m-0 text-sm">{notice}</p> : null}
    </div>
  </section>;
}
