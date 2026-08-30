# Cinematic Character Look Pack And Cast Readiness

**Status:** MVP source-readiness vertical slice implemented on 2026-08-27.
Project/Cast picker corrections, private Character Look source drafts,
three-view review/approval domain contracts, owner library presentation and
immutable Cinematic binding are implemented. Customer-paid three-view Look
generation remains qualification-gated and is not exposed.
The explicit story-aware wardrobe analysis action, progress, retry and
editable-result states were implemented on 2026-08-30 through the shared
Character Look dialog and server text-provider boundary.
**Owner:** Character Profiles for reusable Character identity and Look versions;
Cinematic Studio for Project Cast assignment and Scene continuity
**Primary role:** Product And Requirement Architect
**Reviewers:** Cinematic Experience Director, UX/UI Product Designer
**Skills:** `design-cinematic-experience`, `review-product-ux`

## 1. Outcome

A creator shall be able to select a reusable Character, provide garments or an
approved outfit, prepare one consistent three-view Character Look, approve it
once and reuse that exact Look across every applicable Scene and future Project
without modifying the Character's canonical identity.

Cinematic Studio is the convenient workflow entry point. Character Profiles
remain the canonical owner of reusable identity and Look versions. Cinematic
stores only authorized, pinned references and Project/Scene continuity intent.

## 2. Problem

The existing Cast mockup can assign a Character and record a project-local
wardrobe label, but it does not yet:

- make Character selection visibly reliable;
- consistently present a face-led Character portrait;
- support a bounded, paginated Character catalog;
- attach uploaded garments to the selected Character;
- generate and approve a reusable front/side/back Look;
- preserve a Look version across Storyboard and Video generation; or
- expose the approved Look later from the Character Profile.

Treating an outfit as an unversioned Project field would force the same fitting
work to be repeated, make cross-Shot continuity unverifiable and allow later
edits to silently change approved production sources.

## 3. Product Model

### 3.1 Character Identity Pack

The existing approved Character Profile Version remains the immutable identity
authority and contains or resolves:

- canonical face authority;
- canonical three-view body/casting authority;
- age-range, body, skin, hairstyle and identity metadata;
- identity readiness and reuse-rights evidence.

Creating a Look never overwrites the Character Profile Version, canonical face
or canonical three-view Asset.

### 3.2 Character Look Pack

A Character Look Pack is a reusable, Character-owned derivative that combines
one pinned Character Profile Version with one approved wardrobe specification.
It contains:

- stable Look ID and immutable Look Version ID;
- source Character Profile and Character Version IDs;
- owner and authorization snapshot;
- Look name, description, tags and intended production use;
- source mode: Character default, owned preset, uploaded outfit or accepted AI
  proposal;
- garment authority by role, such as full look, upper garment, lower garment,
  footwear and bounded accessories;
- owned Asset/reference IDs, source fingerprints and authority ordering;
- approved front, exact side and back Look reference Assets at a consistent
  scale, plus review thumbnails;
- canonical face linkage without copying private face bytes into Cinematic;
- generation/quote/Job/reference-plan lineage when media was generated;
- readiness, review, retirement and failure status;
- created, approved, superseded and retired timestamps.

The generated Look reference shall preserve the source Character identity,
apparent-age range, body proportions, hairstyle and natural anatomy while
showing the approved outfit consistently across all three views. It is a
professional non-sexualized continuity reference, not a fashion pose,
expression sheet or replacement identity.

#### 3.2.1 Compact Character Look Sheet

The canonical storage form may be one high-resolution Character Look Sheet
rather than three duplicated source files. The provider-neutral sheet contains:

- one complete neutral front view;
- one exact side view;
- one complete back view;
- one canonical neutral face crop linked to the Character identity authority;
- no more than two bounded garment-detail regions when construction cannot be
  read from the full-body views; and
- no text, measurements, prop catalog, decorative scene, logos, expression
  matrix or repeated fashion poses in the machine-authority image.

