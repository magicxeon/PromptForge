import {
  AUTHORITY_DOMAINS,
  stableFingerprint
} from './referenceProcessingContracts.js';

const OUTFIT_OVERRIDE_FIELDS = Object.freeze({
  primaryColor: ['Primary Color', 'Primary color'],
  secondaryColor: ['Secondary Color', 'Secondary color'],
  pattern: ['Pattern', 'Clothing Pattern'],
  material: ['Material', 'Fabric', 'Surface']
});

export class ReferenceAuthorityPlanner {
  constructor({ policyRegistry }) {
    this.policyRegistry = policyRegistry;
  }

  createPlan({
    references = [],
    selections = {},
    characterReferenceOutfitBehavior = 'preserve',
    outfitReferenceOverrides = {}
  } = {}) {
    const activeRoles = [...new Set(references.map(reference => reference.role))];
    const controlled = new Map();

    for (const role of activeRoles) {
      const config = this.policyRegistry.getRole(role);
      if (!config) continue;
      for (const group of config.ownedAttributeGroups) {
        const entry = controlled.get(group) || {
          group,
          role,
          editableFields: new Set(),
          suppressedFields: new Set()
        };
        config.editableAttributeFields.forEach(field => entry.editableFields.add(field));
        controlled.set(group, entry);
      }
    }

    if (activeRoles.includes('character_reference')
      && characterReferenceOutfitBehavior === 'preserve') {
      for (const group of ['Clothing', 'Accessories']) {
        controlled.set(group, {
          group,
          role: 'character_reference',
          editableFields: new Set(),
          suppressedFields: new Set()
        });
      }
    }

    if (activeRoles.includes('outfit_front')) {
      const editable = outfitEditableFields(outfitReferenceOverrides);
      for (const group of ['Clothing', 'Accessories']) {
        const entry = controlled.get(group) || {
          group,
          role: 'outfit_front',
          editableFields: new Set(),
          suppressedFields: new Set()
        };
        editable.forEach(field => entry.editableFields.add(field));
        controlled.set(group, entry);
      }
    }

    const effectiveSelections = {};
    const suppressedSelections = [];
    for (const [fieldName, selection] of Object.entries(selections || {})) {
      const group = String(selection?.group || '');
      const authority = controlled.get(group);
      const editable = authority
        ? authority.editableFields.has(fieldName)
          || (fieldName === 'Expression' && group === 'Face')
        : true;
      if (!authority || editable) {
        effectiveSelections[fieldName] = selection;
      } else {
        authority.suppressedFields.add(fieldName);
        suppressedSelections.push({
          fieldName,
          group,
          role: authority.role,
          reasonCode: 'controlled_by_reference'
        });
      }
    }

    const authorityPlan = Object.fromEntries(AUTHORITY_DOMAINS.map(domain => [
      domain,
      this.resolveDomain(domain, activeRoles)
    ]));
    const controlledGroups = [...controlled.values()].map(entry => ({
      group: entry.group,
      role: entry.role,
      editableFields: [...entry.editableFields].sort(),
      suppressedFields: [...entry.suppressedFields].sort()
    })).sort((a, b) => a.group.localeCompare(b.group));

    return {
      authorityPlan,
      effectiveSelections,
      suppressedSelections,
      controlledGroups,
      fingerprint: stableFingerprint({
        activeRoles,
        authorityPlan,
        controlledGroups,
        effectiveSelections
      })
    };
  }

  resolveDomain(domain, activeRoles) {
    const priority = this.policyRegistry.getDomainPriority(domain);
    const candidates = priority.filter(source =>
      source === 'attributes'
        || (activeRoles.includes(source)
          && this.policyRegistry.getRole(source)?.authorityDomains.includes(domain))
    );
    const primarySource = candidates[0] || 'attributes';
    return {
      primarySource,
      fallbackSources: candidates.slice(1),
      suppressedSources: activeRoles.filter(role =>
        role !== primarySource
        && this.policyRegistry.getRole(role)?.authorityDomains.includes(domain)
      ),
      ownedAttributeFields: [],
      editableAttributeFields: [],
      conflictResolution: domain === 'pose' && primarySource === 'template_baseline'
        ? 'adapt'
        : primarySource === 'attributes' ? 'merge' : 'replace'
    };
  }
}

function outfitEditableFields(overrides) {
  if (overrides?.enabled !== true) return [];
  return Object.entries(OUTFIT_OVERRIDE_FIELDS).flatMap(([key, fields]) =>
    overrides[key] === true ? fields : []
  );
}
