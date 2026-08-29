import { render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { ProjectCostSummary } from './ProjectCostSummary';

const testI18n = i18next.createInstance();

describe('ProjectCostSummary', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en', resources: { en: { cinematic: {} } }, keySeparator: false,
      returnNull: false, interpolation: { escapeValue: false }
    });
  });

  it('does not invent financial totals before the Credits read model is available', () => {
    render(<I18nextProvider i18n={testI18n}><ProjectCostSummary /></I18nextProvider>);
    expect(screen.getAllByText('--')).toHaveLength(4);
    expect(screen.queryByText('48')).not.toBeInTheDocument();
  });

  it('renders only values supplied by the Credits read model', () => {
    render(<I18nextProvider i18n={testI18n}><ProjectCostSummary summary={{
      spentCredits: 11, processingCredits: 2, nextEstimateCredits: 4, refundedCredits: 1,
      groups: []
    }} /></I18nextProvider>);
    expect(screen.getByText('11')).toBeVisible();
    expect(screen.getByText('2')).toBeVisible();
    expect(screen.getByText('4')).toBeVisible();
    expect(screen.getByText('1')).toBeVisible();
  });

  it('renders a compact drawer trigger without duplicating the ledger metrics', () => {
    render(<I18nextProvider i18n={testI18n}><ProjectCostSummary variant="trigger" /></I18nextProvider>);
    expect(screen.getByRole('button')).toBeVisible();
    expect(screen.queryAllByText('--')).toHaveLength(0);
  });
});
