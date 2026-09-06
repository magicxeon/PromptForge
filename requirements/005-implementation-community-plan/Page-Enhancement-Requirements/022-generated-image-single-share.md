# One Community Share Per Generated Image

Parent: 019. Status: Implemented; focused duplicate/status/visual gates passed.
Owner: Community publication, CommunityPostRepository atomic create, shared dialog.

- Scope is individual generated images (including Template results), not video,
  collection or whole Comparison publication. Key: ownerUserId + generation ID.
- Any existing image/Template post for this key counts as shared, regardless of
  visibility/status. No second post to bypass unpublish/moderation. Historical
  duplicates remain untouched. Re-share after removal is a separate pending policy.
- Owner-only status read uses persisted source ownership, returns boolean only.
  Shared UI query is actor+generation scoped, stale 30s, gc 60s, no polling;
  publish success updates the shared query immediately. Focus refresh supported.
  No Base64 or prompt cached. Failed status reads show retryable state and block
  opening until rechecked. Do not fetch/create a draft just to render a button.
- Disable Share while checking, submitting or already shared; preserve status
  on remount/reload. A crafted/stale click still hits domain duplicate validation.
- Draft/publish check repository before side effects. Serialize simultaneous
  in-process publication for a source and release on terminal success/failure.
  Atomic repository uniqueness check is the final barrier across service instances.
  Bound in-flight keys; no persistent lock/cache or changed storage path.
- Reject duplicates with 409 community_generation_already_shared, concurrent
  in-flight requests with 409 community_generation_share_in_progress. UI refreshes
  status after conflict and never treats a failed request as a successful share.
- Keep ordinary image/template creation, actor isolation, published data, pricing
  and existing management unchanged. No provider/Credit calls on status checks.

Tests: existing private/unpublished post, different actor/source, two drafts,
same/different service instance concurrent writes, restart (persisted lookup),
failure releases lock, UI success disables all same-source triggers, stale 409,
status error/retry. JSON lock is process-local; future multi-process deployment
requires transactional uniqueness before scale-out, not a cross-process guarantee.
