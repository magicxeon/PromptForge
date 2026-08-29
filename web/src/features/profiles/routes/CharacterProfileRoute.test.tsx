import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CharacterLooksPanel, OwnerCharacterControls } from './CharacterProfileRoute';

const testI18n = i18n.createInstance();

beforeAll(async () => {
  await testI18n.use(initReactI18next).init({
    lng: 'en',
    resources: {
      en: {
        'character-profiles': {},
        'react-ui': {}
      }
    },
    ns: ['character-profiles', 'react-ui'],
    interpolation: { escapeValue: false }
  });
});

describe('OwnerCharacterControls', () => {
  it('submits the canonical public reuse policy with the rights declaration', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderControls(
      <OwnerCharacterControls
        character={{
          displayName: 'Mina',
          personalitySummary: 'Calm',
          visibility: 'public',
          reusePolicy: 'owner_only',
          status: 'approved'
        }}
        pending={false}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'ui.action.manageCharacter' }));
    fireEvent.change(screen.getByLabelText(/character-profiles\.sharing\.reuse/), {
      target: { value: 'public_reusable' }
    });
    fireEvent.click(screen.getByRole('checkbox', {
      name: 'character-profiles.sharing.rights'
    }));
    fireEvent.click(screen.getByRole('button', {
      name: 'character-profiles.sharing.save'
    }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      visibility: 'public',
      reusePolicy: 'public_reusable',
      rightsDeclarationAccepted: true
    })));
  });

  it('keeps the editor open and reports a failed save', async () => {
    renderControls(
      <OwnerCharacterControls
        character={{
          displayName: 'Mina',
          personalitySummary: 'Calm',
          visibility: 'public',
          reusePolicy: 'view_only',
          status: 'approved'
        }}
        pending={false}
        onSave={vi.fn().mockRejectedValue(new Error('Sharing could not be saved.'))}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'ui.action.manageCharacter' }));
    fireEvent.click(screen.getByRole('button', {
      name: 'character-profiles.sharing.save'
    }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sharing could not be saved.');
    expect(screen.getByLabelText(/character-profiles\.sharing\.reuse/)).toBeVisible();
  });
});

describe('CharacterLooksPanel', () => {
  it('separates source-ready drafts from approved production Looks', () => {
    renderControls(
      <CharacterLooksPanel
        loading={false}
        error={null}
        onCreate={vi.fn()}
        looks={[
          look('look_draft', 'Travel Draft', 'draft', null),
          look('look_ready', 'Platform Look', 'approved', 'lookver_ready')
        ]}
      />
    );

    expect(screen.getByText('Travel Draft')).toBeVisible();
    expect(screen.getByText('character-profiles.looks.needsReview')).toBeVisible();
    expect(screen.getByText('Platform Look')).toBeVisible();
    expect(screen.getByText('character-profiles.looks.ready')).toBeVisible();
    expect(screen.getByRole('button', { name: 'character-profiles.looks.create' })).toBeEnabled();
  });
});

function renderControls(component: ReactNode) {
  return render(
    <I18nextProvider i18n={testI18n}>
      {component}
    </I18nextProvider>
  );
}

function look(
  id: string,
  name: string,
  lifecycleStatus: 'draft' | 'approved',
  approvedVersionId: string | null
) {
  return {
    id,
    characterProfileId: 'char_a',
    sourceCharacterProfileVersionId: 'charver_a',
    name,
    description: '',
    tags: [],
    official: true,
    visibility: 'private',
    lifecycleStatus,
    activeVersionId: approvedVersionId || `${id}_version`,
    approvedVersionId,
    versions: [{
      id: approvedVersionId || `${id}_version`,
      versionNumber: 1,
      sourceMode: 'uploaded' as const,
      garmentAuthorities: {},
      canonicalFaceAssetId: null,
      status: approvedVersionId ? 'approved' as const : 'source_ready' as const,
      approvedViewAssets: null,
      createdAt: '2026-08-27T00:00:00.000Z',
      updatedAt: '2026-08-27T00:00:00.000Z',
      approvedAt: approvedVersionId ? '2026-08-27T00:00:00.000Z' : null
    }],
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    retiredAt: null
  };
}
