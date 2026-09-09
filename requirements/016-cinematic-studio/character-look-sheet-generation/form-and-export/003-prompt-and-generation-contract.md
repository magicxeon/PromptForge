# 003 Prompt And Generation Contract

2026-09-09: [023 Editorial Pattern](023-editorial-pattern-contract.md) supersedes
this baseline's five-view-only/no-generated-text rules for document preset v2.
The separate approved Character Look recipe described below remains unchanged.

Planned scoped exception: [011-016](011-momelo-enhancement-master.md) define optional
paid Momelo Enhancement in Playground Look Sheet. The no-auto-paid-refinement rule
still holds: only an explicitly quoted/confirmed separate text operation may run.
Existing generation-time refinement stays disabled; no implementation in this update.

ID: CLSFE-003. Status: baseline implemented; remaining acceptance checks tracked in PLAN.
Owner: Generation, using Character Profiles definition/identity policy.

## Compatibility Baseline

Current `character-looks/look-sheet.v2.json` generates front/side/back plus a
neutral face and explicitly excludes text, expressions, props and scenery.
It is used by CharacterLookService for a pinned Character/Look Version.
Do not edit that recipe into the new document format or send fake Profile,
Look or sceneTemplateSnapshot identifiers to satisfy its authorization.

Introduce a distinct versioned preset/recipe under the same canonical prompt
recipe capability. Extend GenerationApplicationService and generationRequestService
to consume the validated definition, resolving final prompt in the existing
compiler. Entry surface stays Playground or Studio; provider dispatch remains
through the existing image Generation operation (not a new media API/queue).
Do not classify a standalone sheet as an approved Character Look.

## Conditional One-Image Output

After D-01 confirmation, initial recipe requests ONE image with five views of
ONE character: complete front, three-quarter, side, back and head/shoulders.
Maintain consistent intended age, facial identity, proportions, hair and one
outfit. Use plain background, legible scale and complete figures without
accidental cropping. Views are not five billable output images.

No logo, generated name/age text, story-specific background or extra people.
The Download renderer writes the document header/footer outside original pixels.
It does not need AI to leave a precise empty margin. Expressions, separate
wardrobe assets and detail grids are deferred, not silently generated or charged.
One-image layout is visually qualified, NOT a deterministic internal slot map.
Never use the legacy crop manifest to extract supposed slots from this new sheet.

## Prompt Authority

| Concern | Source |
|---|---|
| Identity/age/body/ethnicity and distinctive features | Authorized pinned Character when selected; otherwise explicit normalized user definition |
| Outfit | Permitted explicit outfit or visible resolved default; selected styled-character preservation wins |
| Role/personality | Bounded user situation/personality, subordinate to identity |
| Pose/background/lighting/layout | Versioned sheet recipe, not hidden cinematic camera motion |
| Printed name/age/notes/logo | Export metadata and renderer, not image-model typography |

Form inputs are the only editable source; prompt preview is read-only and comes
from the same normalized compilation. Do not open the existing diagnostic
prompt-preview gate globally or disclose private reference prompts. If a normal
user projection is needed, extend the owning facade with a sanitized preview.
No auto paid refinement/analysis. Preserve Natural Realism's current surface
scope and age locks; do not enable its global toggle in Playground as a side effect.

## Lifecycle And Cost

```text
Form -> authorized definition/reference plan -> canonical final compilation
     -> existing estimate -> explicit Generate -> reserve -> Queue/provider
     -> existing Job status/terminal settlement -> History + immutable snapshot
     -> explicit Download -> separate derived document (no provider call)
```

The quote and submitted request bind definition/defaults, recipe/version,
reference fingerprint/count, provider/model, dimensions, output count and surface.
Server validates submitted values again. Reusing an idempotency key with changed
inputs conflicts. Duplicate submission must not cause duplicate charge/dispatch.

Use catalog capability/price/availability gates. Do not hard-code Seedream,
model prices or unsupported aspect ratios. Portrait 3:4 is a target only when
the selected model supports it; quote actual model-supported dimensions.
1536x2048 in the technical proposal is an export layout target, not permission
to submit that size to every model or alter Generation pricing.
Expose the new preset through the existing server-owned feature/capability policy
only after its qualification gate; a query-string URL cannot bypass a disabled
preset. Do not create a UI-only switch that permits requests the server forbids.

Generation failure follows existing refund/terminal policy. A bad-looking but
successfully returned sheet needs explicit retry and a new displayed quote;
no free automatic regeneration promise. Export failure never changes completed
Generation settlement or retries the provider.

## Tasks

- [x] GEN-01 Resolve D-01 and pin new preset/recipe version and output strategy.
- [x] GEN-02 Add strict definition normalization and canonical compiler mapping.
- [x] GEN-03 Wire authorized reference identity and existing model capability gates.
- [x] GEN-04 Extend quote/submit fingerprints and immutable result metadata.
- [ ] GEN-05 Add pure and isolated pipeline tests for parity, duplicate/stale input,
  insufficient credit, failure, actor scope and old recipe compatibility.
- [ ] GEN-06 Record owner-approved live image visual UAT separately, never in tests.

## Acceptance

GEN-A1: output count matches price, Queue request and stored result.
GEN-A2: prompt includes intended age/identity without conflicting legacy recipe.
GEN-A3: changing definition/reference/model requires a new matching quote.
GEN-A4: legacy Character Look, ordinary Image, Scene and Video compile unchanged.
GEN-A5: no reference transport, trust gate or signed source byte is modified.
GEN-A6: original snapshot survives resume; Export is not another Generation.
Groups: `prompt`, `generation`, `privacy`, `compatibility`; manual image UAT in [009](009-verification-and-release.md).