The three body views use the same Character, Look, scale, camera, illumination
and neutral A-pose. A T-pose is prohibited because it can leak into Scene
composition. Expression variants remain Scene direction, not Look authority.

The Look Version stores one Sheet Asset plus a versioned normalized crop
manifest for `front`, `side`, `back`, `face` and optional `detail` regions.
Presentation or provider derivatives are generated from that source on demand.
They are cacheable, replaceable derivatives and are not additional durable Look
authorities. A legacy Version with three independent approved view Assets
remains valid.

The complete sheet is for human review and compact storage. Reference
Processing selects only the relevant region(s) for a Scene generation request;
it must not send the complete multi-view canvas when the selected provider can
accept individual derived references. The approved Storyboard/Scene image then
becomes the primary first-frame authority for Video generation.

### 3.3 Project Cast Look Binding

Cinematic stores a binding, not a copied Look:

```text
Project Cast Assignment
-> pinned Character Profile Version
-> pinned Character Look Version
-> film-wide default or explicit Scene scope
-> continuity lock and stale-dependency state
```

Story Plan, Storyboard, Produce and Export lineage resolve the same pinned Look
Version. They never infer the active outfit from the latest Character edit or
from a mutable image URL.

## 4. Entry Points And Ownership

### 4.1 Cinematic entry point

Inside the selected Cast dossier, `Create new Look` launches the canonical
Character Look workflow without navigating away from the Project context:

1. choose Character default, existing approved Look, upload outfit or optional
   AI wardrobe proposal;
2. upload or select garment references by garment role;
3. review validation and any exact paid generation quote;
4. generate the three-view Look through Generation and Reference Processing;
5. inspect attempts and approve one Look Version;
6. return to the same Cast dossier with that version selected;
7. choose film-wide or Scene-specific scope and optionally lock continuity.

Closing or cancelling returns to Cast without changing the active Look.

`Create Character Look` is one shared Character Profile-owned dialog with two
entry modes:

- **AI Suggestion:** create a story-aligned wardrobe proposal, obtain explicit
  estimate/consent for any generated media, then prepare and review the compact
  Character Look Sheet;
- **Upload Wardrobe:** upload a full-look garment source or a complete Character
  Look Sheet prepared outside Momelo.

Both modes converge on the same Look draft, review, approval, versioning and
Cinematic binding contracts. Cinematic does not own a second dialog, upload
format, repository or generation path.

### 4.2 Character entry point

The Character Profile owner view adds a `Looks / Wardrobe` section using the
same Character Look application contract. Owners can create, inspect, rename,
retire and select approved Looks for later Projects. Cinematic must not create
a second Look service, repository or upload format.

### 4.3 Character not ready

If a selected source lacks an approved Character Profile Version, canonical
face or canonical three-view body authority, the user cannot generate a reusable
Look yet. Cinematic offers `Prepare Character` and returns to the same Project
after the canonical Character Sheet/Profile workflow completes.

Raw actor uploads do not become an independent Cinematic identity store. A user
may create a private Character first and then prepare its Look. Public sharing
is never required to use that Character in the owner's Project.

## 5. Look Sources And Validation

### 5.0 Scoped UI preservation

Character Look work extends the existing Character Profile-owned Look dialog
and Look lifecycle. It must not redesign or remove the Cinematic Cast heading,
Control Level, role-readiness strip, Project Cast list, dossier tabs, stage
footer, Setup actions, Project Cost Summary, navigation, or application shell.
Those adjacent contracts require regression coverage whenever this dialog or
its Cast integration changes.

### 5.1 Supported sources

- **Character default:** use an already approved default Look Version.
- **Existing Look:** select an authorized approved Look from the Character.
- **Upload outfit:** attach owned garment images to this Character.
- **AI wardrobe proposal:** generate or analyze a proposal, then explicitly
  apply it before Look generation.
