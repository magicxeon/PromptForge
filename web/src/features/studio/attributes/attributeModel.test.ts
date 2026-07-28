import { describe, expect, it } from 'vitest';
import {
  compileSelectionPreview,
  createSelection,
  normalizeAttributeGroups
} from './attributeModel';

describe('Studio attribute model', () => {
  const bundle = {
    schema: [{
      group: 'Face',
      fields: [{ name: 'Face Shape', control: 'visual-select' }]
    }],
    templates: {},
    order: [],
    library: [{
      id: 'face.oval',
      category: 'face',
      subcategory: 'Face Shape',
      label: { en: 'Oval face', th: 'รูปหน้าวงรี' },
      prompt: { default: 'oval face' },
      ui: { group: 'Face' },
      tags: ['face']
    }],
    presets: {}
  };

  it('normalizes schema fields against enabled library options', () => {
    const groups = normalizeAttributeGroups(bundle);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.fields[0]!.options[0]!.id).toBe('face.oval');
  });

  it('maps legacy category-only face options into the owning UI field', () => {
    const groups = normalizeAttributeGroups({
      ...bundle,
      schema: [{
        group: 'Face',
        fields: [{ name: 'Eyes', control: 'visual-select' }]
      }],
      library: [{
        id: 'eyes.001',
        category: 'eyes',
        label: { en: 'Almond-shaped eyes' },
        prompt: { default: 'almond-shaped eyes' },
        ui: { group: 'Eyes' },
        tags: ['eyes'],
        enabled: true
      }]
    });

    expect(groups[0]?.fields[0]?.name).toBe('Eyes');
    expect(groups[0]?.fields[0]?.options[0]).toMatchObject({
      id: 'eyes.001',
      group: 'Face',
      subcategory: 'Eyes'
    });
  });

  it('compiles canonical mode prefixes and selected prompt phrases', () => {
    const option = normalizeAttributeGroups(bundle)[0]!.fields[0]!.options[0]!;
    const selection = createSelection(option);
    const preview = compileSelectionPreview(
      { 'Face Shape': selection },
      'character-sheet',
      'reusable_model'
    );
    expect(preview).toContain('three clearly separated views side by side');
    expect(preview).toContain('front view, exact side profile, and back view');
    expect(preview).toContain('opaque modest fitted white casting uniform');
    expect(preview).toContain('on a solid pure white background');
    expect(preview).toContain('oval face');
  });

  it('keeps Face Creation as a front-facing white-background reference portrait', () => {
    const option = normalizeAttributeGroups(bundle)[0]!.fields[0]!.options[0]!;
    const preview = compileSelectionPreview(
      { 'Face Shape': createSelection(option) },
      'headshot',
      'styled_character'
    );
    expect(preview).toContain('straight front-facing portrait');
    expect(preview).toContain('solid pure white background');
  });

  it('does not leak Headshot framing into a guided Scene prompt', () => {
    const sceneSelection = {
      id: 'environment.studio',
      value: 'in a modern fashion studio',
      label: 'Modern fashion studio',
      isCustom: false,
      group: 'Environment',
      category: 'environment',
      tags: [],
      gptPositiveWords: []
    };
    const preview = compileSelectionPreview(
      { Environment: sceneSelection },
      'scene',
      'styled_character'
    );
    expect(preview).toContain('in a modern fashion studio');
    expect(preview).not.toContain('headshot portrait');
    expect(preview).not.toContain('solid pure white background');
  });
});
