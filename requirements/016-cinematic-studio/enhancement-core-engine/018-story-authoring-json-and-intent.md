# Story Authoring Configuration And Intent

Status: implemented; isolated validation passed. Owner: Cinematic configuration; Generation text execution.

- Versioned JSON owns Setup limits, taxonomy IDs/selection bounds and text-model
  defaults; prompt recipes own creative instructions. Retain environment model,
  timeout and token overrides; API keys remain environment-only. Never expose
  private model credentials through the public authoring manifest.
- Setup enhancement defaults to gpt-5.6-terra; Story Plan retains that default.
  Preserve the existing Generation entry point and billing policy. No new paid
  enhancement stage or change to image/video Credits.
- Genre: one to three ordered choices, first is primary. Audience feeling: one
  to three ordered choices forming the intended emotional arc. Pacing: one to
  two compatible traits; contradictory steady speeds cannot be selected together.
  Add genre/feeling/pacing vocabulary in JSON and EN/TH catalogs. UI uses bounded
  checkbox choices with accessible move/order controls, not a new design theme.
- Preserve legacy scalar fields as the primary choice for old consumers; add
  ordered arrays and normalize absent arrays from those scalars. Reject invalid
  new arrays server-side. Both enhancement and planning receive complete intent.
- Move Setup 600/800 limits and enhancement instructions out of hard-coded
  provider/service strings. Initial limits stay unchanged, configurable from one
  public definition. DTO schemas enforce shape/security bounds, server validates
  current configuration. No silent truncation of new user-authored source.
- Expose safe authoring choices/limits via the existing authoring manifest; do
  not build a second taxonomy API or duplicate tables in React.
- Validation: JSON loader rejects malformed IDs/bounds; legacy round-trip;
  multi-choice order survives save/reload/enhance/plan; pending/error and locale
  behavior; no unrelated Setup/role workflow removal.

## Creative Intent Presentation Follow-up (2026-09-11)

Status: implemented and verified (evidence in 023). Primary: UX/UI Product Designer; sequential
QA review (not independent). Skills: review-product-ux, verify-release-regressions.
Scope: Creative Intent only; preserve Setup foundation, story source, roles,
Ending intent, summary, save/continue actions, stored values and selection rules.

1. Keep the existing controlled StoryIntentChoices component and native checkbox
   semantics. Give checkboxes fixed 18px dimensions, aligned adjacent labels and
   row-sized click targets; prevent generic workspace input CSS from winning.
2. Stack the three choice groups in a consistent reading order. Use compact
   ranked selection rows, aligned icon-only ordering controls and a counted
   heading. Keep options progressively disclosed, with a responsive two-column
   list where space permits and one column on narrow panels. No nested cards.
3. Use semantic theme tokens, restrained separators, hover/focus and disabled
   states; retain native keyboard interaction, accessible labels and EN/TH.
   Do not add pricing, generation, persistence or model behavior.
4. Verify caps, incompatible pacing, ordering, last-selection protection and
   pending state. Browser fixtures must include the real
   data-testid="cinematic-workspace" ancestor: earlier isolated fixtures omitted
   it and missed the production input-size collision. Check closed/open groups,
   checkbox dimensions/alignment, keyboard and all three themes at 390/820/1440px.
5. Extend the existing directed-opening test/browser runners; record results in
   023. No paid calls, runtime data writes, new component owner or file moves.
