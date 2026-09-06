import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CharacterPortrait } from './CharacterPortrait';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

it('recovers from failed media when a different Character image is supplied', () => {
  const { rerender } = render(<CharacterPortrait src="/broken.jpg" name="Mali" />);
  fireEvent.error(screen.getByRole('img', { name: 'Mali' }));
  expect(screen.getByText('character-profiles.states.mediaUnavailable')).toBeVisible();
  rerender(<CharacterPortrait src="/new.jpg" name="Mali" />);
  expect(screen.getByRole('img', { name: 'Mali' })).toHaveAttribute('src', '/new.jpg');
});
