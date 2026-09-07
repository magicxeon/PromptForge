import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { communityPostSchema } from '../../schemas/communitySchemas';
import { TemplateDetailActions } from './TemplateDetailActions';

const state = vi.hoisted(() => ({ actor: 'a', canReact: true, toggle: vi.fn() }));
vi.mock('../../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: state.actor } }) }));
vi.mock('../../hooks/useCommunityEngagement', () => ({ useCommunityEngagement: () => ({ canReact: state.canReact, toggle: state.toggle }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const post = communityPostSchema.parse({ id: 'original', postType: 'template', title: 'Template', creator: {}, engagementSummary: {} });
beforeEach(() => { state.actor = 'a'; state.canReact = true; vi.clearAllMocks(); Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); });

it('saves through the existing reaction owner and copies the canonical detail link', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(<TemplateDetailActions post={post} />);
  fireEvent.click(screen.getByRole('button', { name: 'community.detail.save' }));
  expect(state.toggle).toHaveBeenCalledWith('save');
  fireEvent.click(screen.getByRole('button', { name: 'community.detail.share' }));
  await screen.findByRole('status');
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/explore/templates/original`);
});
it('shows a selectable URL on clipboard failure and clears feedback on actor change', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) } });
  const view = render(<TemplateDetailActions post={post} />);
  fireEvent.click(screen.getByRole('button', { name: 'community.detail.share' }));
  expect(await screen.findByRole('textbox')).toHaveValue(`${window.location.origin}/explore/templates/original`);
  state.actor = 'b'; view.rerender(<TemplateDetailActions post={post} />);
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
it('handles native share cancellation without publishing or reporting an error', async () => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')) });
  render(<TemplateDetailActions post={post} />);
  fireEvent.click(screen.getByRole('button', { name: 'community.detail.share' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'community.detail.share' })).toBeEnabled());
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
