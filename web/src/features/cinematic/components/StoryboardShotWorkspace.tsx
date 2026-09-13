import * as Tabs from '@radix-ui/react-tabs';
import { Clapperboard, SlidersHorizontal, Volume2 } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { GenerationWorkspaceRegions } from '../../../components/generation/GenerationExperience';

export type StoryboardWorkspaceTab = 'image' | 'shot' | 'video';

export function StoryboardShotWorkspace({ regions, tab, onTabChange, editingShot, shotDetails, videoDetails, notice }: {
  regions: GenerationWorkspaceRegions;
  tab: StoryboardWorkspaceTab;
  onTabChange: (tab: StoryboardWorkspaceTab) => void;
  editingShot: boolean;
  shotDetails: ReactNode;
  videoDetails: ReactNode;
  notice: ReactNode;
}) {
  const { t } = useTranslation('cinematic');
  const tabsRef = useRef<HTMLDivElement>(null);
  const focusKey = `${tab}:${editingShot}`;
  const previousFocusKey = useRef(focusKey);
  useEffect(() => {
    if (previousFocusKey.current !== focusKey && window.matchMedia('(max-width: 1000px)').matches) {
      tabsRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    previousFocusKey.current = focusKey;
  }, [focusKey]);
  return <div className="cinematic-storyboard-workspace">
    <div className="cinematic-storyboard-workspace__media">
      {regions.result}
      {regions.queue}
    </div>
    <div className="cinematic-storyboard-workspace__controls">
      <Tabs.Root ref={tabsRef} value={tab} onValueChange={value => onTabChange(value as StoryboardWorkspaceTab)}
        className="cinematic-storyboard-workspace__tabs">
        <Tabs.List className="cinematic-storyboard-workspace__tab-list" aria-label={t('cinematic.storyboard.workspace.controls')}>
          <Tabs.Trigger value="image"><SlidersHorizontal aria-hidden="true" />{t('cinematic.storyboard.workspace.image')}</Tabs.Trigger>
          <Tabs.Trigger value="shot"><Clapperboard aria-hidden="true" />{t('cinematic.storyboard.workspace.shot')}</Tabs.Trigger>
          <Tabs.Trigger value="video"><Volume2 aria-hidden="true" />{t('cinematic.storyboard.workspace.video')}</Tabs.Trigger>
        </Tabs.List>
        <div className="cinematic-storyboard-workspace__panels">
          <Tabs.Content value="image" forceMount hidden={tab !== 'image'}>
            {regions.engine}
            {regions.references}
          </Tabs.Content>
          <Tabs.Content value="shot" forceMount hidden={tab !== 'shot'}>
            {shotDetails}
            {regions.prompt}
          </Tabs.Content>
          <Tabs.Content value="video" forceMount hidden={tab !== 'video'}>
            {videoDetails}
          </Tabs.Content>
        </div>
      </Tabs.Root>
      <div className="cinematic-storyboard-workspace__actions">
        {notice}
        {regions.messages}
        {regions.actions}
      </div>
    </div>
  </div>;
}
