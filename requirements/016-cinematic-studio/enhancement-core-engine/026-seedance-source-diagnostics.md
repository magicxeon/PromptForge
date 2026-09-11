# Approved Storyboard And Seedance Source Diagnostics

Date: 2026-09-11. Status: implemented; automated checks passed; visual UAT pending.
Primary: Generative Cinematic Production Director; UX and QA review sequentially.
Owner: Cinematic Produce presentation, existing Generation source/capability rules.

## 1. Evidence And Boundaries

The latest local Project has five approved Seedream 5.0 Pro Storyboard sources.
Read-only source validation with the current capability registry accepts its
first approved source for Seedance 2.0 Mini/Fast/standard and 2.5. Seedance
1.0/1.5 rejects a person reference with
video_provider_portrait_authorization_required. Approval is a creative decision,
not provider authorization. User subsequently confirmed they had forgotten to
select Seedance 2.5. Their exact previous model was not specified. Existing
approved sources can be retained; no source or authorization fix is required.

No paid generation, provider moderation call, Credit write, runtime migration,
automatic model switch, source replacement or approval bypass is authorized.
Keep source integrity, owner/scope, expiry, provider restrictions and quote gates.

## 2. Accurate Recovery Presentation

- Distinguish provider portrait authorization from rejected provider attempts
  and a trusted-source verification failure. Do not label every preflight failure
  as invalid Seedream provenance.
- Show selected model and the actual sanitized quote error/code in the main
  alert, not only the distant Engine panel. Preserve provider request ID and
  confirmed refund information for dispatched attempts.
- Portrait authorization recovery tells the user to select a compatible Video
  model; do not send them to regenerate an already valid Storyboard. Model
  choice remains explicit in the existing Engine control.
- Include trusted-source-unavailable errors in the source alert and expose the
  server message without dumping arbitrary error details or private URLs.
- Keep the approved preview, model preference, shot queue, prompt, loading and
  pricing behavior unchanged. No automatic generation after recovery.

## Ordered Tasks And Checks

1. Record read-only evidence and trace the failing capability gates. Complete.
2. Implement localized, cause-specific Produce alert and action routing.
3. Extend Produce runtime tests: authorization versus source versus moderation,
   selected model, specific error, no regeneration/submit, explicit model retry.
4. Extend the existing directed-openings runner with a focused source-ui group;
   run relevant Generation transport/registry and Produce UI regressions, types,
   i18n parity and diff checks. Verify alert layout at 390/820/1440px where possible.
5. Record remaining live-model diagnosis and provider UAT separately.

No new runtime state, service, storage, endpoint or polling owner. No file moves.

## Evidence And Handoff

- Tasks 1-3 implemented: distinct authorization title, selected model, visible
  sanitized error/code, no regeneration suggestion for portrait authorization.
  Existing model selector requotes only after explicit selection. Tests preserve
  the approved preview, prevent auto-submit, and clear the alert on a valid quote.
- Focused runner: `node scripts/test-cinematic-directed-openings.mjs source-ui`
  (21 tests). Registry/Generation regression: `node --test
  test/videoCapabilityRegistry.test.js test/videoGenerationApplicationService.test.js`
  (32 tests). TypeScript and `node scripts/validate-i18n-catalogs.js` passed.
- Scope is existing alert presentation and localized text only. Existing
  responsive alert grid/wrapping CSS is unchanged; new browser screenshots were
  not captured this round. Visual review at 390/820/1440px remains UAT.
- Review was sequential UX/QA by the implementing agent, not independent.
- No server rule, provider dispatch, Credit policy, stored approval or original
  file was changed. Local source diagnostics used stubbed Credit/preflight
  dependencies and read-only source data; no paid provider call was made.
- Live UAT: explicitly select Seedance 2.5, wait for a fresh estimate, review it
  and manually Generate. Provider moderation can still reject an eligible image.
