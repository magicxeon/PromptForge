import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PlaygroundGenerationWorkspace } from './PlaygroundGenerationWorkspace';

const testI18n = i18next.createInstance();

describe('PlaygroundGenerationWorkspace', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          playground: {
            'playground.result.recentTitle': 'Recent Playground renders'
          },
          'react-ui': {
            'ui.studio.collapseViewport': 'Minimize panel',
            'ui.studio.expandViewport': 'Open panel'
          }
        }
      },
      keySeparator: false,
      interpolation: { escapeValue: false }
    });
  });

  it('renders the task regions and delegates the recent collapse preference', () => {
    const onRecentExpandedChange = vi.fn();
    render(
      <I18nextProvider i18n={testI18n}>
        <PlaygroundGenerationWorkspace
          prompt={<div>Prompt region</div>}
          result={<div>Latest render</div>}
          queue={<div>Queue status</div>}
          recent={<div>Recent images</div>}
          engine={<div>Engine target</div>}
          references={<div>Reference images</div>}
          actions={<button type="button">Generate</button>}
          showRenderPromptHeading={false}
          recentExpanded
          onRecentExpandedChange={onRecentExpandedChange}
          comparisonActive={false}
        />
      </I18nextProvider>
    );

    expect(screen.getByText('Prompt region')).toBeInTheDocument();
    expect(screen.getByText('Latest render')).toBeInTheDocument();
    expect(screen.getByText('Engine target')).toBeInTheDocument();
    expect(screen.getByText('Reference images')).toBeInTheDocument();
    expect(screen.getByText('Recent images')).toBeVisible();
    expect(screen.getByText('Queue status')).toBeVisible();
    expect(
      screen.getByText('Latest render').compareDocumentPosition(
        screen.getByText('Prompt region')
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      screen.getByText('Recent images').compareDocumentPosition(
        screen.getByText('Engine target')
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Minimize panel' }));
    expect(onRecentExpandedChange).toHaveBeenCalledWith(false);
  });

  it('projects sticky control overflow into top and bottom fade states', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <PlaygroundGenerationWorkspace
          prompt={<div>Prompt region</div>}
          result={<div>Latest render</div>}
          queue={<div>Queue status</div>}
          recent={<div>Recent images</div>}
          engine={<div>Engine target</div>}
          references={<div>Reference images</div>}
          actions={<button type="button">Generate</button>}
          showRenderPromptHeading={false}
          recentExpanded
          onRecentExpandedChange={() => {}}
          comparisonActive
        />
      </I18nextProvider>
    );

    const controls = screen.getByText('Queue status')
      .closest<HTMLElement>('.playground-workspace__controls');
    const frame = controls?.closest<HTMLElement>('.playground-workspace__controls-frame');
    expect(controls).not.toBeNull();
    expect(frame).not.toBeNull();

    Object.defineProperties(controls as HTMLElement, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 300 }
    });

    (controls as HTMLElement).scrollTop = 50;
    fireEvent.scroll(controls as HTMLElement);
    expect(frame).toHaveAttribute('data-fade-top', 'true');
    expect(frame).toHaveAttribute('data-fade-bottom', 'true');

    (controls as HTMLElement).scrollTop = 200;
    fireEvent.scroll(controls as HTMLElement);
    expect(frame).toHaveAttribute('data-fade-top', 'true');
    expect(frame).not.toHaveAttribute('data-fade-bottom');
  });

  it('promotes comparison results above both workspace columns', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <PlaygroundGenerationWorkspace
          prompt={<div>Prompt region</div>}
          result={<div>Comparison results</div>}
          queue={<div>Queue status</div>}
          recent={<div>Recent images</div>}
          engine={<div>Engine target</div>}
          references={<div>Reference images</div>}
          actions={<button type="button">Generate</button>}
          showRenderPromptHeading={false}
          recentExpanded
          onRecentExpandedChange={() => {}}
          comparisonActive
        />
      </I18nextProvider>
    );

    const comparison = screen.getByText('Comparison results');
    const prompt = screen.getByText('Prompt region');
    expect(
      comparison.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(comparison.closest('.playground-workspace__comparison-result')).not.toBeNull();
  });

  it('accepts a Video-specific recent title without changing the shared layout', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <PlaygroundGenerationWorkspace
          prompt={<div>Video direction</div>}
          result={<div>Video result</div>}
          queue={null}
          recent={<div>Recent clips</div>}
          recentTitle="Recent Video outputs"
          recentPlacement="after-engine"
          engine={<div>Video engine</div>}
          references={null}
          actions={<button type="button">Generate Video</button>}
          showRenderPromptHeading={false}
          recentExpanded
          onRecentExpandedChange={() => {}}
          comparisonActive={false}
        />
      </I18nextProvider>
    );
    expect(screen.getByRole('heading', { name: 'Recent Video outputs' })).toBeVisible();
    expect(screen.getByText('Video result').compareDocumentPosition(
      screen.getByText('Video direction')
    ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Recent clips').compareDocumentPosition(
      screen.getByText('Video engine')
    ) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });
});
