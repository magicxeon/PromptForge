# Phase 2 Fashion Routing Qualification And Promotion

**Status:** Proposed - Req 009 commercial follow-up  
**Source baseline:**
`../020-generation-providers/qualification/001-fashion-model-qualification-and-routing.md`
**Dependencies:** Fashion Blueprint MVP qualification gate, Reference Processing,
Template Pose Proxy, credit quote integrity, durable jobs and support tracing

## 1. Purpose

The Fashion Blueprint MVP has a working server-owned qualification gate, an
approved Pose Proxy cache and one qualified single-stage Simple route using
`gemini-3.1-flash-image`. This requirement owns the qualification and promotion
work that should not keep the prototype requirement open indefinitely.

The commercial platform must distinguish between:

```text
MVP baseline
  one fixed qualified Simple route
  one qualified proof output
  no automatic cross-provider fallback

Commercial promotion
  repeated benchmark evidence
  separately qualified Premium route
  optional two-stage prepared-look orchestration
  margin-aware routing changes
```

No candidate becomes customer-facing merely because its provider accepts image
references or because it passed one manually selected image.

## 2. Carried Work From Fashion Requirement 009

### 2.1 Repeat the qualified Gemini Flash baseline

Run two additional end-to-end fixtures so the qualified route has evidence from
at least three different combinations in total. Each fixture must use a
different Fashion-ready Template and approved Pose Proxy, Character, Outfit,
and meaningful pose or scene composition.

Record the immutable Template version, Pose Proxy ID, Character version, Outfit
asset IDs, quote ID, Fashion run ID, operation ID, Job ID, provider/model,
strategy version, credits, latency, returned dimensions and reviewer scores.

Immediate rejection remains:

- identity or Outfit fidelity below `4/5`;
- Template identity leakage;
- visible Proxy/wireframe;
- multiple people, multiple views or a contact sheet;
- unrecovered provider failure in more than one of two controlled attempts.

### 2.2 Freeze the first Simple routing matrix

Until additional models qualify:

| Customer tier | Commercial policy |
|---|---|
| Draft/Proof | One output using the same qualified final model as Selling Quality |
| Selling Quality | Fixed `gemini-3.1-flash-image` route |
| Premium Campaign | Hidden or unavailable unless a separately benchmarked Premium route is approved |

Prompt wording alone must not imply that Premium uses a materially better model
when it resolves to the same route. If Product intentionally sells a different
service level using the same model, the additional deliverables, review or
output scope must be explicit and priced as operations rather than described as
better model quality.

Simple routing remains fixed and versioned. Automatic cross-provider
optimization is outside the first paid MVP.

### 2.3 Keep candidate models isolated

Current experimental candidates include Gemini Pro, GPT-Image 1.5, GPT-Image 2
and Seedream 5 Pro. Failed and operation-only models remain governed by the
qualification configuration from Requirement 009.

- Gemini Pro retains `experimental` status until its application request
  reproduces the successful manual authority-order test across the benchmark
  fixtures.
- GPT-Image 1.5 requires repeat evidence with accessory suppression.
- GPT-Image 2 requires Outfit-fidelity improvement before another promotion
  review.
- Seedream final-composition candidates require complete footwear and
  commercial-polish acceptance.
- Grok and failed Seedream routes must not be automatic Simple fallbacks.

Advanced Mode may expose an allowed experimental route only with an explicit
Fashion warning and without a fidelity promise.

## 3. Optional Two-Stage Promotion Gate

The current MVP operation is:

```text
Pose Proxy + Character + Outfit -> final Fashion image
```

The prepared-look experiment is a separate future route:

```text
Stage 1: Character + Outfit -> identity-safe prepared look
Stage 2: Prepared look + Pose Proxy -> final composition
```

Two-stage orchestration is not required to keep the accepted single-stage MVP
available. It may be promoted only when it demonstrates a material fidelity or
repeatability improvement and implements all of the following:

- separate immutable operations and Job IDs;
- quote allocation and maximum credit for both stages;
- lineage from final output to both intermediate inputs;
- private intermediate-asset visibility;
- retry and partial-failure behavior per stage;
- capture/refund reconciliation without double charging;
- restart recovery through durable jobs;
- retention and deletion policy for prepared-look artifacts.

The two-stage route must be benchmarked against the qualified single-stage
baseline using the same fixtures. Added cost and latency must be justified by a
measurable quality gain.

## 4. Pricing And Credit Boundary

This requirement evaluates provider cost, operation count, latency and margin
as qualification evidence. It does not own customer-facing credit typography,
denomination or package copy.

The local MVP Credit presentation and Fashion quote separation were accepted in
`../013-implementation-fashion-blueprint/010-professional-scene-builder-guided-experience.md`.
Future customer package presentation belongs to Phase2-08 and the existing
Fashion quote surface; commercial ledger economics remain owned by Phase2-07.
A display-unit change must never rewrite provider pricing in React, mutate a
pinned Template use-session price or change previously accepted ledger entries.

## 5. Promotion Workflow

```text
register experimental candidate
-> verify exact provider capability
-> bind versioned prompt strategy
-> create fixed benchmark quotes
-> execute repeated fixtures
-> review visual and operational evidence
-> calculate margin and latency
-> approve or reject promotion
-> publish a new qualification/routing policy version
-> invalidate stale quotes
-> observe canary traffic
-> retain rollback to the previous fixed route
```

Qualification and routing policy updates are server-owned configuration
changes. React consumes sanitized availability and customer labels only.

## 6. Production Data And Support

Production migration must persist benchmark and promotion evidence in durable
storage rather than editing runtime JSON manually. Support lookup must connect:

```text
qualification policy
-> routing decision
-> quote
-> Fashion run/operation
-> generation Job/provider request
-> credit reservation/capture/refund
-> output and reviewer decision
```

Normal logs must not contain raw reference images, Base64 payloads or private
prompts. Correlation and recovery follow Phase2-18 and the platform tracing
requirement.

## 7. Implementation Sequence

1. Freeze the current qualified single-stage route and hide unsupported Premium
   claims.
2. Execute and record the two remaining Gemini Flash benchmark fixtures.
3. Add a durable commercial benchmark evidence contract during database
   migration.
4. Re-test candidates one at a time using their provider-specific skill.
5. Promote a Premium route only after repeated visual, cost and reliability
   acceptance.
6. Evaluate two-stage orchestration against the baseline only after durable
   operation and credit recovery are available.
7. Add canary monitoring and rollback before enabling any dynamic routing.

## 8. Acceptance Criteria

- The qualified Gemini Flash baseline has at least three independent fixture
  results with complete lineage, scores, credits and latency.
- Draft/Proof remains a reduced commitment, not a lower-quality model.
- Selling Quality resolves only to a currently qualified fixed route.
- Premium is hidden until its materially different service or route is
  validated and accurately described.
- Experimental, operation-only and failed statuses cannot leak into Simple
  fallback behavior.
- Two-stage generation is not described as production-ready until its quote,
  lineage, recovery and comparative benchmark gates pass.
- Promotion publishes a new versioned policy and invalidates incompatible
  quotes.
- Provider/model pricing remains server-owned and customer credit presentation
  remains separate from qualification evidence.
