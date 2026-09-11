import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StoryIntentChoices } from './StoryIntentChoices';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: { name?: string }) => values?.name ? `${key} ${values.name}` : key }) }));

describe('Story intent choices', () => {
  it('keeps the last selection and disables mutations while pending', () => {
    const changed = vi.fn();
    const { rerender } = render(<StoryIntentChoices label="Genre" prefix="genre" value={['drama']} onChange={changed}
      rule={{ ids: ['drama', 'romance'], default: 'drama', maxSelections: 3 }} />);
    fireEvent.click(screen.getByText('cinematic.intent.options'));
    expect(screen.getByRole('checkbox', { name: 'genre.drama' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'genre.romance' })).not.toBeDisabled();
    rerender(<StoryIntentChoices label="Genre" prefix="genre" value={['drama']} onChange={changed} disabled
      rule={{ ids: ['drama', 'romance'], default: 'drama', maxSelections: 3 }} />);
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    expect(changed).not.toHaveBeenCalled();
  });
  it('appends and removes options without changing the remaining priority', () => {
    function Fixture() {
      const [value, onChange] = useState(['drama', 'mystery']);
      return <StoryIntentChoices label="Genre" prefix="genre" value={value} onChange={onChange}
        rule={{ ids: ['drama', 'mystery', 'romance'], default: 'drama', maxSelections: 3 }} />;
    }
    render(<Fixture />);
    fireEvent.click(screen.getByText('cinematic.intent.options'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'genre.romance' }));
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['1genre.drama', '2genre.mystery', '3genre.romance']);
    fireEvent.click(screen.getByRole('checkbox', { name: 'genre.mystery' }));
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['1genre.drama', '2genre.romance']);
  });
  it('allows replacing incompatible primary pacing without an empty selection', () => {
    function Fixture() {
      const [value, onChange] = useState(['balanced']);
      return <StoryIntentChoices label="Pacing" prefix="pacing" value={value} onChange={onChange}
        rule={{ ids: ['balanced', 'fast', 'rhythmic'], default: 'balanced', maxSelections: 2, incompatiblePairs: [['balanced', 'fast']] }} />;
    }
    render(<Fixture />);
    fireEvent.click(screen.getByText('cinematic.intent.options'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'pacing.fast' }));
    expect(screen.getByRole('checkbox', { name: 'pacing.fast' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'pacing.balanced' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'pacing.fast' })).toBeDisabled();
  });
  it('caps selections and reorders the emotional arc', () => {
    const changed = vi.fn();
    render(<StoryIntentChoices label="Feeling" prefix="feeling" value={['curious', 'relieved']} onChange={changed}
      rule={{ ids: ['curious', 'relieved', 'tense'], default: 'curious', maxSelections: 2 }} />);
    fireEvent.click(screen.getByText('cinematic.intent.options'));
    expect(screen.getByRole('checkbox', { name: 'feeling.tense' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.intent.moveEarlier feeling.relieved' }));
    expect(changed).toHaveBeenCalledWith(['relieved', 'curious']);
  });
});
