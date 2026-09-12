import { render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ProviderModel } from '../../generation/schemas/generationSchemas';
import { StoryboardVideoCompatibilityNotice } from './StoryboardVideoCompatibilityNotice';

const i18n = i18next.createInstance();
const baseModel = {
  id: 'image-model',
  displayName: 'Image model',
  capabilities: {
    imageGeneration: true,
    imageEdit: false,
    imageReferences: false,
    maxReferenceImages: 0,
    streaming: false,
    aspectRatios: ['9:16']
  }
} satisfies ProviderModel;

describe('StoryboardVideoCompatibilityNotice', () => {
  beforeAll(async () => {
    await i18n.use(initReactI18next).init({
      lng: 'en',
      keySeparator: false,
      resources: {
        en: {
          cinematic: {
            'cinematic.storyboard.seedanceCompatibleTitle': 'Ready for Seedance 2.x testing',
            'cinematic.storyboard.seedanceCompatibleDescription': 'Compatible source',
            'cinematic.storyboard.seedanceIncompatibleTitle': 'Not ready for Seedance 2.x',
            'cinematic.storyboard.seedanceIncompatibleDescription': 'Choose Seedream 5.0 Lite'
          }
        }
      }
    });
  });

  it('shows catalog-derived compatibility for a Character Shot', () => {
    const compatibleModel = {
      ...baseModel,
      capabilities: {
        ...baseModel.capabilities,
        downstreamVideoCompatibility: {
          'modelark-seedance-2': { status: 'internal_testing' }
        }
      }
    } satisfies ProviderModel;

    render(<I18nextProvider i18n={i18n}>
      <StoryboardVideoCompatibilityNotice model={compatibleModel} containsCharacter />
    </I18nextProvider>);

    expect(screen.getByText('Ready for Seedance 2.x testing')).toBeInTheDocument();
  });

  it('does not show the Seedream-only warning when source providers are open', () => {
    render(<I18nextProvider i18n={i18n}>
      <StoryboardVideoCompatibilityNotice model={{ ...baseModel,
        capabilities: { ...baseModel.capabilities, generatedReferenceSourcesOpen: true } }} containsCharacter />
    </I18nextProvider>);
    expect(screen.queryByText('Not ready for Seedance 2.x')).not.toBeInTheDocument();
  });

  it('warns for another image model and stays hidden for environment-only Shots', () => {
    const { rerender } = render(<I18nextProvider i18n={i18n}>
      <StoryboardVideoCompatibilityNotice model={baseModel} containsCharacter />
    </I18nextProvider>);
    expect(screen.getByText('Not ready for Seedance 2.x')).toBeInTheDocument();

    rerender(<I18nextProvider i18n={i18n}>
      <StoryboardVideoCompatibilityNotice model={baseModel} containsCharacter={false} />
    </I18nextProvider>);
    expect(screen.queryByText('Not ready for Seedance 2.x')).not.toBeInTheDocument();
  });
});
