import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { CinematicPortableShot } from './CinematicPortableShot';

const api = vi.hoisted(() => ({ export: vi.fn(), media: vi.fn(), actor: 'owner' }));
vi.mock('../api/cinematicSeriesApi', () => ({ exportCinematicShotWriter: (...args: unknown[]) => api.export(...args) }));
vi.mock('../../../lib/api/apiClient', () => ({ apiMediaBlob: (...args: unknown[]) => api.media(...args) }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => api.actor }));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const props = { actorId: 'owner', projectId: 'project', sceneId: 'scene', shotId: 'shot', version: 4, disabled: false };

beforeEach(() => { api.actor = 'owner'; api.export.mockReset(); api.media.mockReset(); });

it('copies the prepared prompt, uses original media and offers download when image clipboard fails', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  api.export.mockResolvedValue({ prompt: '@Image 1 = Lalin. No music.', references: [{ number: 1, name: 'Lalin', source: 'uploaded', imageUrl: '/owned/original.png' }] });
  api.media.mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
  render(<CinematicPortableShot {...props} />);
  fireEvent.click(screen.getByText('cinematic.portable.title'));
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.portable.prepare' }));
  await screen.findByRole('img', { name: 'Lalin' });
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.shotWorkspace.copy' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('@Image 1 = Lalin. No music.'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.portable.copyImage' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.portable.copyImage' }));
  await screen.findByText('cinematic.portable.failed');
  expect(api.media).toHaveBeenCalledWith('/owned/original.png', expect.any(AbortSignal));
  expect(screen.getByRole('button', { name: 'cinematic.portable.download' })).toBeEnabled();
});

it('does not reveal a prepared private packet after the actor switches', async () => {
  let finish!: (value: unknown) => void;
  api.export.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<CinematicPortableShot {...props} />);
  fireEvent.click(screen.getByText('cinematic.portable.title'));
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.portable.prepare' }));
  api.actor = 'other'; finish({ prompt: 'Private story', references: [] });
  await waitFor(() => expect(api.export).toHaveBeenCalledOnce());
  expect(screen.queryByDisplayValue('Private story')).not.toBeInTheDocument();
});

it('keeps valid downloads available but blocks a prompt with inconsistent image numbers', async () => {
  api.export.mockResolvedValue({ prompt: '', copyReady: false, references: [{ number: 1, name: 'Kin', source: 'uploaded', imageUrl: '/owned/kin.png' }],
    issues: [{ slot: 1, name: 'First Frame', code: 'first_frame_unavailable' }], warnings: ['reference_numbers_changed'] });
  render(<CinematicPortableShot {...props} />);
  fireEvent.click(screen.getByText('cinematic.portable.title'));
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.portable.prepare' }));
  await screen.findByRole('img', { name: 'Kin' });
  expect(screen.getByText('cinematic.portable.partial')).toBeVisible();
  expect(screen.getByRole('button', { name: 'cinematic.shotWorkspace.copy' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'cinematic.portable.download' })).toBeEnabled();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

it('discards a late packet after the saved Shot version changes', async () => {
  let finish!: (value: unknown) => void;
  api.export.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<CinematicPortableShot {...props} />);
  fireEvent.click(screen.getByText('cinematic.portable.title'));
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.portable.prepare' }));
  view.rerender(<CinematicPortableShot {...props} version={5} />);
  finish({ prompt: 'Old packet', references: [] });
  await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.portable.prepare' })).toBeEnabled());
  expect(screen.queryByDisplayValue('Old packet')).not.toBeInTheDocument();
});
