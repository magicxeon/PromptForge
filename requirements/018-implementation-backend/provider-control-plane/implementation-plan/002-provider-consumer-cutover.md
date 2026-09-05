# Step 2 - Provider Consumer Cutover

**Status:** Complete

## Goal

Apply the shared availability policy to every catalog and new-work entry point
without changing provider adapters, pricing or accepted work.

## Tasks

1. Image Provider Registry filters public catalogs and rejects disabled
   selections.
2. Generation prepared operations re-check availability before reservation or
   enqueue.
3. Comparison supplies `comparison.image` explicitly.
4. Fashion supplies `fashion.image` explicitly.
5. Cinematic Storyboard and Studio resolve stable workflow keys from existing
   surface/mode values.
6. Video Capability Registry filters catalog and validates Playground versus
   Cinematic workflow context.
7. AI Text services assert exact workflow immediately before external calls.
8. Search for direct Provider construction and document accepted-work-only
   exceptions.

## Exit Evidence

- One Provider master command blocks all registered new-work paths.
- Existing Queue jobs and submitted Video tasks continue through their pinned
  adapters.
- Existing capability and pricing errors remain unchanged when no override is
  active.

Verified across the focused Image, Video, Comparison, Fashion, Cinematic and
AI Text tests listed in the owning requirement.
