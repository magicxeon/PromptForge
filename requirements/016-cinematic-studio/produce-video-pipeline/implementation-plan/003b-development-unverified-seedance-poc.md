# Package 003B - Development Unverified Seedance POC Override

**Plan ID:** `016-PVP-IP-003B`  
**Status:** Development implementation complete; live POC evidence pending  
**Parent:** `003-seedance-first-frame-vertical-slice.md`  
**Scope:** Development-only POC exposure; not provider qualification or paid launch

## 1. Objective

Allow all configured ModelArk Seedance versions that advertise first-frame
capability to appear in Cinematic Produce for temporary image-to-video POC
testing. The canonical catalog remains conservative. Runtime must label every
overridden combination as unverified, charge exactly one test Credit through
the existing Credits lifecycle and remain impossible to enable in production.

## 2. Runtime Switches

```text
CINEMATIC_VIDEO_POC_ENABLE_UNVERIFIED_SEEDANCE=true
CINEMATIC_VIDEO_POC_CREDITS=1
```

Rules:

1. The override is active only when the enable flag is exactly `true` and
   `NODE_ENV` is not `production`.
2. Production ignores the flag and retains the canonical qualified catalog.
3. Credit value is server-owned, integer, bounded to 1-10 and defaults to 1.
4. Changing either flag requires a server restart.
5. Disabling the flag immediately restores the original model input modes.

## 3. Capability Override

1. `VideoCapabilityRegistry` remains the sole capability owner.
2. Do not mutate `cinematic-video-models.json` to claim qualification.
3. Build an effective runtime model only for ModelArk Seedance rows with
   `testingRoutingEnabled: true` and `supportsFirstFrame: true`.
4. Add `image_to_video` only when absent; preserve durations, resolutions,
   audio modes, reference count and commercial operations already in catalog.
5. Apply conservative image MIME, size, dimension and aspect bounds when an
   overridden model has no qualified reference constraints.
6. Project `developmentPocUnverified`, `developmentPocCredits` and a stable
   warning code through catalog, selection, quote, task and Cinematic attempt.

This override does not enable last-frame, video edit, extension, batch or final
assembly behavior.

## 4. Financial Contract

For an overridden model in Cinematic Produce:

1. Quote shows exactly the configured test Credit charge.
2. Provider-cost evidence remains in the estimate breakdown but does not set
   the user charge.
3. Submit reserves one Credit through `CreditReservationService` before the
   provider side effect.
4. Successful durable output captures once.
5. A known non-billable provider rejection refunds once.
6. Ambiguous provider state remains reserved and enters reconciliation.
7. Idempotent replay cannot reserve, capture or refund twice.

Existing qualified no-charge runs and ordinary paid/Playground pricing remain
unchanged.

## 5. UX Contract

- Mark overridden models as `Unverified POC` in the shared model selector.
- Show a visible warning that first-frame payload, quality and provider price
  are not qualified and that the displayed test Credit will be charged.
- Keep the yellow render signature, exact quote and existing Generate consent.
- Do not describe the model as qualified, production-ready or price-verified.
- Preserve current desktop, tablet and mobile Produce layout.

## 6. Data And Recovery

Persist on the provider task and Cinematic attempt:

- model/provider and effective input mode;
- POC warning marker and test Credit value;
- quote, reservation, task, settlement and output Asset IDs;
- packet/reference fingerprints and technical probe status.

Recovery continues polling the original provider task. The override must never
create a second provider route or bypass current source/packet/probe gates.

## 7. Required Follow-Up Qualification Per Model

Before removing the POC marker or enabling normal pricing, verify:

1. account entitlement, exact endpoint, region and model ID;
2. accepted first-frame payload field, role and image delivery format;
3. duration, resolution, aspect-ratio and audio combinations;
4. reference count, MIME, file-size and dimension limits;
5. provider pricing metric, rate, usage response and rounding;
6. first-frame fidelity, identity, wardrobe and environment continuity;
7. motion adherence, camera behavior and unacceptable drift cases;
8. output URL lifetime, polling states, timeout and safety responses;
9. durable copy, poster, codec, dimensions, duration and audio probe;
10. retry, duplicate submission, Credit settlement and reconciliation;
11. three rights-cleared live cases required by `../004`;
12. explicit Commercial and QA approval before paid exposure.

## 8. Verification

- toggle off hides overridden I2V combinations;
- toggle on exposes all configured first-frame Seedance versions in Produce;
- production mode ignores the toggle;
- quote/submit parity includes the POC marker and one-Credit value;
- success captures one Credit once; known failure refunds once;
- unverified warning renders in the shared selector and Produce panel;
- existing Seedance 1.0 no-charge qualification behavior is unchanged;
- protected Generation, Credits, Cinematic and Web tests pass;
- JSON parsing, production build and `git diff --check` pass.

## 9. Stop Gate

POC output is evidence, not qualification. Package 003 remains open and
Package 004 remains blocked until the required live records are reviewed and
the canonical model combinations are updated deliberately.

## 10. Implementation And Verification Record

Completed on 2026-09-04:

1. Added the non-production runtime override in `VideoCapabilityRegistry`;
   the canonical provider catalog remains unchanged.
2. Bound the POC marker and configured Credit value through capability,
   quote, reservation, provider task, Cinematic attempt and lineage records.
3. Reused the normal Credit reserve, capture, refund and reconciliation path;
   no provider or Credit side path was introduced.
4. Added an `Unverified POC` model suffix and visible warning to the shared
   Video Engine and Target Output component in English and Thai.
5. Confirmed the running development catalog exposes seven Seedance models;
   Seedance 1.5, 2.0 and 2.5 rows expose temporary first-frame mode and one
   test Credit while existing Seedance 1.0 qualification rows are unchanged.
6. Server Generation, Credits, Cinematic, media and provider regression suite:
   105 passed.
7. Web regression suite: 104 files and 393 tests passed.
8. TypeScript and Vite production build passed.
9. Translation catalog validation and `git diff --check` passed.
10. Browser checks passed at 1440px and 390px. The POC label and resolved
    one-Credit warning remain visible with no document or panel overflow.

No live provider request was submitted during implementation. The current
sample Project may still block quoting when its approved keyframe or packet is
stale; that existing authority gate is intentionally not bypassed by this POC
toggle. A rights-cleared current Storyboard source is required before collecting
the live qualification evidence in Section 7.
