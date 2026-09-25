# 002 - GPT-6 Sol Text Model Migration

Status: implemented; live model-access validation pending. Owner: Generation text provider configuration. Reviewers: Commercial integrity (billable Look Sheet enhancement), QA. This extends the existing OpenAI Responses adapter; it does not add another text workflow.

## Outcome and scope

Use `gpt-6-sol` for new OpenAI text operations: Cinematic story/plan/scene/shot and wardrobe authoring, attribute localization, prompt refinement, and billable Look Sheet prompt enhancement. Keep `gpt-6-luna` configured as a standby model for deliberate future selection only; it must not become an automatic fallback. Existing Gemini transient fallback, rollout gates, caller-specific reasoning/timeout/token budgets, provider request schemas, and historical quotes/results remain unchanged.

The current local `.env` explicitly pins Prompt Refinement to the previous model, so update that one model setting as part of the local rollout. Other user-set model overrides remain supported. This migration does not change image/video models, enable disabled features, start paid requests, or rewrite historical artifacts.

## Contract and financial rules

1. The existing `OpenAITextProvider` continues to send structured requests to `/v1/responses` with the selected policy model. Both new model IDs support this endpoint, Structured Outputs and the existing reasoning efforts per official model documentation.
2. Canonical server configuration exposes Sol as active and Luna as standby. Cinematic's versioned text policy and example environment values agree with the active model. A caller's explicit environment override remains authoritative.
3. Look Sheet enhancement quote, immutable reservation, provider request, settlement evidence and refund must agree on `gpt-6-sol`. Update the versioned text-enhancement rate using official Sol text-token rates; do not edit already issued quotes or ledger entries. A stale quote for another model fails closed under the existing policy check.
4. Preserve current permission, idempotency, recovery, prompt logging and Gemini fallback behavior.

## Implementation plan and acceptance checks

1. Verify Sol/Luna model IDs, Responses compatibility and Sol input/output/cached-input prices in official OpenAI docs. Confirm the existing call sites and any environment pins.
2. Update the shared active/standby model configuration and OpenAI text defaults, Cinematic policy and `.env.example`; update the one local model pin without touching secrets. Verify no active text default still selects the previous model.
3. Version the billable Look Sheet enhancement pricing snapshot for Sol, retaining old historical quote snapshots. Test model mismatch rejection, estimate arithmetic, reservation/settlement and no double charge.
4. Run focused policy, provider-payload and enhancement tests only, plus JSON and diff checks. Do not run a live API request or broad UAT. Record project model-access and real-response validation as unverified until a user-authorized live request.

Focused runner: `node scripts/test-text-models.mjs policy`, `provider`, or `billing`; `all` explicitly runs their union. These checks use mocked provider responses and local Credit fixtures only. Validation on 2026-09-25: all 45 focused assertions passed. Real OpenAI entitlement, response quality, latency and token usage remain unverified without a paid live request.

Sources: [GPT-6 Sol](https://developers.openai.com/api/docs/models/gpt-6-sol), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna).
