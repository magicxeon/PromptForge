import { ChevronDown, ChevronUp, History, SlidersHorizontal } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
  type ReactNode
} from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { GenerationCommandRegion } from './GenerationCommandRegion';

export type PlaygroundRenderAttempt = {
  sequence: number;
  pending: boolean;
  renderKey: string | null;
};

export function PlaygroundGenerationWorkspace({
  prompt,
  result,
  queue,
  recent,
  engine,
  references,
  actions,
  messages,
  showRenderPromptHeading,
  recentExpanded,
  onRecentExpandedChange,
  comparisonActive,
  recentTitle,
  recentPlacement = 'before-engine',
  composer = false,
  builder,
  builderTitle,
  toolsRef,
  completedResultKey = null,
  activeRenderKey = null,
  submittedRenderAttempt = null,
  renderBusy = false,
  showResult = true,
  modelSummary
}: {
  prompt: ReactNode;
  result: ReactNode;
  queue: ReactNode;
  recent: ReactNode;
  engine: ReactNode;
  references: ReactNode;
  actions: ReactNode;
  messages?: ReactNode;
  showRenderPromptHeading: boolean;
  recentExpanded: boolean;
  onRecentExpandedChange: (expanded: boolean) => void;
  comparisonActive: boolean;
  recentTitle?: ReactNode;
  recentPlacement?: 'before-engine' | 'after-engine';
  composer?: boolean;
  builder?: ReactNode;
  builderTitle?: ReactNode;
  toolsRef?: Ref<HTMLElement>;
  completedResultKey?: string | null;
  activeRenderKey?: string | null;
  submittedRenderAttempt?: PlaygroundRenderAttempt | null;
  renderBusy?: boolean;
  showResult?: boolean;
  modelSummary?: ReactNode;
}) {
  const { t } = useTranslation(['playground', 'react-ui']);
  const controlsRef = useRef<HTMLElement | null>(null);
  const setupRef = useRef<HTMLElement | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const setupMotion = useRef<Animation | null>(null);
  const previousExpanded = useRef(true);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const outputRef = useRef<HTMLElement>(null);
  const setupId = useId();
  const [expanded, setExpanded] = useState(true);
  const [setupVisible, setSetupVisible] = useState(true);
  const [editing, setEditing] = useState(false);
  const [composing, setComposing] = useState(false);
  const handledCompletion = useRef<string | null>(null);
  const eligibleRender = useRef<{ key: string; completed: boolean } | null>(null);
  // Accepted attempts already present on entry/remount are not new submissions.
  const lastAttempt = useRef<PlaygroundRenderAttempt | null>(submittedRenderAttempt);
  const revealOutput = useRef(false);
  const [builderExpanded, setBuilderExpanded] = useState(true);
  const [scrollFade, setScrollFade] = useState({ top: false, bottom: false });

  useLayoutEffect(() => {
    if (!composer || previousExpanded.current === expanded) return;
    previousExpanded.current = expanded;
    const element = composerRef.current;
    if (!element) return;
    const style = getComputedStyle(element);
    // Capture a reversal's visible position before cancelling its previous motion.
    const start = setupMotion.current ? {
      height: style.height, paddingTop: style.paddingTop,
      opacity: style.opacity, transform: style.transform
    } : expanded ? { height: '0px', paddingTop: '0px', opacity: '0', transform: 'translateY(-8px)' }
      : { height: style.height, paddingTop: style.paddingTop, opacity: '1', transform: 'translateY(0)' };
    setupMotion.current?.cancel();
    setupMotion.current = null;
    element.style.overflow = '';
    if (!element.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setSetupVisible(expanded);
      return;
    }
    const end = expanded ? {
      height: `${element.getBoundingClientRect().height}px`, paddingTop: getComputedStyle(element).paddingTop,
      opacity: '1', transform: 'translateY(0)'
    } : { height: '0px', paddingTop: '0px', opacity: '0', transform: 'translateY(-8px)' };
    setSetupVisible(true);
    element.style.overflow = 'hidden';
    const animation = element.animate([start, end], { duration: 240, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
    setupMotion.current = animation;
    animation.onfinish = () => {
      if (setupMotion.current !== animation) return;
      setupMotion.current = null;
      element.style.overflow = '';
      setSetupVisible(expanded);
    };
  }, [composer, expanded]);

  useEffect(() => {
    if (!composer) return;
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const stopMotion = () => {
      if (!preference?.matches) return;
      setupMotion.current?.cancel();
      setupMotion.current = null;
      if (composerRef.current) composerRef.current.style.overflow = '';
      setSetupVisible(previousExpanded.current);
    };
    const cancelRevealOnNavigation = (event: FocusEvent) => {
      if (event.target instanceof Node && !setupRef.current?.contains(event.target)) revealOutput.current = false;
    };
    preference?.addEventListener?.('change', stopMotion);
    document.addEventListener('focusin', cancelRevealOnNavigation);
    return () => {
      preference?.removeEventListener?.('change', stopMotion);
      document.removeEventListener('focusin', cancelRevealOnNavigation);
      setupMotion.current?.cancel();
    };
  }, [composer]);

  const updateScrollFade = useCallback(() => {
    const element = controlsRef.current;
    if (!element) return;
    const next = {
      top: element.scrollTop > 4,
      bottom: element.scrollTop + element.clientHeight < element.scrollHeight - 4
    };
    setScrollFade(current => (
      current.top === next.top && current.bottom === next.bottom ? current : next
    ));
  }, []);

  useEffect(() => {
    const element = controlsRef.current;
    if (!element) return;

    const animationFrame = window.requestAnimationFrame(updateScrollFade);
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateScrollFade);
    const mutationObserver = typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(updateScrollFade);

    resizeObserver?.observe(element);
    mutationObserver?.observe(element, {
      attributes: true,
      childList: true,
      subtree: true
    });
    window.addEventListener('resize', updateScrollFade);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', updateScrollFade);
    };
  }, [updateScrollFade]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(updateScrollFade);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [comparisonActive, recentExpanded, updateScrollFade]);

  useEffect(() => {
    if (!composer || !editing) return;
    let frame = 0;
    const checkFocus = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        // Reference dialogs and model menus are portalled outside the setup DOM.
        if (!setupRef.current?.contains(active) && !active?.closest('[role="dialog"], [role="menu"]')) setEditing(false);
      });
    };
    document.addEventListener('focusin', checkFocus);
    document.addEventListener('focusout', checkFocus);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('focusin', checkFocus);
      document.removeEventListener('focusout', checkFocus);
    };
  }, [composer, editing]);

  useEffect(() => {
    if (!composer) return;
    // Hydration and generic busy flags are not evidence of a new render.
    const previousAttempt = lastAttempt.current;
    if (submittedRenderAttempt && (submittedRenderAttempt.sequence !== previousAttempt?.sequence
      || submittedRenderAttempt.renderKey !== previousAttempt?.renderKey)) {
      eligibleRender.current = submittedRenderAttempt.renderKey
        ? { key: submittedRenderAttempt.renderKey, completed: false } : null;
      if (submittedRenderAttempt.sequence !== previousAttempt?.sequence && completedResultKey
        && completedResultKey !== submittedRenderAttempt.renderKey) handledCompletion.current = completedResultKey;
    }
    lastAttempt.current = submittedRenderAttempt;
    if (submittedRenderAttempt?.pending) {
      revealOutput.current = false;
      eligibleRender.current = null;
      return;
    }
    if (activeRenderKey) {
      revealOutput.current = false;
      eligibleRender.current = { key: activeRenderKey, completed: false };
      if (completedResultKey) handledCompletion.current = completedResultKey;
      return;
    }
    if (!completedResultKey) {
      revealOutput.current = false;
      // An accepted submission can precede its first task read, but lost deferred
      // media must not collapse later after another task or history is selected.
      if (eligibleRender.current?.completed
        || eligibleRender.current?.key !== submittedRenderAttempt?.renderKey) eligibleRender.current = null;
      return;
    }
    if (eligibleRender.current?.key !== completedResultKey) {
      revealOutput.current = false;
      eligibleRender.current = null;
      return;
    }
    eligibleRender.current.completed = true;
    if (editing || composing
      || handledCompletion.current === completedResultKey) return;
    handledCompletion.current = completedResultKey;
    const active = document.activeElement;
    revealOutput.current = active === document.body || Boolean(setupRef.current?.contains(active));
    if (setupRef.current?.contains(active)) toggleRef.current?.focus({ preventScroll: true });
    setExpanded(false);
  }, [composer, completedResultKey, activeRenderKey, submittedRenderAttempt, editing, composing]);

  useEffect(() => {
    if (expanded) return;
    if (setupVisible || !revealOutput.current) return;
    revealOutput.current = false;
    const active = document.activeElement;
    if (active !== document.body && !setupRef.current?.contains(active)) return;
    outputRef.current?.scrollIntoView?.({ block: 'start',
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [expanded, setupVisible]);

  if (composer) return <div
    className={`playground-workspace playground-workspace--composer playground-workspace--expandable${comparisonActive ? ' is-comparison' : ''}`}>
    <div className="playground-workspace__layout">
      <section ref={node => {
        setupRef.current = node;
        if (typeof toolsRef === 'function') toolsRef(node);
        else if (toolsRef) toolsRef.current = node;
      }} className="playground-workspace__tools-frame" tabIndex={-1}
        onFocusCapture={event => {
          if (event.target === event.currentTarget) { revealOutput.current = false; setExpanded(true); }
          else if ((event.target as HTMLElement).matches('input, textarea, select, [contenteditable="true"], [aria-haspopup]')) setEditing(true);
        }}
        onClickCapture={event => {
          if (!(event.target as HTMLElement).closest('.playground-workspace__action')) return;
          // End editing only on activation, never hide a button between focus and click.
          if (completedResultKey) handledCompletion.current = completedResultKey;
          setEditing(false);
        }}
        onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}>
        <button ref={toggleRef} type="button" className="playground-workspace__setup-toggle"
          aria-expanded={expanded} aria-controls={setupId}
          onClick={() => {
            if (completedResultKey) handledCompletion.current = completedResultKey;
            revealOutput.current = false;
            if (expanded && composerRef.current?.contains(document.activeElement)) toggleRef.current?.focus({ preventScroll: true });
            setEditing(false);
            setExpanded(!expanded);
          }}>
          <SlidersHorizontal aria-hidden="true" />
          <span><strong>{t('playground.setup.title')}</strong>{modelSummary ? <small>{modelSummary}</small> : null}</span>
          <span className="playground-workspace__setup-toggle-label">{t(expanded ? 'playground.setup.collapse' : 'playground.setup.expand')}</span>
          {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>
        <p className="sr-only" role="status">{completedResultKey && !renderBusy ? t('playground.setup.resultReady') : ''}</p>
        <div ref={composerRef} id={setupId} hidden={!expanded && !setupVisible}
          inert={!expanded} aria-hidden={!expanded} className="playground-workspace__composer">
          <div className="playground-workspace__writing">
          {builder ? <details className="playground-workspace__builder" open={builderExpanded}
            onToggle={event => setBuilderExpanded(event.currentTarget.open)}>
            <summary><strong>{builderTitle || t('ui.studio.configuratorTitle', { ns: 'react-ui' })}</strong><ChevronDown aria-hidden="true" /></summary>
            {builder}
          </details> : null}
          {references}
          {prompt}
          </div>
          <aside className="playground-workspace__render-settings generation-render-frame">
          {engine}
          <div className="playground-workspace__action">
            <GenerationCommandRegion showPromptHeading={showRenderPromptHeading} actions={actions} />
          </div>
          </aside>
        </div>
        {messages}
      </section>
      <section ref={outputRef} className="playground-workspace__output">
        <div hidden={!showResult} className={`playground-workspace__result${comparisonActive ? ' playground-workspace__comparison-output' : ''}`}>{result}</div>
        {queue}
        {recent ? renderRecentPanel() : null}
      </section>
    </div>
  </div>;

  return (
    <div className={`playground-workspace${comparisonActive ? ' is-comparison' : ''}${composer ? ' playground-workspace--composer' : ''}`}>
      {comparisonActive ? (
        <section className="playground-workspace__comparison-result">
          {result}
        </section>
      ) : null}
      <section className="playground-workspace__primary">
        {!comparisonActive ? (
          <div className="playground-workspace__result">
            {result}
          </div>
        ) : null}
        {prompt}
      </section>
      <div
        className="playground-workspace__controls-frame"
        data-fade-top={scrollFade.top || undefined}
        data-fade-bottom={scrollFade.bottom || undefined}
      >
        <section
          ref={controlsRef}
          className="playground-workspace__controls"
          onScroll={updateScrollFade}
        >
          {queue}
          {recent && recentPlacement === 'before-engine' ? renderRecentPanel() : null}
          <section className="playground-engine-surface generation-render-frame">
            {engine}
            {references}
            <GenerationCommandRegion
              showPromptHeading={showRenderPromptHeading}
              actions={actions}
              messages={messages}
            />
          </section>
          {recent && recentPlacement === 'after-engine' ? renderRecentPanel() : null}
        </section>
      </div>
    </div>
  );

  function renderRecentPanel() {
    return (
      <section className="playground-recent-panel" aria-labelledby="playground-recent-title">
        <header className="playground-recent-panel__heading">
          <div>
            <History aria-hidden="true" />
            <h2 id="playground-recent-title">
              {recentTitle || t('playground.result.recentTitle', { ns: 'playground' })}
            </h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            title={recentExpanded
              ? t('ui.studio.collapseViewport', { ns: 'react-ui' })
              : t('ui.studio.expandViewport', { ns: 'react-ui' })}
            icon={recentExpanded
              ? <ChevronUp aria-hidden="true" />
              : <ChevronDown aria-hidden="true" />}
            aria-expanded={recentExpanded}
            aria-controls="playground-recent-content"
            onClick={() => onRecentExpandedChange(!recentExpanded)}
          />
        </header>
        <div id="playground-recent-content" hidden={!recentExpanded}>
          {recent}
        </div>
      </section>
    );
  }
}
