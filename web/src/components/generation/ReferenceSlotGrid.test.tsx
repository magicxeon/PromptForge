import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ReferenceRows, ReferenceSlotGrid } from './ReferenceSlotGrid';
import { ReferenceProcessingPreview } from './ReferenceProcessingPreview';

vi.mock('../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'alice' } }) }));
vi.mock('../media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: (props: Record<string, unknown>) => <img src={String(props.src)} alt={String(props.alt || '')} /> }));
vi.mock('./ReferenceProcessingPreview', () => ({ ReferenceProcessingPreview: vi.fn(() => null) }));
vi.mock('./GeneratedLookSourceField', () => ({ GeneratedLookSourceField: ({ disabled, onChange }: {
  disabled: boolean; onChange: (source: { previewUrl: string }) => void;
}) => <button disabled={disabled} onClick={() => onChange({ previewUrl: '/outputs/look.png' })}>Select sheet fixture</button> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: { active: number; max: number }) =>
  key === 'playground.reference.usage' && values ? `${values.active}/${values.max}` : key }) }));

describe('Reference display binding', () => {
  it('keeps leading source actions visible when the selected image model has no reference capability', () => {
    render(<MemoryRouter><ReferenceSlotGrid value={{}} supported={false} maxReferences={0}
      leadingContent={<button>Use approved previous clip</button>} onChange={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Use approved previous clip' })).toBeEnabled();
    expect(screen.getByText('playground.reference.unsupported')).toBeInTheDocument();
  });
  it('opts into named read-only rows while preserving canonical count, warning metadata and source bindings', () => {
    const onChange = vi.fn();
    const projection = { schemaVersion: 1, policyVersion: '1', planFingerprint: 'f', controlledGroups: [], suppressedSelections: [],
      references: [{ slotId: 'cinematic_cast_0', role: 'character_identity_pack', intent: 'identity', status: 'warning' as const,
        preserveTraits: [], suppressTraits: [], warningCodes: ['low_confidence'], detectedScope: 'full_look' }],
      warnings: [{ code: 'low_confidence', severity: 'warning', role: 'character_identity_pack' }] };
    const { container, rerender } = render(<MemoryRouter><ReferenceRows sources={[
      { slotId: 'cinematic_cast_0', name: 'Nara - a long character name', description: 'Lead / Cafe uniform', sources: [{ src: '/api/sheet', fit: 'contain' }] },
      { slotId: 'cinematic_cast_1', name: 'Listener without preview', description: 'Supporting', sources: [] }
    ]} labels={{ style_reference: 'Previous Shot: Arrival' }}><ReferenceSlotGrid
      value={{ style_reference: '/api/jobs/raw-job-id' }} roles={['style_reference']} supported maxReferences={6}
      additionalReferenceCount={3} authorityProjection={projection} onChange={onChange} readOnly processing processingError="Retained warning"
    /></ReferenceRows></MemoryRouter>);
    expect(container.querySelector('.reference-slot-grid--rows')).not.toBeNull();
    expect(screen.getByText('4/6')).toBeInTheDocument();
    expect(screen.getByAltText('Nara - a long character name')).toHaveAttribute('src', '/api/sheet');
    expect(screen.getByText('Listener without preview')).toBeInTheDocument();
    expect(screen.getByText('Previous Shot: Arrival')).toBeInTheDocument();
    expect(screen.queryByText('raw-job-id')).not.toBeInTheDocument();
    expect(screen.getAllByTitle('raw-job-id').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.reference-source-row__preview')).toHaveLength(2);
    expect(container.querySelector('[data-processing-spinner]')).not.toBeNull();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    const preview = vi.mocked(ReferenceProcessingPreview).mock.calls.at(-1)![0];
    expect(preview.projection?.references).toEqual([]);
    expect(preview.projection?.warnings).toEqual(projection.warnings);
    expect(preview.error).toBe('Retained warning');
    expect(projection.references).toHaveLength(1);
    rerender(<MemoryRouter><ReferenceSlotGrid value={{}} roles={['style_reference']} supported maxReferences={6} onChange={onChange} /></MemoryRouter>);
    expect(container.querySelector('.reference-slot-grid--rows')).toBeNull();
  });
  it('reserves capacity for scene and cast references without changing existing slots', () => {
    const onChange = vi.fn();
    const { rerender } = render(<MemoryRouter><ReferenceSlotGrid value={{}} supported maxReferences={2}
      additionalReferenceCount={2} lookSheetSelection onChange={onChange} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'playground.reference.chooseLookSheet' })).toBeDisabled();
    rerender(<MemoryRouter><ReferenceSlotGrid value={{}} supported maxReferences={2}
      additionalReferenceCount={1} lookSheetSelection onChange={onChange} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'playground.reference.chooseLookSheet' })).toBeEnabled();
    expect(onChange).not.toHaveBeenCalled();
  });
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
