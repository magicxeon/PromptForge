import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GenerationReferenceDisclosure } from './GenerationReferenceDisclosure';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });

it('starts collapsed while preserving the summary and mounted editor state', () => {
  const view = render(<GenerationReferenceDisclosure count={2} limit={6} summary={<p>Selected sources</p>}>
    <input aria-label="source" defaultValue="saved" />
  </GenerationReferenceDisclosure>);
  const disclosure = view.container.querySelector('details')!;
  expect(disclosure.open).toBe(false);
  expect(screen.getByText('2 / 6')).toBeVisible();
  expect(screen.getByText('Selected sources')).toBeVisible();
  expect(screen.getByText('playground.options.editReferences')).toBeVisible();
  disclosure.open = true;
  fireEvent(disclosure, new Event('toggle'));
  fireEvent.change(screen.getByLabelText('source'), { target: { value: 'edited' } });
  disclosure.open = false;
  fireEvent(disclosure, new Event('toggle'));
  disclosure.open = true;
  fireEvent(disclosure, new Event('toggle'));
  expect(screen.getByLabelText('source')).toHaveValue('edited');
});

it('keeps problems visible and opens the exact rejected editor', async () => {
  Element.prototype.scrollIntoView = vi.fn();
  const view = render(<GenerationReferenceDisclosure count={1} limit={6} problem="Rejected source"
    focusTargetSelector="#rejected">
    <input aria-label="first" /><input id="rejected" aria-label="rejected" />
  </GenerationReferenceDisclosure>);
  expect(screen.getByRole('status')).toHaveTextContent('Rejected source');
  fireEvent.click(screen.getByRole('button', { name: 'playground.options.editReferences' }));
  await waitFor(() => expect(screen.getByLabelText('rejected')).toHaveFocus());
  expect(view.container.querySelector('details')?.open).toBe(true);
});

it('reveals an explicitly linked editor instead of scrolling to a hidden field', () => {
  window.history.replaceState(null, '', '/#reference-images');
  const view = render(<GenerationReferenceDisclosure count={0} limit={6} targetId="reference-images">
    <input aria-label="source" />
  </GenerationReferenceDisclosure>);
  expect(view.container.querySelector('details')?.open).toBe(true);
});

it('uses a guided read-only label for both the summary and problem reveal without changing expansion', () => {
  Element.prototype.scrollIntoView = vi.fn();
  const view = render(<GenerationReferenceDisclosure count={1} limit={6} label="Reference images" problem="Source unavailable">
    <input readOnly aria-label="authorized source" value="Owned Character reference" />
  </GenerationReferenceDisclosure>);
  expect(view.container.querySelector('summary')).toHaveTextContent('Reference images');
  expect(screen.queryByText('playground.options.editReferences')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reference images' }));
  expect(view.container.querySelector('details')).toHaveAttribute('open');
  expect(screen.getByLabelText('authorized source')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('authorized source')).toHaveValue('Owned Character reference');
});
