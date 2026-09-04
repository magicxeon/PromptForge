# Package 004 - Produce, Finish And Export Lineage

**Requirement checkpoints:** Steps 9-10  
**Runtime risk:** Video handoff and final assembly readiness  
**Status:** Complete

## Dependency Order

1. Extend lineage report with approved Storyboard and video source authority.
2. Normalize provider-independent video packet inputs.
3. Reconcile Shot duration with catalog capabilities without silently changing timing.
4. Preserve first/last/reference-frame strategy and audio capability decisions.
5. Link current approved video sources to deterministic timeline entries.
6. Validate order, trim, transition and assembled duration.
7. Compute export eligibility and timeline fingerprint.
8. Keep final assembly qualification and Credits behavior unchanged.

## Stop Gates

- Unsupported duration has a stable recovery decision.
- One stale Shot invalidates only its own video/timeline lineage.
- Existing provider-task polling, failure and recovery remain intact.
- Qualification-only export cannot charge or complete a Project.

## Implemented Evidence

- Produce context compiles one provider-independent execution packet from the
  current Shot, approved Storyboard first frame, Character/Look authority,
  timing, motion, performance, environment, continuity and audio intent.
- Quote and submit require the exact server packet fingerprint and reject a
  browser prompt override before pricing.
- Approved video sources retain packet/keyframe/source fingerprints and render
  duration for downstream reconciliation.
- Finish stores deterministic Shot order, trim, transition, source fingerprints,
  assembled duration and timeline fingerprint.
- Export manifest reads reconcile current source fingerprints again and remain
  qualification-only with no Credit mutation or Project completion.
