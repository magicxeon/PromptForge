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

## Publish Rules

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

- publish validation
- immutable versions
- image presentation fallback
- unlisted/public/private access
- Community post points to version
- hidden prompt absent from public DTO
