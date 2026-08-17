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
});

function renderNavigation({
  collapsed,
  onToggleStudio = vi.fn()
}: {
  collapsed: boolean;
  onToggleStudio?: () => void;
}) {
  return render(
    <I18nextProvider i18n={testI18n}>
      <MemoryRouter initialEntries={['/']}>
        <SidebarNavigation
          role="user"
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
