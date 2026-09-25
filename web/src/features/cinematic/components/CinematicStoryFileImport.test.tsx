import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CinematicStoryFileImport, readStoryFile } from './CinematicStoryFileImport';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const policy = { extensions: ['.md', '.txt'] as Array<'.md' | '.txt'>, maximumBytes: 262144, fullStoryThresholdCharacters: 600 };
function setup() {
  const onImport = vi.fn().mockResolvedValue(undefined);
  render(<CinematicStoryFileImport policy={policy} briefLimit={600} maximumCharacters={50000} disabled={false} onImport={onImport} />);
  return onImport;
}
function upload(file: File) { fireEvent.change(screen.getByLabelText('cinematic.storyImport.upload'), { target: { files: [file] } }); }

describe('Cinematic story file import', () => {
  it('previews a short file without applying it until confirmed, and allows Full Story override', async () => {
    const onImport = setup();
    upload(new File(['# A short complete story'], 'story.md', { type: 'text/markdown' }));
    await screen.findByRole('textbox', { name: 'cinematic.storyImport.preview' });
    expect(onImport).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'cinematic.storyImport.draft' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyImport.full-story' }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyImport.apply.full-story' }));
    await waitFor(() => expect(onImport).toHaveBeenCalledWith({ fileName: 'story.md', content: '# A short complete story' }, 'full-story'));
  });

  it('keeps a detailed story complete and prevents truncating it into the brief', async () => {
    const onImport = setup();
    const content = 'A complete story. '.repeat(100);
    upload(new File([content], 'story.txt'));
    await screen.findByRole('textbox', { name: 'cinematic.storyImport.preview' });
    expect(screen.getByRole('button', { name: 'cinematic.storyImport.draft' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyImport.apply.full-story' }));
    await waitFor(() => expect(onImport).toHaveBeenCalledWith({ fileName: 'story.txt', content: content.trim() }, 'full-story'));
  });

  it('rejects unsupported and empty files without mutating user work', async () => {
    const onImport = setup();
    upload(new File(['PDF'], 'story.pdf'));
    expect(await screen.findByRole('alert')).toHaveTextContent('cinematic.storyImport.error.type');
    upload(new File(['  '], 'story.txt'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('cinematic.storyImport.error.empty'));
    expect(onImport).not.toHaveBeenCalled();
  });

  it('accepts UTF-8 BOM/Thai and rejects malformed encoding, oversized files and overlong content', async () => {
    expect((await readStoryFile(new File(['\uFEFFเรื่องย่อ\r\nตอนจบ'], 'STORY.TXT'), policy, 50000)).content).toBe('เรื่องย่อ\nตอนจบ');
    await expect(readStoryFile(new File([new Uint8Array([0xff, 0x00])], 'story.txt'), policy, 50000)).rejects.toThrow('encoding');
    await expect(readStoryFile(new File(['x'.repeat(10)], 'story.txt'), { ...policy, maximumBytes: 5 }, 50000)).rejects.toThrow('size');
    await expect(readStoryFile(new File(['x'.repeat(10)], 'story.txt'), policy, 5)).rejects.toThrow('length');
  });
});
