import { ChevronDown, ChevronUp, History } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { GenerationCommandRegion } from './GenerationCommandRegion';

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
  recentTitle
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
}) {
  const { t } = useTranslation(['playground', 'react-ui']);
  const controlsRef = useRef<HTMLElement | null>(null);
  const [scrollFade, setScrollFade] = useState({ top: false, bottom: false });

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

  return (
    <div className={`playground-workspace${comparisonActive ? ' is-comparison' : ''}`}>
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
          <section className="playground-engine-surface">
            {engine}
            {references}
            <GenerationCommandRegion
              showPromptHeading={showRenderPromptHeading}
              actions={actions}
              messages={messages}
            />
          </section>
        </section>
      </div>
    </div>
  );
}
