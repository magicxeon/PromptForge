# 010 - Existing Final Review And Download

Screen: UX09. Status: Planned. Parent tasks: T06.1, T06.2, T06.3, T06.4.
Sources: [005 Final](../005-shot-production-and-final.md),
[010 UX09](../010-complete-authoring-screen-redesign.md), [task index](000-task-index.md).
Owner: Cinematic selected-Take/timeline integration; existing Assets/export owners.
Depends on Chapter context and selected-Take contracts. Review with completed
fixtures while Render integration is in progress; no paid generation required.

## Scope And Ownership

Preserve existing Finish/preview/timeline controls, `ClipBundleDownload` and current
export commands. Adapt Chapter scope and navigation without redesigning those
controls. Packet 009 owns any monolith extraction. Do not activate planned assembly,
upscale or post-processing buttons merely to make this page look complete.

## Small Tasks

| ID | Work and output | Focused acceptance | Status |
|---|---|---|---|
| RW09.01 | Resolve Chapter clip order from explicit selected Takes and usable ranges. | Previewed alternative does not change selection; missing/stale reasons exact | Planned |
| RW09.02 | Connect Final navigation and return-to-affected-Shot through existing review UI. | Chapter/Shot IDs retained; no all-film preload; current player/actions intact | Planned |
| RW09.03 | Reuse bulk download/export and implemented post-processing availability. | Correct clip/manifest order; original bytes retained; partial outputs clear; no unsupported action | Planned |
| RW09.04 | Verify Chapter review/download and apply context-navigation feedback. | V07/R04/R10; empty/partial/completed fixtures and three widths | Planned |

## First Review And Closure

Review one Chapter with three selected clips and one missing clip; click the missing
Shot, return, preview an alternate Take and confirm final selection stays unchanged.
Planned group: `rewamp-final-ui`, with existing `rewamp-final` contract checks for
timeline/bundle behavior. Mock exports or use isolated fixture bytes; no live media
mutation or new render service is introduced.

## Feedback And Evidence

No implementation yet. Record selected Take IDs/usable ranges, downloaded fixture
manifest, return navigation, protected-control parity and unavailable capabilities.
