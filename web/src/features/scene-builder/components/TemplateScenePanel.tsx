import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { LayoutTemplate, X, ZoomIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { TemplatePricingBadge } from '../../../components/templates/TemplatePricingBadge';
import { routeBuilders } from '../../../app/routeRegistry/routes';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getCommunityPost } from '../../community/api/communityApi';
import type { CharacterSummary } from '../../profiles/schemas/profileSchemas';
import { type SceneCharacterHandoff } from '../templateCharacterPolicy';
import { SceneCharacterSelector } from './SceneCharacterSelector';

export function TemplateScenePanel({ postId, accessCredits, characterAllowed, characterReference, displayCharacter, onCharacter, onClearCharacter, onExit, children }: {
  postId: string | null; accessCredits?: number; characterAllowed: boolean; characterReference?: string;
  displayCharacter?: CharacterSummary | null;
  onCharacter: (handoff: SceneCharacterHandoff) => void; onClearCharacter: () => void;
  onExit: () => void; children?: ReactNode;
}) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const source = useQuery({ queryKey: ['community-post', postId, actor?.userId || 'loading'], queryFn: () => getCommunityPost(postId!), enabled: Boolean(postId && actor), staleTime: 30_000 });
  const image = source.data?.imageUrl;
  return <section className="template-scene-panel">
    <header><span><LayoutTemplate aria-hidden="true" />{t('ui.templateScene.title')}</span>
      <ConfirmDialog trigger={<Button size="sm" icon={<X />}>{t('ui.templateScene.exit')}</Button>}
        title={t('ui.templateScene.exitTitle')} description={t('ui.templateScene.exitDescription')} confirmLabel={t('ui.templateScene.exit')} onConfirm={onExit} />
    </header>
    {source.isLoading ? <p role="status">{t('ui.templateScene.loading')}</p> : null}
    {source.isError ? <div role="alert">{t('ui.templateScene.loadFailed')}<Button onClick={() => void source.refetch()}>{t('ui.characterPicker.retry')}</Button></div> : null}
    {image ? <Dialog.Root><Dialog.Trigger asChild><button className="template-scene-panel__preview" type="button" aria-label={t('ui.templateScene.enlarge')}>
      <AuthenticatedMediaImage src={image} alt={source.data?.title || ''} /><ZoomIn aria-hidden="true" /></button></Dialog.Trigger>
      <Dialog.Portal><Dialog.Overlay className="character-picker__overlay" /><Dialog.Content className="template-scene-image-dialog" aria-describedby={undefined}>
        <Dialog.Title>{source.data?.title || t('ui.templateScene.original')}</Dialog.Title><Dialog.Close asChild><Button icon={<X />} aria-label={t('ui.action.close')} /></Dialog.Close>
        <AuthenticatedMediaImage src={image} alt={source.data?.title || ''} />
      </Dialog.Content></Dialog.Portal></Dialog.Root> : !source.isLoading && !source.isError ? <p>{t('ui.templateScene.noPreview')}</p> : null}
    <div className="template-scene-panel__identity"><h2>{source.data?.title || t('ui.templateScene.original')}</h2>
      {source.data?.creator.displayName ? <span>{source.data.creator.displayName}</span> : null}
      {accessCredits != null ? <TemplatePricingBadge accessCredits={accessCredits} /> : null}
      {postId ? <Link to={routeBuilders.templateDetail(postId)}>{t('ui.templateScene.details')}</Link> : null}
    </div>
    {characterAllowed ? <SceneCharacterSelector templateMode characterReference={characterReference} displayCharacter={displayCharacter}
      onCharacter={onCharacter} onClearCharacter={onClearCharacter} /> : null}
    <section className="template-scene-panel__inputs"><h3>{t('ui.templateScene.inputs')}</h3>{children}</section>
  </section>;
}
