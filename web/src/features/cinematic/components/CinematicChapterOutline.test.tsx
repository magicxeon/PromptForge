import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { CinematicChapterOutline, chapterOutlineNeedsReview } from './CinematicChapterOutline';
import { cinematicChapterPlanningEstimateSchema, type CinematicProject } from '../schemas/cinematicSchemas';

const api = vi.hoisted(() => ({ propose: vi.fn(), review: vi.fn(), estimate: vi.fn(), actor: 'writer' }));
vi.mock('../api/cinematicApi', () => ({ proposeCinematicChapterOutline: (...args: unknown[]) => api.propose(...args),
  reviewCinematicChapterOutline: (...args: unknown[]) => api.review(...args),
  estimateCinematicChapterPlanning: (...args: unknown[]) => api.estimate(...args) }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => api.actor }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const row = { title: 'Arrival', synopsis: 'Mina returns home.', seasonNumber: 1, chapterNumber: 1 };
const project = { id: 'project', version: 4, activeFullStoryVersionId: 'story', confirmedFullStoryVersionId: 'story',
  setup: { format: 'mini-series', durationSeconds: 60, seasonEnabled: false, seasonCount: 1, chapterCount: 1, chaptersPerSeason: [1] },
  chapterOutline: { id: 'outline', sourceRevisionId: 'story', sourceKey: 'key', status: 'proposed',
    settings: { format: 'mini-series', durationSeconds: 60, seasonEnabled: false, seasonCount: 1 },
    chapters: [row], rationale: 'One dramatic turn.', warnings: [] }
} as unknown as CinematicProject;
const label = (name: string) => `cinematic.chapterOutline.${name}`;
function show(initial = project) {
  const changed = vi.fn(), pending = vi.fn();
  function Demo() {
    const [value, setValue] = useState(initial);
    return <CinematicChapterOutline actorId="writer" project={value} disabled={false}
      onPendingChange={pending} onProjectChanged={next => { changed(next); setValue(next); }} />;
  }
  render(<Demo />); return { changed, pending };
}

describe('Chapter outline review', () => {
  beforeEach(() => { api.actor = 'writer'; api.propose.mockReset(); api.review.mockReset(); api.estimate.mockReset(); });
  it('does not dispatch on entry and approves the edited plan explicitly', async () => {
    api.review.mockResolvedValue({ ...project, version: 5, chapterOutline: { ...project.chapterOutline, status: 'approved', chapters: [{ ...row, title: 'Homecoming' }] } });
    const props = show();
    expect(api.propose).not.toHaveBeenCalled(); expect(api.estimate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: label('chapterTitle') }), { target: { value: 'Homecoming' } });
    expect(props.pending).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('button', { name: label('regenerate') })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: label('approve') }));
    await waitFor(() => expect(props.changed).toHaveBeenCalledOnce());
    expect(api.review).toHaveBeenCalledWith('project', expect.objectContaining({ expectedVersion: 4, action: 'approve', chapters: [{ ...row, title: 'Homecoming' }] }));
    expect(screen.getByRole('button', { name: label('approve') })).toBeDisabled();
  });
  it('adds, reorders and removes rows, requiring nonblank text', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: label('add') }));
    expect(screen.getByRole('button', { name: label('approve') })).toBeDisabled();
    fireEvent.change(screen.getAllByRole('textbox', { name: label('chapterTitle') })[1]!, { target: { value: 'Reunion' } });
    fireEvent.change(screen.getAllByRole('textbox', { name: label('synopsis') })[1]!, { target: { value: 'Friends meet.' } });
    fireEvent.click(screen.getAllByRole('button', { name: label('up') })[1]!);
    expect(screen.getAllByRole('textbox', { name: label('chapterTitle') })[0]).toHaveValue('Reunion');
    fireEvent.click(screen.getAllByRole('button', { name: label('remove') })[0]!);
    expect(screen.getAllByRole('textbox', { name: label('chapterTitle') })).toHaveLength(1);
  });
  it('prevents stale approval, keeps discard available and detects changed targets', () => {
    show({ ...project, confirmedFullStoryVersionId: 'new-story' });
    expect(screen.getByRole('button', { name: label('approve') })).toBeDisabled();
    expect(screen.getByRole('button', { name: label('discard') })).toBeEnabled();
    expect(chapterOutlineNeedsReview({ ...project, chapterOutline: { ...project.chapterOutline!, status: 'approved' }, setup: { ...project.setup, chapterCount: 2 } })).toBe(true);
  });
  it('shows unavailable rather than zero estimates and accepts service-price previews', async () => {
    const response = { projectVersion: 4, billingStatus: 'qualification_no_charge', estimates: { chapters: null, chapter_outline: null } };
    expect(cinematicChapterPlanningEstimateSchema.safeParse(response).success).toBe(true);
    api.estimate.mockResolvedValue(response); show();
    fireEvent.click(screen.getByRole('button', { name: label('estimate') }));
    await waitFor(() => expect(screen.getAllByText(label('unavailable'))).toHaveLength(2));
    expect(screen.getByText('cinematic.writingBilling.paidWriting')).toBeVisible();
    expect(cinematicChapterPlanningEstimateSchema.safeParse({ ...response, estimates: { ...response.estimates,
      chapters: { operation: 'chapters', model: 'model', credits: 165, retailThb: 16.5, chargeCredits: 165,
        costBasis: 'service_price_preview', policyVersion: 'policy', exceedsValueTarget: false } } }).success).toBe(true);
  });
  it('ignores delayed results after switching actors', async () => {
    let finish!: (value: CinematicProject) => void;
    api.propose.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const props = show({ ...project, chapterOutline: null });
    fireEvent.click(screen.getByRole('button', { name: label('generate') }));
    expect(api.propose).toHaveBeenCalledOnce();
    api.actor = 'different-user'; finish(project);
    await waitFor(() => expect(screen.getByRole('button', { name: label('generate') })).not.toHaveAttribute('aria-busy'));
    expect(props.changed).not.toHaveBeenCalled();
  });
});
