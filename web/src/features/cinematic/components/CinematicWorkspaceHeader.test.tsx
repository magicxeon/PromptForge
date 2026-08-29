import { render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { CinematicWorkspaceHeader } from './CinematicWorkspaceHeader';

const testI18n = i18next.createInstance();

describe('CinematicWorkspaceHeader', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en', resources: { en: { cinematic: {} } }, keySeparator: false,
      returnNull: false, interpolation: { escapeValue: false }
    });
  });

  it('keeps project identity, save status, and Project cost access together', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <CinematicWorkspaceHeader projectTitle="Before the Last Train" saveState="offline" />
      </I18nextProvider>
    );
    expect(screen.getByRole('heading', { name: 'Before the Last Train' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveAttribute('data-save-state', 'offline');
    expect(screen.getByRole('button', { name: 'cinematic.cost.title' })).toBeVisible();
  });
});
