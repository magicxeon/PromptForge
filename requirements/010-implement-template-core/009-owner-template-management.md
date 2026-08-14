# 009 Owner Template Management

## Business Requirement

A creator who publishes a reusable Template must have an obvious owner-only
path to correct its public listing without publishing a duplicate. The creator
must be able to manage the Template from its Community detail page and from the
Templates section of their Creator Profile.

## Editing Contract

### Mutable Public Presentation

The owner may update these Community listing fields in place:

- title;
- description;
- custom tags;
- visibility (`public`, `unlisted`, or `private`);
- prompt visibility (`full` or `remix_only`);
- Template access credits per output.

These fields are owner presentation and commercial settings. They update the
current Community post and current published Template projection without
changing `templateVersionId`, replaceable inputs, provider settings or the
private execution snapshot.

### Immutable Execution Version

The following fields belong to a published immutable Template version and must
never be patched through the presentation editor:

- execution snapshot and final prompt policy;
- replaceable and required input schema;
- provider/model compatibility;
- reference ownership policy;
- generation settings.

Changing those fields requires a new draft and a newly published Template
version. Existing use sessions and generation lineage remain pinned to the
version from which they were created.

## Ownership And Security

- Edit controls are rendered only when the viewer is the owner.
- The server rechecks `req.actorContext`; client ownership is not trusted.
- A non-owner update returns a stable forbidden response.
- Public API responses must not expose private execution data.
- A successful edit records an audit event containing safe before/after
  presentation metadata, never private prompts or reference payloads.

## UX Design

Use one reusable `SharedTemplateEditDialog`:

- opened by `Edit template` on the Community Template detail page;
- also available on Template cards in the owner's Creator Profile;
- resumes from `My Library -> My Templates` at `/me/templates` when the owner
  closes the first setup dialog;
- compact dark Momelo surface with stable header and footer;
- labeled title, description, tags, and visibility fields;
- labeled prompt-visibility and access-credit fields;
- an information notice explains that generation settings remain on the
  published version;
- API errors use the shared error notice;
- Save is disabled while the update is pending;
- successful save closes the dialog and refreshes Community and Profile data.

Other viewers continue to see only `Use Template` and permitted engagement
actions.

## Reusable Template Publication Gate

Publishing an ordinary image remains immediate. Choosing `Publish as a
reusable Template` creates the canonical Template and immutable version but
does **not** immediately expose it to other people.

The lifecycle is:

```text
Share Scene output as reusable Template
-> create owner-only Community post with status draft
-> open Edit shared template automatically
-> calculate locked Pose Proxy preparation cost
-> owner confirms preparation
-> queue prepares the private identity-neutral Pose Proxy
-> owner reviews and approves the result
-> activate the same Community post as published
```

The draft keeps the final human preview as its owner-visible marketing image.
The Pose Proxy remains a private preparation artifact and never replaces that
preview.

### Draft Visibility And Use Rules

- A draft appears only to its owner in `/me/templates` and owner profile
  projections.
- It is absent from Community, Explore, public Creator Profile tabs and Fashion
  Template pickers for every other actor.
- A direct public post or Template-use request must return a stable unavailable
  or setup-incomplete response; it must never enter Generation with incomplete
  data.
- Approval is idempotent and promotes the existing post. It must not create a
  duplicate post, Template or version.
- `active` Pose Proxy readiness is the only state that can activate the post.
- Failed, rejected, retired and superseded setup remains recoverable by the
  owner from `/me/templates`.

### Immediate Post-share Experience

After the share mutation succeeds:

- show `Template setup saved`, not `Template published`;
- keep the owner in the same context and open `SharedTemplateEditDialog`;
- automatically request the preparation estimate once readiness is loaded;
- show progress, review, failure and support-reference states in that dialog;
- show `Template published` only after owner approval activates the post.

Closing the dialog is safe because the owner can continue setup from
`/me/templates`, the Community post detail route or the Templates tab in their
own Creator Profile.

## Implementation Plan

### Client

- Extend `web/src/features/community/api/communityApi.ts` with the typed PATCH
  request.
- Add the reusable dialog under `web/src/components/templates/`.
- Mount the dialog in
  `web/src/features/community/routes/CommunityPostRoute.tsx`.
- Allow `web/src/components/media/MediaCard.tsx` to receive an owner-management
  action outside its navigation link.
- Mount that action from
  `web/src/features/profiles/routes/CreatorProfileRoute.tsx` only when the
  profile viewer can manage content.
- Add localized strings to every enabled `react-ui` catalog.
- Register `/me/templates` as the owner-facing library entry while reusing the
  existing Creator Profile Templates tab and card management action.

### Server

- Keep `PATCH /api/scene-templates/shared/:postId` as the presentation endpoint.
- Continue delegating through `CommunityShareService` and
  `CommunityPostAccessService`.
