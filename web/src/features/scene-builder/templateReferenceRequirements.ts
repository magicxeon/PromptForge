import type { TemplateReferenceRequirement } from '../../components/templates/TemplateReadinessPanel';
import type { GenerationReferenceRole } from '../generation/api/generationApi';

export function getMissingTemplateReferenceRequirements(
  requiredRoles: GenerationReferenceRole[],
  references: Partial<Record<GenerationReferenceRole, string>>
): TemplateReferenceRequirement[] {
  const required = new Set(requiredRoles);
  const missing: TemplateReferenceRequirement[] = [];
  const requiresIdentity = required.has('face_reference')
    || required.has('character_reference');
  const hasIdentity = Boolean(references.face_reference || references.character_reference);

  if (requiresIdentity && !hasIdentity) missing.push('identity_reference');
  required.delete('face_reference');
  required.delete('character_reference');

  required.forEach(role => {
    if (!references[role]) missing.push(role);
  });
  return missing;
}
