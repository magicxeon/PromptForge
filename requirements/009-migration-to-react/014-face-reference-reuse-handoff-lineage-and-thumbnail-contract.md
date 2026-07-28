# React-014 Face Reference Reuse, Handoff, Lineage, and Thumbnail Contract

## 1. Business Requirement

Images created by Face Creation are reusable identity assets. A user must be
able to select an eligible face image from a completed render, private history,
collection viewer, or Community post and continue without manually downloading
and uploading the same image again.

The supported destinations are:

1. Character Sheet, mapped to `face_reference`.
2. Scene Builder, mapped to `face_reference`.
3. Playground, mapped to `face_reference`.

The flow must be understandable to a non-technical user. The viewer therefore
uses one **Use this Face** action followed by a visual destination chooser. Each
destination is represented by an icon, name, short outcome, and clear action.
Character Sheet is the recommended first destination.

The application must show a visible thumbnail for every populated Reference
Image slot. A selected slot must not rely on a dim full-card background because
that makes the source image difficult to identify.

## 2. Ownership and Reuse Policy

### 2.1 Owner behavior

The owner of a Face Creation result may use it in every supported destination
regardless of whether the result has been shared publicly.

### 2.2 Community viewer behavior

A non-owner may use a shared face only when all conditions are true:

- the Community post is published and public;
- the source generation is a Face Creation result;
- `faceReusePolicy` is `public_reusable`.

`view_only` permits viewing but does not expose a reuse action or an authorized
reference handoff. A private or unlisted post is not publicly reusable in this
MVP.

### 2.3 Server authority

The client must never grant reuse from an image URL alone. Every reuse action
must call a server authorization endpoint using `req.actorContext`. The server
resolves the source record, verifies mode, ownership, visibility, and policy,
then returns a short-lived actor-bound handoff payload.

## 3. Character and Outfit Clarification

- A reusable Character Profile remains governed by the existing Character
  Profile sharing and handoff contracts.
- A Styled Character keeps its source outfit by default.
- Scene Builder may explicitly replace that outfit when the user selects or
  uploads a new outfit reference.
- Absence of a new outfit reference means preserve the source outfit.
- This requirement does not reintroduce or rename the previous
  `fashion_safe_reusable` concept.

## 4. User Experience

### 4.1 Viewer action

Eligible owner or Community viewer surfaces display **Use this Face**.

Selecting it opens an infographic dialog with:

- source thumbnail and a statement that the face identity will be reused;
- **Build a Character**, marked Recommended;
- **Create a Scene**;
- **Open in Playground**;
- permission feedback when the source is view-only;
- pending and stable error states.

The dialog must not expose provider implementation details or ask the user to
choose a reference role.

When the chooser is launched from `GenerationImageViewer`, its overlay and
content must render above the viewer overlay/content. The nested chooser must
receive focus and pointer interaction while the underlying viewer remains
inactive until the chooser closes or navigation succeeds. After a destination
handoff succeeds, the source viewer must close before navigation so it cannot
remain open when the destination reuses the same route.

### 4.2 Destination behavior

After authorization:

1. write the actor-scoped handoff to `sessionStorage`;
2. navigate to the selected destination;
3. consume the handoff once;
4. populate `face_reference`;
5. preserve other actor-owned draft values;
6. scroll/focus the relevant creation workspace normally.

### 4.3 Reference thumbnails

Every populated reference slot displays:

- a 48-64 px thumbnail with `object-fit: cover`;
- a visible selected state;
- the reference role label;
- a short source label when derivable;
- Replace and Remove controls.

The thumbnail URL must pass through the shared API media URL resolver. Long
URLs and Base64 values must never be rendered as visible text.

## 5. Data Contract

### 5.1 Published post field

```ts
type FaceReusePolicy = "view_only" | "public_reusable";
```

`faceReusePolicy` defaults to `view_only`. It may be set to
`public_reusable` only for a public post whose source generation mode is
`headshot`.

Public Community projections expose only:

```ts
{
  faceReuseAvailability: boolean;
}
```

They must not expose private asset paths, owner-only job IDs, or raw reference
payloads.

### 5.2 Authorization request

```ts
type FaceReferenceHandoffRequest = {
  sourceType: "generation" | "community_post";
  sourceId: string;
  destination: "character_sheet" | "scene_builder" | "playground";
};
```

### 5.3 Authorization response

```ts
type FaceReferenceHandoff = {
  handoffVersion: 1;
  destination: "character_sheet" | "scene_builder" | "playground";
  referenceRole: "face_reference";
  referenceValue: {
    source: "history";
    jobId: string;
    imageUrl: string;
    referenceId: string | null;
  };
  source: {
    type: "generation" | "community_post";
    id: string;
    ownerUserId: string;
    ownerUsername: string | null;
  };
  attribution: {
    creatorDisplayName: string | null;
    communityPostId: string | null;
  };
  authorizationToken: string; // signed, actor-bound, and short-lived
  expiresAt: string;
};
```

The client stores this response in the existing handoff envelope under the
`face-reference` kind. The destination submits the signed token as
`faceReferenceContext.authorizationToken`; the server verifies it again before
queue authorization. Embedded Base64 data is forbidden.

## 6. Lineage Contract

