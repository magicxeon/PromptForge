# Generation Prompt, Reference And Job Workspace

**Requirement ID:** `016-CLWR-003`  
**Status:** Implemented; automated Generation/reference gates passed  
**Priority:** P0 blocking bug and paid-workflow protection  
**Owning capabilities:** Character Profiles orchestration; Generation execution

## 1. Problems

The current Look Sheet Generation adapter passes the server-compiled
`plan.prompt` simultaneously as the main prompt, `additionalDirection`, and the
template `additionalDirectionSnapshot`. The canonical Additional Direction
contract rejects values over 300 characters, while a versioned Look Sheet recipe
plus wardrobe direction is expected to be longer. Submission therefore fails
before provider dispatch with `Additional Direction cannot exceed 300
characters`.

The workspace also declares `outfit_front` and `outfit_back` display roles even
when the plan contains no such Assets. Empty technical slots appear as missing
creator work and obscure the separately authorized Character identity input.

## 2. Prompt Ownership Contract

The server-authorized plan owns the complete main prompt:

```text
global Look Sheet recipe
+ bounded Look name
+ bounded saved wardrobe direction
= plan.prompt
```

The React adapter must submit:

```ts
initialPrompt = plan.prompt;
additionalDirection = '';
sceneTemplateSnapshot = {
  id,
  promptRecipeSnapshot: plan.recipe,
  characterLookSource: plan.source
};
```

It must not place `plan.prompt` in `additionalDirection` or
`additionalDirectionSnapshot`. A future editable creator delta may use
Additional Direction only when:

- the UI exposes it explicitly;
- input is normalized to at most 300 Unicode characters;
- estimate and submission receive the same value;
- it remains separate from the immutable recipe and saved source direction.

This phase does not add that field. Prompt editing remains hidden in the Look
Sheet workspace.

## 3. Prompt Regression Rules

- A main prompt longer than 300 characters is valid when within the normal main
  prompt limit.
- Additional Direction remains subject to the global 300-character limit.
- The recipe is loaded only from server prompt configuration and includes its
  ID, version and fingerprint.
- Estimate and generate use the same authorized plan prompt and recipe snapshot.
- Client changes cannot replace the Character, Look or Version IDs in the plan.
- Provider debug logging may record length/fingerprint, never the private full
  prompt or Base64 references in normal logs.

## 4. Reference Contract

Reference roles are data-driven:

| Source | Character identity | Outfit references shown/sent |
|---|---|---|
| AI direction | required authorized Character Profile Version | none |
| Full Look upload | required authorized Character Profile Version | actual `outfit_front`; optional back only if present |
| Separate Pieces | required authorized Character Profile Version | owned source Assets retained; one server-composed wardrobe authority sent within provider limit |
| completed Sheet upload | no Generation operation | none in Generation workspace |

`outfit_front` and `outfit_back` are internal normalized roles, not mandatory UI
slots. The workspace displays compact input summaries/thumbnails only for Assets
present in `plan.references`. Character identity is shown as a separate locked
input summary because it is authorized through `characterProfileContext`.

No UI may synthesize an empty reference, silently drop an authorized reference,
or send more references than the active model supports.

## 5. Provider Capability And Parity

Before estimate and submit:

- derive effective reference count from actual outfit references plus the
  Character identity reference used by Generation;
- filter provider/models using the public server capability catalog;
- hide unsupported resolution/reference controls;
- keep fixed `1:1`, one-output Look Sheet contract unless a future recipe
  version explicitly changes it;
- use one selected provider/model for one candidate;
- preserve last valid provider/model preference only when still qualified;
- reject stale estimate if provider/model, references, prompt recipe, output or
  source Version changed.

## 6. Generation Workspace

Keep `CharacterLookGenerationDialog` separate from source/review. Reuse
`GenerationExperience` for:

- provider/model selection;
- actual input summary;
- exact Credit estimate;
- insufficient-Credit recovery;
- explicit submit;
- Queue/processing/completed/failed/refunded states;
- durable Job pointer and navigation-safe resume;
- result presentation with `contain`;
- `Review this Look Sheet` candidate action.

Labels by state:

| State | Primary label |
|---|---|
| no plan | Generate Look Sheet |
| plan ready, no estimate | Calculate estimate / canonical shared behavior |
| estimate ready | Generate Look Sheet |
| queued/processing | View generation progress |
| completed, not adopted | Review this Look Sheet |
| failed/refunded | Retry generation |
| returning to active workspace | Resume generation |

Do not use `Return to generation` unless an existing Job/result actually exists.

## 7. Credit And Job Safety

- Opening/configuring the workspace does not reserve Credits.
- Estimate describes the exact provider, model, source Version, effective
  references, output count and resolution submitted.
- Submit uses the canonical idempotent Generation command.
- One attempt creates at most one reservation and one terminal settlement.
- Closing/back never cancels or duplicates an accepted Job.
- Completed results remain in History/Job Center even when the Look preparation
  is later retired.
