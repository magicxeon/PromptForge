import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { StoryboardSequenceBoard } from './StoryboardSequenceBoard';

const useGenerationJob = vi.hoisted(() => vi.fn());
vi.mock('../../generation/hooks/useGenerationJob', () => ({ useGenerationJob }));

const i18n = i18next.createInstance();

describe('StoryboardSequenceBoard read-only mode', () => {
  beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: 'en', resources: { en: { cinematic: {} } }, keySeparator: false });
  });

  it('selects a Shot without polling, dragging or exposing reorder controls', () => {
    const onSelect = vi.fn();
    render(<I18nextProvider i18n={i18n}><StoryboardSequenceBoard
      sceneTitle="Scene A"
      sceneDurationSeconds={4}
      shots={[{ id: 'shot-a', durationSeconds: 4, title: 'Opening', framing: 'medium', action: 'Hold', status: 'queued', generationJobId: 'image-job-a' }]}
      selectedShotId="shot-a"
      onSelectShot={onSelect}
      onMoveShot={vi.fn()}
      readOnly
      variant="queue"
    /></I18nextProvider>);

    expect(useGenerationJob).not.toHaveBeenCalled();
    expect(document.querySelector('[data-shot-id="shot-a"]')).toHaveAttribute('draggable', 'false');
    expect(document.querySelector('[data-shot-id="shot-a"] header strong')).toHaveTextContent('cinematic.storyboard.shot shot-a');
    expect(screen.queryByTitle('cinematic.storyboard.dragToReorder')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /moveEarlier/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.selectShot shot-a' }));
    expect(onSelect).toHaveBeenCalledWith('shot-a');
  });

  it('keeps a compact consumer-owned sequence label separate from duration', () => {
    render(<I18nextProvider i18n={i18n}><StoryboardSequenceBoard
      sceneTitle="Scene A"
      sceneDurationSeconds={6}
      shots={[{
        id: 'cineshot_1788454401629_very_long_internal_identifier',
        sequenceLabel: 'Shot 1',
        durationSeconds: 6,
        title: 'After closing',
        framing: 'medium-wide',
        action: 'Hold the CLOSED sign',
        status: 'ready'
      }]}
      selectedShotId="cineshot_1788454401629_very_long_internal_identifier"
      onSelectShot={vi.fn()}
      onMoveShot={vi.fn()}
      readOnly
      variant="queue"
    /></I18nextProvider>);

    const card = document.querySelector('[data-shot-id="cineshot_1788454401629_very_long_internal_identifier"]');
    expect(card?.querySelector('header strong')).toHaveTextContent('Shot 1');
    expect(card?.querySelector('.cinematic-storyboard-card__duration')).toHaveTextContent('6s');
    expect(card?.textContent).not.toContain('cineshot_1788454401629_very_long_internal_identifier');
  });
});
