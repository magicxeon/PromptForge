import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DialogueSoundEditor } from './DialogueSoundEditor';
import type { CinematicShot } from '../../schemas/cinematicSchemas';

describe('Dialogue & Sound', () => {
  it('edits one of several cues without overwriting sibling data and reorders whole cues', () => {
    const dialogue = [1, 2, 3].map(number => ({ text: `Line ${number}`, speakerCastAssignmentId: '', offscreenVoiceRole: 'Narrator', delivery: `delivery ${number}`, startOffsetMs: number * 100, estimatedDurationMs: 500, speakerVisible: false }));
    const onDialogue = vi.fn(), onSound = vi.fn();
    render(<DialogueSoundEditor shot={{ durationMs: 6000, dialogueCues: dialogue, audioCues: [] } as unknown as CinematicShot} cast={[]} onDialogue={onDialogue} onSound={onSound} />);
    fireEvent.change(screen.getByDisplayValue('Line 2'), { target: { value: 'Changed' } });
    const result = onDialogue.mock.calls[0]![0];
    expect(result[0]).toEqual(dialogue[0]);
    expect(result[2]).toEqual(dialogue[2]);
    expect(result[1]).toEqual({ ...dialogue[1], text: 'Changed' });
    fireEvent.click(screen.getAllByRole('button', { name: 'cinematic.cues.earlier' })[1]!);
    expect(onDialogue.mock.lastCall?.[0]).toEqual([dialogue[1], dialogue[0], dialogue[2]]);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.cues.addSound' }));
    expect(onSound.mock.lastCall?.[0][0]).toMatchObject({ kind: 'ambience', durationMs: 6000 });
  });
});