- Candidate adoption does not charge Credits and cannot auto-approve or bind.

## 8. State And Error Matrix

| Condition | Required behavior |
|---|---|
| plan loading | keep preparation visible; disable duplicate open |
| plan stale/failed | remain in preparation with stable retry error |
| no qualified model | show upload-complete-Sheet fallback |
| reference count unsupported | filter model or show precise block before quote |
| estimate loading/failed | preserve provider/model and inputs |
| insufficient Credits | canonical recovery; no Job |
| queued/processing | may leave and resume same Job |
| provider failed/refunded | show canonical terminal status and retry |
| result completed | show inspection media and Review action |
| adoption failed | retain completed result and retry adoption only |
| adoption succeeded | return to Review & Use with returned Look projection |

## 9. Implementation Steps

1. Add a failing adapter/server regression proving a >300-character main Look
   prompt is accepted while Additional Direction remains empty.
2. Remove duplicate `additionalDirection` and snapshot assignment from
   `CharacterLookGenerationDialog` without altering shared Generation defaults.
3. Add estimate/submission payload parity assertions for recipe, prompt,
   Character context, references and output.
4. Replace static reference-role presentation with roles derived from actual
   authorized plan references.
5. Add separate Character identity and Wardrobe source summaries without
   exposing private raw IDs as primary UI.
6. Correct resume/action labels using canonical Job state.
7. Test zero-outfit-reference AI direction, one Full Look reference, optional
   back reference and provider-limit rejection.
8. Run Generation, Credit, Job Center, Character Look, Playground, Studio and
   Fashion regressions before release.

## 10. Acceptance

- AI direction can submit its full recipe prompt without the 300-character
  Additional Direction error.
- Main prompt appears once in the request contract.
- Empty `outfit_front/outfit_back` placeholders are absent.
- The quote and submitted operation have identical billable inputs.
- Leaving/reopening resumes one Job rather than creating another.
- Result adoption returns to Review and never auto-approves or auto-binds.
- Existing normal Character Sheet, Playground, Studio and Fashion prompt
  behavior remains unchanged.

## 11. Implementation Evidence (2026-09-01)

- `CharacterLookGenerationDialog` is separate from source/review and reuses
  `GenerationExperience`, provider catalog, estimate, queue and Job Center.
- The compiled Look recipe appears once as `prompt`; Additional Direction and
  its snapshot are empty, including prompts longer than 300 characters.
- Full Look sends only its real authority. AI direction sends no empty outfit
  placeholders. Separate Pieces are composed by `ReferenceAssetService` from
  2-6 actor-owned image Assets while retaining every original authority.
- The composite endpoint validates role, actor ownership, image status and
  confined storage paths, then stores a private derivative Asset with source
  lineage. It does not dispatch Generation or alter Credits.
- Result adoption returns the same Look Version to explicit Review; it does not
  approve or bind automatically.

## 12. Wardrobe Fidelity And Candidate Adoption Correction

Provider evidence found that the first implementation displayed the authorized
wardrobe direction in preparation, but the canonical `character-sheet` prompt
compiler did not consume that server-planned prompt. The provider therefore
received the generic Character Sheet baseline and could return a neutral
identity turnaround instead of the requested outfit. The shared output-count
preference could also leak into this fixed single-candidate operation, moving
the adoption action into a Generation Group viewer where it was easy to miss.

The correction must preserve the existing Generation/Credit/Queue owners and:

1. compile the Character Look main prompt only for a Cinematic
   `character-sheet` request whose Character Profile, Look and Look Version
   context agree;
2. include the saved AI suggestion's garment pieces, palette, materials,
   movement constraints and continuity rules as authoritative wardrobe detail;
3. explicitly reject neutral fitting basics or the Character reference's
   casting uniform as a substitute for the target outfit;
4. lock this operation to one output and disable prompt refinement so estimate,
   submitted request and review candidate describe the same deterministic
   recipe contract;
5. show a prominent `Use this Look Sheet` action as soon as the one candidate
   completes, while retaining History and normal result inspection;
6. attach the selected Generation result to Review only after that explicit
   action; never auto-approve or auto-bind it.

Regression evidence must prove the generic Character Sheet compiler remains
unchanged outside the qualified Cinematic Character Look context, and that
Playground output-count preferences are neither read nor overwritten by this
workflow.

### Correction evidence (2026-09-01)

- Prompt recipe `character-look-sheet` v2 is stored separately from v1 and
  includes explicit wardrobe authority and casting-uniform exclusion rules.
- The generation plan compiles garment pieces, palette, materials, movement
  constraints and continuity notes from the saved suggestion.
- The canonical server compiler accepts that prompt only when Cinematic,
  Character Profile, Look, Look Version and recipe context agree; mismatched
  context falls back without consuming the supplied prompt.
- Client and server both force one output and disable prompt refinement for this
  operation. Credit estimation, reservation and Queue ownership remain on the
  existing Generation/Credit path.
