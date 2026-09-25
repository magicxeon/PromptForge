import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { videoModelCapabilitySchema } from '../../generation/schemas/videoGenerationSchemas';
import { VideoImageReferenceSources } from './VideoImageReferenceSources';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, values?: { number?: number }) =>
    values?.number ? `${key} ${values.number}` : key })
}));
vi.mock('./PlaygroundVideoSources', () => ({
  PlaygroundVideoSources: (props: { frameLabel: string; invalidFrame?: boolean }) => (
    <div data-testid="reference-source" aria-invalid={props.invalidFrame || undefined}>
      {props.frameLabel}
    </div>
  )
}));
vi.mock('./TrustedVideoSources', () => ({ TrustedVideoSources: () => null }));

const model = videoModelCapabilitySchema.parse({
  providerId: 'modelark', modelId: 'seedance', displayName: 'Seedance',
  operations: ['image_to_video'], inputModes: ['image_to_video', 'multimodal_reference'],
  referenceImageLimit: 9, supportsOrderedImageReferences: true,
  qualificationStatus: 'internal_testing', paidRoutingEnabled: false,
  testingRoutingEnabled: true, durations: [6], resolutions: ['720p'],
  aspectRatios: ['9:16'], audioModes: ['none']
});

describe('Video image reference provider issues', () => {
  it('marks only the reference matching the provider reference index', () => {
    render(<VideoImageReferenceSources
      value={{
        operation: 'image_to_video', referenceImageUrl: null, character: null, lookSheet: null,
        imageReferences: [{ url: '/one.png' }, { url: '/two.png' }, { url: '/three.png' }]
      }}
      model={model}
      onChange={() => {}}
      onBusy={() => {}}
      referenceIssue={{ contentIndex: 2, referenceIndex: 1, reason: 'possible_real_person' }}
    />);
    const sources = screen.getAllByTestId('reference-source');
    expect(sources[0]).not.toHaveAttribute('aria-invalid');
    expect(sources[1]).toHaveAttribute('aria-invalid', 'true');
    expect(sources[2]).not.toHaveAttribute('aria-invalid');
  });
});
