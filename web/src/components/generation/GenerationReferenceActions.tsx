import {
  Palette,
  PersonStanding,
  Shirt,
  UserRound
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { GenerationReferenceRole } from '../../features/generation/api/generationApi';
import { Button } from '../ui/Button';

const actions: Array<{
  role: GenerationReferenceRole;
  labelKey: string;
  icon: typeof UserRound;
}> = [
  { role: 'face_reference', labelKey: 'playground.reference.face', icon: UserRound },
  { role: 'character_reference', labelKey: 'playground.reference.character', icon: PersonStanding },
  { role: 'style_reference', labelKey: 'playground.reference.style', icon: Palette },
  { role: 'pose_reference', labelKey: 'playground.reference.pose', icon: PersonStanding },
  { role: 'outfit_front', labelKey: 'playground.reference.outfitFront', icon: Shirt },
  { role: 'outfit_back', labelKey: 'playground.reference.outfitBack', icon: Shirt }
];

export function GenerationReferenceActions({
  imageUrl,
  roles,
  value,
  maxReferences,
  onChange
}: {
  imageUrl: string;
  roles?: GenerationReferenceRole[];
  value: Partial<Record<GenerationReferenceRole, string>>;
  maxReferences: number;
  onChange: (value: Partial<Record<GenerationReferenceRole, string>>) => void;
}) {
  const { t } = useTranslation('playground');
  const visible = actions.filter(action => !roles || roles.includes(action.role));
  const activeCount = Object.values(value).filter(Boolean).length;
  if (!imageUrl || !maxReferences || !visible.length) return null;

  return (
    <div className="generation-reference-actions">
      {visible.map(action => {
        const Icon = action.icon;
        const alreadyAssigned = Boolean(value[action.role]);
        const requiresOutfitFront = action.role === 'outfit_back'
          && !value.outfit_front
          && !alreadyAssigned;
        const replacesIdentityReference =
          (action.role === 'face_reference' && Boolean(value.character_reference))
          || (action.role === 'character_reference' && Boolean(value.face_reference));
        return (
          <Button
            key={action.role}
            size="sm"
            variant={alreadyAssigned ? 'primary' : 'secondary'}
            icon={<Icon aria-hidden="true" />}
            disabled={requiresOutfitFront || (
              !alreadyAssigned
              && activeCount >= maxReferences
              && !replacesIdentityReference
            )}
            onClick={() => {
              const next = {
                ...value,
                [action.role]: alreadyAssigned ? undefined : imageUrl
              };
              if (!alreadyAssigned && action.role === 'face_reference') {
                next.character_reference = undefined;
              }
              if (!alreadyAssigned && action.role === 'character_reference') {
                next.face_reference = undefined;
              }
              onChange(next);
            }}
          >
            {t(action.labelKey)}
          </Button>
        );
      })}
    </div>
  );
}
