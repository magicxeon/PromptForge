import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DisplayMediaImage } from './DisplayMediaImage';

const state = vi.hoisted(() => ({ actor: 'a' }));
vi.mock('../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: state.actor } }) }));
vi.mock('./AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: ({ src, alt, style, onError }: React.ImgHTMLAttributes<HTMLImageElement>) => <img src={src} alt={alt} style={style} onError={onError} /> }));
it('falls through a bounded image list, ends in a placeholder and resets for another actor', () => {
  const sources = [{ src: '/work', fit: 'cover' as const }, { src: '/front', fit: 'contain' as const }];
  const view = render(<DisplayMediaImage sources={sources} alt="Alice" fallback={<span>Unavailable</span>} />);
  expect(screen.getByAltText('Alice')).toHaveStyle({ objectFit: 'cover', objectPosition: 'center' });
  fireEvent.error(screen.getByAltText('Alice'));
  expect(screen.getByAltText('Alice')).toHaveAttribute('src', '/front');
  fireEvent.error(screen.getByAltText('Alice'));
  expect(screen.getByText('Unavailable')).toBeInTheDocument();
  state.actor = 'b'; view.rerender(<DisplayMediaImage sources={sources} alt="Alice" />);
  expect(screen.getByAltText('Alice')).toHaveAttribute('src', '/work');
});
