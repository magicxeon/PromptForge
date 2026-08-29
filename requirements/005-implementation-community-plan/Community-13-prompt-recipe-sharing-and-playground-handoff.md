# Community-13 Prompt Recipe Sharing And Playground Handoff

**Status:** Planned — implementation deferred  
**Feature type:** Prompt-only Community publishing and safe Playground reuse  
**Owner:** Community publishing and discovery  
**Depends on:** Community-00 ownership/public snapshot policy, Community-03 taxonomy, Community-04 publishing, Community-05 discovery, Playground actor-scoped drafts  
**Created:** 2026-08-29

---

## 1. Objective

Allow a creator to publish a reusable Prompt Recipe without requiring the post
itself to be an Image Post or a reusable Scene Template.

The core loop is:

```text
discover Prompt Recipe
-> inspect prompt and compatibility
-> Use in Playground
-> review an actor-owned Playground draft
-> choose current provider/model and references
-> obtain an exact generation estimate
-> explicitly generate
```

Using a Prompt Recipe never submits Generation, reserves Credits, copies private
references, or promises identical output automatically.

---

## 2. Existing sharing modes and the missing capability

### 2.1 Share artwork

Current `postType = image`:

- always represents a generated media result;
- may expose Full, Partial, or Private Prompt visibility;
- Full Prompt can be copied manually from Post Detail;
- remains view-only unless it is separately published as a Template;
- does not currently provide a canonical `Use in Playground` handoff.

### 2.2 Publish reusable Template

Current `postType = template`:

- requires an eligible sanitized Scene Template execution snapshot;
- defines replaceable inputs and required replacement bindings;
- may charge Template access Credits;
- may expose Full Prompt or Remix Only;
- uses the Template preparation, versioning, readiness, and handoff workflow.

### 2.3 Share Prompt Recipe

New `postType = prompt_recipe`:

- media is optional and never the source of execution authority;
- publishes readable prompt text and bounded generation hints;
- has no replaceable Template bindings;
- has no Template preparation or access fee in the MVP;
- opens Playground as an editable draft;
- is not a Template, image result, Character, or generation Job.

This requirement must not convert ordinary Image Posts into Templates or create
a second prompt compiler.

---

## 3. MVP product decisions

### 3.1 Prompt visibility

A public or unlisted reusable Prompt Recipe requires `promptVisibility = full`.
The entire approved recipe text must be available because partial or hidden
text cannot produce an honest reusable Prompt Recipe.

Rules:

- `full`: valid for a published Prompt Recipe;
- `partial`: remains available to artwork sharing, not Prompt Recipe reuse;
- `remix_only`: remains reserved for eligible guided Templates;
- `private`: may be used for an owner draft but cannot appear in public Prompt
  discovery or be used by another actor.

### 3.2 Reuse rights

Publishing requires an explicit declaration that the creator has the right to
share the prompt text and permits Community users to create derivative outputs.

MVP reuse policy:

```text
prompt_reuse_allowed
```

The policy grants prompt reuse only. It does not grant rights to source images,
Characters, logos, products, private references, or third-party protected
material mentioned by the prompt.

### 3.3 No Prompt marketplace in MVP

- no access Credits;
- no creator payout;
- no paid unlock;
- no hidden text sold through Remix Only;
- no guarantee that the recipe works with every provider/model.

Paid Prompt products require a later commercial requirement and financial,
refund, moderation, and creator-earnings review.

---

## 4. Prompt Recipe contract

Community extends the canonical post envelope with:

```text
postType: prompt_recipe
mediaType: none | image
promptRecipeSnapshot:
  schemaVersion
  recipeVersion
  title
  promptText
  avoidText
  authoringMode
  languageCode
  sourceType
  sourceGenerationResultId | null
  sourcePromptFingerprint
  compatibilityHints
    providerId | null
    modelId | null
    aspectRatio | null
    resolution | null
    supportsReferences | null
  structuredSelections
  referenceRequirements
  createdAt
promptVisibility: full
reusePolicy: prompt_reuse_allowed
rightsDeclarationAcceptedAt
```

### 4.1 Required fields

- title;
- prompt text;
- prompt language;
- official/custom taxonomy review inputs;
- full Prompt visibility;
- prompt reuse-rights declaration;
- post visibility;
- immutable recipe version and fingerprint.

### 4.2 Optional fields

- description;
- negative/Avoid text;
- provider/model compatibility hint;
- aspect-ratio and resolution hint;
- safe structured Attribute selections;
- optional creator-owned example image;
- reference requirement descriptions, such as `Character reference optional`.

### 4.3 Forbidden fields

Public Prompt Recipe snapshots must not include:

- API keys or provider request payloads;
- private Asset URLs or Base64 media;
- uploaded Character, Face, Outfit, Pose, Style, or product reference bytes;
- private Character Profile lineage;
- internal prompts, system instructions, moderation data, or support notes;
- billing, Credit reservation, or provider-operation IDs;
- unsupported model controls presented as guaranteed settings.

