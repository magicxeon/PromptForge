import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../../client/i18n/locales/en/tutorials.json';
import { ContentCatalogRoute } from './ContentCatalogRoute';
import { contentSchema, listCatalog, saveContent } from '../api/contentCatalogApi';

const state = vi.hoisted(() => ({ authorized: true, enabled: true, resolvingActor: false, actorId: 'admin' }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => state.actorId }));
vi.mock('../hooks/useCatalogAccess', () => ({ useCatalogAccess: () => ({ ...state, actor: { userId: state.actorId, role: state.authorized ? 'admin' : 'member' }, config: { data: { enabled: true, defaultFreeCount: 3,
  limits: { titleLength: 200, descriptionLength: 10000, chapters: 100, episodes: 500, lessonsPerChapter: 100, totalLessons: 1 } }, isPending: false, isError: false } }) }));
vi.mock('../api/contentCatalogApi', async importOriginal => ({ ...await importOriginal<typeof import('../api/contentCatalogApi')>(), listCatalog: vi.fn(), saveContent: vi.fn() }));
const i18n = i18next.createInstance();
function mount(path = '/tutorials') {
  const router = createMemoryRouter([{ path: '*', element: <ContentCatalogRoute kind="tutorial" /> }], { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const tree = <I18nextProvider i18n={i18n}><QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider></I18nextProvider>;
  return { router, client, tree, ...render(tree) };
}
describe('admin catalog draft workspace', () => {
  beforeAll(async () => { await i18n.use(initReactI18next).init({ lng: 'en', keySeparator: false, interpolation: { prefix: '{', suffix: '}' }, resources: { en: { tutorials: en, 'react-ui': { 'ui.action.cancel': 'Cancel' } } } }); });
  beforeEach(() => {
    vi.clearAllMocks(); Object.assign(state, { authorized: true, enabled: true, resolvingActor: false, actorId: 'admin' });
    vi.mocked(listCatalog).mockResolvedValue({ items: [], total: 0, offset: 0, limit: 12 });
  });
  it('does not fetch catalogs for a non-admin or a resolving actor', () => {
    state.authorized = false; mount();
    expect(screen.getByText(en.denied)).toBeInTheDocument(); expect(listCatalog).not.toHaveBeenCalled();
  });
  it('fails closed when the feature is disabled', () => {
    state.enabled = false; mount();
    expect(screen.getByText(en.disabled)).toBeInTheDocument(); expect(listCatalog).not.toHaveBeenCalled();
  });
  it('shows published discovery separately from draft management', async () => {
    mount(); await screen.findByText(en.emptyCatalog);
    expect(listCatalog).toHaveBeenCalledWith('tutorial', expect.objectContaining({ includeDrafts: false }), expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('link', { name: en.teach }));
    await screen.findByText(en.emptyDrafts);
    expect(listCatalog).toHaveBeenLastCalledWith('tutorial', expect.objectContaining({ includeDrafts: true }), expect.any(AbortSignal));
  });
  it('keeps publication disabled and retains edited content after a save failure', async () => {
    vi.mocked(saveContent).mockRejectedValue(new Error('offline'));
    mount('/tutorials/teach/new');
    fireEvent.change(screen.getByRole('textbox', { name: en.title }), { target: { value: 'My course' } });
    expect(screen.getByRole('button', { name: en.publish })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: en.save }));
    await screen.findByText(en.saveError);
    expect(screen.getByRole('textbox', { name: en.title })).toHaveValue('My course');
    expect(saveContent).toHaveBeenCalledWith(expect.objectContaining({ title: 'My course', kind: 'tutorial', access: { mode: 'free', freeCount: 0, priceCredits: 0 } }), undefined);
  });
  it('asks before navigating away from unsaved work', async () => {
    mount('/tutorials/teach/new');
    fireEvent.change(screen.getByRole('textbox', { name: en.title }), { target: { value: 'Keep this' } });
    fireEvent.click(screen.getByRole('button', { name: en.back }));
    await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('textbox', { name: en.title })).toHaveValue('Keep this');
  });
  it('honors the server total lesson limit across chapters', () => {
    mount('/tutorials/teach/new');
    fireEvent.click(screen.getByRole('button', { name: en.addChapter }));
    fireEvent.click(screen.getByRole('button', { name: en.addChapter }));
    fireEvent.click(screen.getAllByRole('button', { name: en.addLesson })[0]!);
    expect(screen.getAllByRole('button', { name: en.addLesson }).every(button => button.hasAttribute('disabled'))).toBe(true);
  });
  it.each(['admin-other', 'member'])('ignores a late create response after switching to %s', async actorId => {
    let resolve!: (value: Awaited<ReturnType<typeof saveContent>>) => void;
    vi.mocked(saveContent).mockImplementation(() => new Promise(done => { resolve = done; }));
    const view = mount('/tutorials/teach/new');
    fireEvent.change(screen.getByRole('textbox', { name: en.title }), { target: { value: 'Private old draft' } });
    fireEvent.click(screen.getByRole('button', { name: en.save }));
    await waitFor(() => expect(saveContent).toHaveBeenCalled());
    state.actorId = actorId;
    view.client.clear();
    resolve({ item: contentSchema.parse({ id: 'tutorial-old', type: 'tutorial', title: 'Private old draft', description: '', status: 'draft', revision: 1, accessMode: 'free', freeCount: 0, chapters: [], createdAt: '', updatedAt: '' }) });
    await waitFor(() => expect(screen.getByRole('button', { name: en.save })).not.toHaveAttribute('aria-busy', 'true'));
    expect(view.client.getQueryData(['content-catalog', 'admin', 'tutorial', 'tutorial-old'])).toBeUndefined();
    expect(view.router.state.location.pathname).toBe('/tutorials/teach/new');
  });
  it('ignores a late response after the editor unmounts without an actor change', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof saveContent>>) => void;
    vi.mocked(saveContent).mockImplementation(() => new Promise(done => { resolve = done; }));
    const view = mount('/tutorials/teach/new');
    fireEvent.change(screen.getByRole('textbox', { name: en.title }), { target: { value: 'Unsaved response' } });
    fireEvent.click(screen.getByRole('button', { name: en.save }));
    await waitFor(() => expect(saveContent).toHaveBeenCalled());
    view.unmount(); view.client.clear();
    resolve({ item: contentSchema.parse({ id: 'tutorial-late', type: 'tutorial', title: 'Unsaved response', description: '', status: 'draft', revision: 1, accessMode: 'free', freeCount: 0, chapters: [], createdAt: '', updatedAt: '' }) });
    await new Promise(done => setTimeout(done, 10));
    expect(view.client.getQueryData(['content-catalog', 'admin', 'tutorial', 'tutorial-late'])).toBeUndefined();
    expect(view.router.state.location.pathname).toBe('/tutorials/teach/new');
  });
});
