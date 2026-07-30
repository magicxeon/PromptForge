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
- visibility (`public`, `unlisted`, or `private`).

These changes do not alter generation behavior and may update the current
Community post immediately.

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
- compact dark Momelo surface with stable header and footer;
- labeled title, description, tags, and visibility fields;
- an information notice explains that generation settings remain on the
  published version;
- API errors use the shared error notice;
- Save is disabled while the update is pending;
- successful save closes the dialog and refreshes Community and Profile data.

Other viewers continue to see only `Use Template` and permitted engagement
actions.

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

### Server

- Keep `PATCH /api/scene-templates/shared/:postId` as the presentation endpoint.
- Continue delegating through `CommunityShareService` and
  `CommunityPostAccessService`.
- Persist only the presentation whitelist through
  `CommunityPostRepository`.
- Append a safe owner-edit audit event.

## Testing

- owner can update title, description, tags, and visibility;
- non-owner is rejected by the server;
- edit controls are absent for non-owners;
- save refreshes Community detail and Creator Profile cards;
- current `templateVersionId` does not change after a presentation edit;
- no execution snapshot, prompt, or private reference can be patched;
- dialog remains usable at desktop and mobile widths.
