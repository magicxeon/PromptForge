# Cast: Import An Owned Generated Sheet

Date: 2026-09-09. Status: implemented; isolated automated and responsive checks
passed. Live provider UAT remains pending and is not implied by fixture evidence.
Owner: Character Profiles (Look lifecycle), Generation (trusted source),
Cinematic (binding and video), Assets (existing local media).
Primary: Product Requirement Architect. Sequential UX, Backend/security and QA
reviews; the additional roles cover shared UI, private media authority and
provider dispatch. Review is not independent.
Skills: review-product-ux, implement-generation-workflow,
direct-generative-cinematic-production, verify-release-regressions.

## Evidence And Scope

User reports task `videotask_e1b9cc51e58c02f6e563` succeeds. Local record is
completed, model `dreamina-seedance-2-0-260128`, multimodal_reference, two
trusted generated Look references. This is not proof of all Seedance variants
or a waiver of provider moderation, same-account policy or the 30-day limit.
The two source IDs are `job_1788893919996_lbaxeczqf` and
`job_1788894286344_wefegk5mt`; stored source model is `seedream-5-0-260128`,
text_to_image with zero input references. Only safe metadata was inspected;
the historical task was not replayed and its signed URLs were not exported.

Preserve the current Cast/Wardrobe layout, existing upload/AI source choices,
Review, Approve-and-use-film action, separate binding recovery and pinned
Character version. Do not alter Storyboard selection, credits or video models.

## G1: Source And Import

- Add a fourth source choice, Generated sheet, to the existing Look dialog.
  Expose a direct Generated sheet command in Cast > Wardrobe's existing source
  group, preserving Upload and AI commands. Use the same theme tokens and a
  full-width third command; retain the single-column mobile layout.
- Owner-scoped paginated selection uses Generation's eligible original-source
  listing: Seedream 5.0 family, current credential scope, unexpired/unrejected,
  existing owned output. No signed URLs in responses or browser persistence.
- Show complete image, model and expiry. Keep loading/error/retry/empty and
  pagination states compact; preview uses contain, responsive controls.
- Legacy generated images without document metadata remain selectable: require
  explicit confirmation that the sheet shows the selected character with front,
  side and back views. Do not guess crops from an editorial document layout.
- Import by generation ID only; reauthorize Character and source on server.
  Store source lineage in the existing Look version and reuse original local
  Asset bytes. No re-upload, generation charge or public visibility change.
- Idempotent retry must return the same draft/review, including recovery from
  asset/draft/review partial completion. No automatic approval or film binding.

## G2: Approval And Video

- Imported provenance is generated_import, not system-generated identity proof.
  Identity assurance becomes user_confirmed only after explicit review/approval.
- Store whole-sheet references without guessed cropManifest; preserve original.
  Document names and panel labels are allowed; review for unrelated people,
  unrelated imagery and obstructive marks rather than demanding a text-free sheet.
- Recheck source ownership, local content, eligibility and expiry at approval,
  video quote/acceptance and dispatch. A stale imported sheet fails closed with
  an actionable error; upload or GCS/Base64 fallback must not replace its URL.
- ModelArk transport uses the original provider URL privately and verifies
  bytes/hash through Trusted Generated Sources. Other providers keep existing
  authorized transport. Existing uploaded Looks keep their prior policy.
- Rejection tracking must identify the original generated ID, not its Look Asset.
- Storyboard and all references still obey the selected model's constraints;
  importing a Look does not make an arbitrary first frame provider-trusted.

## Acceptance

1. A current owned Seedream sheet can be selected, reviewed, approved and bound
   through existing Cast actions without a second generation/upload.
2. Imported sheet renders whole and name/identity warnings are clear in EN/TH.
3. Other actor, deleted, expired, rejected, changed-content and wrong-account
   source requests fail before provider dispatch; no signed URL leaks.
4. Existing AI/upload Looks, Generate dialogs, approval and binding still work.
5. Mobile 390, tablet 820 and desktop 1440 are operable with no overflow.

See [ordered plan](007-generated-sheet-implementation-plan.md).
