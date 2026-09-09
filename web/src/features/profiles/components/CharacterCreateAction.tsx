import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Clapperboard, Shirt, Sparkles } from 'lucide-react';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import type { CharacterSummary } from '../schemas/profileSchemas';
import { useCharacterHandoff } from '../useCharacterHandoff';
import { characterDestinations } from './characterDiscoveryModel';

export function CharacterCreateAction({ character, showName = false }: { character: CharacterSummary; showName?: boolean }) {
  const { t } = useTranslation('character-profiles');
  const handoff = useCharacterHandoff(character.id);
  const destinations = characterDestinations(character);
  if (!destinations.length) return null;
  return (
    <div className="character-create-action">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="primary" disabled={handoff.isPending} aria-busy={handoff.isPending}
            aria-label={t('character-profiles.gallery.createWithName', { name: character.displayName })}
            icon={handoff.isPending ? <ProcessingSpinner className="size-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="size-4" />}>
            <span className="character-create-action__label">{t(handoff.isPending ? 'character-profiles.gallery.preparing'
              : showName ? 'character-profiles.gallery.createWithName' : 'character-profiles.gallery.createWith', { name: character.displayName })}</span>
            <ChevronDown className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="character-create-menu" sideOffset={6} align="end" collisionPadding={12}>
            {destinations.map(destination => (
              <DropdownMenu.Item key={destination} className="character-create-menu__item" disabled={handoff.isPending}
                onSelect={() => handoff.mutate(destination)}>
                {destination === 'fashion_blueprint' ? <Shirt aria-hidden="true" /> : <Clapperboard aria-hidden="true" />}
                {t(destination === 'fashion_blueprint' ? 'character-profiles.actions.useFashion' : 'character-profiles.actions.useScene')}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {handoff.isError && <p className="character-create-action__error" role="alert">{handoff.error.message}</p>}
    </div>
  );
}