---

## 5. Authoring and publishing flow

### 5.1 Entry points

Initial supported entry points:

1. owned completed Playground generation;
2. owned completed Studio generation;
3. owned Community Image Post with Full Prompt;
4. Playground prompt editor through `Share Prompt Recipe` after the user has
   explicitly saved the prompt as an actor-owned draft.

An imported public recipe cannot be republished unchanged without attribution
and lineage to the source recipe.

### 5.2 Share dialog

The share surface presents three distinct commands where eligible:

```text
Share artwork
Share Prompt Recipe
Publish reusable Template
```

Prompt Recipe fields:

- title and description;
- Prompt preview with Copy/Edit confirmation;
- Avoid text preview;
- compatibility hints;
- official/custom tags;
- post visibility;
- full Prompt visibility disclosure;
- reuse-rights checkbox;
- optional example-image inclusion;
- Publish Prompt Recipe.

The UI must explain that a recipe is editable guidance, not a guarantee of an
identical image.

### 5.3 Server authority

For a Generation source, the server resolves the owned result and builds the
recipe snapshot. The browser cannot submit arbitrary source ownership,
provider evidence, or private reference URLs.

For a Playground draft source, the server validates actor ownership, text
limits, moderation policy, allowed structured selections, and rights
declaration before publication.

Published recipe content is immutable. Editing prompt text creates a new recipe
version. Presentation-only title, description, tags, and visibility may use the
existing guarded Community presentation-update path.

---

## 6. Community discovery and detail

### 6.1 Explore

Add `prompt_recipe` to the Post type filter and ranking/count projection:

```text
All | Images | Videos | Prompts | Templates | Comparisons | Collections
```

Prompt Recipe cards show:

- recipe title;
- creator;
- prompt excerpt;
- official tags;
- compatibility hint;
- optional example image, when intentionally included;
- `Use in Playground` action;
- engagement summary.

A card without an example image uses a restrained Prompt/document presentation,
not a fabricated media placeholder that resembles a generated result.

### 6.2 Post Detail

Show:

- full prompt and optional Avoid text;
- Copy Prompt;
- Use in Playground;
- creator and attribution lineage;
- compatibility and generation-setting hints;
- provider/model disclaimer;
- optional example image;
- likes, saves, comments, report, and remix/use count;
- AI-generated/AI-assisted disclosure appropriate to the source.

Do not show Template pricing, replaceable inputs, Use Template, private
references, or internal structured JSON.

---

## 7. Use in Playground handoff

### 7.1 Canonical behavior

`Use in Playground` calls a Community handoff endpoint that validates:

- post is published and visible to the actor;
- post type is `prompt_recipe`;
- Prompt visibility is Full;
- reuse policy is active;
- moderation and creator status permit reuse;
- snapshot version and fingerprint are intact.

The endpoint returns a sanitized handoff envelope:

```text
handoffVersion
sourcePostId
sourceRecipeVersion
sourceCreatorId
prompt
avoidPrompt
safeStructuredSelections
compatibilityHints
attributionSnapshot
```

### 7.2 Playground import

Playground writes the envelope into its existing actor-scoped draft owner:

- select Image mode;
- populate Prompt and Avoid fields;
- apply only supported structured selections;
- leave reference slots empty;
- use compatibility provider/model as a suggestion only;
- fall back to a currently enabled compatible model when necessary;
- display source attribution and an `Imported recipe` notice;
- focus the Prompt editor for review.

It must not:

- call an image provider;
- create a Generation Job;
- estimate or reserve Credits before the normal estimate trigger;
- copy private references;
- overwrite a user's existing unsaved Playground draft without confirmation;
- bypass current provider capabilities or pricing.

### 7.3 Attribution and usage event

Opening a handoff records a bounded `prompt_recipe_use_started` event. A normal
Generation created from that draft may later record source recipe lineage and a
successful use conversion without making the source creator the owner of the
new output.

---

## 8. Ownership, privacy, and moderation

- Every publish mutation uses server actor context.
- Public reads use a sanitized immutable snapshot.
- Owner unpublish blocks new handoffs but preserves historical attribution and
  moderation/audit evidence.
- Hidden, removed, reported, or rights-revoked recipes cannot start new reuse.
- Prompt text is scanned through the existing Community moderation boundary.
- Reporting supports copyright, impersonation, unsafe instructions, prohibited
  sexual content, deceptive claims, and private-data exposure reasons.
- Admin search/moderation must include `prompt_recipe` records and text evidence
  without exposing private drafts to ordinary staff roles.

---

## 9. Capability ownership and non-duplication

| Concern | Canonical owner |
|---|---|
| Prompt Recipe publication, visibility, version, moderation status | Community |
| Public prompt snapshot sanitization | Community public snapshot policy |
| Prompt compilation and final generation prompt | Existing Prompt compiler |
| Playground draft import and confirmation | Playground |
| Provider capability and model exposure | Generation provider catalog |
| Estimate, reservation, capture, and refund | Credits |
| Generated result lifecycle | Generation |
| Template replacement bindings and access pricing | Template Core |
| Engagement events and ranking | Community-12 |
| Admin content moderation | Admin/Support Community moderation |

