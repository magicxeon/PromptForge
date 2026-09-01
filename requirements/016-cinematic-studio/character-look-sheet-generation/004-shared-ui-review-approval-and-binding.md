# Shared Look Sheet UI, Review, Approval And Binding

**Requirement ID:** `016-CLSG-004`  
**Priority:** P0  
**Status:** Core flow implemented; crop inspection enhancement pending

## 1. Shared Experience

Use the shared Character Profile Look workflow rather than creating a
Cinematic-owned generation flow. `CharacterLookDialog` owns source/review and
the separate `CharacterLookGenerationDialog` owns the Generation modal. Both
Character Profile and Cinematic use the same states:

1. Source saved.
2. Choose `Upload complete sheet` or `Generate Look Sheet with AI`.
3. For AI, inspect Engine & Target Output and exact Credit estimate.
4. Confirm and watch/resume the canonical Generation Job.
5. Inspect one complete sheet with `contain` media presentation.
6. Review front/side/back/face crop regions and quality checks.
7. Approve one immutable Look Version.
8. When opened from Cinematic, bind the approved version to the selected Cast
   Assignment through the existing Cinematic endpoint.

Upload and AI converge before Review. Neither path creates a second Look draft
when preparing an existing source-ready Look.

## 2. Component Reuse Map

| Need | Reuse/extension |
|---|---|
| source/review dialog lifecycle | `CharacterLookDialog` |
| dedicated Generation dialog shell | `CharacterLookGenerationDialog` |
| provider/model/output controls | existing Engine & Target Output shared components |
| estimate/submit/result | `GenerationExperience` and canonical generation hooks |
| loading/empty/error | shared Generation stage state |
| media inspection | existing authenticated media/result components with `contain` |
| durable Job status | Generation Job Center |
| approval | existing Character Look review/approve API |
| Cinematic binding | existing `upsertCinematicWardrobeLook` adapter |

Shared components receive normalized state and callbacks. They do not call
Character Look repositories, providers or Credits directly.

## 3. UI States

| State | Primary action |
|---|---|
| source incomplete | return to source fields |
| no qualified model | upload a complete sheet |
| ready to quote | calculate exact estimate |
| estimate ready | confirm and generate |
| insufficient Credits | open standard Credit recovery |
| queued/processing | leave safely or view Job Center |
| completed | review sheet |
| provider failed/refunded | inspect status and retry |
| review failed | retain attempt; generate/upload another |
| approved | use/bind approved Look |
| bind conflict | refresh Project version and retry binding only |

No generated result is approved or bound automatically. Closing the dialog
never changes the active Look.

## 4. Review Contract

The review UI must let the creator verify:

- exactly one Character;
- identity, apparent age, hairstyle and body-proportion fidelity;
- unchanged outfit and accessories across front/side/back;
- exact side and readable complete body views;
- neutral pose/background and no accidental scene behavior;
- face crop and every required crop region;
- absence of text, watermark, extra limbs/people and unsafe content.

Approval attaches the generated durable Asset and crop manifest with Generation
lineage, then creates the immutable approved Look Version. Binding is a
separate Cinematic mutation and does not charge Credits.

## 5. Responsive And Accessibility

- Desktop may show inspection media and Engine/quote controls in two columns.
- Tablet uses bounded columns or stacked regions without nested scrolling.
- Mobile uses one column, persistent but non-occluding terminal actions and
  full-width inspection media.
- Focus moves to the Job/result region after confirmed submission and returns
  to the triggering control on close.
- Loading uses an accessible status; errors use stable text and preserve input.
- Thai/English labels, all themes and reduced motion are required.

## 6. Implementation Steps

1. Add component tests for upload/AI branch parity and protected upload flow.
2. Coordinate mutually exclusive source/review and Generation dialogs; avoid
   nested visible dialogs and duplicate pollers.
3. Adapt the shared Engine/Generation components to the fixed Look Sheet mode.
4. Add result review and generated-Asset adoption through Character Profiles.
5. Reuse existing approval and Cinematic binding callbacks.
6. Add i18n, keyboard, focus, responsive and stale-version recovery tests.

## 7. Acceptance

- Generate is available from both Character Profile and Cinematic for the same
  authorized Look without workflow duplication.
- Upload complete sheet remains free and functionally unchanged.
- A generated attempt survives navigation and can be reviewed later.
- Only explicit approval creates the immutable Look Version; only explicit or
  existing post-approval binding changes the film.
