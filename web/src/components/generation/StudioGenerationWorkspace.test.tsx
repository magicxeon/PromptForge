import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioGenerationWorkspace } from './StudioGenerationWorkspace';

const testI18n = i18next.createInstance();

describe('StudioGenerationWorkspace', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          'react-ui': {
            'ui.studio.aestheticOptions': 'Character Aesthetic Options',
            'ui.studio.backToConfigurator': 'Back to Configurator',
            'ui.studio.collapseViewport': 'Minimize panel',
            'ui.studio.configuratorDescription': 'Configuration description',
            'ui.studio.configuratorTitle': 'Studio Creative Configurator',
            'ui.studio.expandViewport': 'Open panel',
            'ui.studio.stepLabel': 'Step',
            'ui.studio.viewportDescription': 'Viewport description',
            'ui.studio.viewportTitle': 'Visual Viewport'
          }
        }
      },
      keySeparator: false,
      interpolation: { escapeValue: false }
    });
  });

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('returns to the canonical configurator without changing the workspace content', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <StudioGenerationWorkspace
          modeSelector={<div>Mode selector</div>}
          builder={<div>Builder</div>}
          result={<div>Result</div>}
          queue={<div>Queue</div>}
          engine={<div>Engine</div>}
          references={<div>References</div>}
          prompt={<div>Prompt</div>}
          actions={<button type="button">Generate</button>}
        />
      </I18nextProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to Configurator' }));

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start'
    });
    expect(screen.getByText('Mode selector')).toBeVisible();
    expect(screen.getByText('Result')).toBeVisible();
  });
});
