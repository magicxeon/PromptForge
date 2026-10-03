import { ChevronDown, Images } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

export function GenerationReferenceDisclosure({ count, limit, summary, leadingContent, problem,
  focusTargetSelector, targetId, label, children }: {
  count: number;
  limit: number;
  summary?: ReactNode;
  leadingContent?: ReactNode;
  problem?: ReactNode;
  focusTargetSelector?: string;
  targetId?: string;
  label?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation('playground');
  const resolvedLabel = label ?? t('playground.options.editReferences');
  const id = useId();
  const [open, setOpen] = useState(() => Boolean(targetId && window.location.hash === `#${targetId}`));
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!targetId) return;
    const revealTarget = () => { if (window.location.hash === `#${targetId}`) setOpen(true); };
    window.addEventListener('hashchange', revealTarget);
    return () => window.removeEventListener('hashchange', revealTarget);
  }, [targetId]);
  function editProblem() {
    setOpen(true);
    requestAnimationFrame(() => {
      const target = focusTargetSelector ? editorRef.current?.querySelector<HTMLElement>(focusTargetSelector) : null;
      const control = target?.matches('button,input,select,textarea') ? target
        : (target || editorRef.current)?.querySelector<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)');
      control?.focus({ preventScroll: true });
      control?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    });
  }
  return <section className="generation-reference-disclosure">
    <details open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary aria-controls={id}><Images aria-hidden="true" /><strong>{resolvedLabel}</strong>
        <span className="generation-reference-disclosure__count">{count} / {limit}</span><ChevronDown aria-hidden="true" /></summary>
      <div id={id} ref={editorRef} className="generation-reference-disclosure__editor">{children}</div>
    </details>
    {leadingContent}
    {summary}
    {problem ? <div className="generation-reference-disclosure__problem">
      <span role="status">{problem}</span>
      <Button type="button" variant="ghost" onClick={editProblem}>{resolvedLabel}</Button>
    </div> : null}
  </section>;
}
