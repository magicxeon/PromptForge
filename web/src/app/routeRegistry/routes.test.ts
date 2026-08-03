import { describe, expect, it } from 'vitest';
import {
  isSidebarNavigationTargetActive,
  sidebarNavigationGroups
} from './routes';

describe('Momelo sidebar navigation registry', () => {
  it('declares the three canonical Studio workflows once', () => {
    const studio = sidebarNavigationGroups
      .flatMap(group => group.items)
      .find(item => item.id === 'studio');

    expect(studio?.children?.map(item => [item.id, item.path])).toEqual([
      ['face-creator', '/create/studio/face#studio-configurator-title'],
      ['character-sheet', '/create/studio/character#studio-configurator-title'],
      ['scene-builder', '/create/studio/scene#studio-configurator-title']
    ]);
  });

  it('distinguishes Face Creator, Character Sheet and Scene Builder routes', () => {
    expect(isSidebarNavigationTargetActive('face-creator', '/create/studio/face')).toBe(true);
    expect(isSidebarNavigationTargetActive('face-creator', '/create/studio/character')).toBe(false);
    expect(isSidebarNavigationTargetActive('character-sheet', '/create/studio/character')).toBe(true);
    expect(isSidebarNavigationTargetActive('scene-builder', '/create/studio/scene')).toBe(true);
  });

  it('keeps only private Recent and Collections destinations in My Library', () => {
    const library = sidebarNavigationGroups.find(group => group.id === 'library');
    expect(library?.items.map(item => [item.id, item.path])).toEqual([
      ['history', '/library/recent'],
      ['collections', '/library/collections']
    ]);
    expect(isSidebarNavigationTargetActive('history', '/library/recent')).toBe(true);
  });
});
