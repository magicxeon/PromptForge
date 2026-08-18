import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GenerationVideoViewer } from './GenerationVideoViewer';

const testI18n = i18next.createInstance();

describe('GenerationVideoViewer', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          'react-ui': {
            'ui.action.close': 'Close',
            'ui.action.download': 'Download',
            'ui.viewer.previous': 'Previous',
            'ui.viewer.next': 'Next',
            'ui.viewer.position': '{{current}} of {{total}}',
            'ui.viewer.provider': 'Provider',
            'ui.viewer.model': 'Model',
            'ui.viewer.created': 'Created',
            'ui.viewer.credits': 'Credits',
            'ui.videoViewer.title': 'Video viewer',
            'ui.videoViewer.description': 'Inspect video details',
            'ui.videoViewer.videoAlt': 'Generated video',
            'ui.videoViewer.generation': 'Video generation',
            'ui.videoViewer.referenceTitle': 'Video {id}',
            'ui.videoViewer.jobId': 'Job ID',
            'ui.videoViewer.status': 'Status',
            'ui.videoViewer.source': 'Starting source',
            'ui.videoViewer.clipDuration': 'Clip duration',
            'ui.videoViewer.processingTime': 'Processing time',
            'ui.videoViewer.aspectRatio': 'Aspect ratio',
            'ui.videoViewer.resolution': 'Resolution',
            'ui.videoViewer.audio': 'Audio',
            'ui.videoViewer.character': 'Character',
            'ui.videoViewer.operation.character_to_video': 'Character'
          }
        }
      },
      keySeparator: false,
      interpolation: { escapeValue: false }
    });
  });

  it('preserves a portrait clip and shows actor-owned task metadata', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <GenerationVideoViewer
            open
            activeId="vtask_portrait"
            onOpenChange={() => {}}
            onActiveIdChange={vi.fn()}
            items={[{
              id: 'vtask_portrait',
              videoUrl: '/outputs/video/portrait.mp4',
              status: 'completed',
              provider: 'modelark',
              model: 'seedance-1-0-pro-fast-251015',
              operation: 'character_to_video',
              createdAt: '2026-08-18T08:00:00.000Z',
              completedAt: '2026-08-18T08:01:05.000Z',
              clipDurationSeconds: 6,
              aspectRatio: '9:16',
              resolution: '720p',
              audioMode: 'none',
              creditCost: 42,
              characterProfileId: 'charprof_alice'
            }]}
          />
        </MemoryRouter>
      </I18nextProvider>
    );

    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveClass('object-contain');
    expect(screen.getByText('seedance-1-0-pro-fast-251015')).toBeVisible();
    expect(screen.getByText('1m 5s')).toBeVisible();
    expect(screen.getByText('9:16')).toBeVisible();
    expect(screen.getByText('42')).toBeVisible();
    expect(screen.getByRole('link', { name: /charprof_alice/i }))
      .toHaveAttribute('href', '/characters/charprof_alice');
  });

  it('supports keyboard navigation between completed clips', () => {
    const onActiveIdChange = vi.fn();
    render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <GenerationVideoViewer
            open
            activeId="vtask_one"
            onOpenChange={() => {}}
            onActiveIdChange={onActiveIdChange}
            items={[
              { id: 'vtask_one', videoUrl: '/one.mp4' },
              { id: 'vtask_two', videoUrl: '/two.mp4' }
            ]}
          />
        </MemoryRouter>
      </I18nextProvider>
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
    expect(onActiveIdChange).toHaveBeenCalledWith('vtask_two');
  });
});
