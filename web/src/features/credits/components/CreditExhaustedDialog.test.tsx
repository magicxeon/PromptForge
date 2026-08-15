import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CreditExhaustedDialog } from './CreditExhaustedDialog';

const testI18n = i18next.createInstance();

describe('CreditExhaustedDialog', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          credits: {
            'dialog.exhausted.title': 'You are out of credits',
            'dialog.exhausted.description': 'This generation has not entered the queue.',
            'dialog.exhausted.available': 'Available credits',
            'dialog.exhausted.required': 'Required for this render',
            'dialog.exhausted.addMock': 'Add 100 mock credits',
            'dialog.exhausted.adding': 'Adding credits...',
            'dialog.exhausted.viewCredits': 'View credit account',
            'dialog.exhausted.close': 'Close credit notice'
          }
        }
      },
      keySeparator: false,
      interpolation: { escapeValue: false, prefix: '{', suffix: '}' }
    });
  });

  it('explains the shortfall and exposes the mock grant action', () => {
    const grant = vi.fn();
    render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <CreditExhaustedDialog
            open
            requiredCredits={75}
            availableCredits={0}
            canGrantMockCredits
            grantPending={false}
            onOpenChange={() => {}}
            onGrantMockCredits={grant}
          />
        </I18nextProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog', { name: 'You are out of credits' })).toBeVisible();
    expect(screen.getByText('75')).toBeVisible();
    expect(screen.getByText('0')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Add 100 mock credits' }));
    expect(grant).toHaveBeenCalledOnce();
  });
});
