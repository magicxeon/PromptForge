import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { DisplayMediaImage } from '../../../components/media/DisplayMediaImage';
import { Button } from '../../../components/ui/Button';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { uploadGenerationReference } from '../../generation/api/generationApi';
import { listCharacterLooks } from '../../profiles/api/profileApi';
import { characterDisplayImages } from '../../profiles/characterDisplayImage';
import { CharacterLibraryPicker } from '../../profiles/components/CharacterLibraryPicker';
import type { CharacterSummary } from '../../profiles/schemas/profileSchemas';
import {
  approvedVideoLooks,
  type VideoReferenceSelection,
} from './videoReferenceSelection';
import '../../../styles/playground-video-references.css';

export function PlaygroundVideoSources({
  value,
  onChange,
  onBusy,
}: {
  value: VideoReferenceSelection;
  onChange: (patch: Partial<VideoReferenceSelection>) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { t } = useTranslation('playground');
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const epoch = useRef(0);
  const frameInput = useRef<HTMLInputElement>(null);
  const lookInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      epoch.current += 1;
      onBusy(false);
    },
    [onBusy],
  );
  const isCurrent = (token: number) =>
    token === epoch.current && getActiveActorId() === actor?.userId;
  const looks = useQuery({
    queryKey: [
      'character-looks',
      actor?.userId,
      value.character?.id,
      value.character?.characterProfileVersionId,
    ],
    queryFn: () =>
      listCharacterLooks(
        value.character!.id,
        value.character!.characterProfileVersionId,
      ),
    enabled: Boolean(
      value.character && value.operation === 'character_to_video',
    ),
    retry: false,
    staleTime: 30_000,
  });
  const options = value.character
    ? approvedVideoLooks(looks.data?.items || [], value.character)
    : [];

  async function selectCharacter(character: CharacterSummary) {
    const token = ++epoch.current;
    setPending('character');
    onBusy(true);
    setError(null);
    try {
      const result = await queryClient.fetchQuery({
        queryKey: [
          'character-looks',
          actor?.userId,
          character.id,
          character.characterProfileVersionId,
        ],
        queryFn: () =>
          listCharacterLooks(character.id, character.characterProfileVersionId),
        staleTime: 0,
      });
      if (!isCurrent(token)) return;
      onChange({
        character,
        lookSheet: approvedVideoLooks(result.items, character)[0] || null,
      });
    } finally {
      if (isCurrent(token)) {
        setPending(null);
        onBusy(false);
      }
    }
  }

  async function upload(file: File | undefined, slot: 'frame' | 'look') {
    if (!file) return;
    setError(null);
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      !file.size ||
      file.size > 12 * 1024 * 1024
    ) {
      setError(t('playground.video.references.invalidUpload'));
      return;
    }
    const token = ++epoch.current;
    setPending(slot);
    onBusy(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      if (!isCurrent(token)) return;
      const uploaded = await uploadGenerationReference(
        data,
        'character_reference',
        'playground-video',
      );
      if (isCurrent(token))
        onChange(
          slot === 'frame'
            ? { referenceImageUrl: uploaded.imageUrl }
            : {
                lookSheet: {
                  url: uploaded.imageUrl,
                  assetId: uploaded.referenceId,
                  name: file.name,
                },
              },
        );
    } catch {
      if (isCurrent(token))
        setError(t('playground.video.references.uploadFailed'));
    } finally {
      if (isCurrent(token)) {
        setPending(null);
        onBusy(false);
      }
    }
  }
  function removeCharacter() {
    epoch.current += 1;
    onChange({ character: null, lookSheet: null });
  }
  const withLook = value.operation === 'character_to_video';
  return (
    <div className="playground-video-references">
      {withLook ? (
        <div className="playground-video-references__character">
          {value.character ? (
            <>
              <div className="playground-video-references__portrait">
                <DisplayMediaImage
                  sources={characterDisplayImages(value.character)}
                  alt={value.character.displayName}
                />
              </div>
              <strong>{value.character.displayName}</strong>
            </>
          ) : null}
          <Button
            disabled={Boolean(pending)}
            icon={<UserRound />}
            onClick={() => setPickerOpen(true)}
          >
            {t('playground.video.chooseCharacter')}
          </Button>
          {value.character ? (
            <Button
              disabled={Boolean(pending)}
              size="icon"
              icon={<X />}
              aria-label={t('playground.video.references.removeCharacter')}
              onClick={removeCharacter}
            />
          ) : null}
        </div>
      ) : null}
      <div className="playground-video-references__slots">
        {(
          ['frame', ...(withLook ? ['look'] : [])] as Array<'frame' | 'look'>
        ).map((slot) => {
          const image =
            slot === 'frame' ? value.referenceImageUrl : value.lookSheet?.url;
          const input = slot === 'frame' ? frameInput : lookInput;
          const title = t(
            slot === 'frame'
              ? withLook
                ? 'playground.video.references.scene'
                : 'playground.video.references.frame'
              : 'playground.video.references.look',
          );
          return (
            <section className="playground-video-references__slot" key={slot}>
              <header>
                <strong>{title}</strong>
                <small>
                  {slot === 'frame' && !withLook
                    ? 'first_frame'
                    : 'reference_image'}
                </small>
              </header>
              <div className="playground-video-references__preview">
                {image ? (
                  <AuthenticatedMediaImage
                    src={image}
                    alt={title}
                    fallback={
                      <span>
                        {t('playground.video.references.previewFailed')}
                      </span>
                    }
                  />
                ) : (
                  <ImagePlus aria-hidden="true" />
                )}
              </div>
              {slot === 'look' && value.lookSheet ? (
                <small className="playground-video-references__filename">
                  {value.lookSheet.name}
                </small>
              ) : null}
              <div className="playground-video-references__actions">
                <Button
                  disabled={Boolean(pending)}
                  icon={<ImagePlus />}
                  onClick={() => input.current?.click()}
                >
                  {t(
                    pending === slot
                      ? 'playground.reference.uploading'
                      : 'playground.reference.browse',
                  )}
                </Button>
                {image ? (
                  <Button
                    disabled={Boolean(pending)}
                    size="icon"
                    icon={<X />}
                    aria-label={`${t('playground.reference.remove')} ${title}`}
                    onClick={() =>
                      onChange(
                        slot === 'frame'
                          ? { referenceImageUrl: null }
                          : { lookSheet: null },
                      )
                    }
                  />
                ) : null}
                <input
                  ref={input}
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label={`${t('playground.reference.browse')} ${title}`}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    void upload(file, slot);
                  }}
                />
              </div>
              {slot === 'look' && options.length ? (
                <label>
                  {t('playground.video.references.approvedLook')}
                  <select
                    disabled={Boolean(pending)}
                    value={value.lookSheet?.versionId || ''}
                    onChange={(event) =>
                      onChange({
                        lookSheet:
                          options.find(
                            (item) => item.versionId === event.target.value,
                          ) || null,
                      })
                    }
                  >
                    <option value="">
                      {t('playground.video.references.customLook')}
                    </option>
                    {options.map((item) => (
                      <option key={item.versionId} value={item.versionId}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </section>
          );
        })}
      </div>
      {withLook ? (
        <p>{t('playground.video.references.multimodalNotice')}</p>
      ) : null}
      {withLook &&
      value.character &&
      !looks.isLoading &&
      !looks.isError &&
      !options.length ? (
        <p role="status">{t('playground.video.references.noApprovedLook')}</p>
      ) : null}
      {looks.isError && withLook ? (
        <div role="alert">
          {t('playground.video.references.lookFailed')}{' '}
          <Button onClick={() => void looks.refetch()}>
            {t('playground.video.references.retry')}
          </Button>
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <CharacterLibraryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        current={value.character}
        unavailableReason={(item) =>
          item.handoffAvailable && item.characterProfileVersionId
            ? undefined
            : t('playground.video.references.characterUnavailable')
        }
        onSelect={selectCharacter}
      />
    </div>
  );
}
