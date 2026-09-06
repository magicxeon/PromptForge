import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProviderMark } from './ProviderMark';

describe('ProviderMark', () => {
  it.each([
    ['gemini', 'lucide-sparkles'],
    ['openai', 'lucide-brain-circuit'],
    ['xai', 'lucide-telescope'],
    ['modelark', 'lucide-aperture'],
    ['meta-muse', 'lucide-palette']
  ])('maps %s to a distinct provider symbol', (providerId, iconClass) => {
    const { container } = render(<ProviderMark providerId={providerId} />);
    expect(container.querySelector(`[data-provider-mark="${providerId}"] .${iconClass}`)).toBeInTheDocument();
  });

  it('keeps an honest generic fallback for a future provider', () => {
    const { container } = render(<ProviderMark providerId="future-provider" />);
    expect(container.querySelector('[data-provider-mark="future-provider"] .lucide-boxes')).toBeInTheDocument();
  });
});
