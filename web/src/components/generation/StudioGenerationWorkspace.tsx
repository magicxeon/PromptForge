import { ChevronDown, ChevronUp, Image as ImageIcon, Palette } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

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
  messages
}: StudioGenerationWorkspaceProps) {
  const { t } = useTranslation('react-ui');
  const [viewportCollapsed, setViewportCollapsed] = useState(false);

  return (
    <div className="studio-workspace">
      <section
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
        </header>

        <div id="studio-viewport-content" className="studio-viewport-grid" hidden={viewportCollapsed}>
          <div className="studio-active-render">{result}</div>
          <aside className="studio-queue-column">{queue}</aside>
        </div>
      </section>

      <section className="studio-configurator-panel" aria-labelledby="studio-configurator-title">
        <header className="studio-panel-heading">
          <div className="studio-panel-heading__title">
            <Palette aria-hidden="true" />
            <div>
              <h2 id="studio-configurator-title">{t('ui.studio.configuratorTitle')}</h2>
              <p>{t('ui.studio.configuratorDescription')}</p>
            </div>
          </div>
        </header>

        <div className="studio-configurator-pipeline">
          <section className="studio-step-card studio-step-card--attributes">
            <header className="studio-step-heading">
              <span>{t('ui.studio.stepLabel')} 1</span>
              <h2>{t('ui.studio.aestheticOptions')}</h2>
            </header>
            {modeSelector}
            {builder}
          </section>

          <section className="studio-step-card studio-step-card--generation">
            {engine}
            {references}
            {prompt}
            <header className="studio-step-heading studio-step-heading--render">
              <span>{t('ui.studio.stepLabel')} 3</span>
              <h2>{t('ui.studio.renderPrompt')}</h2>
            </header>
            {configActions}
            {actions}
            {messages}
          </section>
        </div>
      </section>
    </div>
  );
}
