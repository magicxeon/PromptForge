# 015 - Cinematic Flow Hardening

Status: implemented with focused automated/browser evidence, 2026-09-27.
Live integrated UAT remains open; not full release-closed.
Owner: Cinematic application and React workspace. Extends tasks 008-011 and 014;
does not replace their protected Render/Queue/Engine contracts.

## Outcome And Roles

Complete a usable authoring -> Render -> selected Take -> Chapter review/export
flow so the owner can conduct one integrated UAT after focused automated checks.
Primary: Product Requirement Architect. UX designer and Backend/QA reviewers work
on bounded slices. Security review applies to private reference export; no price,
Credit settlement, provider retry or post-processing activation changes.
Roles above three are sequential review gates, not concurrent competing owners.

## Scope And Acceptance

1. Preserve unsaved authoring work when navigating between Full Story, Chapter,
   Scene and Shot or reloading. Reuse actor-scoped persistence; text only, bounded,
   versioned, no Base64/media. Do not auto-apply recovered work over a changed server
   revision. Explicit recovery/discard and browser unload warning must be accessible.
   Successful save clears only the saved draft; failure leaves work recoverable.
   Preserve edits made while Save is in flight, including reverting to the original
   value. Storage quota/capacity failures require explicit consent before leaving
   through SPA navigation, browser Back or local Scene selection.
2. Keep stable Shot context for writer -> existing Render -> writer. Media preview
   is not approval. Reload/late completion must not move approval or preview to
   another Shot. Reuse existing source/attempt and queue owners; no new poller.
3. Show readable readiness and source-impact advice near the Shot production entry:
   unsaved text, missing selected Look/First Frame, stale prompt/frame and dialogue
   timing. Only hard contract/capability/permission faults block submission. Do not
   introduce film-wide creative gates; server validation remains authoritative.
4. Expose revision/source impacts without erasing assets or rewriting old receipts.
   Existing source fingerprints/statuses are authority. Distinguish an advisory
   upstream Chapter edit from an invalid reference or changed Shot source.
5. Portable export retains usable authorized references when another is missing,
   unavailable or unauthorized. Return per-slot sanitized issues, never private
   URLs from failed resolution. Number available images contiguously. Never silently
   reinterpret a custom prompt's @Image references after removal: flag unsafe
   numbering and prevent copying an inconsistent packet until corrected. Export
   stays read-only and makes no paid request. Normal generation fails closed.
6. Connect Chapter Final review to existing selected-Take, timeline and clip bundle
   owners. Show ready/missing/stale rows in current Scene/Shot order with a route
   back to the exact Shot. Existing clip/range selection is explicit, preview alone
   cannot change it. Keep original downloads and explicit partial-ZIP consent;
   no fake concatenation/upscale/post-processing actions.
7. Preserve theme, Engine/Render/Queue and adjacent controls. Test long Thai/English,
   mobile/tablet/desktop, 200% zoom-equivalent layout, keyboard/focus and errors.
   All new strings use TH/EN catalogs; all pending icons use ProcessingSpinner.
8. Reconcile documentation with code and remove only demonstrated dead branches
   or redundant local glue. Do not delete compatibility readers, runtime data or
   modules solely on static-search evidence. Record actual cleanup, even if zero.

## UX Decisions

Keep writer sections in place. Recovery is a compact status/action region near
the document; no new authoring mode. Readiness/impact details use progressive
disclosure with links to the owning section. Final is a Chapter-level ordered
review, not a new video editor. Export lists distinguish available image numbers
from unavailable source slots; missing items never look like successful references.
No silent autosave to server or AI rewrite is introduced.

Recovery limits are centralized in `RECOVERY_LIMITS` in the owning state hook:
12 documents per actor, 600,000 serialized characters, seven-day retention. Do not
evict another unsaved document to make space. Small Shot bindings/timeline numbers
are allowed; images, blobs and arbitrary provider payloads are not. A browser
recovery is not a server backup or a multi-tab collaborative editor.

Default Chapter Final is the ordered review. The previous timeline editor remains
an explicit action at `?editor=timeline`; its trim draft also uses recovery. Clip
downloads retain original bytes; displayed usable ranges do not imply trimming
or concatenation has run. No post-processing service is activated.

## Ownership, Compatibility And Rollback

- Writer state: existing Cinematic components/state and shared actor storage.
- Source readiness: existing project/Shot DTO plus canonical compiler/reference
  owner. No separate workflow/service for queue or generation.
- Portable references: CinematicVideoReferencePlanService behind
  CinematicApplicationService.exportShotWriter, existing authenticated media API.
- Final: existing Finish/Produce runtime, clip bundle and timeline facade.
- Additive optional DTOs/keys only; old projects, Take snapshots and assets stay
  readable. Rollback hides new presentation, not deletes saved work or revisions.
- No runtime storage path, media publishing policy, Credit rule or provider model
  is changed. No new cache/poller; recovery is actor/project/document scoped and
  bounded, with explicit removal and stale-source check.

## Delivery And Verification

Ordered task/evidence packet:
[015 implementation and UAT](tasks/015-cinematic-flow-hardening.md).
Each slice runs focused isolated tests before the next. Aggregate is explicit and
must not start paid generation, mutate live data or restart workers. Live provider
quality and paid flow UAT require the user to initiate them separately.
