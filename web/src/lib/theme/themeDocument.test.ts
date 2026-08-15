import { afterEach, describe, expect, it } from 'vitest';
import { applyDocumentTheme } from './themeDocument';

describe('theme document projection', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    document.documentElement.style.removeProperty('color-scheme');
  });

  it('projects light Fashion and dark Creative color schemes', () => {
    applyDocumentTheme('fashion');
    expect(document.documentElement.dataset.theme).toBe('fashion');
    expect(document.documentElement.style.colorScheme).toBe('light');

    applyDocumentTheme('creative');
    expect(document.documentElement.dataset.theme).toBe('creative');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});