- **Uploaded Character Look Sheet:** attach one owner-authorized sheet that
  already satisfies the compact layout and approve it without AI generation.

Upload and selection are free. Image analysis, outfit proposal generation and
three-view Look generation are separate quoted operations.

The upload form exposes exactly these source patterns:

- **Full Look:** one required owned image representing the complete outfit.
- **Separate Pieces:** required upper and lower garment images, with optional
  outerwear, footwear and accessory images.
- **Uploaded Character Look Sheet:** one complete owner-authorized sheet with
  front, exact side, back and optional canonical-face regions.

Do not represent Separate Pieces as one file plus a garment-role dropdown.
Each supported piece has a stable labelled upload slot so completeness is
visible before Save.

### 5.1.1 Global Prompt Recipe configuration

Prompt patterns are global runtime configuration reused by every Cinematic
Project. They are not stored as project-authored prompts. Canonical recipes
live under:

```text
server/config/prompt-recipes/cinematic/
```

Each recipe has a stable recipe ID, semantic version, enabled state, system
instruction, strict output schema and bounded runtime input contract. Runtime
results record recipe ID, version and fingerprint. A Cinematic Project keeps
its own story and Cast context; the accepted private Character Look draft keeps
the structured suggestion and recipe provenance. Changing the global recipe
affects new operations but does not rewrite historical evidence.

React components never contain the canonical AI instruction or output schema.
Provider adaptation remains behind the server text-provider boundary.

### 5.1.2 AI wardrobe suggestion interaction

When Cinematic Project context is available, AI Suggestion reads the persisted
Story Brief, Creative Direction, role dossier, Character identity metadata and
existing Scene summaries. The user explicitly requests analysis. The result
must present:

- Look name and concise wardrobe direction;
- upper, lower, outerwear, footwear and bounded accessory suggestions;
- palette and material intent;
- role/scene rationale;
- movement constraints and continuity notes;
- film-wide or Scene-scoped recommendation;
- warnings when Story Plan is not yet available.

The user may edit the accepted direction before saving a private Look draft.
Suggestion does not create media, approve a Look, publish it or silently bind
it to a Project. During qualification it reports
`qualification_no_charge`; a future paid release must use the canonical
Credits quote -> lock -> submit contract before exposing a Credit amount.

The shared Create Character Look dialog must expose one explicit
`Analyze story and suggest wardrobe` action before the editable Look fields
when it is opened from Cinematic Cast in AI Suggestion mode. Selecting the AI
Suggestion source alone never starts an AI request. The action delegates through
the Cinematic API and application service to the shared server text-provider
boundary; React must not call `GeminiProvider`, `OpenAITextProvider`, or any
other provider directly.

Interaction states are part of the contract:

- ready: show the Analyze action and explain which persisted Project context is
  used;
- loading: disable duplicate analysis and show an accessible progress icon;
- success: populate Look name and Wardrobe direction, display the structured
  summary and offer `Regenerate suggestion`;
- error: retain every user-edited field, show the returned safe error and offer
  `Try analysis again`;
- Character Profile without Cinematic Story context: retain manual AI-direction
  authoring and explain that story analysis is available from Cinematic Cast.

Analysis never saves the Look automatically. The user reviews or edits the
result and explicitly selects `Save AI direction`. Character Look Sheet media
preparation remains a later, separately quoted and confirmed operation.

An uploaded Character Look Sheet does not consume Credits merely to become a
Look Version. The user reviews the sheet, confirms rights and layout coverage,
and explicitly approves it. Automatic analysis, repair, background cleanup or
regeneration is a separate optional quoted operation.

### 5.2 Garment completeness

The workflow identifies the intended outfit scope and requires only relevant
roles:

- a full-look reference may satisfy upper/lower garment coverage;
- separate top and bottom references compose one wardrobe specification;
- footwear may be explicit or use an approved policy default;
- optional accessories are bounded and cannot be invented silently;
- front is required; side/back becomes required when construction fidelity or
  a planned Shot needs authority unavailable from the front.

