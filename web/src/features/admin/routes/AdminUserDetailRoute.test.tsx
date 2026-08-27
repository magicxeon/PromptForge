import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUserDetailRoute } from './AdminUserDetailRoute';

const mocks = vi.hoisted(() => ({
  actor: { userId: 'usr_support', role: 'support' },
  getUser: vi.fn(),
  changeStatus: vi.fn()
}));

vi.mock('../api/adminApi', async importOriginal => {
  const original = await importOriginal<typeof import('../api/adminApi')>();
  return { ...original, getAdminUser: mocks.getUser, changeAdminUserStatus: mocks.changeStatus };
});
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: mocks.actor }) }));

const testI18n = i18n.createInstance();
const userDetail = {
  user: { id: 'usr_demo', username: 'user_demo', displayName: 'Demo User', role: 'user', status: 'active' },
  credits: { availableCredits: 120, reservedCredits: 5 },
  activity: { imageJobs: 3, videoJobs: 2, communityPosts: 1 }
};

describe('AdminUserDetailRoute', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en', resources: { en: { admin: {} } }, ns: ['admin'], interpolation: { escapeValue: false }
    });
  });

  beforeEach(() => {
    mocks.actor = { userId: 'usr_support', role: 'support' };
    mocks.getUser.mockReset().mockResolvedValue(userDetail);
    mocks.changeStatus.mockReset().mockResolvedValue({ user: { ...userDetail.user, status: 'suspended' } });
  });

  function renderRoute() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(<QueryClientProvider client={queryClient}><I18nextProvider i18n={testI18n}><MemoryRouter initialEntries={['/admin/users/usr_demo']}><Routes><Route path="/admin/users/:userId" element={<AdminUserDetailRoute />} /></Routes></MemoryRouter></I18nextProvider></QueryClientProvider>);
  }

  it('allows Support to inspect the user while keeping account controls read-only', async () => {
    renderRoute();
    expect(await screen.findByText('Demo User')).toBeVisible();
    expect(screen.getByText('admin.users.supportReadOnly')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'admin.users.applyStatus' })).not.toBeInTheDocument();
  });

  it('submits an Admin status command with the current status and reason', async () => {
    mocks.actor = { userId: 'usr_admin', role: 'admin' };
    renderRoute();
    await screen.findByText('Demo User');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'suspended' } });
    fireEvent.change(screen.getByPlaceholderText('admin.users.reason'), { target: { value: 'Confirmed support review' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.users.applyStatus' }));
    await waitFor(() => expect(mocks.changeStatus).toHaveBeenCalledWith('usr_demo', 'suspended', 'active', 'Confirmed support review'));
  });
});
