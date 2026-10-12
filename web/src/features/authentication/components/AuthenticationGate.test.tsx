import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationGate, isPublicAuthenticationRoute, safeAuthenticationReturnPath } from './AuthenticationGate';
import { useActor } from '../../../lib/auth/ActorProvider';

vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const current: ReturnType<typeof useActor> = {
  actor: null, config: null, identityScope: 'session:guest', mockUsers: [], mockSwitcherEnabled: false,
  isLoading: false, error: null, refresh: vi.fn().mockResolvedValue(undefined), switchActor: vi.fn().mockResolvedValue(undefined)
};

function mount(path = '/create/playground') {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/login" element={<p>Login entry</p>} />
    <Route path="*" element={<AuthenticationGate><p>Private workspace</p></AuthenticationGate>} />
  </Routes></MemoryRouter>);
}

describe('shared private presentation guard', () => {
  beforeEach(() => vi.mocked(useActor).mockReturnValue(current as ReturnType<typeof useActor>));
  it('never mounts private children while resolving or unavailable', () => {
    vi.mocked(useActor).mockReturnValue({ ...current, isLoading: true } as ReturnType<typeof useActor>);
    const view = render(<MemoryRouter initialEntries={['/credits']}><AuthenticationGate><p>Private workspace</p></AuthenticationGate></MemoryRouter>);
    expect(screen.queryByText('Private workspace')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('auth.resolving');
    vi.mocked(useActor).mockReturnValue({ ...current, error: new Error('offline') } as ReturnType<typeof useActor>);
    view.rerender(<MemoryRouter initialEntries={['/credits']}><AuthenticationGate><p>Private workspace</p></AuthenticationGate></MemoryRouter>);
    expect(screen.queryByText('Private workspace')).not.toBeInTheDocument();
    expect(screen.getByText('auth.unavailable')).toBeInTheDocument();
  });
  it('redirects resolved guests without mounting the workspace', () => {
    mount();
    expect(screen.getByText('Login entry')).toBeInTheDocument();
    expect(screen.queryByText('Private workspace')).not.toBeInTheDocument();
  });
  it('permits the server-confirmed owner', () => {
    vi.mocked(useActor).mockReturnValue({ ...current, actor: { userId: 'owner', username: 'owner', displayName: 'Owner', role: 'user', authMode: 'session' } });
    mount();
    expect(screen.getByText('Private workspace')).toBeInTheDocument();
  });
  it('preserves suspended same-owner input and discards it on a confirmed scope change', () => {
    const owner = { ...current, identityScope: 'session:owner', actor: { userId: 'owner', username: 'owner', displayName: 'Owner', role: 'user' as const, authMode: 'session' as const } };
    function Draft() {
      const [value, setValue] = useState('');
      return <input aria-label="Draft" value={value} onChange={event => setValue(event.target.value)} />;
    }
    const tree = () => <MemoryRouter initialEntries={['/create/playground']}><AuthenticationGate><Draft /></AuthenticationGate></MemoryRouter>;
    vi.mocked(useActor).mockReturnValue(owner);
    const view = render(tree());
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'unsaved work' } });
    vi.mocked(useActor).mockReturnValue({ ...owner, isLoading: true });
    view.rerender(tree());
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Draft')).not.toBeVisible();
    expect(screen.getByLabelText('Draft').parentElement).toHaveAttribute('inert');
    vi.mocked(useActor).mockReturnValue(owner);
    view.rerender(tree());
    expect(screen.getByRole('textbox')).toHaveValue('unsaved work');
    vi.mocked(useActor).mockReturnValue({ ...owner, identityScope: 'development_bypass:owner' });
    view.rerender(tree());
    expect(screen.getByRole('textbox')).toHaveValue('');
    vi.mocked(useActor).mockReturnValue({ ...current, error: new Error('offline') });
    view.rerender(tree());
    expect(screen.queryByLabelText('Draft')).not.toBeInTheDocument();
  });
  it('keeps explicit public discovery visible for guests', () => {
    mount('/explore/templates');
    expect(screen.getByText('Private workspace')).toBeInTheDocument();
    expect(isPublicAuthenticationRoute('/me')).toBe(false);
    expect(isPublicAuthenticationRoute('/admin')).toBe(false);
    for (const path of ['/home', '/community', '/community/post_1', '/community/characters', '/community/characters/char_1', '/creators/alice', '/compare']) {
      expect(isPublicAuthenticationRoute(path), path).toBe(true);
    }
    expect(isPublicAuthenticationRoute('/creator/characters')).toBe(false);
    for (const path of ['/posts/p/', '/POSTS/p', '/profiles/alice/', '/community/', '/COMMUNITY', '/creators/alice/']) {
      expect(isPublicAuthenticationRoute(path), path).toBe(true);
    }
    for (const path of ['/ME/', '/CREDITS/', '/ADMIN/', '/Creator/Characters/']) {
      expect(isPublicAuthenticationRoute(path), path).toBe(false);
    }
  });
  it('normalizes return paths and denies external, encoded, normalized staff and auth loops', () => {
    for (const path of ['//evil.invalid', '/%2f%2fevil.invalid', '/\\evil.invalid', '/login', '/LOGIN', '/ADMIN', '/AUTH/verify', '/auth/verify', '/admin', '/x/../admin', '/x/%2e%2e/admin', '/%61dmin', '/foo%0abar', 'https://evil.invalid', '/bad%']) {
      expect(safeAuthenticationReturnPath(path), path).toBe('/');
    }
    expect(safeAuthenticationReturnPath('/create/playground?compare=1')).toBe('/create/playground?compare=1');
  });
});