The review screen identifies missing coverage, conflicting references,
unsupported image quality and uncertain garment ownership before quoting.

### 5.3 Generation readiness

Readiness is explicit:

```text
identity_ready
+ wardrobe_sources_ready
+ provider_reference_plan_supported
+ approved_look_version
= cast_look_ready
```

An unapproved attempt may be previewed but cannot become the Storyboard or
Produce wardrobe authority.

### 5.4 Sheet validation and crop manifest

The upload path accepts one image Asset and records a normalized crop manifest:

```text
layoutVersion: character-look-sheet-v1
regions.front: { x, y, width, height }
regions.side:  { x, y, width, height }
regions.back:  { x, y, width, height }
regions.face:  { x, y, width, height } optional when canonical face remains separate
```

Coordinates are normalized from `0` through `1`, must stay within the image,
and may not be empty. MVP may apply the standard `character-look-sheet-v1`
layout automatically. A later visual crop editor may override these regions
without changing the source Asset. Sheet review requires front, side and back
coverage, an ownership declaration and explicit approval.

## 6. Versioning And Continuity

- Editing wardrobe sources creates a new Look Version; approved history is
  immutable.
- Approving a new version does not automatically replace a version pinned by
  an existing Project.
- Rebinding a Project or Scene to another Look Version marks only dependent
  Storyboards, video attempts and exports stale.
- Unaffected Scenes and approved outputs remain valid.
- Retiring a Look prevents new selection but preserves authorized historical
  Projects and audit lineage.
- A Scene-specific outfit change is another binding to an approved Look
  Version, not an in-place mutation of the film-wide default.
- Series continuation may reuse the same approved Look Version or deliberately
  pin a successor.

## 7. Rights, Privacy And Sharing

### 7.1 Owner Character

The Character owner may keep a Look private, reuse it across owned Projects or
explicitly publish it when Character and outfit rights permit. Saving or
approving never publishes automatically.

### 7.2 Reusable Character owned by another user

An authorized user may create an account-private derived Look for their own
Projects when the Character reuse policy permits derivative wardrobe use. The
source Character owner retains identity ownership; the Look creator retains
their authorized garment Assets and Project usage record.

That derived Look cannot be presented as an official public Look, transferred,
sold or published for general reuse without an explicit Character-owner policy
and publication workflow. Revocation and retirement behavior must preserve
already-settled audit evidence while blocking unauthorized new use.

### 7.3 Data exposure

Cinematic responses contain authorized presentation URLs and stable IDs, not
private canonical face bytes, raw provider payloads or another user's garment
references. Admin and Support use audited bounded projections.

## 8. Cast And Character Picker UX

### 8.1 Project list

- Project titles may wrap to two readable lines before truncation and expose the
  complete accessible name.
- Stage labels resolve through valid localization keys; raw keys never appear.
- Duration and status remain distinct metadata and must reflect saved server
  truth.

### 8.2 Character picker

- Use one clear `Add Character` entry point in the empty Cast state; duplicate
  controls with identical behavior are removed.
- Search and server-owned filters cover source, reuse eligibility, gender, age
  range and ethnicity without pixel inference.
- Results use bounded cursor/page pagination with a stable page size and
  preserve filter and selection state.
- Card media priority is canonical face/face thumbnail, owner-selected Character
  profile image with attention crop, then an explicit full-body fallback.
- Selecting a card produces an immediate amber/yellow outline, selected
  background, check indicator and accessible selected state.
- Header/filters and confirmation footer remain visible while only the result
  region scrolls. `Use selected Character` is always reachable and disabled
  until one eligible Character is selected.
- Confirm closes the dialog, restores focus to the invoking Cast action and
  focuses the selected dossier.
- Empty, loading, partial-image, forbidden, retry and no-result states are
  explicit.

