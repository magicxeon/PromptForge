import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { GenerationResultGrid } from './GenerationResultGrid';

const testI18n = i18next.createInstance();

describe('GenerationResultGrid', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          playground: {
            'playground.result.openImage': 'Open generated image',
            'playground.result.imageAlt': 'Generated image',
            'playground.result.generating': 'Generating'
          }
        }
      },
      keySeparator: false,
      interpolation: { escapeValue: false }
    });
  });

  it.each([1, 2, 3, 4])('exposes the stable %s-item grid contract', count => {
    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <GenerationResultGrid
          items={Array.from({ length: count }, (_, index) => ({
            id: `job_${index}`,
            status: 'queued',
            label: `Image ${index + 1}`
          }))}
          onOpen={() => {}}
        />
      </I18nextProvider>
    );
    expect(container.querySelector('.generation-result-grid'))
      .toHaveAttribute('data-count', String(count));
    expect(container.querySelectorAll('.generation-result-grid__tile')).toHaveLength(count);
  });

  it('opens the selected completed child and stops animation for a failed sibling', () => {
    const open = vi.fn();
    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <GenerationResultGrid
          items={[
            { id: 'job_ok', status: 'completed', imageUrl: '/outputs/original.png' },
            { id: 'job_failed', status: 'failed', error: { message: 'Provider failed.' } }
          ]}
          onOpen={open}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open generated image' }));
    expect(open).toHaveBeenCalledWith('job_ok');
    expect(screen.getByRole('alert')).toHaveTextContent('Provider failed.');
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });
});
