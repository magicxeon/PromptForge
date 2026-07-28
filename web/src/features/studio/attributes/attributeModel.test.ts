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
    expect(compileSelectionPreview(
      { 'Face Shape': selection },
      'character-sheet',
      'reusable_model'
    )).toContain('professional full-body three-view character casting sheet, oval face');
  });
});
