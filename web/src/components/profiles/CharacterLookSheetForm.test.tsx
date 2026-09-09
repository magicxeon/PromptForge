import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CharacterLookSheetForm } from './CharacterLookSheetForm';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const value = { schemaVersion: 1 as const, name: 'MIRA', ageYears: 24, appearance: 'Dark hair', situation: 'Market owner', outfit: 'White shirt', personality: 'Warm' };
describe('CharacterLookSheetForm', () => {
  it('emphasizes the prompt and accepts 2000 Unicode code points without silent truncation', () => {
    const onChange = vi.fn();
    render(<CharacterLookSheetForm value={value} onChange={onChange} identitySlot={<button>Picker</button>} />);
    const prompt = screen.getByLabelText('lookSheet.appearance');
    expect(prompt).toHaveAttribute('rows', '8');
    const maximum = '\u{1f642}'.repeat(2000);
    fireEvent.change(prompt, { target: { value: maximum } });
    expect(onChange).toHaveBeenLastCalledWith({ ...value, appearance: maximum });
    onChange.mockClear();
    fireEvent.change(prompt, { target: { value: `${maximum}x` } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('lookSheet.promptLimit');
    expect(screen.getByRole('button', { name: 'Picker' })).toBeInTheDocument();
  });
  it('edits required fields without mutating the accepted object', () => {
    const onChange = vi.fn();
    render(<CharacterLookSheetForm value={value} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('lookSheet.name'), { target: { value: 'Lina' } });
    expect(onChange).toHaveBeenCalledWith({ ...value, name: 'Lina' });
    expect(value.name).toBe('MIRA');
    expect(screen.getByLabelText('lookSheet.age')).toHaveAttribute('type', 'number');
  });
  it('shows a pinned range and locks the approved wardrobe', () => {
    render(<CharacterLookSheetForm value={value} onChange={vi.fn()} ageLabel="20-29" outfitLocked />);
    expect(screen.getByLabelText('lookSheet.age')).toHaveValue('20-29');
    expect(screen.getByLabelText('lookSheet.age')).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/lookSheet.outfit/)).toHaveAttribute('readonly');
  });
});
