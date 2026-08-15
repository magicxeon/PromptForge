import { render } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import type { FashionRun } from '../schemas/fashionSchemas';
import { FashionProductionSurface } from './FashionProductionSurface';

const testI18n = i18next.createInstance();

describe('FashionProductionSurface presentation', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          'fashion-blueprint': {
            'fashion.run.title': 'Fashion production',
            'fashion.run.preparingTitle': 'Preparing outfits',
            'fashion.run.preparingDescription': 'Your images are being prepared.'
          },
          playground: {
            'playground.queue.outputGroup': 'Output group',
            'playground.queue.groupProgress': '{{completed}} of {{total}} complete',
            'playground.queue.statusProcessing': 'Processing'
          }
        }
      },
      keySeparator: false,
      interpolation: { escapeValue: false }
    });
  });

  it('uses the shared loading halo while an accepted run is preparing', () => {
    const run = {
      id: 'frun_preparing',
      status: 'processing',
      operations: []
    } as FashionRun;
    const { container } = render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <FashionProductionSurface run={run} />
        </I18nextProvider>
      </MemoryRouter>
    );

    expect(container.querySelector('.fashion-production__empty .generation-loading-indicator'))
      .toBeInTheDocument();
    expect(container.querySelector('.fashion-production__empty .generation-loading-indicator__pulse'))
      .toBeInTheDocument();
  });
});
