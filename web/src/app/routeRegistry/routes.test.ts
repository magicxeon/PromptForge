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
      ['face-creator', '/studio#studio-configurator-title'],
      ['character-sheet', '/studio?mode=character-sheet#studio-configurator-title'],
      ['scene-builder', '/studio/scene#studio-configurator-title']
    ]);
  });

  it('distinguishes Face Creator, Character Sheet and Scene Builder routes', () => {
    expect(isSidebarNavigationTargetActive('face-creator', '/studio')).toBe(true);
    expect(isSidebarNavigationTargetActive('face-creator', '/studio?mode=character-sheet')).toBe(false);
    expect(isSidebarNavigationTargetActive('character-sheet', '/studio?mode=character-sheet')).toBe(true);
    expect(isSidebarNavigationTargetActive('scene-builder', '/studio/scene')).toBe(true);
  });

  it('keeps owner Characters and Recent Generations in the library group', () => {
    const library = sidebarNavigationGroups.find(group => group.id === 'library');
    expect(library?.items.map(item => [item.id, item.path])).toEqual([
      ['history', '/recent-generations'],
      ['my-characters', '/creator/characters'],
      ['collections', '/collections']
    ]);
    expect(isSidebarNavigationTargetActive('history', '/recent-generations')).toBe(true);
    expect(isSidebarNavigationTargetActive('my-characters', '/creator/characters/char_1')).toBe(true);
  });
});
