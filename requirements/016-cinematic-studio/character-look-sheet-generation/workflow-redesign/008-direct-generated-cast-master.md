# Direct Generated Look Sheet Cast

Date: 2026-09-09. Updated: 2026-09-10.
Status: implemented; isolated automation and responsive browser checks passed.
Live provider UAT remains pending, not implied by implementation completion.
Supersedes the new-import UI in 006; historical imports remain readable.

## Decision

A Cast Assignment has exactly one identity source: an authorized reusable
Character version OR an owned, eligible Seedream 5.0 generated Look Sheet.
The second source does not create or require a Character Profile/Character Look.
Playground and Studio Look Sheet generation remain unchanged. Remove the
Generated sheet command from Character Wardrobe preparation, not ordinary
uploaded/AI Looks or historical records. No migration deletes user work.

The successful task videotask_e1b9cc51e58c02f6e563 is evidence for the tested
Seedance 2.0 configuration, not a guarantee of 2.5 moderation acceptance.
Do not bypass source eligibility, provider limits or register BytePlus Assets.

## Ownership And Sequence

Primary: Product Requirement Architect. Reviews are applied sequentially, not
independently: Backend/privacy, UX, Commercial and QA. More than two review
perspectives are needed because this combines private reference transport,
material Cast navigation and billable pricing. Skills: implement-generation-
workflow, direct-generative-cinematic-production, review-product-ux,
review-commercial-integrity and verify-release-regressions.

1. Image pricing: image/008-openai-image25-provisional-estimation.md under
   requirements/020-generation-providers; keep Credits as sole pricing owner.
2. Cast source contract and downstream references: 009 in this folder.
3. Cast selection UX and retirement of the incorrect entry: 010.
4. Focused and aggregate verification: 011. Update evidence per task.

Protected behavior: existing Cast direction/role editing, replacement/removal
guards, pinned reusable Characters, ordinary Look generation/upload/approval,
Story Plan approval, model limits, reference fingerprinting, fixed quote consent,
Credit reservations/capture/refunds, Playground generation and download originals.

No paid generation, live runtime-data rewrite or worker restart in automation.

## Delivery

Cast -> Add cast / Change cast source -> Generated Look Sheet -> choose an owned
eligible original -> enter Cast name -> review confirmation -> use as Cast.
Reusable Character remains the alternate source, never a prerequisite for this
flow. See 011 for test commands, evidence, runtime boundaries and remaining UAT.

2026-09-11 follow-up: enhancement-core-engine/024-country-style-and-cast-picker.md
adds metadata-based sheet-only selection and a new-assignment category guard.
Existing pinned Cast sources remain readable; trust/expiry rules do not change.
