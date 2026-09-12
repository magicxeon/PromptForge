import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { expect, it, vi } from 'vitest';
import { VideoTakeList } from './VideoTakeList';

it('keeps preview distinct from the pinned Take and exposes older Takes beyond eight', async () => {
  const i18n = i18next.createInstance();
  await i18n.use(initReactI18next).init({ lng: 'en', keySeparator: false, interpolation: { prefix: '{', suffix: '}' }, resources: { en: { cinematic: {
    'cinematic.takes.number': 'Take {number}', 'cinematic.takes.selected': 'Selected for timeline', 'cinematic.takes.more': 'Show more Takes'
  } } } });
  const onPreview = vi.fn(), attempts = Array.from({ length: 10 }, (_, i) => ({ id: `take${i+1}`, status: i === 9 ? 'provider_processing' : 'completed' }));
  render(<I18nextProvider i18n={i18n}><VideoTakeList attempts={attempts} previewId="take10" approvedId="take3" onPreview={onPreview} /></I18nextProvider>);
  expect(screen.queryByRole('button', { name: /^Take 1 / })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Show more Takes/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Take 1 / }));
  expect(onPreview).toHaveBeenCalledWith('take1');
  expect(screen.getByRole('button', { name: /^Take 3 / })).toHaveTextContent('Selected for timeline');
  expect(screen.getByRole('button', { name: /^Take 10 / })).toHaveAttribute('aria-pressed', 'true');
});
