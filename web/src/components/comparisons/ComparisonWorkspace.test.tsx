import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { comparisonRunSchema } from '../../features/comparisons/schemas/comparisonSchemas';
import { ComparisonWorkspace } from './ComparisonWorkspace';

const testI18n = i18next.createInstance();

describe('ComparisonWorkspace', () => {
  it('shows the shared spinner per active slot and stops on terminal states without hiding finished images', () => {
    const run = comparisonRunSchema.parse({ id: 'loading_run', status: 'processing', createdAt: Date.now(),
      slots: ['queued', 'processing', 'failed', 'cancelled', 'completed'].map((status, index) => ({
        id: `state_${index}`, provider: 'openai', model: 'model', status,
        ...(status === 'completed' ? { result: { imageUrl: '/outputs/ready.png' } } : {})
      })) });
    const view = render(<I18nextProvider i18n={testI18n}><ComparisonWorkspace mode="generation" run={run} /></I18nextProvider>);
    expect(view.container.querySelectorAll('[data-processing-spinner]')).toHaveLength(2);
    expect(view.container.querySelectorAll('[aria-busy="true"]')).toHaveLength(2);
    view.rerender(<I18nextProvider i18n={testI18n}><ComparisonWorkspace mode="generation" run={{ ...run,
      slots: run.slots.slice(0, 2).map(slot => ({ ...slot, status: 'completed', result: { mediaType: 'image' as const, imageUrl: '/outputs/ready.png' } })) }} /></I18nextProvider>);
    expect(view.container.querySelectorAll('[data-processing-spinner]')).toHaveLength(0);
    expect(view.container.querySelectorAll('.comparison-result-panel__viewport img')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled();
  });
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          comparisons: {
            comparisons: {
              viewer: {
                controls: 'Comparison controls',
                sync: 'Sync view',
                zoomOut: 'Zoom out',
                zoomIn: 'Zoom in',
                fit: 'Fit',
                reset: 'Reset',
                fullscreen: 'Fullscreen',
                exitFullscreen: 'Exit fullscreen',
                previous: 'Previous',
                next: 'Next',
                download: 'Download',
                promptLabel: 'Comparison prompt',
                winner: 'Winner',
                generationDetails: 'Generation details',
                generationDuration: 'Generation time: {value}',
                dimensions: 'Delivered dimensions: {width} by {height} pixels',
                aspectRatio: 'Delivered aspect ratio: {value}. Requested: {requested}',
                aspectRatioMismatch: 'Delivered aspect ratio {actual} differs from requested {requested}',
                actualCredits: 'Actual cost: {value} Credits',
                estimatedCredits: 'Estimated cost: {value} Credits',
                fileFormat: 'File format: {value}'
              }
            }
          }
        }
      },
      interpolation: { escapeValue: false, prefix: '{', suffix: '}' }
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

  it('toggles fullscreen through the same toolbar control', async () => {
    const run = comparisonRunSchema.parse({
      id: 'run_fullscreen',
      status: 'completed',
      createdAt: Date.now(),
      slots: [{
        id: 'slot_1',
        provider: 'gemini',
        model: 'model_a',
        status: 'completed',
        result: { imageUrl: '/outputs/result.png' }
      }]
    });
    let fullscreenElement: Element | null = null;
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement
    });
    const requestFullscreen = vi.fn(async () => {
      fullscreenElement = document.querySelector('.comparison-workspace');
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    const exitFullscreen = vi.fn(async () => {
      fullscreenElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen
    });

    render(
      <I18nextProvider i18n={testI18n}>
        <ComparisonWorkspace mode="generation" run={run} />
      </I18nextProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: 'Exit fullscreen' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeVisible());
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('renders exactly two video players without image zoom controls', () => {
    const run = comparisonRunSchema.parse({
      id: 'run_video',
      status: 'completed',
      mediaType: 'video',
      createdAt: Date.now(),
      slots: ['a', 'b'].map(id => ({
        id: `slot_${id}`,
        provider: 'provider',
        model: `model_${id}`,
        status: 'completed',
        result: {
          mediaType: 'video',
          videoUrl: `/outputs/${id}.mp4`,
          posterUrl: `/outputs/${id}.webp`
        }
      }))
    });

    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <ComparisonWorkspace mode="generation" run={run} />
      </I18nextProvider>
    );

    expect(container.querySelectorAll('video')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument();
    expect(container.querySelector('.comparison-workspace__grid')).toHaveClass('is-video');
  });

  it('shows comparable result facts and flags a material ratio mismatch', () => {
    const run = comparisonRunSchema.parse({
      id: 'run_metadata',
      status: 'completed',
      createdAt: Date.now(),
      configurationSnapshot: { aspectRatio: '6:8' },
      slots: [
        {
          id: 'slot_matching',
          provider: 'meta-muse',
          model: 'muse-image-1.0',
          estimatedCredit: 20,
          actualCredit: 15,
          status: 'completed',
          result: {
            imageUrl: '/outputs/matching.webp',
            generationDuration: '18.7',
            width: 1344,
            height: 1792,
            mimeType: 'image/webp'
          }
        },
        {
          id: 'slot_mismatch',
          provider: 'openai',
          model: 'gpt-image-1',
          actualCredit: 105,
          status: 'completed',
          result: {
            imageUrl: '/outputs/mismatch.png',
            generationDuration: 58.8,
            width: 1024,
            height: 1536,
            mimeType: 'image/png'
          }
        }
      ]
    });

    render(
      <I18nextProvider i18n={testI18n}>
        <ComparisonWorkspace mode="generation" run={run} />
      </I18nextProvider>
    );

    expect(screen.getByLabelText('Generation time: 18.7s')).toBeVisible();
    expect(screen.getByLabelText('Delivered dimensions: 1344 by 1792 pixels')).toBeVisible();
    expect(screen.getByLabelText('Delivered aspect ratio: 3:4. Requested: 6:8')).toBeVisible();
    expect(screen.getByLabelText('Actual cost: 15 Credits')).toBeVisible();
    expect(screen.getByLabelText('File format: WEBP')).toBeVisible();
    expect(screen.getByLabelText('Delivered aspect ratio 2:3 differs from requested 6:8'))
      .toHaveClass('is-warning');
  });

  it('uses estimated Credits for an active result without a settled cost', () => {
    const run = comparisonRunSchema.parse({
      id: 'run_estimate',
      status: 'processing',
      createdAt: Date.now(),
      slots: [{
        id: 'slot_processing',
        provider: 'gemini',
        model: 'gemini-image',
        estimatedCredit: 90,
        actualCredit: 0,
        status: 'processing',
        result: { imageUrl: '/outputs/partial.png' }
      }]
    });

    render(
      <I18nextProvider i18n={testI18n}>
        <ComparisonWorkspace mode="generation" run={run} />
      </I18nextProvider>
    );

    expect(screen.getByLabelText('Estimated cost: 90 Credits')).toHaveTextContent('~90');
  });
});