- A completed Job raises a focused candidate-ready action in the dedicated
  modal. Adoption rechecks exact Look Version and recipe lineage before Review.

## 13. Compact Generation Workspace And Header Regression

The dedicated Character Look Generation dialog must reuse the established
Playground generation presentation instead of rendering the shared regions as
one full-width vertical stack. This is a presentation adapter only; provider
catalog, estimate, Credit, Queue, Job and candidate-adoption ownership remain
unchanged.

### 13.1 Workspace layout

1. Display the current Character name and Look name before provider selection
   so a creator can confirm which identity and wardrobe contract will be used.
2. At desktop width, place the contained result preview beside the compact
   Engine, references and Generation command column.
3. Reuse `PlaygroundGenerationWorkspace` and `EngineTargetPanel`; do not create
   a Character-Look-only provider/model selector or pricing calculation.
4. Hide Playground Recent generations and the editable Prompt region because
   neither belongs to this fixed-recipe operation.
5. Keep one square output, one candidate, fixed prompt refinement, exact quote,
   Queue state, result utilities and explicit `Use as review candidate` action.
6. Constrain the media preview with `object-fit: contain`; opening the shared
   media viewer remains available for close inspection.
7. Collapse to one readable column on tablet and mobile with no horizontal
   overflow, clipped provider/model text or inaccessible actions.

### 13.2 Shared App Header preservation

The Cinematic route continues to hide only the global `Create` command as
specified by the approved Setup requirement. When that command is absent, its
former `margin-left: auto` alignment responsibility must transfer to the first
right-side status control so Job status, Credits and account controls remain
right aligned. The global search, sidebar, actor switcher, footer and Cinematic
workspace header contracts must otherwise remain unchanged.

### 13.3 Verification

- Character Look adapter coverage asserts Playground layout, hidden Recent
  history, fixed output/refinement and visible Character context.
- Shared Playground coverage asserts that omitting Recent content does not
  remove Engine, references, Queue, result or Generate controls.
- App Shell route-policy coverage continues proving only `Create` is hidden on
  Cinematic routes.
- Verify the dialog and global header at approximately 390px, 820px and 1440px
  widths before release.

### 13.4 Implementation evidence (2026-09-01)

- The Character Look adapter uses the shared Playground workspace with Recent
  outputs disabled and the fixed recipe Prompt hidden.
- Character and Look names are visible above the provider/model controls.
- Desktop renders contained preview and controls side by side; 820px and 390px
  render one column with no dialog or document horizontal overflow.
- At 390px Provider and Model stack so the selected model remains readable.
- The Cinematic App Header retains the approved hidden `Create` policy while
  Job status, Credits and the full desktop actor selector align to the right.
- Frontend regression suite: 95 files and 356 tests passed. TypeScript, ESLint,
  i18n parity, production build and Playwright viewport inspection passed.

## 13. Compact Generation Workspace And Header Regression

The dedicated Character Look Generation dialog must reuse the established
Playground generation presentation instead of rendering the shared regions as
one full-width vertical stack. This is a presentation adapter only; provider
catalog, estimate, Credit, Queue, Job and candidate-adoption ownership remain
unchanged.

### 13.1 Workspace layout

1. Display the current Character name and Look name before provider selection
   so a creator can confirm which identity and wardrobe contract will be used.
2. At desktop width, place the contained result preview beside the compact
   Engine, references and Generation command column.
3. Reuse `PlaygroundGenerationWorkspace` and `EngineTargetPanel`; do not create
   a Character-Look-only provider/model selector or pricing calculation.
4. Hide Playground Recent generations and the editable Prompt region because
   neither belongs to this fixed-recipe operation.
5. Keep one square output, one candidate, fixed prompt refinement, exact quote,
   Queue state, result utilities and explicit `Use as review candidate` action.
6. Constrain the media preview with `object-fit: contain`; opening the shared
   media viewer remains available for close inspection.
7. Collapse to one readable column on tablet and mobile with no horizontal
   overflow, clipped provider/model text or inaccessible actions.

### 13.2 Shared App Header preservation

The Cinematic route continues to hide only the global `Create` command as
specified by the approved Setup requirement. When that command is absent, its
former `margin-left: auto` alignment responsibility must transfer to the first
right-side status control so Job status, Credits and account controls remain
right aligned. The global search, sidebar, actor switcher, footer and Cinematic
workspace header contracts must otherwise remain unchanged.

### 13.3 Verification

- Character Look adapter coverage asserts Playground layout, hidden Recent
  history, fixed output/refinement and visible Character context.
- Shared Playground coverage asserts that omitting Recent content does not
  remove Engine, references, Queue, result or Generate controls.
- App Shell route-policy coverage continues proving only `Create` is hidden on
  Cinematic routes.
- Verify the dialog and global header at approximately 390px, 820px and 1440px
  widths before release.
