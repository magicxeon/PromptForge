import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { communityPostSchema } from '../../schemas/communitySchemas';
import { TemplateFeatured } from './TemplateFeatured';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../components/media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: () => null }));
const root = communityPostSchema.parse({ id: 'root', title: 'Original', postType: 'template', imageUrl: '/root.jpg', templateAvailability: true, creator: {}, engagementSummary: {} });
it('shows original and two real creations with separate destinations and root use action', () => {
  const onUse = vi.fn();
  const creations = Array.from({ length: 3 }, (_, i) => communityPostSchema.parse({ id: `work-${i}`, title: `Work ${i}`, postType: 'image', imageUrl: `/work-${i}.jpg`, creator: {}, engagementSummary: {} }));
  const { container } = render(<MemoryRouter><TemplateFeatured post={root} creations={creations} using={false} onUse={onUse} /></MemoryRouter>);
  expect(container.querySelectorAll('.template-feature__media a')).toHaveLength(3);
  expect(screen.getByRole('link', { name: 'Original' })).toHaveAttribute('href', '/explore/templates/root');
  expect(screen.getByRole('link', { name: 'Work 0' })).toHaveAttribute('href', '/posts/work-0');
  fireEvent.click(screen.getByRole('button', { name: 'ui.action.useTemplate' }));
  expect(onUse).toHaveBeenCalledOnce();
});
it('does not fabricate variations when the family is empty and guards pending use', () => {
  const { container } = render(<MemoryRouter><TemplateFeatured post={root} creations={[]} using onUse={vi.fn()} /></MemoryRouter>);
  expect(container.querySelectorAll('.template-feature__media a')).toHaveLength(1);
  expect(screen.getByRole('button')).toBeDisabled();
});
