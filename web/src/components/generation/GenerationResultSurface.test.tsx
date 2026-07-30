import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { comparisonSetSchema } from '../../features/comparisons/schemas/comparisonSchemas';
import { GenerationResultSurface } from './GenerationResultSurface';

const testI18n = i18next.createInstance();

describe('GenerationResultSurface', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          playground: {
            'playground.result.kicker': 'Latest render',
            'playground.result.comparisonTitle': 'Comparison result',
            'playground.result.comparisonReady': 'Ready to compare models',
            'playground.result.comparisonEmptyDescription': 'Choose models and generate.',
            'playground.result.openComparison': 'Open Comparison Screen'
          },
          comparisons: {
            'comparisons.viewer.controls': 'Comparison controls',
            'comparisons.viewer.sync': 'Sync view',
            'comparisons.viewer.zoomOut': 'Zoom out',
            'comparisons.viewer.zoomIn': 'Zoom in',
            'comparisons.viewer.fit': 'Fit',
            'comparisons.viewer.reset': 'Reset',
            'comparisons.viewer.fullscreen': 'Fullscreen',
            'comparisons.viewer.previous': 'Previous',
            'comparisons.viewer.next': 'Next',
            'comparisons.viewer.download': 'Download',
            'comparisons.viewer.promptLabel': 'Comparison prompt',
            'comparisons.viewer.winner': 'Winner'
          },
          'react-ui': {
            'ui.action.cancel': 'Cancel',
            'ui.action.save': 'Save',
            'ui.comparisons.renameTitle': 'Rename Comparison'
          }
        }
      },
      keySeparator: false,
      interpolation: { escapeValue: false }
    });
  });

  it('links a generated comparison to its canonical Comparison Screen', () => {
    const comparison = comparisonSetSchema.parse({
      id: 'comparison_123',
      name: 'Provider test',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      runs: [{
        id: 'run_1',
        status: 'completed',
        createdAt: Date.now(),
        slots: []
      }]
    });
    render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <GenerationResultSurface
            comparison={comparison}
            pending={false}
            onGoToPrompt={() => {}}
          />
        </I18nextProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Open Comparison Screen' }))
      .toHaveAttribute('href', '/comparisons/comparison_123');
  });

  it('shows a comparison-owned empty stage instead of the normal image placeholder', () => {
    render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <GenerationResultSurface
            comparisonActive
            pending={false}
            showEmpty
            onGoToPrompt={() => {}}
          />
        </I18nextProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Comparison result' })).toBeVisible();
    expect(screen.getByText('Ready to compare models')).toBeVisible();
    expect(screen.getByText('Choose models and generate.')).toBeVisible();
  });

  it('separates result utilities from feature workflow actions', () => {
    const { container } = render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <GenerationResultSurface
            job={{
              status: 'completed',
              result: {
                imageUrl: '/outputs/job_face_result.png',
                mimeType: 'image/png'
              }
            }}
            pending={false}
            onGoToPrompt={() => {}}
            renderActions={() => <button type="button">Use this Face</button>}
          />
        </I18nextProvider>
      </MemoryRouter>
    );

    expect(container.querySelector('.generation-result__media-surface')).toBeInTheDocument();
    expect(container.querySelector('.generation-result__utility-actions')).toContainElement(
      screen.getByRole('link')
    );
    expect(container.querySelector('.generation-result__workflow-actions')).toContainElement(
      screen.getByRole('button', { name: 'Use this Face' })
    );
  });

  it('renames a completed comparison directly from the result heading', async () => {
    const comparison = comparisonSetSchema.parse({
      id: 'comparison_rename',
      name: 'Original name',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      runs: [{
        id: 'run_rename',
        status: 'completed',
        createdAt: Date.now(),
        slots: []
      }]
    });
    const rename = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <GenerationResultSurface
            comparison={comparison}
            pending={false}
            onGoToPrompt={() => {}}
            onRenameComparison={rename}
          />
        </I18nextProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rename Comparison' }));
    const input = screen.getByRole('textbox', { name: 'Rename Comparison' });
    fireEvent.change(input, { target: { value: 'Fashion model benchmark' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(rename).toHaveBeenCalledWith('Fashion model benchmark');
    });
  });
});
