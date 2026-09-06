# Derived Sharing Domain Rules

Parent: 019. Status: Implemented; focused gates and independent QA passed.
Owner: CommunityShareService using persisted GenerationResultRepository records;
Template provenance is read from the persisted Generation result.

- Determine derivation from server-persisted templateUseContext, never request
  flags, filenames, prompt text or the existence of sceneTemplateSnapshot.
- Nonempty/incomplete recorded Template context is conservatively non-republishable.
- Draft returns templateEligible=false and a stable reason for derived results.
  Do not provide replacement schemas for a forbidden publication action.
- Publish re-reads the owned generation before side effects. Reject derived
  publishAsTemplate=true with 403 community_template_derivative_not_publishable.
  Reject missing/foreign source with 404. Do not consume the draft on rejection.
- Re-check stored context even when an earlier draft was eligible. Owner of the
  original Template is not exempt. Both current and legacy share route aliases
  delegate to the same policy. No new publication endpoint or repository path.
- User follow-up: ALL Template-derived results share with private prompt only,
  including full-prompt originals and results made by the original owner.
  Reject full/partial/remix_only API requests. Hide prompt and execution data in
  draft snapshots and published posts. Recheck persisted origin at publish.
- Preserve generation source ID on image posts. Existing TemplateDetail service
  resolves provenance and lists public creations; no extra public raw provenance
  blob, private asset URLs or duplicated lineage database.
- Metadata Edit does not convert image posts to Templates. Existing reusable
  Template management remains unchanged; retrospective review is pending.
  Image-post Edit also rejects non-private visibility for derived work. New posts
  retain a server-set templateDerived boolean so the rule survives missing history;
  this is additive metadata, not a new data path or public raw provenance blob.

Tests: normal/derived/partial context, same-owner, crafted fields, stale draft,
foreign/deleted source, retry as image, privacy, no Template writes on rejection,
original publication and existing attribution visibility/likes order.
