import { describe, expect, it } from 'vitest';
import {
  compileSelectionPreview,
  countCharacters,
  countCustomSelectionCharacters,
  createSelection,
  filterApplicableAttributeGroups,
  isAdultMalePresentation,
  normalizeAttributeGroups,
  reconcileSelectionsWithCatalog
} from './attributeModel';
import {
  applyCustomColorSelectionAuthority,
  createStudioCustomColors
} from './customColorModel';

describe('Studio attribute model', () => {
  it('shows Facial Hair only for an adult male and filters Outfit Base by presentation', () => {
    const groups = [
      {
        group: 'Face',
        fields: [{
          name: 'Facial Hair', control: 'select', group: 'Face', options: [option('facial_hair.designer_stubble', 'Face', 'Facial Hair', ['adult-male'])]
        }]
      },
      {
        group: 'Clothing',
        fields: [{
          name: 'Outfit Base', control: 'select', group: 'Clothing', options: [
            option('outfit.base.male.chore_jacket_chinos', 'Clothing', 'Outfit Base', ['outfit-base-male']),
            option('outfit.base.female.square_neck_knit_tailored_trousers', 'Clothing', 'Outfit Base', ['outfit-base-female'])
          ]
        }]
      }
    ];
    const adultMale = {
      Gender: previewSelection('male man', 'Character', 'character'),
      Age: previewSelection('21-year-old young adult', 'Character', 'character')
    };
    const female = {
      Gender: previewSelection('female woman', 'Character', 'character'),
      Age: previewSelection('21-year-old young adult', 'Character', 'character')
    };

    expect(isAdultMalePresentation(adultMale)).toBe(true);
    expect(filterApplicableAttributeGroups(groups, adultMale)[0]?.fields[0]?.name)
      .toBe('Facial Hair');
    expect(filterApplicableAttributeGroups(groups, adultMale)[1]?.fields[0]?.options.map(item => item.id))
      .toEqual(['outfit.base.male.chore_jacket_chinos']);
    expect(filterApplicableAttributeGroups(groups, female).some(group => group.group === 'Face'))
      .toBe(false);
  });
  it('counts Unicode custom directions without truncating their value', () => {
    const pose = '\u0e17\u0e48\u0e32\u0e17\u0e32\u0e07'.repeat(140);
    const selection = {
      ...previewSelection(pose, 'Pose', 'pose'),
      id: 'custom.pose-intent',
      isCustom: true
    };

    expect(countCharacters(pose)).toBe(Array.from(pose).length);
    expect(countCustomSelectionCharacters({ 'Pose Intent': selection }))
      .toBe(Array.from(pose).length);
    expect(selection.value).toBe(pose);
  });

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

  it('maps legacy Hair subcategories into the canonical React fields', () => {
    const groups = normalizeAttributeGroups({
      ...bundle,
      schema: [{
        group: 'Hair',
        fields: [
          { name: 'Cut / Style', control: 'visual-select' },
          { name: 'Texture', control: 'visual-select' },
          { name: 'Parting / Fringe', control: 'visual-select' }
        ]
      }],
      library: [
        hairOption('hair_008', 'Style', 'Ponytail'),
        hairOption('hair.text_01', 'Hair Texture', 'Silky Smooth'),
        hairOption('hair_027', 'Bangs', 'See-through Bangs')
      ]
    });

    expect(groups[0]?.fields.map(field => [
      field.name,
      field.options[0]?.id
    ])).toEqual([
      ['Cut / Style', 'hair_008'],
      ['Texture', 'hair.text_01'],
      ['Parting / Fringe', 'hair_027']
    ]);
  });

  it('compiles canonical mode prefixes and selected prompt phrases', () => {
    const option = normalizeAttributeGroups(bundle)[0]!.fields[0]!.options[0]!;
    const selection = createSelection(option);
    const preview = compileSelectionPreview(
      {
        Gender: previewSelection('female adult', 'Character', 'character'),
        'Face Shape': selection
      },
      'character-sheet',
      'reusable_model'
    );
    expect(preview).toContain('three clearly separated views side by side');
    expect(preview).toContain('front view, exact side profile facing toward the viewer right, and back view');
    expect(preview).toContain('head aligned with the torso');
    expect(preview).toContain('unlabeled image only');
    expect(preview).toContain('opaque matte medium-gray unbranded silhouette-reading casting outfit');
    expect(preview).toContain('deep rounded scoop neckline ending securely above the cleavage line');
    expect(preview).toContain('short upper-thigh athletic shorts with a short inseam');
    expect(preview).toContain('subtle white contour grid');
    expect(preview).toContain('head-to-body relationship of approximately 1:7.5 to 1:8');
    expect(preview).toContain('clear tonal separation between the medium-gray outfit');
    expect(preview).toContain('without compression, padding, lifting, reshaping, concealment, or flattening');
    expect(preview).toContain('on a seamless matte light warm-gray studio background');
    expect(preview).toContain('never AI art, CGI, 3D rendering, illustration, or a mannequin');
    expect(preview).toContain('oval face');
  });

  it('keeps a slender curvaceous build distinct from a straight slender build', () => {
    const preview = compileSelectionPreview({
      'Model Build': previewSelection(
        'slender adult fashion-model build with a narrow lean frame and slim shoulders, arms, and legs; preserve the separately selected natural body silhouette without flattening or exaggerating it',
        'Body',
        'body'
      )
    }, 'character-sheet', 'reusable_model');

    expect(preview).toContain('slender adult fashion-model build');
    expect(preview).toContain('preserve the separately selected natural body silhouette');
  });

  it('rehydrates persisted option prompt values from the current catalog', () => {
    const groups = normalizeAttributeGroups({
      ...bundle,
      schema: [{
        group: 'Body',
        fields: [{ name: 'Body Silhouette', control: 'select' }]
      }],
      library: [{
        id: 'body.silhouette.full-bust-runway-hourglass',
        category: 'body',
        subcategory: 'Body Silhouette',
        label: { en: 'Full-Bust Runway Hourglass' },
        prompt: { default: 'current anatomical proportion direction' },
        tags: ['body'],
        enabled: true
      }]
    });
    const reconciled = reconcileSelectionsWithCatalog({
      'Body Silhouette': {
        ...previewSelection('stale prompt value', 'Body', 'body'),
        id: 'body.silhouette.full-bust-runway-hourglass'
      }
    }, groups);

    expect(reconciled['Body Silhouette']?.value)
      .toBe('current anatomical proportion direction');
  });

  it('uses custom hair colors and a harmonized two-tone garment palette', () => {
    const preview = compileSelectionPreview(
      {},
      'character-sheet',
      'styled_character',
      {
        Color: {
          enabled: true,
          base: '#3a2418',
          highlightEnabled: true,
          highlight: '#c99662'
        },
        'Primary Color': { enabled: true, color: '#1f2937' },
        'Secondary Color': { enabled: true, color: '#f8fafc' }
      }
    );

    expect(preview).toContain('base hair color #3a2418');
    expect(preview).toContain('dimensional hair highlights in #c99662');
    expect(preview).toContain('dominant garment tone #1f2937');
    expect(preview).toContain('coordinating accent garment tone #f8fafc');
    expect(preview).toContain('one cohesive outfit color palette');
  });

  it('removes legacy color selections when custom color controls own them', () => {
    const colors = createStudioCustomColors({
      Color: {
        enabled: true,
        base: '#3a2418',
        highlightEnabled: false,
        highlight: '#c99662'
      }
    });
    const filtered = applyCustomColorSelectionAuthority({
      Color: { id: 'hair_013' },
      'Primary Color': { id: 'legacy.primary' },
      'Secondary Color': { id: 'legacy.secondary' },
      Pattern: { id: 'outfit.pattern.solid' }
    }, colors);

    expect(filtered).toEqual({
      Pattern: { id: 'outfit.pattern.solid' }
    });
  });

  it('keeps native clothing tone fields without exposing legacy color presets', () => {
    const groups = normalizeAttributeGroups({
      schema: [{
        group: 'Clothing',
        fields: [
          { name: 'Primary Color', control: 'select' },
          { name: 'Secondary Color', control: 'select' }
        ]
      }],
      templates: {},
      order: [],
      presets: {},
      library: [{
        id: 'outfit.color.black',
        category: 'clothing',
        subcategory: 'Clothing Color',
        label: { en: 'Black' },
        prompt: { default: 'black' },
        ui: { group: 'Clothing' },
        tags: ['clothing', 'color'],
        enabled: true
      }]
    });

    expect(groups[0]?.fields.map(field => ({
      name: field.name,
      optionCount: field.options.length
    }))).toEqual([
      { name: 'Primary Color', optionCount: 0 },
      { name: 'Secondary Color', optionCount: 0 }
    ]);
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

  it('includes editable Scene hair, skin, and body directions in the preview', () => {
    const sceneSelections = Object.fromEntries([
      ['Cut / Style', previewSelection('sleek bob haircut', 'Hair', 'hair')],
      ['Tone', previewSelection('warm deep skin tone', 'Skin', 'skin')],
      ['Model Build', previewSelection('athletic natural build', 'Body', 'body')]
    ]);

    const preview = compileSelectionPreview(
      sceneSelections,
      'scene',
      'styled_character'
    );

    expect(preview).toContain('sleek bob haircut');
    expect(preview).toContain('warm deep skin tone');
    expect(preview).toContain('athletic natural build');
  });
});

function previewSelection(value: string, group: string, category: string) {
  return {
    id: `${category}.fixture`,
    value,
    label: value,
    isCustom: false,
    group,
    category,
    tags: [],
    gptPositiveWords: []
  };
}

function option(id: string, group: string, subcategory: string, tags: string[]) {
  return {
    id,
    category: group.toLowerCase(),
    subcategory,
    label: id,
    group,
    prompt: id,
    tags
  };
}

function hairOption(id: string, subcategory: string, label: string) {
  return {
    id,
    category: 'hair',
    subcategory,
    label: { en: label },
    prompt: { default: label.toLowerCase() },
    ui: { group: 'Hair' },
    tags: ['hair'],
    enabled: true
  };
}