Implementation must extend the canonical Community post repository/read model
and Playground draft entry point. It must not create a Prompt Recipe-specific
post repository, generation route, Credit calculator, or provider catalog.

---

## 10. API direction

Exact route naming may follow the current Community route convention:

```text
POST /api/community/prompt-recipe-drafts
PATCH /api/community/prompt-recipe-drafts/:draftId
POST /api/community/prompt-recipe-drafts/:draftId/publish
POST /api/community/posts/:postId/prompt-recipe-handoff
```

These endpoints delegate to Community services and the canonical post
repository. They do not call Generation or Credits.

Public list/detail APIs extend their post-type discriminated union with
`prompt_recipe` and return only fields allowed by the public snapshot policy.

---

## 11. UX, responsive, localization, and states

- All new visible strings use Community/Playground i18n namespaces with locale
  parity.
- Prompt cards and detail remain readable without an image.
- Long prompts use bounded preview and explicit Show more/less.
- Copy and Use actions remain distinct.
- Mobile, tablet, and desktop layouts expose Use in Playground without hover.
- Keyboard and screen-reader users can inspect, copy, report, and use a recipe.
- States include draft, publishing, published, unavailable, hidden, removed,
  version superseded, importing, imported, incompatible hint, and import error.
- Toasts report publish, unpublish, copy, import, and failure outcomes while
  stable inline errors preserve context.

---

## 12. Performance and migration readiness

- Feed/detail queries remain cursor-paginated and add a database-indexable
  `post_type = prompt_recipe` discriminator.
- Public list projections contain only bounded prompt excerpts; full text is
  returned on authorized detail reads.
- Search indexes title, creator, tags, and an approved bounded prompt text
  projection.
- Playground handoff payload excludes media bytes and private references.
- JSON development storage uses the canonical Community repository now and
  maps directly to future Community post/snapshot/version tables.
- Cache keys and invalidation extend the existing Community list/detail owner;
  no feature-local prompt cache is introduced.

---

## 13. Acceptance criteria

- A creator can publish a Prompt Recipe without publishing an Image or Template.
- Public Prompt Recipes always expose the full approved prompt and reuse-rights
  disclosure.
- A Prompt Recipe can optionally show an example image without becoming an
  Image Post.
- `Use in Playground` creates an actor-owned editable draft and does not
  generate or reserve Credits.
- Existing unsaved Playground work is protected by explicit replacement/new
  draft confirmation.
- References are empty after handoff unless a future independently authorized
  reference requirement implements an explicit contract.
- Disabled or incompatible provider/model hints never select an unsupported
  model silently.
- Image sharing, Template publishing, Video sharing, Comparisons, Collections,
  engagement, and moderation continue to work unchanged.
- Private prompt/reference data does not appear in public APIs, logs, handoff
  payloads, or browser persistence.
- Admin can find, hide, restore where policy permits, or remove a Prompt Recipe
  through the existing audited content moderation workflow.

---

## 14. Required tests before exposure

### Server

- actor ownership for draft and publish;
- full-Prompt requirement;
- rights declaration requirement;
- immutable version and fingerprint;
- public snapshot sanitization;
- hidden/removed/revoked handoff rejection;
- no reference/Base64/provider payload leakage;
- Community type filtering, pagination, search, ranking, and moderation;
- no Generation or Credit mutation during publish or handoff.

### Web

- Prompt card with and without example image;
- full prompt Copy action;
- Use in Playground import and source attribution;
- unsaved-draft replacement confirmation;
- provider/model incompatibility fallback notice;
- responsive and keyboard operation at mobile, tablet, and desktop;
- Image, Template, Video, Comparison, and Collection post regressions.

### Manual

```text
Alice publishes a Prompt Recipe
-> Bob discovers it
-> Bob opens detail and copies it
-> Bob chooses Use in Playground
-> Bob reviews an imported draft with empty references
-> no Credits have changed
-> Bob chooses a current model and generates normally
-> resulting output belongs to Bob and retains source-recipe attribution
```

---

## 15. Implementation sequence

1. Reconcile Community post discriminated unions and public snapshot policy.
2. Add Prompt Recipe draft/version contracts through the existing Community
   repository boundary.
3. Add publish and handoff services with ownership, rights, and sanitization.
4. Extend Community Explore, Post Detail, search, ranking, engagement, and
   moderation projections.
5. Add the canonical Playground draft import adapter and unsaved-work guard.
6. Add i18n, responsive UI, analytics, and error/toast states.
7. Run cross-post-type regressions and keep exposure behind a server-owned
   feature flag until release validation passes.

No implementation is authorized by this requirement record yet. It is retained
as planned work pending prioritization against the current roadmap.
