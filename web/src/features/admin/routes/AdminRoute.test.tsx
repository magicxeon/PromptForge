import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { AdminRoute } from './AdminRoute';

const mocks = vi.hoisted(() => ({ listAdminPosts: vi.fn(), moderatePost: vi.fn() }));
vi.mock('../api/adminApi', async importOriginal => ({
  ...await importOriginal<typeof import('../api/adminApi')>(),
  listAdminPosts: mocks.listAdminPosts,
  moderatePost: mocks.moderatePost
}));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'admin', role: 'admin' } }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listAdminPosts.mockResolvedValue({ items: [{ id: 'work', title: 'Creation', status: 'published' }], hasMore: false });
  mocks.moderatePost.mockResolvedValue({});
});

it.each([true, false])('invalidates only the moderating actor family caches on success=%s', async success => {
  if (!success) mocks.moderatePost.mockRejectedValueOnce(new Error('Denied'));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const preview = ['community-template-previews', 'admin', ['root']];
  const detail = ['community-template-detail', 'admin', 'root', 'likes', 12];
  const other = ['community-template-previews', 'other', ['root']];
  for (const key of [preview, detail, other]) client.setQueryData(key, { items: [] });
  const view = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/admin?tab=posts']}><AdminRoute /></MemoryRouter></QueryClientProvider>);
  const hide = await screen.findByRole('button', { name: 'ui.action.hide' });
  fireEvent.click(hide);
  await waitFor(() => expect(mocks.moderatePost).toHaveBeenCalledWith('work', 'hide', 'Support moderation: hide'));
  await waitFor(() => expect(client.isMutating()).toBe(0));
  expect(client.getQueryState(preview)?.isInvalidated).toBe(success);
  expect(client.getQueryState(detail)?.isInvalidated).toBe(success);
  expect(client.getQueryState(other)?.isInvalidated).toBe(false);
  view.unmount();
  client.clear();
});
