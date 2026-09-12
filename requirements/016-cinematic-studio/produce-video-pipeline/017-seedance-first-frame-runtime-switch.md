# Seedance First Frame Runtime Switch

Status: implemented; false/true policy, no-Cast route and legacy enabled-path tests
passed 2026-09-12. Runtime needs a server process started with the updated .env.
Owner: Generation capability policy, consumed by Cinematic and Playground.
This is a local product restriction requested by the user, not a universal claim
that ModelArk never supports First Frame images.

## Contract

1. Add a server-owned environment switch SEEDANCE_FIRST_FRAME_ENABLED=false in
   local .env and the appropriate tracked environment example during implementation.
   Default false when absent. Keep independent from existing provider activation
   and pricing switches. Do not add POC terminology or notices to the UI.
2. Apply to Seedance models in the provider catalog across Cinematic and Playground.
   Keep other providers unchanged. When false, no First Frame may enter quote or
   submit, whether role=first_frame or a Storyboard/opening_frame reference embedded
   in multimodal input. Server enforcement is required; hiding a control alone is
   insufficient. Preserve ordinary reference-image arrays and Look Sheets.
3. Expose the effective policy through the existing public capability catalog.
   UI disables First Frame without disabling Generate for an otherwise valid
   Look Sheet request. No client-side duplicated model table or environment read.
   In Playground one general Start image can remain a reference_image on models
   that support that mode; label it as a reference, not as an active First Frame.
4. Existing saved Shots/images are preserved. Show the effective reference mode
   before quoting and generation; never silently remove a frame at dispatch.
   Saved quotes or requests using the now-disabled route must be invalidated with
   an actionable policy error before reservation. Pending accepted tasks continue
   observation/settlement; do not cancel or reinterpret their stored inputs.
5. Storyboard still generation, stored approvals, image downloads and later reuse
   remain available. The flag only disables supplying First Frame to Seedance
   video; it does not disable Seedream image generation or delete an approved still.
6. With Cast: prepare eligible selected Look Sheets through the existing resolver,
   including authorized local-file fallback, ownership, expiry and hash rules.
   Without Cast: never fabricate a Character or require an irrelevant Look Sheet.
   Use text-to-video only when the catalog supports it and the canonical Cinematic
   workflow is ready; otherwise explain the compatible model/mode requirement.
   Current looks_only requires Cast, so this no-Cast contract must be explicitly
   completed and tested, not assumed from a provider's text-to-video capability.
7. Restore First Frame capability after enabling the flag and restarting the
   server, without automatically selecting it or dispatching any stored request.
   Render the effective mode consistently in preview, quote, packet and payload.

## Acceptance

Switch false/absent/true; stale open tab and stored quote; all Seedance catalog
variants, a non-Seedance control model, raw first_frame and disguised opening
reference requests; one/multiple general images, one/multiple Looks; no-Cast Shot.
No forbidden frame in submitted payload, no invalid reservation, no image deletion,
no duplicate dispatch and no suppression of already accepted task status.

## Rollout

Update .env only during implementation, never commit secrets. Document the new
key in the canonical tracked example and owning config. Restart only after active
work is accounted for. No bulk rewrite of live Projects. Tests use isolated env
fixtures and mocks; live paid Seedance attempts remain user-controlled.

## Sketch Composition Extension (2026-09-12)

Enhancement-core-engine/031 adds a distinct approved sketch composition path.
An immutable, owner-verified Asset with server-derived `concept_sketch_v1`
provenance may use `sketch_composition` as a `reference_image` on a compatible
multimodal model while the First Frame flag is false. It is not an immutable
opening frame: the video must render photoreal live action from its composition.
Character Look Sheets follow separately with unchanged identity/trust rules.
Client labels cannot grant this exception. Old photographic Assets and disguised
opening_frame/storyboard_opening requests remain blocked. Reference counts, source
verification, quote parity and existing Credit lifecycle apply before dispatch.
This extension does not toggle .env or promise provider acceptance.
