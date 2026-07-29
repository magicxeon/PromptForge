import { render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { GenerationCommandRegion } from './GenerationCommandRegion';

const testI18n = i18next.createInstance();

describe('GenerationCommandRegion', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          'react-ui': {
            'ui.studio.stepLabel': 'Step',
            'ui.studio.renderPrompt': 'Render Active Prompt'
          }
        }
      },
      keySeparator: false,
      interpolation: { escapeValue: false }
    });
  });

  it('hides an empty active-prompt heading without hiding generation actions', () => {
    const { rerender } = render(
      <I18nextProvider i18n={testI18n}>
        <GenerationCommandRegion
          showPromptHeading={false}
          actions={<button type="button">Generate</button>}
        />
      </I18nextProvider>
    );

    expect(screen.queryByText('Render Active Prompt')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate' })).toBeVisible();

    rerender(
      <I18nextProvider i18n={testI18n}>
        <GenerationCommandRegion
          showPromptHeading
          actions={<button type="button">Generate</button>}
        />
      </I18nextProvider>
    );

    expect(screen.getByText('Render Active Prompt')).toBeVisible();
  });
});
