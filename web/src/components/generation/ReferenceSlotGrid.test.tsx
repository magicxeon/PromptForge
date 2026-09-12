import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ReferenceSlotGrid } from './ReferenceSlotGrid';

vi.mock('../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'alice' } }) }));
vi.mock('../media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: (props: Record<string, unknown>) => <img src={String(props.src)} alt={String(props.alt || '')} /> }));
vi.mock('./ReferenceProcessingPreview', () => ({ ReferenceProcessingPreview: () => null }));
vi.mock('./GeneratedLookSourceField', () => ({ GeneratedLookSourceField: ({ disabled, onChange }: {
  disabled: boolean; onChange: (source: { previewUrl: string }) => void;
}) => <button disabled={disabled} onClick={() => onChange({ previewUrl: '/outputs/look.png' })}>Select sheet fixture</button> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Reference display binding', () => {
  it('selects a Look into the existing Character slot without removing other references', () => {
    const onChange = vi.fn();
    render(<MemoryRouter><ReferenceSlotGrid value={{ character_reference: '/character.png', style_reference: '/style.png' }}
      supported maxReferences={3} lookSheetSelection onChange={onChange} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'playground.reference.chooseLookSheet' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select sheet fixture' }));
    expect(onChange).toHaveBeenCalledWith({ character_reference: '/outputs/look.png', style_reference: '/style.png' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'playground.reference.browseLookSheet' })).toBeEnabled();
  });

  it('keeps the Look chooser behind capability, read-only and capacity gates', () => {
    const props = { value: { style_reference: '/style.png' }, maxReferences: 1, supported: true, lookSheetSelection: true, onChange: vi.fn() };
    const { rerender } = render(<MemoryRouter><ReferenceSlotGrid {...props} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'playground.reference.chooseLookSheet' })).toBeDisabled();
    rerender(<MemoryRouter><ReferenceSlotGrid {...props} readOnly /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'playground.reference.chooseLookSheet' })).not.toBeInTheDocument();
    rerender(<MemoryRouter><ReferenceSlotGrid {...props} supported={false} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'playground.reference.chooseLookSheet' })).not.toBeInTheDocument();
  });
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
