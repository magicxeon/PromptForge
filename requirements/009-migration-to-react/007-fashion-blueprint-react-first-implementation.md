# 007 Fashion Blueprint React-First Implementation

**Status:** New feature; implement only in React  
**Depends on:** 001-006 and Fashion Blueprint requirements

## 1. Decision

Fashion Blueprint is not implemented in the legacy client and then migrated.
It is the first new commercial workflow implemented directly in React after
Community/Profile shared components are stable.

Canonical product requirements remain:

```text
requirements/010-implementation-fashion-blueprint/
```

This requirement changes only the client implementation location and reuse map.
Server domain/repository plans in the Fashion requirements remain valid.

## 2. Business Flow

```text
Choose final-look Template
-> choose recommended/My/Community Character
-> upload one or up to five outfits
-> optionally adjust pose/environment
-> choose Simple tier or Advanced settings
-> receive server quote
-> confirm and generate
-> review grouped results
-> download, collect or share
```

Simple Mode must remain understandable without provider or prompt terminology.

## 3. React Feature Owner

Replace the planned legacy `client/fashion-blueprint/` owner with:

```text
web/src/features/fashion-blueprint/
  api/
  routes/FashionBlueprintRoute.tsx
  state/
  schemas/
  components/
    TemplateStep.tsx
    CharacterStep.tsx
    OutfitStep.tsx
    DirectionStep.tsx
    QualityStep.tsx
    QuoteSummary.tsx
    RunProgress.tsx
    FashionResults.tsx
```

Server owners remain under:

```text
server/domain/fashion-blueprint/
server/repositories/fashion-blueprint/
server/app/routes/fashionBlueprintRoutes.js
```

## 4. Reuse Contract

Consume React shared components:

```text
AppShell and Breadcrumbs
MediaCard/MediaStage
CharacterPickerCard
ReferenceSlotGrid/upload adapter
EngineTargetPanel with Comparison disabled
CreditEstimate
GenerationActionBar
GenerationResultSurface primitives
Dialog/Drawer/Stepper/Empty/Error states
```

Fashion owns grouping by product item and shot purpose. It does not fork generic
generation polling, credit display, download or media inspection.

## 5. State

Use a bounded feature reducer/store:

```text
template version
character handoff/version
product items and asset IDs
direction overrides
routing mode/tier
advanced provider settings
quote and expiry
run ID
```

Persist actor-scoped drafts only. Derived output counts and prices come from the
server plan/quote. Any input change that affects price invalidates the quote.

## 6. Uploads

- front required per product;
- back/detail optional;
- one to five products;
- upload through the asset/reference boundary;
- show validation and progress per product;
- persist IDs, not Base64;
- preserve user input when another item fails;
- remove orphan temporary assets through server lifecycle policy.

## 7. Quote and Generation

- server validates template, Character, references and provider capability;
- one quote binds all operation inputs and expires;
- UI shows maximum total before confirmation;
- submission carries quote/estimate IDs and idempotency key;
- partial success is represented per product/shot;
- successful Character usage is recorded once.

## 8. Route Activation

`/create/fashion` remains hidden until:

- all Fashion server contracts exist;
- React route passes E2E;
- quality tier labels/pricing are complete;
- Character and Template pickers have real data;
- bulk and partial failure behavior pass;
- actor switch invalidates draft/quote correctly.

Remove the stale `workflowIntent.mode: "guided"` assumption. Fashion is its own
route and state owner.

## 9. Requirement Updates During Implementation

When implementing, update files under
`requirements/010-implementation-fashion-blueprint/` that still name legacy
client modules. Server and business rules must not be rewritten merely because
the frontend path changes.

## 10. Exit Criteria

- Fashion Blueprint is delivered once, in React.
- Beginner flow has no prompt/provider requirement.
- Advanced flow reuses shared generation controls.
- Quotes, credits and submitted operations match.
- One-to-five outfit runs support partial outcomes.
- No duplicate legacy Fashion page or state exists.

