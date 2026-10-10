import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SidebarNavigation } from './SidebarNavigation';

const testI18n = i18n.createInstance();

describe('SidebarNavigation Studio behavior', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          shell: {
            'shell.navigation.menu': 'Main navigation',
            'shell.navigation.collapse': 'Collapse menu',
            'shell.navigation.items.studio': 'Studio'
          }
        }
      },
      interpolation: { escapeValue: false }
    });
  });

  it('keeps expanded Studio as an accordion trigger', () => {
    const onToggleStudio = vi.fn();
    renderNavigation({ collapsed: false, onToggleStudio });

    const studio = screen.getByRole('button', { name: 'Studio' });
    expect(studio).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('link', { name: 'Studio' })).not.toBeInTheDocument();

    fireEvent.click(studio);
    expect(onToggleStudio).toHaveBeenCalledOnce();
  });

  it('turns collapsed Studio into a direct Scene Builder link', () => {
    renderNavigation({ collapsed: true });

    expect(screen.getByTitle('Studio'))
      .toHaveAttribute('href', '/create/studio/scene#studio-configurator-title');
  });
  it.each(['user', 'support'])('hides learning navigation from %s even when enabled', role => {
    renderNavigation({ collapsed: false, role, learningEnabled: true });
    expect(document.querySelector('a[href="/tutorials"]')).toBeNull();
    expect(document.querySelector('a[href="/ai-cinema"]')).toBeNull();
  });
  it('shows both entries only for enabled admins', () => {
    renderNavigation({ collapsed: false, role: 'admin', learningEnabled: true });
    expect(document.querySelector('a[href="/tutorials"]')).toBeInTheDocument();
    expect(document.querySelector('a[href="/ai-cinema"]')).toBeInTheDocument();
  });
  it('keeps the admin menu hidden when the POC is disabled', () => {
    renderNavigation({ collapsed: false, role: 'admin', learningEnabled: false });
    expect(document.querySelector('a[href="/tutorials"]')).toBeNull();
  });
});

function renderNavigation({
  collapsed,
  onToggleStudio = vi.fn(),
  role = 'user',
  learningEnabled = false
}: {
  collapsed: boolean;
  onToggleStudio?: () => void;
  role?: string;
  learningEnabled?: boolean;
}) {
  return render(
    <I18nextProvider i18n={testI18n}>
      <MemoryRouter initialEntries={['/']}>
        <SidebarNavigation
          role={role}
          learningEnabled={learningEnabled}
          collapsed={collapsed}
          studioOpen
          communityEnabled
          charactersEnabled
          cinematicEnabled
          onToggleCollapsed={vi.fn()}
          onToggleStudio={onToggleStudio}
          onNavigate={vi.fn()}
        />
      </MemoryRouter>
    </I18nextProvider>
  );
}