- Persist only the presentation whitelist through
  `CommunityPostRepository`.
- Append a safe owner-edit audit event.
- Create reusable Community posts as `draft` and activate the same post from
  the approved Pose Proxy workflow callback.
- Filter non-active Template versions from public list, detail and use-session
  contracts.
- Keep Template pricing and prompt-visibility updates behind Template Core and
  Community Share services rather than mutating repositories from routes.

## Testing

- owner can update title, description, tags, and visibility;
- non-owner is rejected by the server;
- edit controls are absent for non-owners;
- save refreshes Community detail and Creator Profile cards;
- current `templateVersionId` does not change after a presentation edit;
- no execution snapshot, prompt, or private reference can be patched;
- dialog remains usable at desktop and mobile widths.
- ordinary image sharing remains immediately published;
- reusable sharing creates an owner-visible draft and auto-opens setup;
- another actor cannot discover, open or use the draft;
- owner draft appears under `/me/templates` with `Setup required`;
- approval activates the same post without changing Template/version IDs;
- title, description, tags, post visibility, prompt visibility, access credits,
  readiness controls, retire and save remain present in the shared dialog;
- changing prompt visibility or access credits updates handoff/public pricing
  while preserving the immutable version ID.

## Implementation Record (2026-08-14)

Implemented across Community Share, Template Core, Pose Proxy, public Template
routes, Creator Profile projections, route registry and the shared management
dialog. Automated regression coverage owns the generic-image exception, draft
visibility, activation identity, mutable settings and preservation of existing
dialog controls. Requirement remains open until the listed manual flow is
validated in the running application.

### Post-share Layering Regression

`ShareGeneratedDialog` can be launched from inside `GenerationImageViewer`.
The owner setup dialog must therefore render above the viewer after the Share
dialog closes, while remaining below shared toast and confirmation layers. The
layer contract is `Generation viewer (100/101) < Template management
(110/111) < toast (120) < Share dialog (130/131) < nested/confirmation dialogs
(160+)`. Component coverage must preserve both branches: reusable publication
opens owner setup with automatic readiness estimation, while ordinary image
publication keeps its existing completion behavior.

### Save Destination And Owner-only Media

- Saving Template presentation settings from the shared management dialog
  navigates to the canonical `/posts/:postId` detail route after related query
  caches are invalidated. This gives the creator a concrete confirmation page
  for the same Template record and must not create a duplicate post.
- Draft, private, retired and other owner-only Template cards load protected
  image and presentation endpoints through the shared actor-authenticated media
  component. Public active media keeps the native image path to avoid needless
  blob allocation and request overhead.
- A protected presentation failure falls back to the protected source
  thumbnail with the same actor credentials before showing an empty state.

### Template Media Surface Regression Checklist

Every Template media change must preserve all of these surfaces together:

- discovery and Creator Profile cards use the existing card or square Sharp
  top-biased person presentation; this is deterministic because Sharp attention
  detects visual saliency rather than faces and can drift toward garments,
  windows or floor shadows;
- `/posts/:postId` uses the dedicated 4:5 `templateDetail` Sharp top-biased
  presentation from the original image so the person remains visually
  prominent without upscaling the smaller discovery thumbnail;
- ordinary Image post detail and fullscreen surfaces continue to show the
  uncropped original image;
- owner-only Template presentations load with actor credentials and fall back
  to the matching protected source rather than a public request;
- presentation URLs remain server allowlisted, and a failed derivative never
  replaces or mutates the original generation output.

Regression coverage must assert each surface contract when media rendering,
post detail, profile cards, authentication or image presentation profiles are
changed.

Presentation profile IDs are versioned when crop behavior changes. The current
Template card and square profiles use `v2`, while the detail profile starts at
`v1`; legacy profile IDs remain readable so cached or older clients fail safely.

## Manual Verification Checkpoint

1. As Alice, generate a Scene and share it with `Publish as a reusable
   Template` enabled.
2. Confirm the Share dialog closes, `Template setup saved` appears and `Edit
   shared template` opens automatically with a preparation estimate.
3. Close the dialog before preparing. Open `My Library -> My Templates` and
   confirm the same post appears once with `Setup required` and can resume.
4. Switch to Bob. Confirm the draft is absent from Explore Templates and
   Alice's public Templates tab; opening its copied direct URL or reuse action
   must not start Generation.
5. Switch back to Alice, confirm the locked estimate, wait for preparation,
   review the Doll/Pose Proxy and approve it.
6. Confirm `Template published` appears and the same post ID becomes available
   to Bob without creating a second post or Template version.
7. As Alice, edit prompt visibility, access credits and post visibility. Reload
   and confirm all values persist while `templateVersionId` remains unchanged.
8. As Bob, confirm the Use Template handoff shows the updated access credits and
   obeys prompt/post visibility.
