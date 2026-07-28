import * as Dialog from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import {
  Clapperboard,
  FlaskConical,
  Sparkles,
  UserRound,
  X
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  requestFaceReferenceHandoff,
  type FaceReferenceDestination,
  type FaceReferenceSource
} from '../../features/generation/api/faceReferenceHandoffApi';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { getActiveActorId } from '../../lib/auth/actorStore';
import { writeFaceReferenceHandoff } from '../../lib/persistence/faceReferenceHandoff';
import { Button } from '../ui/Button';

const destinationDefinitions = [
  {
    id: 'character_sheet',
    icon: UserRound,
    path: '/studio?mode=character-sheet#reference-images',
    recommended: true
  },
  {
    id: 'scene_builder',
    icon: Clapperboard,
    path: '/studio/scene#reference-images',
    recommended: false
  },
  {
    id: 'playground',
    icon: FlaskConical,
    path: '/playground#reference-images',
    recommended: false
  }
] as const;

export function FaceReferenceDestinationDialog({
  source,
  imageUrl,
  trigger,
  disabled = false,
  onHandoffComplete
}: {
  source: FaceReferenceSource;
  imageUrl: string;
  trigger?: ReactNode;
  disabled?: boolean;
  onHandoffComplete?: () => void;
}) {
  const { t } = useTranslation('react-ui');
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const handoff = useMutation({
    mutationFn: (destination: FaceReferenceDestination) =>
      requestFaceReferenceHandoff(source, destination),
    onSuccess: payload => {
      writeFaceReferenceHandoff(getActiveActorId(), payload);
      setOpen(false);
      onHandoffComplete?.();
      const path = destinationDefinitions.find(item => item.id === payload.destination)?.path;
      if (path) navigate(path);
    }
  });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger || (
          <Button
            disabled={disabled}
            icon={<UserRound className="size-4" />}
          >
            {t('ui.faceReuse.action')}
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="face-reference-dialog__overlay" />
        <Dialog.Content className="face-reference-dialog">
          <Dialog.Close asChild>
            <Button
              className="face-reference-dialog__close"
              size="icon"
              variant="ghost"
              title={t('ui.action.close')}
              icon={<X />}
            />
          </Dialog.Close>
          <header className="face-reference-dialog__header">
            <img src={apiMediaUrl(imageUrl) || ''} alt="" />
            <div>
              <Dialog.Title>{t('ui.faceReuse.title')}</Dialog.Title>
              <Dialog.Description>{t('ui.faceReuse.description')}</Dialog.Description>
            </div>
          </header>
          <div className="face-reference-dialog__flow" aria-hidden="true">
            <span>{t('ui.faceReuse.source')}</span>
            <Sparkles />
            <span>{t('ui.faceReuse.destination')}</span>
          </div>
          <div className="face-reference-dialog__destinations">
            {destinationDefinitions.map(destination => {
              const Icon = destination.icon;
              return (
                <button
                  key={destination.id}
                  type="button"
                  className="face-reference-dialog__destination"
                  disabled={handoff.isPending}
                  onClick={() => handoff.mutate(destination.id)}
                >
                  <span className="face-reference-dialog__destination-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{t(`ui.faceReuse.${destination.id}.title`)}</strong>
                    <small>{t(`ui.faceReuse.${destination.id}.description`)}</small>
                  </span>
                  {destination.recommended ? (
                    <em>{t('ui.faceReuse.recommended')}</em>
                  ) : null}
                </button>
              );
            })}
          </div>
          {handoff.isError ? (
            <p role="alert" className="face-reference-dialog__error">
              {handoff.error.message}
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
