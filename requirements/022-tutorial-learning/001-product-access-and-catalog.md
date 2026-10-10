# TUT-001 Product, Access And Catalog

**Status:** Draft requirement; no runtime implementation.

## Actors And Feature Gate

| Actor | POC behavior |
|---|---|
| Anonymous/member/non-admin staff | No new menu or landing course data; reject direct course, purchase, report and media access |
| Admin learner view | Browse published POC courses, preview free Chapters, test purchase and learning under explicit test classification |
| Admin teaching view | Own/manage draft courses, upload, publish and review analytics within authorized scope |
| Future instructor | Deferred eligibility/approval policy; no automatic publication or finance access from toggling UI mode |

Resolve identity from `req.actorContext`; never trust a submitted role/userId.
Feature flags fail closed on client and server. Teaching mode changes navigation,
not authorization. POC actor switching is not a substitute for production login;
public paid rollout requires authenticated identities and server-enforced roles.

## Content Contract

- Stable IDs: courseId, chapterId, lessonId, instructorUserId and assetId.
- Course: title, description, outcomes, prerequisites, cover, language, category,
  instructor, access mode, price version, publication version and timestamps.
- Chapter: title, order, ordered Lesson IDs; Lesson: title, order, description,
  video asset/version, probed duration and optional accessible captions/resources.
- Use stable IDs for progress/purchase links, not title or list index.
- Draft -> published -> archived. Publishing validates ready playable assets,
  ownership, required copy, valid pricing and access-policy snapshot.
- Chapter/Lesson editing uses optimistic revision checks. Reordering changes the
  next published curriculum, not historical receipts or stable progress identities.
- Published edits are staged and explicitly republished. Preview has a visible
  admin-only state and cannot be confused with learner entitlement.

## Access Modes

`free`: all published Chapters available without a paid order.
`preview_then_paid`: first N published Chapters free; remaining Chapters locked.
`paid`: lessons locked until entitlement is active; course description is not a lesson.

Persist the free Chapter ID set with each publication, derived from published
order. Show an access-impact confirmation before moving a Chapter across the
free/paid boundary. Do not silently revoke existing paid entitlement by reordering.
The author sets `freeChapterCount` in the Course editor, with an editable default3.
Require an integer satisfying 1 <= N < published Chapter count in partial-free
mode. Offer free mode for all Chapters or paid mode for none; never silently clamp
the author's selection. A two-Chapter Course may set N=1. Snapshot N and the free
Chapter IDs in the publication. Later defaults do not alter existing Courses.

Proposed purchase unit is the Course; access duration, future content inclusion,
and archive treatment require approval in 007. A paid course cannot change to a
lesser entitlement for existing purchasers without explicit migration/refund policy.

## Enrollment And Progress

One enrollment per actor + Course. Free/preview enrollment is recorded idempotently
when the member intentionally starts learning, not from landing impressions.
Purchase can establish the enrollment before the first playback. Record
enrollment source (free/preview/purchase/manual), version and entitlement separately.
Purchase does not imply playback or course completion; refund does not erase history.

Store per-Lesson resume position and watched intervals; handle multiple devices
and stale updates. A course progress denominator is tied to a curriculum version;
new Lessons must not retroactively change a previously awarded completion record.

## Acceptance

- TUT-ACCESS-01: role/feature gate holds on menu, deep link, API and media request.
- TUT-ACCESS-02: N=1,3,5 each opens exactly the first N Chapters and their Lessons;
  Chapter N+1 is locked. Invalid/fractional/all-free partial counts are rejected.
- TUT-ACCESS-03: reorder/rename cannot charge twice or detach purchased access.
- TUT-ACCESS-04: only published/ready content is eligible for learner catalog.
- TUT-ACCESS-05: repeated enrollment returns the same identity; admin preview is
  separated from learner/test enrollment in analytics.
