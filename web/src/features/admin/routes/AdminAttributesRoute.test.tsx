import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAttributesRoute } from './AdminAttributesRoute';

const mocks = vi.hoisted(() => ({
  listDefinitions: vi.fn(),
  getOverview: vi.fn(),
  createDraft: vi.fn(),
  saveOption: vi.fn(),
  loadManifests: vi.fn()
}));

vi.mock('../api/attributeCatalogApi', () => ({
  listAttributeDefinitions: mocks.listDefinitions,
  getAttributeCatalogOverview: mocks.getOverview,
  createAttributeCatalogDraft: mocks.createDraft,
  saveAttributeCatalogOption: mocks.saveOption
}));
vi.mock('../../studio/api/visualManifestApi', () => ({
  loadStudioVisualManifests: mocks.loadManifests,
  isSafeVisualAssetUrl: (value: string) => value.startsWith('/assets/visual-character-builder/')
}));
vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: 'usr_admin', role: 'admin' } })
}));

const testI18n = i18n.createInstance();

describe('AdminAttributesRoute mockup checkpoint', () => {
  beforeAll(async () => {
    Element.prototype.scrollIntoView = vi.fn();
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { admin: {} } },
      ns: ['admin'],
      interpolation: { escapeValue: false }
    });
  });

  beforeEach(() => {
    mocks.getOverview.mockResolvedValue(overviewResponse());
  });

  it('renders compact themed filters and keeps publication out of Attribute Studio', async () => {
    mocks.loadManifests.mockResolvedValue({});
    mocks.listDefinitions.mockResolvedValue(definitionsResponse());
    renderRoute();

    expect(await screen.findByRole('heading', { name: 'Oval face' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'admin.attributes.category' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'admin.attributes.attributeType' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'admin.attributes.visualProduction' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'admin.attributes.search' })).toHaveAttribute('placeholder', 'admin.attributes.search');
    expect(screen.queryByText('admin.attributes.search')).not.toBeInTheDocument();
    expect(screen.getByText('admin.attributes.selectDraftToEdit')).toBeVisible();
    expect(screen.queryByText('admin.attributes.supportReadOnlyHelp')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'admin.attributes.publishCategory' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'admin.attributes.publishSelectedCategory' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'admin.attributes.publishVersion' })).not.toBeInTheDocument();
  });

  it('submits the visual Attribute filter through the canonical read API', async () => {
    const user = userEvent.setup();
    mocks.loadManifests.mockResolvedValue({});
    mocks.listDefinitions.mockResolvedValue(definitionsResponse());
    renderRoute();
    const typeFilter = await screen.findByRole('combobox', { name: 'admin.attributes.attributeType' });

    typeFilter.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    await waitFor(() => expect(mocks.listDefinitions).toHaveBeenLastCalledWith(
      expect.objectContaining({ presentationKind: 'visual' }),
      expect.any(AbortSignal)
    ));
  });

  it('preserves the selected Category and Field when Attribute type changes', async () => {
    const user = userEvent.setup();
    mocks.loadManifests.mockResolvedValue({});
    mocks.listDefinitions.mockResolvedValue(bodyDefinitionsResponse());
    renderRoute('/admin/attributes?category=body&field=Body%20Silhouette&type=visual');

    const typeFilter = await screen.findByRole('combobox', { name: 'admin.attributes.attributeType' });
    typeFilter.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    await waitFor(() => expect(mocks.listDefinitions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        category: 'body',
        subcategory: 'Body Silhouette',
        presentationKind: 'text'
      }),
      expect.any(AbortSignal)
    ));

    const updatedTypeFilter = await screen.findByRole('combobox', { name: 'admin.attributes.attributeType' });
    updatedTypeFilter.focus();
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{Enter}');

    await waitFor(() => expect(mocks.listDefinitions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        category: 'body',
        subcategory: 'Body Silhouette',
        presentationKind: ''
      }),
      expect.any(AbortSignal)
    ));
  });

  it('separates Category Publish, release history, and rollback into Category Releases', async () => {
    const user = userEvent.setup();
    mocks.loadManifests.mockResolvedValue({});
    mocks.listDefinitions.mockResolvedValue(definitionsResponse());
    mocks.getOverview.mockResolvedValue(overviewResponse());
    renderRoute();

    await user.click(await screen.findByRole('button', { name: 'admin.attributes.categoryReleases' }));

    expect(await screen.findByRole('combobox', { name: 'admin.attributes.releaseCategory' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'admin.attributes.publishSelectedCategory' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'admin.attributes.releaseHistory' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'admin.attributes.rollback' })).toBeDisabled();
  });

  it('previews an exact approved manifest asset when Admin has no Gender selection', async () => {
    mocks.loadManifests.mockResolvedValue({
      'body.silhouette': {
        schemaVersion: 1,
        manifestId: 'body-silhouette',
        fieldId: 'body.silhouette',
        recolorMode: 'mask',
        items: [{
          assetId: 'visual.body.silhouette.straight',
          optionId: 'body.silhouette.straight',
          attributeId: 'body.011',
          slug: 'straight',
          recolorMode: 'mask',
          alt: { en: 'Straight silhouette' },
          assets: { thumb: '/assets/visual-character-builder/straight.png' }
        }]
      }
    });
    mocks.listDefinitions.mockResolvedValue(bodyDefinitionsResponse());
    const { container } = renderRoute('/admin/attributes?category=body&field=Body%20Silhouette&type=visual&option=body.silhouette.straight');

    expect(await screen.findByRole('heading', { name: 'Straight silhouette' })).toBeVisible();
    const previewIcons = container.querySelectorAll('.visual-option-icon');
    expect(previewIcons).toHaveLength(2);
    expect([...previewIcons].every(icon => icon.classList.contains('visual-option-icon--fluid'))).toBe(true);
  });

  it('saves an edited definition through the selected canonical draft revision', async () => {
    const user = userEvent.setup();
    mocks.loadManifests.mockResolvedValue({});
    mocks.listDefinitions.mockResolvedValue(definitionsResponse());
    mocks.getOverview.mockResolvedValue({
      ...overviewResponse(),
      drafts: [{ id: 'attrdraft_001', title: 'Working draft', revision: 3, status: 'draft', optionCount: 1 }]
    });
    mocks.saveOption.mockResolvedValue({
      id: 'attrdraft_001',
      title: 'Working draft',
      revision: 4,
      status: 'draft',
      lastSavedOptionId: 'face.002',
      bundle: { library: [] }
    });
    renderRoute('/admin/attributes?draft=attrdraft_001&category=face&field=Face%20Shape&option=face.002');

    const label = await screen.findByRole('textbox', { name: 'admin.attributes.labelEn' });
    await user.clear(label);
    await user.type(label, 'Refined oval face');
    await user.click(screen.getByRole('button', { name: 'admin.attributes.saveOption' }));

    await waitFor(() => expect(mocks.saveOption).toHaveBeenCalledWith('attrdraft_001', expect.objectContaining({
      expectedRevision: 3,
      option: expect.objectContaining({
        id: 'face.002',
        label: expect.objectContaining({ en: 'Refined oval face' })
      })
    })));
  });

  it('creates an Attribute only inside the selected existing Category and Field', async () => {
    const user = userEvent.setup();
    mocks.loadManifests.mockResolvedValue({});
    mocks.listDefinitions.mockResolvedValue(definitionsResponse());
    mocks.getOverview.mockResolvedValue({
      ...overviewResponse(),
      drafts: [{ id: 'attrdraft_001', title: 'Working draft', revision: 3, status: 'draft', optionCount: 1 }]
    });
    mocks.saveOption.mockResolvedValue({
      id: 'attrdraft_001',
      title: 'Working draft',
      revision: 4,
      status: 'draft',
      lastSavedOptionId: 'face.refined-lead',
      bundle: { library: [] }
    });
    renderRoute('/admin/attributes?draft=attrdraft_001&category=face&field=Face%20Shape');

    await user.click(await screen.findByRole('button', { name: 'admin.attributes.newAttribute' }));
    const label = screen.getByRole('textbox', { name: 'admin.attributes.labelEn' });
    const prompt = screen.getByRole('textbox', { name: 'admin.attributes.prompt' });
    await user.type(label, 'Refined lead face');
    await user.type(prompt, 'a refined lead face');
    await user.click(screen.getByRole('button', { name: 'admin.attributes.saveOption' }));

    await waitFor(() => expect(mocks.saveOption).toHaveBeenCalledWith('attrdraft_001', expect.objectContaining({
      expectedRevision: 3,
      option: expect.objectContaining({
        id: '',
        category: 'face',
        subcategory: 'Face Shape',
        label: expect.objectContaining({ en: 'Refined lead face' })
      })
    })));
  });
});

