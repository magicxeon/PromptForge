# 014 - Luna AI Prompt Refinement Provider

**Status:** Implemented; validation pending
**Owner:** Generation capability
**Provider adapter:** `server/providers/OpenAITextProvider.js`
**Initial model:** `gpt-5.6-luna`
**Related requirement:**
`../../013-implementation-fashion-blueprint/010-professional-scene-builder-guided-experience.md`

## 1. Objective

Add an optional text-only Prompt Director that refines the canonical Momelo
image prompt immediately before generation. Its purpose is to improve physical
coherence, photographic realism and natural language flow without changing
identity, wardrobe, pose, framing, environment, lighting or output decisions
already owned by structured attributes and references.

The deterministic compiler remains mandatory and remains the fallback. Luna is
an enhancement stage, never the source of business rules.

## 2. Canonical workflow

```text
structured selections and references
  -> canonical deterministic compiler
  -> optional Luna refinement
  -> refinement validation
  -> provider-specific image request
  -> queue/history evidence
```

Single generation and Comparison must call one Generation-owned refinement
entry point. React routes, HTTP routes and image providers must not call Luna
directly.

## 3. Ownership and files

```text
server/providers/OpenAITextProvider.js
  OpenAI Responses API transport, timeout and Structured Output parsing

server/config/prompt-refinement-policy.js
  env configuration and safe public availability

server/domain/generation/PromptRefinementService.js
  opt-in decision, structured request, validation, fallback and diagnostics

server/domain/generation/GenerationApplicationService.js
  canonical workflow entry point used by normal and Comparison generation

web/src/components/generation/EngineTargetPanel.tsx
  reusable user-facing toggle

web/src/features/generation/
  actor-scoped preference and request contract
```

## 4. Configuration

```dotenv
ENABLE_AI_PROMPT_REFINE=false
PROMPT_REFINEMENT_MODEL=gpt-5.6-luna
PROMPT_REFINEMENT_REASONING_EFFORT=low
PROMPT_REFINEMENT_TIMEOUT_MS=30000
PROMPT_REFINEMENT_MAX_OUTPUT_TOKENS=1800
PROMPT_REFINEMENT_AUDIT_MAX_FILES=500
LOG_AI_PROMPT_REFINE=false
```

- `ENABLE_AI_PROMPT_REFINE` is the server rollout gate. The UI toggle is hidden
  when it is false or the OpenAI key is unavailable.
- The customer toggle is opt-in and actor-scoped. Server availability never
  silently enables it for a user.
- `LOG_AI_PROMPT_REFINE` logs before/after prompt text only in non-production
  environments. Normal production logs contain metadata and fingerprints only.
- When raw logging is enabled, `PROMPT_REFINEMENT_AUDIT_MAX_FILES` bounds the
  private per-Job audit directory. Oldest files are removed first.
- The existing `OPENAI_API_KEY` is reused; no secret is exposed to React.

## 5. Provider request

Use the OpenAI Responses API with:

- model `gpt-5.6-luna` by default;
- `store: false`;
- low reasoning effort by default;
- strict JSON Schema Structured Output;
- a bounded output token budget and timeout; and
- no reference images or private binary assets.

Required response shape:

```json
{
  "refinedPrompt": "string",
  "changeSummary": ["string"],
  "warnings": ["string"],
  "preservedAuthorities": ["string"]
}
```

The instruction must require one English image-generation prompt and prohibit
new people, garments, props, camera decisions, light sources or environments
that are not represented in the canonical input.

## 6. Failure and safety contract

Refinement is best-effort. Timeout, network error, refusal, malformed schema,
empty output or an invalid prompt returns the deterministic prompt and does not
fail generation or consume another image-generation reservation.

The service must:

1. reject an empty or unreasonably large input before provider dispatch;
2. sanitize context to IDs, modes and reference roles rather than private image
   content;
