# Shared Create And Edit Template Controls

Owner: shared templates components; Community mutations; Scene consumption.
Status: Implemented; focused verification passed. Live-data smoke pending. Parent: 016.

- Reuse a controlled TemplateInputPolicyFields in ShareGeneratedDialog and
  SharedTemplateEditDialog. Display required Outfit front, optional Character
  and optional Outfit back. Capability restrictions come from server DTOs.
- Owner can enable/disable optional inputs, not change their required status.
  Remove old arbitrary field and required-checkbox lists only from Template
  publishing; ordinary Image sharing and Face Creation sharing stay unchanged.
- Edit loads actor-scoped owner settings only when open. Loading/error/retry and
  unsupported-source states are local. Cannot save policy without valid loaded
  settings. No automatic save or preparation request caused by policy selection.
- Keep title, tags, description, visibility, pricing, readiness review, retirement,
  cancel and existing confirmation behavior. Legacy input removals are visible.
- Downstream new Template sessions show only enabled policy roles. Character
  picker remains optional; outfit front blocks readiness until supplied. Existing
  old sessions and normal Scene inputs retain their contract.
- EN/TH keys, semantic checkbox/toggle controls, icons and theme tokens; mobile
  390, tablet 820 and desktop 1440 without horizontal overflow or clipped actions.
- Shared component has no API/provider/Credit calls; typed Zod owner API boundary
  belongs to Templates, post save delegates to existing Community facade.

Tests: Create/Edit parity, defaults, mandatory outfit, optional toggles, locked
fields absent, owner-load failures/stale errors, adjacent Image sharing and
Template preparation/actions unchanged. Layout uses isolated fixtures, no paid
generation or live-account mutation.

Verification: Create/Edit components 7/7; Scene/serializer/Detail compatibility
14/14. Responsive browser fixtures passed 36 Create/Edit cases across EN/TH,
three themes and 390/820/1440 widths. Footer/button bounds, field parity and
fixture save payloads asserted. Build, scoped lint and i18n validation passed.
Existing Template data and generated images were not modified by these checks.
