import { render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  CinematicEngineTargetPanel,
  type CinematicGenerationPreviewState
} from './CinematicEngineTargetPanel';

const testI18n = i18n.createInstance();

describe('CinematicEngineTargetPanel foundation fixture', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          cinematic: {
            'cinematic.engine.title': 'Engine & Target Output',
            'cinematic.engine.description': 'Video preview',
            'cinematic.engine.provider': 'Provider',
            'cinematic.engine.model': 'Model',
            'cinematic.engine.resolution': 'Resolution',
            'cinematic.engine.duration': 'Duration',
            'cinematic.engine.qualificationPending': 'Qualification pending',
            'cinematic.engine.noPaidDispatch': 'No paid dispatch',
            'cinematic.engine.generateDisabled': 'Generate video unavailable',
            'cinematic.engine.queued': 'Video queued',
            'cinematic.engine.completed': 'Video complete',
            'cinematic.engine.failed': 'Video failed',
            'cinematic.engine.previewOnly': 'Preview only'
          }
        }
      },
      interpolation: { escapeValue: false }
    });
  });

  for (const theme of ['default', 'fashion', 'creative']) {
    for (const state of ['ready', 'queued', 'completed', 'failed'] as CinematicGenerationPreviewState[]) {
      it(`renders ${state} through shared presentation under ${theme}`, () => {
        const { container, unmount } = render(
          <I18nextProvider i18n={testI18n}>
            <div data-theme={theme}>
              <CinematicEngineTargetPanel state={state} />
            </div>
          </I18nextProvider>
        );

        expect(container.querySelector('.engine-target-panel')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Generate video unavailable' })).toBeDisabled();
        unmount();
      });
    }
  }
});
