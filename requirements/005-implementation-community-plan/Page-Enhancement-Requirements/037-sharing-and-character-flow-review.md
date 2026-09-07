# Sharing And Character Flow Review

Parent: [033](033-publication-and-character-continuity-master.md).
Status: Current flow documented; simplified flow is a PROPOSAL for discussion.
No new navigation, rights defaults or public visibility changes approved here.

## Current Flow Inventory

| User goal | Current entry / steps | Result and owning contract |
|---|---|---|
| Share an image | Generation result, Recent/detail, individual Comparison image or Fashion output -> ShareGeneratedDialog -> draft -> metadata/prompt/post visibility -> Publish | Community image post; source+owner uniqueness; no Character publication |
| Share a reusable Template | Same dialog on eligible original Scene result -> Publish as Template -> input policy + fee + compatible prompt policy -> Publish -> Template management dialog | TemplateCoreService version + linked Community Template post; not an additional image post |
| Use a Template | Template Gallery -> detail, or image post -> Template previews/detail -> Use Template -> existing Scene route in Template mode -> required outfit, optional allowed Character -> quote -> Generate | Private generated result with source Template provenance; user may share as image only |
| Create a Character | Studio source/Sheet -> create Profile -> approve canonical version -> My Characters | Owned approved identity; approval alone does not publish or grant reuse |
| Make Character discoverable/reusable | Owner Character Profile -> metadata/sharing editor -> visibility + reuse policy + rights declaration where needed -> save | Profiles.updateSharing -> Community Character projection, separate from image posts |
| Share Character link | Character Profile -> Share Character | navigator.share or clipboard of current URL; does NOT change visibility or reuse permission |
| Choose Character display image | Owner Character Profile -> featured-image candidates -> select or automatic | Display projection only, with eligible linked work; no change to canonical references or rights |
| Reuse Character | Character Gallery/detail -> compatible destination, or supported shared Character picker -> authorized handoff -> Scene/Fashion/other supported consumer -> quote -> Generate | Server-approved profile/version/reference; resulting image can be separately published |

Entry-point anchors: ShareGeneratedDialog, GenerationResultSurface,
GenerationLibrary/HistoryDetailRoute, FashionProductionSurface,
CharacterProfileRoute, CharacterFeaturedImagePicker, CharacterLibraryPicker,
CharacterProfileSharingService.createHandoff/updateSharing, TemplateScenePanel.
This inventory is source-inspected, not a completed live browser walkthrough.

## Why It Feels Confusing

1. Share means both creating a public post and copying a URL, with different effects.
2. A successful image share gives a toast but no direct post destination; duplicate
   prevention then disables the familiar action. Gallery queries are not directly
   invalidated and editorial deduplication can remove the image from the main grid.
3. Image visibility, Character visibility, Character reuse and Character cover
   are independent but appear related. Changing a cover cannot fix missing lineage.
4. Template setup is nested in image sharing and opens another management dialog
   after success. Private prompt cannot currently publish a reusable Template.
5. Multiple entry points are useful shortcuts, but outcomes/labels must agree.
   Unifying outcomes does not require one enormous dialog or merging repositories.

## Proposed Simpler End-User Model

| Intent / proposed action name | Shortest safe flow | Success destination |
|---|---|---|
| Publish image | Result or Recent -> common share form (prompt private) -> Publish | View post; Gallery for public posts |
| Publish Template | Eligible result -> clearly separate Template intent in the same owning dialog -> compatible inputs/privacy/fee confirmation -> Publish | Template detail; edit settings optional, not a second mandatory wizard |
| Publish Character | My Characters -> approved Profile -> one focused visibility/reuse review with rights consent -> confirm | Character detail; Character Gallery only when public |
| Copy link | Already published/viewable post or Character -> copy appropriate public/direct URL | No publication or permission side effect |
| Use Character | Character card/detail or common picker -> compatible destination -> authorized selection -> Generate after quote | Result; optional Publish image using the same dialog |
| Set cover | Eligible linked work -> optional Set Character cover, or existing Profile editor | Only display image changes; never required for image publication |

No automatic Character publication, public_reusable grant, full-prompt disclosure,
cover update, image-to-Template conversion or second duplicate post. Keep private
and unlisted states, owner access, explicit fee review, moderation and rights.
An already shared ordinary image cannot currently become a second Template post;
conversion/editing policy is pending, not an implied new shortcut.

## Screen / State Contract To Discuss

- Pending checks/submission: stable action dimensions, no double submit.
- Success: persisted object identity, clear View post / View Template / View
  Character action; gallery availability follows actual visibility.
- Already shared: view existing object; owner management if authorized. A stale
  duplicate response resolves the same existing post without retrying creation.
- Error: keep form data, retry the failed operation only. A feed refresh or cover
  update failure after successful publication must not be reported as unpublished.
- Private/unlisted/revoked: accurate visibility and access; copied owner-only
  /me links must not masquerade as public links. No auto-publish on Copy link.
- Empty Character work: distinguish no linked generations from no public works;
  offer reuse/creation path, not instructions to publish unrelated images.
- Search/filter excludes new post: preserve filters and provide direct post link.
- Use the existing controlled dialogs, authenticated media, query keys, toast and
  handoff hooks. New strings use i18n EN/TH, existing themes and keyboard/focus rules.
- Normal Scene shared Character picker is a proposed extension of the Template
  picker with the same search/Mine/Community/recents and authorized handoff, not
  another library. Preserve manual references and mutually exclusive selection.

## Discussion Decisions / Acceptance Before Implementation

1. Approve distinct Publish image / Publish Template / Publish Character / Copy
   link intents while retaining current shortcut entry points.
2. Choose Template private-prompt compatibility approach from 034.
3. Confirm optional cover shortcut versus existing Profile-only management;
   no automatic selection change. Legacy manual association remains pending.
4. Confirm normal Scene picker and approval-crop follow-ups as separate slices;
   do not bundle derivative changes into publication UI.

Usability acceptance proposal: a first-time creator can publish and reopen an
image without visiting Character settings; can explain whether others may view
or reuse a Character; and can return to a Template result's source. Test ordinary,
derived, already-shared, private and denied cases at 390/820/1440px with keyboard,
EN/TH and existing themes. No provider calls required for these walkthroughs.