3. preserve aspect-ratio and mandatory workflow directives;
4. avoid logging raw prompt text unless the explicit local debug flag is on;
5. emit provider/model, latency, status and safe error code;
6. record whether the queued prompt was refined or fallback; and
7. never retry automatically in the first MVP because a retry increases latency
   and text cost while the deterministic fallback is already valid.

## 7. UX contract

Engine & Target Output displays a compact `AI Prompt Refine` switch when the
server feature is available. Supporting text explains that the prompt is
polished before generation while selections remain locked.

- OFF: submit the canonical deterministic prompt.
- ON: call Luna once after Generate is clicked, then enqueue the resulting
  prompt or deterministic fallback.
- While submitting, the existing generation pending state covers refinement
  and queue submission; duplicate Generate actions remain disabled.
- The setting applies once to the shared prompt in Comparison mode, not once per
  comparison slot.

## 8. Initial scope and deferred work

The first implementation receives the canonical compiled prompt plus sanitized
workflow context because the complete semantic-direction-plan implementation in
Requirement 010 is staged separately. Once that plan exists, Luna input must
migrate to it without changing this provider/service boundary.

Not included:

- AI-authored attribute selection;
- image-reference analysis by Luna;
- customer credit billing for text refinement;
- automatic enablement based on provider/model;
- prompt caching before privacy and fingerprint policy is qualified; or
- replacement of deterministic validation.

## 9. Acceptance criteria

- Server-disabled deployments expose no toggle and never call Luna.
- User-disabled requests never call Luna.
- Enabled single generation refines exactly once before enqueue.
- Enabled Comparison refines exactly once for all slots.
- Provider failure queues the deterministic prompt.
- Structured Output is validated before use.
- Actor switching does not leak the toggle preference.
- Before/after text appears only when both debug logging and non-production mode
  are active.
- Each refined or fallback Job writes one private audit file named after its
  Job ID while raw debug logging is active.
- Tests cover config parsing, structured response parsing, fallback, single
  generation and comparison reuse.

## 10. Implementation record

Implemented through the canonical Generation workflow:

- `server/config/prompt-refinement-policy.js` owns rollout, model, timeout,
  token budget and local raw-log policy;
- `server/providers/OpenAITextProvider.js` owns the OpenAI Responses API
  transport and strict Structured Output parsing;
- `server/domain/generation/PromptRefinementService.js` owns sanitization,
  validation, fingerprints, diagnostics and deterministic fallback;
- `GenerationApplicationService.compilePromptForExecution()` is the only
  application entry point used by single and Comparison submission;
- queue/history evidence stores safe refinement metadata with the generation;
- `EngineTargetPanel` exposes the shared switch when public runtime policy
  permits it; and
- `promptRefinementPreference.ts` stores the opt-in setting per actor.

### Private per-Job audit output

Before/after inspection records are written to:

```text
server/data/generation/output/prompt-refinement/<jobId>.json
```

This directory deliberately lives under Generation runtime data rather than
`client/outputs`. `client/outputs` is served publicly by Express, while prompt
audit files can contain private creative instructions and must never be
downloadable by guessing a URL. The directory is excluded by `.gitignore` so
raw customer prompts cannot be committed accidentally.

Each file contains:

- `schemaVersion` and `jobId`;
- request and response IDs;
- provider, model, status, latency and token usage;
- before/after fingerprints;
- Luna `changeSummary`, warnings and preserved authorities;
- `beforePrompt` and `afterPrompt`; and
- fallback error code when applicable.

Single generation writes one file. Comparison writes one file per generated
slot Job using the same shared refinement result, allowing support staff to
trace each resulting image directly from its Job ID. Audit write failure must
warn locally but must not fail or refund an already queued image Job.

Local development currently enables rollout and before/after tuning logs in
`.env`. `.env.example` remains disabled by default for new environments.

## 11. Primary references

- OpenAI Responses API:
  `https://developers.openai.com/api/reference/responses/create`
- OpenAI Structured Outputs guide:
  `https://developers.openai.com/api/docs/guides/structured-outputs`
- GPT-5.6 Luna model reference:
  `https://developers.openai.com/api/docs/models/gpt-5.6-luna`