Generation submissions already persist role-specific source job IDs. Viewer
lineage must preserve the role instead of flattening all parents into an
unlabelled list:

- Face Reference;
- Character Reference;
- Style Reference;
- Outfit Reference.

When a parent job is available to the active actor, its thumbnail is displayed
and links to the parent history detail. A Character Sheet created from a Face
Creation result therefore exposes the face parent, and a Scene created from that
Character can expose the Character parent and its available upstream lineage.

## 7. Software Design

### 7.1 Server

Create:

- `server/domain/generation/FaceReferenceHandoffService.js`
  - validates eligible source modes;
  - applies owner/public policy;
  - creates the response contract.
- `server/app/routes/referenceHandoffRoutes.js`
  - validates HTTP input;
  - delegates to the service;
  - returns stable sanitized errors.

Modify:

- `server/app/createApp.js`
  - registers the reference handoff routes.
- `server/domain/community/CommunityShareService.js`
  - snapshots source generation mode;
  - accepts and validates `faceReusePolicy`.
- `server/domain/community/communityPostPublicView.js`
  - exposes `faceReuseAvailability` only.

The service reuses `GenerationResultRepository`,
`CommunityPostAccessService`, and existing media/reference resolution. It must
not read JSON files directly.

### 7.2 React shared components and infrastructure

Create:

- `web/src/components/generation/FaceReferenceDestinationDialog.tsx`
  - reusable visual chooser;
  - receives source and completion callback;
  - owns no provider logic.
- `web/src/features/generation/api/faceReferenceHandoffApi.ts`
  - request/response Zod schema;
  - API call.
- `web/src/lib/persistence/faceReferenceHandoff.ts`
  - typed write/read helpers around the existing handoff storage.

Modify:

- `web/src/components/generation/ReferenceSlotGrid.tsx`
  - explicit thumbnail and source label.
- `web/src/components/media/GenerationImageViewer.tsx`
  - typed parent lineage and reusable action composition.
- `web/src/components/generation/GenerationExperience.tsx`
  - Face Creation result action.
- `web/src/features/studio/components/StudioRecentGenerations.tsx`
  - owner result eligibility and role-preserving lineage.
- `web/src/features/history/routes/HistoryDetailRoute.tsx`
  - owner face reuse action.
- `web/src/features/community/routes/CommunityPostRoute.tsx`
  - public reusable face action.
- `web/src/features/studio/routes/StudioRoute.tsx`
  - consume Character Sheet face handoff.
- `web/src/features/scene-builder/routes/SceneBuilderRoute.tsx`
  - consume Scene Builder face handoff.
- `web/src/features/playground/routes/PlaygroundRoute.tsx`
  - consume Playground face handoff and persist lightweight references.

All strings are added to the existing i18n namespaces with locale parity.

## 8. Input, Process, Output

### Input

- active actor;
- source generation or Community post ID;
- selected destination;
- published face reuse policy.

### Process

1. Validate source type and ID.
2. Resolve source through its repository/service.
3. Confirm the source mode is `headshot`.
4. Permit the owner, or validate public + `public_reusable`.
5. Return an actor-bound lightweight handoff.
6. Store and consume the handoff once.
7. Populate `face_reference`.

### Output

- the destination route opens with the authorized face visible in its reference
  slot;
- the next generation persists the face source job in lineage;
- no private reference is exposed to an unauthorized actor.

## 9. Impact and Concerns

- Existing direct `referenceJobId` links remain temporarily compatible but new
  UI actions use the handoff contract.
- Actor switching invalidates the handoff through the existing actor ID check.
- Community sharing defaults to view-only to avoid changing old post behavior.
- Removing or unpublishing a source post must prevent new handoffs.
- A handoff does not transfer ownership of the source asset.
- Provider reference limits remain enforced by the canonical generation
  pipeline.
- Reference thumbnails must not inflate persisted drafts with Base64 data.

## 10. Testing

### Automated

- owner can authorize a private headshot generation;
- owner cannot authorize a non-headshot generation as a face;
- non-owner cannot authorize a private, unlisted, or view-only post;
- non-owner can authorize a public `public_reusable` face post;
- source IDs and ownership are derived server-side;
- each destination consumes the handoff and fills `face_reference`;
- actor mismatch and expiry discard the handoff;
- populated reference slots render a thumbnail and retain Replace/Remove;
- lineage preserves reference role labels.

### Manual

1. Generate a Face Creation image and open its viewer.
2. Select **Use this Face**, then each destination.
3. Confirm the selected face thumbnail appears in `face_reference`.
4. Share the face as View only and verify another user cannot reuse it.
5. Share it as Public reusable and verify another user can reuse it.
6. Generate a Character Sheet and confirm the face parent appears in lineage.
7. Switch users and confirm private handoffs and drafts do not cross actors.

## 11. Acceptance Criteria

- One visual chooser supports all three face destinations.
- The chooser is visible and interactive when launched from a generation
  Lightbox.
- A successful destination selection closes both the chooser and its source
  Lightbox.
- Owner and Community reuse permissions are enforced on the server.
- No destination requires downloading/re-uploading an eligible face.
- Reference slots clearly show the selected source image.
- Existing character and scene generation pipelines remain canonical.
- Typecheck, lint, i18n parity, focused unit tests, and desktop/mobile browser
  verification pass.
