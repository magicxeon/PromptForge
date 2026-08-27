import { describe, expect, it } from 'vitest';
import {
  isSidebarNavigationTargetActive,
  routePaths,
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

  it('keeps private work and owned Characters in My Library', () => {
    const library = sidebarNavigationGroups.find(group => group.id === 'library');
    expect(library?.items.map(item => [item.id, item.path])).toEqual([
      ['history', '/library/recent'],
      ['collections', '/library/collections'],
      ['my-characters', '/me/characters'],
      ['my-templates', '/me/templates']
    ]);
    expect(isSidebarNavigationTargetActive('history', '/library/recent')).toBe(true);
    expect(isSidebarNavigationTargetActive('my-characters', '/me/characters')).toBe(true);
    expect(isSidebarNavigationTargetActive('my-characters', '/me/characters/charprof_1')).toBe(true);
    expect(isSidebarNavigationTargetActive('my-templates', '/me/templates')).toBe(true);
  });

  it('keeps Attribute Studio under the canonical Admin route', () => {
    expect(routePaths.admin).toBe('/admin');
    expect(routePaths.adminOperations).toBe('/admin/operations');
    expect(routePaths.adminAttributes).toBe('/admin/attributes');
  });

  it('registers Cinematic Studio once under Create and marks nested routes active', () => {
    const create = sidebarNavigationGroups.find(group => group.id === 'create');
    const cinematicItems = create?.items.filter(item => item.id === 'cinematic');

    expect(cinematicItems).toEqual([expect.objectContaining({
      path: '/create/cinematic',
      feature: 'cinematic'
    })]);
    expect(routePaths.createCinematicNew).toBe('/create/cinematic/new');
    expect(isSidebarNavigationTargetActive('cinematic', '/create/cinematic/project_1/storyboard')).toBe(true);
  });
});
