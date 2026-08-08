import { render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { GenerationQueueStatus } from './GenerationQueueStatus';

const testI18n = i18next.createInstance();

describe('GenerationQueueStatus', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          playground: {
            'playground.queue.current': 'Active render',
            'playground.queue.comparison': 'Comparison render',
            'playground.queue.openJob': 'Open render',
            'playground.queue.processList': 'Generation process queue',
            'playground.queue.progress': '{completed} of {total} completed',
            'playground.queue.statusSubmitting': 'Sending to the generation queue',
            'playground.queue.statusIdle': 'No active generation',
            'playground.queue.statusQueued': 'Waiting in queue',
            'playground.queue.statusProcessing': 'Generation in progress',
            'playground.queue.statusCompleted': 'Generation completed',
            'playground.queue.statusFailed': 'Generation failed',
            'playground.result.openComparison': 'Open Comparison Screen'
          }
        }
      },
      keySeparator: false,
      interpolation: { escapeValue: false, prefix: '{', suffix: '}' }
    });
  });

  it('maps an active single job to its actor-owned History detail', () => {
    render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <GenerationQueueStatus jobId="job_123" jobStatus="processing" />
        </I18nextProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Generation in progress')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Open render' })).toHaveAttribute(
      'href',
      '/history/job_123'
    );
  });

  it('renders nothing before the server accepts a queue item', () => {
    const { container } = render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <GenerationQueueStatus />
        </I18nextProvider>
      </MemoryRouter>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('stops the progress animation when a job fails', () => {
    const { container } = render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <GenerationQueueStatus jobId="job_failed" jobStatus="FAILED" />
        </I18nextProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Generation failed')).toBeVisible();
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
    expect(container.querySelector('.generation-queue-status'))
      .toHaveAttribute('aria-busy', 'false');
  });

  it('links a completed comparison to its canonical Comparison Screen', () => {
    render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <GenerationQueueStatus
            comparisonSetId="comparison_123"
            comparisonStatus="completed"
          />
        </I18nextProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Generation completed')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Open Comparison Screen' })
    ).toHaveAttribute('href', '/comparisons/comparison_123');
  });

  it('renders one compact process row per selected comparison model', () => {
    render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <GenerationQueueStatus
            comparisonSetId="comparison_123"
            comparisonStatus="processing"
            comparisonItems={[
              {
                slotId: 'slot_1',
                providerLabel: 'Google Gemini AI',
                modelLabel: 'Nano Banana',
                status: 'completed'
              },
              {
                slotId: 'slot_2',
                providerLabel: 'OpenAI',
                modelLabel: 'GPT-Image',
                status: 'processing'
              },
              {
                slotId: 'slot_3',
                providerLabel: 'ModelArk',
                modelLabel: 'Seedream',
                status: 'queued'
              }
            ]}
          />
        </I18nextProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('1 of 3 completed')).toBeVisible();
    expect(screen.getByText('Nano Banana')).toBeVisible();
    expect(screen.getByText('GPT-Image')).toBeVisible();
    expect(screen.getByText('Seedream')).toBeVisible();
    expect(screen.getByLabelText('Generation process queue').children).toHaveLength(3);
  });
});