function renderRoute(initialEntry = '/admin/attributes') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={testI18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <AdminAttributesRoute />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function bodyDefinitionsResponse() {
  return {
    items: [{
      id: 'body.silhouette.straight',
      category: 'body',
      subcategory: 'Body Silhouette',
      label: { en: 'Straight silhouette' },
      prompt: { default: 'straight silhouette' },
      tags: ['body'],
      enabled: true,
      presentationKind: 'visual',
      ui: { group: 'Body', control: 'select' }
    }],
    offset: 0,
    limit: 100,
    total: 1,
    hasMore: false,
    facets: [{ category: 'body', count: 1, fields: [{ field: 'Body Silhouette', count: 1 }] }],
    resolvedFilters: { category: 'body', subcategory: 'Body Silhouette', optionId: null }
  };
}

function overviewResponse() {
  return {
    drafts: [],
    releases: [{
      id: 'attrrel_001',
      status: 'published',
      sourceDraftId: 'attrdraft_001',
      sourceDraftRevision: 2,
      publishedByUsername: 'admin_demo',
      publishedAt: '2026-08-15T00:00:00.000Z',
      reason: 'Test release'
    }],
    state: {
      activeReleaseId: 'attrrel_001',
      previousReleaseId: null,
      revision: 1,
      updatedAt: '2026-08-15T00:00:00.000Z'
    },
    permissions: { canRead: true, canMutate: true, canPublish: true }
  };
}

function definitionsResponse() {
  return {
    items: [{
      id: 'face.002',
      category: 'face',
      subcategory: 'Face Shape',
      label: { en: 'Oval face' },
      prompt: { default: 'oval face' },
      tags: ['face'],
      enabled: true,
      presentationKind: 'visual',
      ui: { group: 'Face', control: 'select' }
    }],
    offset: 0,
    limit: 100,
    total: 1,
    hasMore: false,
    facets: [{ category: 'face', count: 1, fields: [{ field: 'Face Shape', count: 1 }] }],
    resolvedFilters: { category: 'face', subcategory: 'Face Shape', optionId: null }
  };
}
