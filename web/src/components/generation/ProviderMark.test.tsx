import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProviderMark } from './ProviderMark';

describe('ProviderMark', () => {
  it.each([
    'gemini', 'openai', 'xai', 'modelark', 'meta-muse'
  ])('maps %s to its supplied provider shape', (providerId) => {
    const { container } = render(<ProviderMark providerId={providerId} />);
    expect(container.querySelector('.provider-mark__shape')).toHaveStyle({ maskImage: `url("/assets/providers/${providerId}.png")` });
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('.lucide-boxes')).toBeInTheDocument();
    expect(container.querySelector('.provider-mark__shape')).not.toBeInTheDocument();
  });

  it('keeps an honest generic fallback for a future provider', () => {
    const { container } = render(<ProviderMark providerId="future-provider" />);
    expect(container.querySelector('[data-provider-mark="future-provider"] .lucide-boxes')).toBeInTheDocument();
  });
});
