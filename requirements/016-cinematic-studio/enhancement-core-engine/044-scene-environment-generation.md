# Scene Environment Image

Status: implemented; offline checks passed, visual UAT pending. Owner: Cinematic Scene, Generation and Reference Processing.

Presentation follow-up: [046](046-storyboard-reference-layout.md) parks the Shot
reference section layout cleanup. It does not change the implemented Scene
selection, gallery, toggle or generation behavior described here.

1. Each Scene exposes Scene environment in Storyboard, before Shot image controls.
   A compact preview and Generate/Edit action opens a shared generation dialog.
   One Scene image is shared across its Shots, not duplicated for each Shot.
2. A large environment prompt controls architecture, street/curb geometry, static
   set dressing, time/weather and motivated lighting. It creates an empty clean
   location with no people, faces, mannequins, text, panels or Look Sheet layout.
   Do not inject character action/timeline into this image. Initial text may use
   existing Scene location/time/art/light fields; manual editing is authoritative.
3. Reuse GenerationExperience, provider catalog, real estimate, yellow processing,
   result review and explicit approval. Generation uses the existing cinematic
   image batch entry point with a scene_environment purpose, not a synthetic Shot
   or another provider dispatch pipeline. New attempts persist in Generation history.
4. Save Scene.environmentPrompt with optimistic Project/Scene versions. Approve a
   completed owner-matched environment Job registered for that Scene. Keep the
   current approved environment until explicit replacement; a failed attempt does
   not remove it. Generated history and reference content remain private/owned.
5. Store an immutable approvedEnvironmentSource on the Scene, and attach its
   stable asset/hash binding as environment_reference for new Shot stills in that
   Scene. Resolve ownership and original bytes before estimate and dispatch. Do
   not repurpose style/pose slots or let environmental reference override Cast.
6. Count the extra reference for the visible attachment count, model selection, pricing and dispatch. If the
   model cannot preserve all references, block visibly; never silently drop one.
   Keep existing previous-Shot style continuity references and Look reference roles.
7. Scene image changes affect future still generations only, not old approved
   keyframes/video fingerprints. Job request provenance records the Scene binding.
   Existing Simple rows/Advanced hierarchy and Season/Chapter records remain intact.
8. No mandatory Scene-image approval gate for existing workflows. No automatic
   Scene generation charge when creating a Shot or submitting a video. Video uses
   the resulting approved Storyboard composition and Looks as before.
9. The shared Generation estimate must display the received image price when
   Enhancement is OFF. An absent optional enhancement fee must not hide that
   estimate. Enhancement ON still waits for its fee; billing remains unchanged.

UI: scoped theme tokens, Lucide icons, localized EN/TH labels, contained previews,
responsive dialog/action areas at 390/820/1440; retain draft/loading/error controls.
Checks: cross-actor rejection, stale version, approved-job binding, preservation,
actual reference order/count/hash parity, environment prompt and new UI actions.

## Project Scene Gallery And Optional Reference (2026-09-13)

Status: implemented; focused offline and responsive UI checks passed, generated
media quality remains user UAT. Extends rules 1, 4 and 5 without another flow.
Primary: Product Requirement Architect; reviewers: UX and QA (including owner
isolation), applied sequentially, not independent agents. Skills: media pipeline,
generative production (preceding Shot 3 fix), product UX and regression review.

1. Display generated environment images, including completed but not yet selected
   results, in the Scene dialog. Select from environment generations registered
   anywhere in this Project, not Look Sheets, Shot frames or another Project.
   List through the existing Asset/Generation read authority, bounded pagination,
   actor-scoped Query keys; no new polling loop or durable browser image cache.
2. Selecting an existing result explicitly sets that Scene's immutable source.
   It may be from another Scene or an older prompt version: this is intentional
   reuse, not automatic approval of a stale result. Revalidate Project membership,
   owner, completed result and bytes server-side. Keep the existing Generate and
   Use-for-this-scene approval path and its prompt-fingerprint protection.
3. Add `Scene.environmentReferenceEnabled`, default true when absent. Show a
   switch and the selected image in Storyboard. OFF retains the selection and
   history but sends no environment binding; ON reuses the saved selection.
   Choosing an image enables its use. No source means no extra reference.
4. Show the same control in the Shot image workspace, so selection/disable is
   reachable beside its references. Scene-wide choice applies to future stills
   in both Simple and Advanced, including Generate All. Quote/reference count
   and submission use the same context; stale submitted bindings still reject.
5. Persist selection/switch through version-checked Cinematic commands. Preserve
   all Shot fields, old stills, Takes, approvals, other Scene choices and saved
   plans. No automatic image/video generation, charges, deletion or public reuse.
   Environment-only commands increment Project.version, not the authored
   Scene.version: preparing a still reference must not change an existing video
   packet fingerprint. Project optimistic version and prompt/hash checks remain.
6. Reuse contained authenticated previews, shared buttons, yellow spinner and
   localized EN/TH controls. Responsive thumbnail gallery, selected indicator,
   empty/error/retry and load-more controls; keep existing prompt/draft guards.

Plan and evidence: 045, follow-up section. No new runtime store or migration.