### 8.3 Cast workspace

- The Cast list and selected dossier have one unambiguous visual hierarchy.
- The dossier groups Role and Personality, Performance Direction,
  Relationships, Scene Commitments and Looks/Wardrobe.
- The active Look shows thumbnail, readiness, version, scope and continuity
  status.
- Mobile uses a single-column list-to-detail flow; tablet and desktop may use
  master/detail layout. Sticky actions must not cover content or become
  unreachable with browser zoom or long localized labels.

## 9. Credit And Generation Contract

Character Look generation uses canonical owners:

```text
validate source rights and readiness
-> prepare named reference authorities
-> exact quote
-> explicit confirmation
-> Credit reservation
-> Generation Job/group
-> durable Assets
-> capture or eligible refund
-> user approval creates immutable Look Version
```

- Browsing, upload, manual metadata editing, assignment and approval are free.
- Analysis, AI proposal and generated Look attempts have separate estimates and
  ledger operation types.
- The displayed quote includes provider/model, resolution, output count and
  effective references used.
- Failed/partial multi-output attempts settle through existing Generation and
  Credit contracts; approval itself never charges again.
- Character Profiles own the resulting Look Version, but do not call providers
  or mutate Credits directly.

## 10. Capability And Data Boundaries

| Concern | Owner |
|---|---|
| Character identity and reusable Look lifecycle | Character Profiles |
| Project Cast, Scene scope and stale propagation | Cinematic Studio |
| Uploaded garment media | Assets |
| Outfit/product authority when available | Fashion / Assets public contract |
| Reference role planning and provider limits | Reference Processing |
| Generation lifecycle | Generation |
| Quote and settlement | Credits |
| Public sharing | Community plus Character publication policy |
| Operational search and recovery | Admin/Support owner commands |

Implementation extends the existing Character Profile facade and repository
under `server/domain/character-profiles/` and
`server/repositories/character-profiles/`. Cinematic calls that public facade;
it does not write Character storage or invent a second Look aggregate.

## 11. State And Error Matrix

| Condition | User state | Recovery |
|---|---|---|
| Character identity incomplete | Look creation blocked | Prepare Character, then return |
| Character reuse not authorized | selection blocked | choose another Character |
| Outfit reference incomplete | draft retained | add or replace required role |
| Provider cannot support reference plan | quote blocked | choose qualified route or simplify sources |
| Quote expires or inputs change | Generate disabled | refresh exact quote |
| Generation fails | approved Look unchanged | inspect refund state and retry |
| Some views fail | attempt remains incomplete | retry failed output set; cannot approve |
| Approval succeeds | Look ready | bind to film or Scene |
| Source Look version changes | current Project remains pinned | explicitly adopt new version |
| Bound Look retired/revoked | historical lineage retained | block new use and show policy recovery |

## 12. Implementation Sequence

1. Characterize existing Character Profile/identity/version, Character picker,
   Cast assignment, Asset upload, Generation and Credit behavior.
2. Add failing regression tests for Project-card localization/title, visible
   Character selection, face-led media priority, sticky confirmation and
   pagination contracts.
3. Define Character Look DTOs, repository contract and authorization policy
   behind the Character Profile facade.
4. Implement reusable Character picker presentation without changing existing
   Profile, Studio or Scene Builder consumers.
5. Replace duplicate Cast actions and add selected Character dossier/Look
   readiness presentation.
6. Implement upload/existing/default Look draft creation through Assets and
   Character Profiles.
7. Add the free single-sheet upload, crop-manifest review and explicit approval
   path while retaining compatibility with independent three-view Assets.
8. Add quoted three-view Look generation through Reference Processing,
   Generation and Credits.
9. Add immutable approval/versioning, Character `Looks / Wardrobe` management
   and Cinematic binding.
10. Add stale propagation, retirement/revocation and Admin/Support projections.
11. Run automated regression and manual responsive/theme/actor/financial media
    qualification gates before enabling paid customer routing.

