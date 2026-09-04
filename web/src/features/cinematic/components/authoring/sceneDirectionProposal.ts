import type { CinematicScene, CinematicSceneDirectionProposal } from '../../schemas/cinematicSchemas';

type FieldProposal = NonNullable<CinematicSceneDirectionProposal['fieldProposals']>[number];

export function recommendedSceneDirectionFields(proposal: CinematicSceneDirectionProposal | null) {
  return (proposal?.fieldProposals || [])
    .filter(field => field.outcome === 'proposed' && field.recommended)
    .map(field => field.fieldKey);
}

export function applySceneDirectionFieldProposals(
  scene: CinematicScene,
  proposals: FieldProposal[],
  selectedFieldKeys: string[]
) {
  const result = structuredClone(scene);
  const selected = new Set(selectedFieldKeys);
  for (const proposal of proposals) {
    if (!selected.has(proposal.fieldKey) || proposal.outcome !== 'proposed') continue;
    const parsed = parseFieldKey(proposal.fieldKey);
    if (parsed.entity === 'scene' && parsed.entityId === result.id) {
      (result as unknown as Record<string, unknown>)[parsed.field] = structuredClone(proposal.proposedValue);
      continue;
    }
    if (parsed.entity === 'shot' && parsed.sceneId === result.id) {
      const shot = result.shots.find(item => item.id === parsed.entityId);
      if (shot) (shot as unknown as Record<string, unknown>)[parsed.field] = structuredClone(proposal.proposedValue);
    }
  }
  result.durationMs = result.shots.reduce((total, shot) => total + shot.durationMs, 0);
  result.shotOrder = result.shots.map(shot => shot.id);
  return result;
}

function parseFieldKey(value: string) {
  const [scope = '', field = ''] = value.split('.');
  const [entity = '', firstId = '', secondId = ''] = scope.split(':');
  if (entity === 'scene') return { entity, entityId: firstId, sceneId: firstId, field };
  if (entity === 'shot') return { entity, entityId: secondId, sceneId: firstId, field };
  return { entity: '', entityId: '', sceneId: '', field: '' };
}
