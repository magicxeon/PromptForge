# 003 Template Publishing, Versioning and Preview

## Business Requirement

Every published Template needs a visually compelling final image and an
immutable tested version. Updating a Template must not silently alter results
for previous buyers or existing remix lineage.

## Share And Publish Dialog Layout

The reusable `ShareGeneratedDialog` is the common publishing surface for an
owned generated image and an optional reusable Template. Its layout must:

- keep the title/description header and Cancel/Publish footer visible while the
  form body scrolls independently;
- fit within the current viewport on desktop and mobile without page-level
  clipping;
- place prompt and post visibility controls in two desktop columns and one
  mobile column;
- contain replaceable-input rows in their own bounded scrolling region;
- keep the Template access-credit field outside the input-list scroller so the
  list cannot overlap pricing or footer actions;
- align each replaceable input with its `Required` control using stable columns,
  truncating unusually long labels without resizing the dialog;
- preserve draft loading, API error, Template-ineligible, and Face reuse policy
  states without leaving empty fixed-height regions.

## Share Intent And Template Eligibility

`Share to Community` is an image-post workflow by default. Opening
`ShareGeneratedDialog` must always start with `Publish as a reusable Template`
unchecked, even when the source generation is technically Template-eligible.
The creator must make an explicit disclosure decision before any Template-only
controls, version creation or preparation flow can appear.

The reusable Template option is rendered only when the server share draft says
the source is eligible. An ineligible source must not show a disabled checkbox,
an empty Template section or explanatory controls that cannot be used. The
shared eligibility contract applies to every caller of `ShareGeneratedDialog`,
including Studio results, Playground results, Recent, My Images and generation
detail surfaces.

Eligibility is server-owned and requires all of the following:

- the active actor owns the completed source generation;
- the source has a valid reusable Scene execution snapshot;
- at least one meaningful replaceable input can be published safely;
- the source is not an internal Pose Proxy, Doll, thumbnail or other hidden
  preparation artifact;
- the source type is supported by Template Core and is not merely a
  Comparison, Collection or unsupported generation result.

The client must use the draft eligibility response and must not duplicate this
decision with component-local mode, URL or label heuristics.

## Mandatory And Optional Template Inputs

Template input selection has two authorities:

1. **System-mandatory inputs** are derived by Template Core from execution,
   reference-sanitization and target-consumer policy. They are injected into
   the submitted public input schema by the server and cannot be removed,
   unchecked or downgraded to optional by the client.
2. **Creator-optional inputs** may be exposed or hidden by the creator. Their
   `Required` control is available only while that optional input is selected.

For a Fashion-compatible MVP Template, Outfit Front is a mandatory replaceable
input. Character authority is supplied by the dedicated Fashion Character step
unless the Template explicitly exposes an additional Character input, so the
Share dialog must not force a duplicate Character checkbox merely to satisfy
Fashion quote validation. Outfit Back remains optional.

The share-draft contract must return normalized policy metadata such as
`mandatoryTemplateInputIds` (or an equivalent per-input selection policy). The
server repeats this policy during publication and rejects a payload that omits
or alters mandatory definitions. Client-side locking is presentation only, not
the security boundary.

Mandatory inputs should not appear as editable checkbox rows in `What can
people change?`. Prefer omitting them from that optional list entirely. If user
orientation is necessary, show one compact read-only summary such as
`Included automatically: Outfit Front`, with no checkbox or `Required` toggle.
The later Template setup/readiness surface remains responsible for explaining
what future users must provide.

When `Publish as a reusable Template` is unchecked:

- every Template-only section is collapsed;
- optional selections and optional `Required` flags are cleared;
- system-mandatory inputs remain server policy and are not stored as transient
  user selections;
- publishing creates only the Community image post and never creates a
  Template version or preparation job.

## Publish Rules

- Publishing a reusable Template hands the creator directly into the existing
  Edit Shared Template surface. The transition must not nest dialogs or require
  the creator to rediscover the Template in Community.
- Image-only shares continue to close after publication. Only reusable Template
  publication opens Template management and Fashion-readiness controls.

- Source generation belongs to the creator and is completed.
- Preview uses the original full image and Sharp presentation profiles for
  cards; never store a low-quality thumbnail as canonical media.
- At least one meaningful replaceable input is required.
- All required input definitions have a resolvable source field.
- Guided `remix_only` is allowed.
- Manual hidden remix is blocked.
- Public references pass ownership and share-policy sanitization.
- Publishing creates a new immutable version and links a Community post.

## Version Rules

- Draft edits do not change a published version.
- Republish creates `versionNumber + 1`.
- Existing use sessions remain pinned to their version.
- Archiving hides new discovery but does not delete lineage.
- Public title, description, custom tags, and visibility are mutable listing
  metadata; editing them does not create or mutate an execution version.
- Input policy, prompt policy, compatibility, references, and generation
  settings require a newly published immutable version.

## Community Linkage

Community Post stores `templateId` and `templateVersionId`, plus public preview
projection. It must not become the source of truth for execution.

The same Template projection appears in:

```text
Community feed
Community Template filter
Creator Profile / Templates
Scene Builder shared templates
Fashion Studio template picker
```

## Testing

- Share opens in image-only mode for every eligible source;
- Template toggle and all Template-only controls are absent for an ineligible
  source on every component surface;
- enabling Template publication reveals only creator-optional input controls;
- mandatory inputs cannot be removed by DOM manipulation or a crafted API
  payload and are normalized server-side;
- disabling Template publication clears optional selections and creates an
  image post only;
- Fashion-compatible publication always contains Outfit Front exactly once,
  keeps Outfit Back optional and does not require a duplicate Character input;
- publish validation;
- immutable versions;
- image presentation fallback;
- unlisted/public/private access;
- Community post points to version;
- hidden prompt absent from public DTO.

## Planned Adjustment Checkpoint (2026-08-14)

This section records the approved UX and contract adjustment only. Source code
implementation remains pending. Before implementation, add regression coverage
around `ShareGeneratedDialog` and the server draft/publication contract so the
existing post sharing, Template setup handoff, prompt visibility, access
credits, lifecycle status and owner-management behavior remain intact.
