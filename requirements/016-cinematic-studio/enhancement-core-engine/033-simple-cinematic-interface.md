# Simple Cinematic Interface

Owner: existing Cinematic mode simple/advanced, Project setup and production facade.
Simple is default for new users/Projects; existing saved Advanced choice retained.
Same Project/data and AI recipes in both modes. Switching mode cannot clear input,
generate, approve, charge, replace Cast or reset selected Takes.

Simple setup exposes story prompt, duration, format and an optional title. Derive
a bounded editable title for blank-title creation. Tone/country and Cast settings
are optional disclosures. Enhancement uses all saved fields and existing preview/
apply/price handling. Technical camera/light/performance remain in Advanced data.
Simple stages prioritize story, visual review and production with next action;
avoid asking users to fill every structured Shot field. Preserve direct access
to Cast, Storyboard, Takes/export and Series controls through existing stages.
Generation still presents cost and consent; never hide errors or fabricate progress.
Prompt-only entry is allowed. Missing required Character authority must be surfaced
as a clear next action, not bypassed or silently generated at extra cost. Automatic
look generation remains a separately confirmed operation in its existing owner.
Advanced stays fully functional, same stored recipe output, errors and navigation.
Tests: mode toggle preserves draft; prompt-only setup continuation; no auto AI;
existing Advanced controls and role constraints. EN/TH, mobile/tablet/desktop.
Status: implemented as progressive authoring; offline tests/visual checks passed.
Live AI quality and end-to-end pilot remain manual UAT.

## Ordered Tasks

1. Done: minimal Setup brief, duration and platform; optional title, country/Genre/
   feeling/pacing and creative direction in a disclosure. Retain Save and Enhance.
2. Done: Prepare film uses the existing role-analysis endpoint when roles are absent,
   derives an editable title, saves through the existing Project facade, then opens
   Cast. No separate AI, queue, prompt compiler or Credit service is introduced.
   Duplicate preparation is guarded; actor changes discard stale results. Errors
   preserve the draft, pending uses ProcessingSpinner and disables form controls.
3. Done: Story Plan Simple displays Scene summaries; existing Generate Plan completes
   the same structured direction and existing approval remains required. Advanced
   keeps Beat/Scene editing. Produce collapses detailed direction while retaining
   media, Dialogue/Sound, price, reference selection, Generate, Takes and downloads.
4. Done: Simple/Advanced share the same draft/Project. No generation, approval or
   charge occurs on mode switch. Existing Cast and Series entry points remain.
5. Passed: nine Setup tests, Produce regression group, typecheck; EN/TH browser
   screenshots at 390/820/1440 and mode round-trip without losing the brief.

## Explicit Boundary

This is prompt-only entry with guided production, not an unconfirmed one-click
paid movie. The user still chooses authorized Look Sheets for visible Cast,
reviews Story Plan/Sketch and confirms video costs. Automatic paid Character
creation, automatic paid whole-film rendering and automatic approvals are not
part of this implementation. Do not advertise those capabilities as completed.
