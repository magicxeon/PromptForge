export type HairColorConfiguration = {
  enabled: boolean;
  base: string;
  highlightEnabled: boolean;
  highlight: string;
};

export type GarmentToneConfiguration = {
  enabled: boolean;
  color: string;
};

export type StudioCustomColors = {
  Color: HairColorConfiguration;
  'Primary Color': GarmentToneConfiguration;
  'Secondary Color': GarmentToneConfiguration;
};

export const defaultStudioCustomColors: StudioCustomColors = {
  Color: {
    enabled: false,
    base: '#4a3728',
    highlightEnabled: false,
    highlight: '#c58a5b'
  },
  'Primary Color': {
    enabled: false,
    color: '#111827'
  },
  'Secondary Color': {
    enabled: false,
    color: '#e5e7eb'
  }
};

export function createStudioCustomColors(
  value?: Partial<StudioCustomColors> | null
): StudioCustomColors {
  return {
    Color: {
      ...defaultStudioCustomColors.Color,
      ...(value?.Color || {})
    },
    'Primary Color': {
      ...defaultStudioCustomColors['Primary Color'],
      ...(value?.['Primary Color'] || {})
    },
    'Secondary Color': {
      ...defaultStudioCustomColors['Secondary Color'],
      ...(value?.['Secondary Color'] || {})
    }
  };
}

export function isCustomColorField(group: string, fieldName: string) {
  return (
    (group === 'Hair' && fieldName === 'Color')
    || (group === 'Clothing'
      && (fieldName === 'Primary Color' || fieldName === 'Secondary Color'))
  );
}

export function isCustomHairColorActive(colors: StudioCustomColors) {
  return colors.Color.enabled || colors.Color.highlightEnabled;
}

export function applyCustomColorSelectionAuthority<T>(
  selections: Record<string, T>,
  colors: StudioCustomColors
) {
  const next = { ...selections };
  delete next['Primary Color'];
  delete next['Secondary Color'];
  if (isCustomHairColorActive(colors)) {
    delete next.Color;
  }
  return next;
}

export function restrictCustomColorsForReferences(
  colors: StudioCustomColors,
  {
    characterOwnsAppearance = false,
    characterOwnsOutfit = false,
    outfitReferenceOwnsOutfit = false
  }: {
    characterOwnsAppearance?: boolean;
    characterOwnsOutfit?: boolean;
    outfitReferenceOwnsOutfit?: boolean;
  }
) {
  const next = createStudioCustomColors(colors);
  if (characterOwnsAppearance) {
    next.Color.enabled = false;
    next.Color.highlightEnabled = false;
  }
  if (characterOwnsOutfit || outfitReferenceOwnsOutfit) {
    next['Primary Color'].enabled = false;
    next['Secondary Color'].enabled = false;
  }
  return next;
}

export function compileCustomColorPhrases(colors: StudioCustomColors) {
  const hair = [
    colors.Color.enabled
      ? `base hair color ${colors.Color.base}`
      : '',
    colors.Color.highlightEnabled
      ? `dimensional hair highlights in ${colors.Color.highlight}, blended naturally through the hair strands`
      : ''
  ].filter(Boolean);

  const garment = [
    colors['Primary Color'].enabled
      ? `dominant garment tone ${colors['Primary Color'].color}`
      : '',
    colors['Secondary Color'].enabled
      ? `coordinating accent garment tone ${colors['Secondary Color'].color}`
      : ''
  ].filter(Boolean);

  return {
    hair,
    garment: garment.length
      ? [
        `${garment.join(' with ')}, harmonized by the AI as one cohesive outfit color palette`
      ]
      : []
  };
}
