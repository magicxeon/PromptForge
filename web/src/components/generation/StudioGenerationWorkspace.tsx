import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Palette,
  SlidersHorizontal
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { GenerationCommandRegion } from './GenerationCommandRegion';
import { GenerationEngineShell } from './GenerationEngineShell';

type StudioGenerationWorkspaceProps = {
  modeSelector: ReactNode;
  builder: ReactNode;
  result: ReactNode;
  queue: ReactNode;
  engine: ReactNode;
  references: ReactNode;
  prompt: ReactNode;
  configActions?: ReactNode;
  actions: ReactNode;
  messages?: ReactNode;
  focusResultSignal?: number;
  showRenderPromptHeading?: boolean;
  comparisonActive?: boolean;
  configurationFirst?: boolean;
  builderTitle?: string;
};

export function StudioGenerationWorkspace({
  modeSelector,
  builder,
  result,
  queue,
  engine,
  references,
  prompt,
  configActions,
  actions,
  messages,
  focusResultSignal = 0,
  showRenderPromptHeading = true,
  comparisonActive = false,
  configurationFirst = false,
  builderTitle
}: StudioGenerationWorkspaceProps) {
  const { t } = useTranslation('react-ui');
  const [viewportCollapsed, setViewportCollapsed] = useState(false);
  const viewportRef = useRef<HTMLElement | null>(null);
  const configuratorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (focusResultSignal > 0) setViewportCollapsed(false);
  }, [focusResultSignal]);

  useEffect(() => {
    if (focusResultSignal <= 0 || viewportCollapsed) return;
    const animationFrame = window.requestAnimationFrame(() => {
      viewportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [focusResultSignal, viewportCollapsed]);

  const viewport = (
      <section
        key="viewport"
        ref={viewportRef}
        className={`studio-viewport-panel${viewportCollapsed ? ' is-collapsed' : ''}`}
        aria-labelledby="studio-viewport-title"
      >
        <header className="studio-panel-heading">
          <div className="studio-panel-heading__title">
            <ImageIcon aria-hidden="true" />
            <div>
              <h1 id="studio-viewport-title">{t('ui.studio.viewportTitle')}</h1>
              <p>{t('ui.studio.viewportDescription')}</p>
            </div>
          </div>
          <div className="studio-panel-heading__actions">
            <Button
              size="sm"
              variant="ghost"
              icon={<SlidersHorizontal aria-hidden="true" />}
              onClick={() => configuratorRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              })}
            >
              {t('ui.studio.backToConfigurator')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={viewportCollapsed
                ? <ChevronDown aria-hidden="true" />
                : <ChevronUp aria-hidden="true" />}
              aria-expanded={!viewportCollapsed}
              aria-controls="studio-viewport-content"
              onClick={() => setViewportCollapsed(current => !current)}
            >
              {viewportCollapsed
                ? t('ui.studio.expandViewport')
                : t('ui.studio.collapseViewport')}
            </Button>
          </div>
        </header>

        <div
          id="studio-viewport-content"
          className={`studio-viewport-grid${comparisonActive ? ' is-comparison' : ''}`}
          hidden={viewportCollapsed}
        >
          <div className="studio-active-render">{result}</div>
          <aside className="studio-queue-column">{queue}</aside>
        </div>
      </section>
  );
  const configurator = (
      <section
        key="configurator"
        ref={configuratorRef}
        className="studio-configurator-panel"
        aria-labelledby="studio-configurator-title"
      >
        <header className="studio-panel-heading">
          <div className="studio-panel-heading__title">
            <Palette aria-hidden="true" />
            <div>
              <h2 id="studio-configurator-title">{builderTitle || t('ui.studio.configuratorTitle')}</h2>
              {!builderTitle ? <p>{t('ui.studio.configuratorDescription')}</p> : null}
            </div>
          </div>
        </header>

        <div className="studio-configurator-pipeline">
          <section className="studio-step-card studio-step-card--attributes">
            <header className="studio-step-heading">
              <span>{t('ui.studio.stepLabel')} 1</span>
              <h2>{builderTitle || t('ui.studio.aestheticOptions')}</h2>
            </header>
            {modeSelector}
            {builder}
          </section>

          <GenerationEngineShell>
            <div className="studio-generation-scroll-region">
              {engine}
              {references}
              {prompt}
            </div>
            <GenerationCommandRegion
              showPromptHeading={showRenderPromptHeading}
              configActions={configActions}
              actions={actions}
              messages={messages}
            />
          </GenerationEngineShell>
        </div>
      </section>
  );
  return <div className="studio-workspace">{configurationFirst ? [configurator, viewport] : [viewport, configurator]}</div>;
}