## 13. Acceptance Criteria

- `CLP-01`: a ready Character can create and approve a three-view Look without
  changing its canonical identity version.
- `CLP-02`: the approved Look appears in the Character owner's `Looks /
  Wardrobe` library and can be selected in another Project.
- `CLP-03`: one Project pins an immutable Character and Look Version across
  every applicable Scene and generated Shot.
- `CLP-04`: changing a Scene Look marks only dependent Storyboards, clips and
  exports stale.
- `CLP-05`: an identity-incomplete source cannot consume Look-generation
  Credits and exposes `Prepare Character`.
- `CLP-06`: an authorized third-party Character user can create a private
  derived Look but cannot publish it as an official reusable Look without the
  required policy.
- `CLP-07`: Character selection is visibly confirmed with amber/yellow state,
  keyboard semantics and an always-reachable confirmation action.
- `CLP-08`: Character cards prefer canonical/profile face media and use a
  deliberate fallback rather than an accidental full-body thumbnail.
- `CLP-09`: Character results remain usable with pagination, filtering and
  preserved selection at mobile, tablet and desktop widths.
- `CLP-10`: only one primary Add Character action exists in the empty Cast
  workflow.
- `CLP-11`: Project titles and localized Stage labels render completely enough
  to identify the Project; raw translation keys never appear.
- `CLP-12`: an owner can upload one complete Character Look Sheet, review and
  approve it without a Generation Job or Credit charge.
- `CLP-13`: one approved Sheet Asset plus its validated crop manifest satisfies
  Look readiness while existing independent three-view Versions remain valid.
- `CLP-14`: AI Suggestion and Upload Wardrobe invoke the same Character
  Profile-owned dialog and lifecycle rather than parallel Cinematic workflows.
- `CLP-15`: upload and assignment are free; every generated or analyzed output
  follows exact quote, reservation and terminal settlement contracts.
- `CLP-16`: private identity and garment sources never leak through Cinematic,
  Community or another actor's Look response.
- `CLP-17`: existing Character Profile, Scene Builder, Fashion, image
  Generation, Credits and Community tests remain green.
- `CLP-18`: opening AI Suggestion from a persisted Cinematic Cast Assignment
  always exposes the explicit Analyze action; loading, success and retry states
  are visible, duplicate requests are blocked and failures preserve user input.

## 14. Manual Qualification

Validate at approximately 390px, 820px and 1440px under every supported theme:

1. select an owned female Character and an owned male Character;
2. select an authorized public Character from another actor;
3. exercise enough candidates to require at least two pages;
4. upload separate upper/lower garments and one full-look reference;
5. generate, reject, retry and approve a three-view Look;
6. bind one Look film-wide and a second Look to one Scene;
7. refresh/restart and confirm all pins, states and Credit outcomes;
8. open another Project and reuse the approved Look;
9. retire the Look and verify historical versus new-use behavior;
10. switch actor and verify private Look and source media isolation.

Media review records identity, apparent age, body proportion, outfit fidelity,
front/side/back consistency, unexpected accessories, anatomy, commercial
quality and one-sheet/multi-person failure. Provider qualification evidence is
required before enabling customer-paid Look generation.

## 15. Deferred

- large pre-generated expression libraries for every Character;
- automatic voice cloning or lip-sync identity packs;
- public marketplace sale/licensing of derived Looks;
- collaborative Look approval;
- automatic continuity repair without explicit approval.

For MVP, the canonical face plus approved three-view identity, approved Look
Version and per-Shot Storyboard remain the minimum continuity authorities.

## 16. Implementation Checkpoint - 2026-08-27

### 16.1 Implemented

- Project cards use valid Stage localization keys, expose the complete Project
  title and allow two readable title lines.
- The Cast picker uses one empty-state action, face-first authorized media,
  amber selected state, explicit async states, bounded cursor pagination and a
  fixed confirmation footer.
- selected Cast assignments persist an authorized face-led `portraitUrl` and
  preserve it across dossier-only updates.
- Character Profiles own `CharacterLookService`, `CharacterLookRepository` and
  `server/data/character-profiles/looks.json`.
- an owner or authorized Character user can create an account-private,
  source-ready Look draft from owned garment Assets without publishing or
  consuming Credits.
- Look review requires owned front, side and back Assets; approval creates an
  immutable approved version and supersedes the prior approved version.
- resolving a Look for Cinematic reauthorizes the exact pinned Character
  Profile Version rather than inferring a newer version.
- owner Character Details exposes one `Looks / Wardrobe` section using the same
  Character Profile API and draft component as Cinematic Cast.
- Cinematic binds only an approved Look Version and snapshots the approved
  view Asset IDs/hashes. Rebinding the same Project Look invalidates only Shots
  that name that Cinematic Look binding.
- private Look list/read/mutation remains actor-scoped. Cinematic receives
  authorized IDs and presentation data, not raw face or garment bytes.

### 16.2 Production gates still closed

- the app does not yet quote, reserve Credits or dispatch a generated
  three-view Look attempt;
- no provider/model is qualified yet for customer-paid Character Look
  composition and identity/wardrobe continuity;
- the current safe UI creates source-ready drafts. A complete review set can be
  approved through the Character Look application contract, while generated
  review UI remains disabled until the exact quote/reference-plan workflow is
  implemented;
- rename, successor-version authoring, retirement UI, Scene-specific binding,
  revocation propagation and Admin/Support projections remain follow-up work;
- full responsive/theme/provider visual qualification in Section 14 remains a
  manual release gate.

### 16.3 Automated evidence

- `node --test test/characterLookService.test.js test/cinematicApplicationService.test.js`
- `npm.cmd run typecheck:web`
- `npm.cmd run test --workspace web -- src/features/profiles/routes/CharacterProfileRoute.test.tsx src/features/cinematic/components/CharacterPickerDialog.test.tsx src/features/cinematic/components/CinematicUxPrototype.test.tsx`

The checkpoint is a **conditional pass**, not Requirement closure. `CLP-07`,
`CLP-08`, `CLP-10`, `CLP-11` and the source-draft/pinning portions of
`CLP-01`, `CLP-02`, `CLP-03`, `CLP-06`, `CLP-13`, and `CLP-14` have automated
evidence. Paid generation, full reuse, Scene-level stale propagation and manual
media qualification remain open.

### 16.4 Cast selection persistence regression - 2026-08-29

- `Use selected Character` must await the Cast mutation and close the picker
  only after the server returns the updated Project.
- Cast creation is serialized through the Project workspace mutation lane and
  uses `projectVersionRef` as the current optimistic-lock authority. The Cast
  stage must not submit a captured `project.version` while Setup or Stage
  persistence can advance the Project version.
- while saving, confirmation and close actions are disabled and a visible
  saving label prevents duplicate submission.
- failed persistence keeps the picker open and exposes the sanitized API error;
  it must never imply that an unpersisted Character was added.
- successful persistence updates the actor-scoped Cinematic Project query and
  selects the new Cast Assignment immediately.
- `CharacterPickerDialog.test.tsx` covers pending, success-close and
  failure-stays-open behavior. The targeted Cinematic UI suite passes 20 tests.

### 16.5 Cast directory version contract regression - 2026-08-29

- every owner Character directory item exposes the active
  `characterProfileVersionId` used to calculate `handoffAvailable`; detail and
  directory responses must identify the same pinned version;
- Cinematic offers a Character only when both `handoffAvailable` is true and a
  non-empty `characterProfileVersionId` is present;
- an incomplete compatibility record remains hidden instead of allowing a
  selection that can only fail during Cast persistence;
- lifecycle and picker regression tests cover the server summary contract and
  the client eligibility guard.
