import { fireEvent, render, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { comparisonRunSchema } from '../../features/comparisons/schemas/comparisonSchemas';
import { ComparisonWorkspace } from './ComparisonWorkspace';

const testI18n = i18next.createInstance();

describe('ComparisonWorkspace', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          comparisons: {
            viewer: {
              controls: 'Comparison controls',
              sync: 'Sync view',
              zoomOut: 'Zoom out',
              zoomIn: 'Zoom in',
              fit: 'Fit',
              reset: 'Reset',
              fullscreen: 'Fullscreen',
              previous: 'Previous',
              next: 'Next',
              download: 'Download',
              promptLabel: 'Comparison prompt',
              winner: 'Winner'
            }
          }
        }
      },
      interpolation: { escapeValue: false }
    });
  });

  it('uses the wheel for image zoom without scrolling the page', async () => {
    const run = comparisonRunSchema.parse({
      id: 'run_1',
      status: 'completed',
      createdAt: Date.now(),
      slots: [
        {
          id: 'slot_1',
          provider: 'gemini',
          model: 'model_a',
          status: 'completed',
          result: { imageUrl: '/outputs/result.png' }
        }
      ]
    });

    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <ComparisonWorkspace mode="generation" run={run} />
      </I18nextProvider>
    );

    const viewport = container.querySelector<HTMLElement>(
      '[data-comparison-slot-id="slot_1"]'
    );
    const image = viewport?.querySelector('img');
    expect(viewport).not.toBeNull();
    expect(image).not.toBeNull();

    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: -100
    });
    fireEvent(viewport as HTMLElement, event);

    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(image?.style.transform).toContain('scale(1.15)');
    });
  });
});
