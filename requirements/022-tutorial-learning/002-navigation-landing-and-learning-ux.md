# TUT-002 Navigation, Landing And Learning UX

**Status:** Interaction design requirements; implementation/screenshots pending.

## Scoped Changes

Add a top-level Tutorial/Learn navigation section separate from Create and
Cinematic. Proposed routes: `/tutorials`, `/tutorials/my-learning`,
`/tutorials/:courseId`, `/tutorials/:courseId/learn/:lessonId`, and
`/tutorials/teach`. Final registration belongs to `web/src/app/routeRegistry/routes.ts`
and `web/src/app/router.tsx`; these routes do not exist yet.

Use one clear Learn/Teach workspace switch for eligible Admins. Separate the
teaching management screens from the learner player; do not add teaching controls
to Playground. Admin Finance retains financial report ownership/navigation.

## Landing Page

Add a real-course band immediately after existing start paths and before the
provider directory on `CommunityHomeRoute`, respecting its existing search/editorial
visibility behavior. Do not move the hero, provider directory, feed or filters.

- Heading, link to all Tutorials, and up to four published featured Course items.
- Each item: actual cover, title, instructor, language, duration/Chapter count,
  and Free / First N Chapters free / Credit price / Continue state, using the
  actual published count. The Course access editor exposes an integer stepper
  only for partial-free mode, plus a preview of free/locked Chapter titles.
- Link to detail or resume only; no automatic purchase from a card click.
- No invented ratings, learner counts, durations or placeholder paid courses.
- During POC fetch/render only for authorized Admin; no metadata/media leakage
  in public page payloads. Eligible empty state links to teaching workspace.
- Intentionally replace/suppress the static home `EditorialTutorialRail` only
  when the real-course POC section is enabled for this viewer. Preserve it for
  other existing callers and viewers; do not show duplicate Tutorial bands.
- Reuse its visual patterns where suitable; static sample items are not migrated
  into enrollments, assets or saleable course records.

## Screen Inventory

| Screen | Main actions and content |
|---|---|
| Catalog | Search/filter language/category/access; real covers; bounded pagination |
| My Learning | Resume, purchased/free enrollment, progress, last activity |
| Course detail | Outcomes, instructor, complete curriculum, free/locked Chapters, exact Credit offer |
| Player | Large video, current lesson/title, curriculum, previous/next, resume and captions when available |
| Teaching list | Draft/published/archived status; create/edit/preview; no learner controls mixed in |
| Course editor | Details, ordered curriculum, upload status, access/price, review/publish |
| Course analytics | Learner/usage view; authorized link to matching Finance course filter |
| Purchase confirmation | Course, unlock scope/duration, price, balance before/after, confirm/cancel |

Desktop player: video left, collapsible curriculum right. Mobile: video then
lesson details and collapsible curriculum below; no fixed sidebar covering video.
Seek/speed/fullscreen/captions use familiar controls. Locked Lesson selection
opens an explanation and explicit purchase action, never silently charges.
Reopening an owned Course goes to Resume without another checkout.

## Shared UX And Safety

- Reuse `VideoMediaPlayer` through an extended controlled contract or focused
  course wrapper. Existing image/video Generation viewers must stay unchanged.
- Shared Button, confirmation dialogs, ProcessingSpinner, async states, discovery
  controls and route Links; plain accessible forms for text content.
- Free labels use success semantics plus text; Credit price uses established
  credit emphasis. Do not apply Generation's yellow render frame to course sections.
- Maintain theme tokens, <=8px item radius, Thai/English readability, zero letter
  spacing and keyboard-visible focus. No decorative nested cards or oversized form headings.
- Accessible tabs/disclosures and dialog focus return; reduced-motion support.
- All visible strings localized through existing manifest/locales, proposed
  `tutorials` namespace with parity for every enabled locale.
- Processing video, retryable upload, buffering, locked, expired session, missing
  video, unavailable price, insufficient Credits, purchase pending, refund and
  forbidden states must each have specific recoverable UI.
- Explicit purchase consent cannot be bypassed by the existing AI-generation
  'do not ask again' preference. This is a different purchase contract.

## Design Evidence And Acceptance

Study patterns, not brand styling: [Udemy course player](https://support.udemy.com/hc/en-us/articles/229603648-How-to-Use-The-Course-Player-and-Start-Your-Course)
supports curriculum-driven playback; [Udemy course authoring](https://support.udemy.com/hc/en-us/articles/229605768-How-to-add-sections-lectures-and-video-content-to-your-course)
organizes sections and lectures. [Teachable drip content](https://support.teachable.com/en/articles/11682465-drip-content)
is a later scheduling option, not a POC requirement. Research reviewed 2026-10-08.

Before implementation inspect Momelo's visual references named by the canonical
visual guide. Verify actual screens at 390,820,1440px in all supported themes and
locales. Check focus, long Thai titles, no overflow, no accidental purchase,
hidden non-admin landing section and unchanged sibling home/Generation screens.
