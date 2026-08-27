# 011 Video Library, Profile And Character Discovery

**Status:** Implemented; manual UX verification pending  
**Owner:** History presentation, Community Profile presentation, and Character Profile presentation  
**Lifecycle owners retained:** Generation owns private Video tasks; Community owns published Video posts; Character Profiles own Character identity and visibility  
**Primary role:** UX/UI Product Designer  
**Reviewer:** QA Release Engineer  
**Skills:** `review-product-ux`, `verify-release-regressions`

## 1. Outcome

Completed and in-progress Video work must remain discoverable after the creator
leaves Playground. The product shall present Video through the existing My
Library, Creator Profile, Community post and Character Profile contracts rather
than introducing a second media library or copying Video lifecycle state.

## 2. Ownership And Privacy Contract

- `/library/recent` is an actor-private projection. Image items come from the
  canonical History repository and Video items come from durable actor-owned
  Video Provider Tasks.
- Creator Profile Video content comes only from Community posts already visible
  to the current viewer. The owner may see their own private/unlisted posts when
  the existing Community repository authorizes them; another viewer may not.
- Character Profile Video content comes from Community Video posts carrying a
  verified `characterAttributions` entry for that Character. Private Character
  identity must not become public merely because an owner generated a Video.
- Generation tasks, Community posts and Character profiles retain their stable
  IDs. Presentation code must not create a copied Video record.
- Provider prompts, private source URLs and reference bytes are excluded from
  Recent Video list payloads.

## 3. My Library Recent

The full Recent route provides an accessible segmented filter:

- `All`: merge actor-owned Images and Video tasks by creation time descending.
- `Images`: preserve the existing History grid, pagination, Collection filter,
  Image Viewer, Character actions, sharing and delete behavior.
- `Videos`: show durable Video tasks using poster-first cards with duration,
  provider/model and terminal or active status.

The compact Studio Recent component remains Image-only in this phase so its
existing creation workflow is not expanded unintentionally. Selecting a
non-default Image Collection excludes Video because Video Collection membership
is not yet part of the Collection contract.

Completed Video with a durable output opens the shared
`GenerationVideoViewer`. Queued, processing, failed and reconciliation states
remain visible but do not open an empty player. A Video task cannot be deleted
through the Image History delete mutation.

Loading, partial API failure, empty results, keyboard focus and mobile two-column
presentation must remain stable. Cards never preload full Video bytes; they use
the durable poster when available.

## 4. Creator Profile

- Add `Videos` as a first-class Profile tab without changing existing route
  meanings for Overview, Works, Characters, Templates, Comparisons or
  Collections.
- The Videos tab contains accessible Community Video cards and links to the
  canonical Community post detail.
- Overview adds `Featured Videos` when at least one visible Video exists and a
  `View all` link to the Videos tab.
- Profile counts expose Video count independently from existing Work count.
- Existing profile theme, owner controls, follow behavior and mobile layout are
  protected behavior.

## 5. Character Profile

- Character Profile Overview displays a separate `Featured in Videos` section
  when verified Video works exist.
- Image and non-Video works remain in the existing work section.
- The Creations tab retains the complete mixed-media list.
- Owner and public access continue through the same Character works endpoint;
  no client-side visibility override is allowed.
- Selecting a Video opens its canonical Community post through `MediaCard`.

## 6. Shared Component Map

| Need | Reused owner |
|---|---|
| Video playback and detail | `web/src/components/media/GenerationVideoViewer.tsx` |
| Published Video card | `web/src/components/media/MediaCard.tsx` and `MediaStage.tsx` |
| Private Video task API/schema | `web/src/features/generation/` |
| Image History and pagination | `web/src/features/history/` |
| Creator page data | `server/domain/community/CreatorProfilePageService.js` |
| Character-attributed works | `CharacterProfileSharingService.listPublicWorks` |

## 7. Acceptance And Regression Gate

1. Actor A cannot see Actor B's private Video task in Recent.
2. `All`, `Images` and `Videos` preserve the selected filter without a document
   reload and order visible items newest first.
3. Image History viewer, pagination, Collection selection and deletion remain
   operational.
4. A completed Video opens the shared viewer; an active or failed task does not
   open a blank dialog.
5. A public Creator Video appears in Overview and Videos; a private Video is
   invisible to another actor.
6. A verified Character Video appears under `Featured in Videos`; a Video with
   no verified Character attribution does not.
7. English and Thai labels, keyboard focus, profile themes, approximately
   1440px desktop and 390px mobile layouts are manually verified.

## 8. Deferred Scope

- Adding private Video tasks directly to Collections.
- Selecting a private Video as a public Profile feature without publishing it.
- Video task deletion from the customer UI.
- Autoplay feed previews and automatic poster generation changes.

## 9. Implementation Checkpoint (2026-08-25)

- My Library Recent now merges actor-owned Image history and durable Video
  tasks, with `All`, `Images`, and `Videos` filters on the full Recent route.
- Completed Video opens the shared Video viewer; active and failed tasks remain
  inspectable without opening an empty player.
- Creator Profile now exposes a dedicated Videos tab and a bounded Featured
  Videos overview section sourced from viewer-authorized Community posts.
- Character Profile separates verified Video appearances into Featured in
  Videos while preserving the existing mixed Creations tab.
- Recent Video task projections expose only safe presentation metadata and
  verified Character attribution; raw prompt and private reference data remain
  excluded.
- Automated Server regression: 33 relevant tests pass across Video sharing,
  Character visibility, Creator Profile projection, and durable Video tasks.
- Focused React regression: 7 tests pass across Recent media filtering, Video
  API projection, and Character Profile rendering. Web TypeScript validation
  passes.
- Manual desktop/mobile, theme, keyboard, and real-media verification remains
  required before marking this requirement complete. Follow
  `_temp/test-case/video-library-profile-discovery-test-cases-20260825-th.md`.
