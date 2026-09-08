# Sharing And Character Flow Review

Parent: [033](033-publication-and-character-continuity-master.md).
Status: Implemented 2026-09-08 with existing rights preserved; Plan 035 owns evidence.
Scope: separate Publish image/Template intent, View post after publish, Copy link
versus Character visibility/reuse settings, and shared normal Scene picker.
Cover remains optional in Profile settings. Crop repair and legacy association
without provenance remain pending. No automatic visibility/reuse changes.

Preparation gate correction: current Template creation produces a draft until
preparation approval. Keep the existing management/preparation UI and activation
guard; a saved draft must not be announced as public. Making this step optional
is deferred, not part of the approved simplification. Failure to load management
after creation must preserve saved status and an owner recovery destination.

## Source-Inspection Baseline Flow Inventory

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

## Implemented End-User Model

| Intent / proposed action name | Shortest safe flow | Success destination |
|---|---|---|
| Publish image | Result or Recent -> common share form (prompt private) -> Publish | View post; Gallery for public posts |
| Create Template draft | Eligible result -> Template intent -> compatible inputs/privacy/fee confirmation -> create draft -> existing preparation/activation | View Template; saved draft is not yet public until preparation succeeds |
| Visibility & reuse | My Characters -> approved Profile -> hero action opens existing details/settings with rights consent -> save | Same Character detail; Character Gallery only when public |
| Copy link | Already published/viewable post or Character -> copy appropriate public/direct URL | No publication or permission side effect |
| Use Character | Character card/detail or common picker -> compatible destination -> authorized selection -> Generate after quote | Result; optional Publish image using the same dialog |
| Set cover | Eligible linked work -> optional Set Character cover, or existing Profile editor | Only display image changes; never required for image publication |

No automatic Character publication, public_reusable grant, full-prompt disclosure,
cover update, image-to-Template conversion or second duplicate post. Keep private
and unlisted states, owner access, explicit fee review, moderation and rights.
An already shared ordinary image cannot currently become a second Template post;
conversion/editing policy is pending, not an implied new shortcut.

## Screen / State Contract

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
- Normal Scene shared Character picker is an extension of the Template
  picker with the same search/Mine/Community/recents and authorized handoff, not
  another library. Preserve manual references and mutually exclusive selection.

## Resolved Decisions / Remaining Gates

1. Distinct Publish image / Create Template draft / Visibility & reuse / Copy
   link intents retain current shortcut entry points. No new publication route.
2. Template requires an explicit compatible prompt policy from 034.
3. Keep existing Profile-only cover management;
   no automatic selection change. Legacy manual association remains pending.
4. Normal Scene picker implemented. Approval-crop remains a separate pending slice.

Usability acceptance proposal: a first-time creator can publish and reopen an
image without visiting Character settings; can explain whether others may view
or reuse a Character; and can return to a Template result's source. Test ordinary,
derived, already-shared, private and denied cases at 390/820/1440px with keyboard,
EN/TH and existing themes. No provider calls required for these walkthroughs.

Copy link uses the canonical /characters/:id URL, never /me/characters/:id, and
is disabled for private Characters. It cannot publish or grant reuse permission.
The existing owner editor/cover/Look controls remain in Details; the new hero
action opens that editor rather than creating a competing settings dialog.
