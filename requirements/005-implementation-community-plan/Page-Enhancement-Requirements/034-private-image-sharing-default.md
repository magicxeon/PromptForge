# Private Image Sharing Default

Parent: [033](033-publication-and-character-continuity-master.md).
Status: Planned; implementation held. Owner: Community publication.

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

Pending discussion, not implementation permission:

1. Smallest compatible approach: ordinary image sharing defaults private;
   choosing Publish Template explicitly requests an eligible reuse policy and
   consent. Offer remix_only only for supported structured snapshots; do not
   silently choose full or pretend unsupported manual snapshots can remix.
2. Larger follow-up: separate private execution recipe from public prompt policy
   to allow private-prompt reusable Templates. Requires Templates/Community
   contract and privacy review; defer unless explicitly approved.

## Ordered Tasks And Tests

1. Inventory defaults and add focused draft/publish/schema fixtures.
2. Set ordinary defaults and preserve existing-post and derived-image policy.
3. After decision, coordinate Template eligibility/consent/error states.
4. Verify shared dialog consumers: result, Recent/detail, Comparison individual
   image and Fashion output. Video/whole-Comparison publication unchanged.

Test omitted field, explicit policy, legacy draft, reopening, derived provenance,
private public projection, actor switch, stale submit, duplicate conflict and
ordinary Template eligibility. Reuse test-template-derived-sharing.mjs coverage.
No retroactive migration. Roll back defaults/UI together, retaining server
derived-image privacy and existing published records.
