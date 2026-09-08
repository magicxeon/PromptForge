# Private Image Sharing Default

Parent: [033](033-publication-and-character-continuity-master.md).
Status: Implemented; focused automated and fixture layout gates passed 2026-09-07.
Owner: Community publication. Live owner publishing UAT not performed.

## Rules

- PVT-01: Newly opened ordinary generated-image share forms and server draft /
  missing-field fallbacks use private. Audit component, API schema, draft and
  publish defaults together; changing only the select is insufficient.
- PVT-02: Ordinary original images may explicitly opt into a supported prompt
  policy. Existing published choices are not changed retroactively. Reopening
  an existing post uses its actual policy, not the new-create default.
- PVT-03: Template-derived images remain private with no visibility selector
  and no publish-as-reusable-Template action. Server guards reject stale/crafted
  requests, including attempts by the original Template owner.
- PVT-04: Post visibility and prompt visibility remain independent. Public
  image + private prompt is valid, discoverable and does not require a public
  Character. Private prompts/references must not leak through feed, detail,
  shared snapshot, error responses or Character work projections.
- PVT-05: Preserve one image/Template post per owner+source Generation result;
  no duplicate publication or bypass of moderation through another entry point.

## Compatibility Gate: Reusable Templates

Current communityShareSnapshot removes reusable scene data for private and
isReusablePublishedSnapshot rejects private/partial. CommunityShareService
checks that guard before creating a Template. A private default without UI
coordination would leave a selectable Template option that fails publication.

Delivery decision for this first slice: preserve existing Template publication
rights. The user must explicitly select a compatible prompt policy; checking
Publish Template never changes prompt visibility. Disable submission with a
localized validation message while policy is incompatible. The server supplies
allowedTemplatePromptVisibilities based on the actual sanitized source snapshot
and existing manual/remix restrictions. Missing capability data fails closed
for remix_only. No new private-recipe execution policy is introduced.

Owner-only drafts retain the sanitized source recipe needed for an explicit
later choice of Full/Partial/Remix Only. Default visibility is not a command to
irreversibly discard that source while preparing an original-image draft.
Derived drafts remain stripped. Publication applies the selected policy before
any public record/projection is returned. Drafts remain actor-authorized.

Alternatives retained for context:

1. Smallest compatible approach: ordinary image sharing defaults private;
   choosing Publish Template explicitly requests an eligible reuse policy and
   consent. Offer remix_only only for supported structured snapshots; do not
   silently choose full or pretend unsupported manual snapshots can remix.
2. Larger follow-up: separate private execution recipe from public prompt policy
   to allow private-prompt reusable Templates. Requires Templates/Community
   contract and privacy review; defer unless explicitly approved.

## Ordered Tasks And Tests

1. [done] Inventory defaults and add focused draft/publish/schema fixtures.
2. [done] Set ordinary defaults and preserve existing-post and derived-image policy.
3. [done] Coordinate Template eligibility and explicit policy choice as above.
4. [done] Verify shared dialog consumers: result, Recent/detail, Comparison individual
   image and Fashion output. Video/whole-Comparison publication unchanged.

Test omitted field, explicit policy, legacy draft, reopening, derived provenance,
private public projection, actor switch, stale submit, duplicate conflict and
ordinary Template eligibility. Reuse test-template-derived-sharing.mjs coverage.
No retroactive migration. Roll back defaults/UI together, retaining server
derived-image privacy and existing published records.

## Delivery Evidence

- Server/schema/shared-dialog defaults private; original owner drafts retain
  sanitized recipes for explicit policy changes. Derived drafts remain stripped.
- Server advertises compatible Template prompt policies; UI requires an explicit
  supported choice and prevents invalid submit, including a synthetic form submit.
- Existing-post editing, Template preparation/activation, input policy, quote/
  Credit rules and duplicate guards are unchanged. No runtime data migration.
- Focused tests: privacy 21; shared dialog/API 12; compatibility 46 (36 server,
  10 UI). All 79 passed. TypeScript, i18n catalog validation, scoped ESLint and
  git diff --check passed. Vite build passed with existing large-chunk warning.
- Playwright: 18 ordinary/private-policy cases + 18 derived cases across EN/TH,
  390/820/1440 and default/fashion/creative themes. All API writes intercepted;
  no live account publication or paid provider calls. Representative Thai mobile
  and English desktop screenshots inspected; bounds checked in every case.
- Shared consumer reuse was source-inspected and exercised at the shared-dialog
  boundary; browser navigation used Recent, not every production route/account.
- Sequential QA/privacy review by the implementing agent; independent review
  was unavailable. Live owner UAT remains follow-up evidence, not claimed.
- Commands, artifact locations and remaining slices: implementation plan 035.
