import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PromptEditor } from './PromptEditor';

describe('PromptEditor', () => {
  it('preserves the Image Playground defaults when optional media props are absent', () => {
    const { container } = render(
      <PromptEditor
        variant="playground"
        value=""
        negativeValue=""
        onChange={vi.fn()}
        onNegativeChange={vi.fn()}
      />
    );

    expect(container.querySelectorAll('.playground-prompt-editor__panel')).toHaveLength(2);
    expect(container.querySelector('#generation-main-prompt')).toHaveAttribute('maxlength', '8000');
    expect(screen.getByText('0 / 8000')).toBeInTheDocument();
  });

  it('uses the same Playground panel for a bounded Video prompt and source footer', () => {
    const { container } = render(
      <PromptEditor
        variant="playground"
        value="camera moves forward"
        negativeValue=""
        onChange={vi.fn()}
        onNegativeChange={vi.fn()}
        primaryLabel="Video direction"
        primaryDescription="Describe one clip"
        primaryPlaceholder="Describe motion"
        primaryMaxLength={4000}
        primaryFooter={<div>Video source controls</div>}
        showNegative={false}
        inputId="video-prompt"
      />
    );

    expect(container.querySelectorAll('.playground-prompt-editor__panel')).toHaveLength(1);
    expect(screen.getByLabelText('Video direction')).toHaveAttribute('maxlength', '4000');
    expect(screen.getByText('Video source controls')).toBeInTheDocument();
  });
});
