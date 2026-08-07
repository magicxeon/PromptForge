# 004 - React Admin Authoring Experience

**Status:** Planned  
**Depends on:** 001-003

## Objective

Add an Admin-only left-navigation destination and a complete React authoring
workspace at `/admin/attributes`.

## Navigation

- Add `Attributes` beneath the Admin navigation group.
- Expanded navigation opens `/admin/attributes` directly.
- Collapsed navigation exposes an icon with tooltip.
- Admin sees edit controls; Support receives read-only presentation.
- Breadcrumbs show `Admin / Attributes / <field or option>`.

## Page Structure

### Catalog Rail

- category/field tree with counts
- search by label, ID, alias and tag
- filters for mode, visual type, enabled state, lifecycle and validation
- badges for missing asset, invalid rule, unpublished change and retired item
- create category/field/option commands according to permission

### Editor Workspace

- identity: stable ID, revision and lifecycle
- localized labels/descriptions
- control type and ordering
- mode and character-type exposure
- prompt contribution and provider adaptations
- dependencies, conflicts, safety and Reference override rules
- visual generation/upload controls
- unsaved-state and concurrent-update warning

### Inspection Rail

- exact customer-facing visual card preview
- prompt impact, before/after and compilation order
- affected modes and saved-configuration usage count
- validation results grouped by error/warning/info
- release history and audit references

### Evaluation Workspace

- generated candidate grid
- fixed-fixture render comparison
- approve/reject with reviewer notes
- responsive preview for desktop and mobile controls

## Interaction Rules

- Enable/disable is explicit and confirms affected surfaces.
- Required dependencies are visible before publication.
- Destructive retirement uses a correctly layered AlertDialog.
- Save, publish, rollback and generation actions produce shared toast feedback.
- Forms use the global 0.75rem body font and theme radius/tokens.
- No nested decorative cards; use full-width work bands and framed tools.

## State and API

- TanStack Query keys include actor identity and catalog release/revision.
- Draft form state remains local to the route and warns before navigation loss.
- All APIs use `apiClient.ts` and Zod response schemas.
- Actor switching clears Admin draft and cached privileged data.
- Large images are URLs, never Base64 persistence.

## Accessibility and Responsive Behavior

- full keyboard editing and visible focus
- labeled icon buttons and tooltips
- status not communicated by color alone
- no clipped IDs, labels, generated variants or validation text
- desktop is optimized for dense authoring; mobile supports review and safe
  enable/disable but may defer complex rule graph editing

## Acceptance Criteria

- Admin can complete create-to-publish without editing files.
- Support cannot mutate catalog state.
- Customer preview matches the shared Visual Option component.
- Filters and selection survive refresh through URL parameters where useful.
- Desktop and mobile Playwright screenshots show no overlap or inaccessible
  controls.

