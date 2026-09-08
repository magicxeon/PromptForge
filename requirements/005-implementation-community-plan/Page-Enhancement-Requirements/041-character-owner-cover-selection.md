# Select A Cover From My Images

Parent: 038. Status: Implemented; cover and UI tests in Plan 036.
Real legacy eligibility verified read-only; no real profile choice was changed.

- COV-01: Extend existing cover picker with Linked works / My images sources.
  My images is an owner-authorized cursor-paginated result list (36 per page,
  server maximum 60), including unshared and legacy owned renderable images.
  Preserve linked Community works and automatic mode. No new cache or polling.
- COV-02: Server validates ownership and renderable image eligibility again on
  selection/media read. Reject failed, removed, video or foreign results; use
  canonical normalized ownership for legacy records, not client claims.
- COV-03: Explicit manual selection may use an unlinked owned image. Store only
  existing cover source IDs on the profile; do not alter result lineage, stats,
  prompt, identity attributes, Community publication or generation references.
  Unrelated images must never enter automatic cover selection.
- COV-04: Selection is an explicit display grant: selected image can be shown
  wherever this profile's visibility allows. Show this warning before saving an
  unlinked owned cover in a confirmation dialog. This does not publish the source
  post or expose its prompt. Private profile media remains private. Revoked or
  missing images fall back through the existing cover policy.
- COV-05: Preserve selection across refresh; errors/retries, loading, empty pages,
  pagination, keyboard and mobile controls must work. Source switch resets cursor
  and does not change current cover until selection is confirmed.
  Selected media URL includes the profile record revision so changing covers
  reloads the authenticated image even when the media endpoint path is unchanged.

Tasks: reuse GenerationResultRepository owner page; extend candidates/query and
manual validation/resolution; add scoped selector and explicit confirmation;
test foreign/invalid/legacy/manual/automatic/media boundaries plus responsive UI.
