import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ReferenceSlotGrid } from './ReferenceSlotGrid';

vi.mock('../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'alice' } }) }));
vi.mock('../media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: (props: Record<string, unknown>) => <img src={String(props.src)} alt={String(props.alt || '')} /> }));
vi.mock('./ReferenceProcessingPreview', () => ({ ReferenceProcessingPreview: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Reference display binding', () => {
  it('shows artwork only for the matching input and leaves other input URLs intact on remove', () => {
    const onChange = vi.fn();
    const props = { value: { character_reference: '/api/sheet', outfit_front: '/outfit' }, maxReferences: 6, supported: true, onChange,
      displayPreviews: { character_reference: { reference: '/api/sheet', sources: [{ src: '/api/community-art', fit: 'cover' as const }], label: 'Character artwork: Alice' } } };
    const { rerender } = render(<MemoryRouter><ReferenceSlotGrid {...props} /></MemoryRouter>);
    expect(screen.getByAltText('Character artwork: Alice')).toHaveAttribute('src', '/api/community-art');
    fireEvent.click(screen.getAllByTitle('playground.reference.remove')[0]!);
    expect(onChange).toHaveBeenCalledWith({ character_reference: undefined, outfit_front: '/outfit' });
    rerender(<MemoryRouter><ReferenceSlotGrid {...props} value={{ ...props.value, character_reference: '/api/replacement' }} /></MemoryRouter>);
    expect(screen.queryByAltText('Character artwork: Alice')).not.toBeInTheDocument();
    expect(screen.getByAltText('playground.reference.character')).toHaveAttribute('src', '/api/replacement');
    expect(props.value.character_reference).toBe('/api/sheet');
  });
});
