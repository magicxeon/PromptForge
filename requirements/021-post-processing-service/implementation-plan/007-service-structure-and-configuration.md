# P0-config - Service Structure And Configuration

**Status:** Implemented and verified for the local pilot (2026-09-14). **Owner:** 009. Primary Backend Platform Architect;
QA/security review sequentially; no independent subagent available.

1. **Done.** Document current api/domain/adapter/config/model ownership and service
   rules in post-processing-service/AGENTS.md. Preserve Core boundaries.
2. **Done.** Add ignored local .env, committed .env.example and validated JSON policy.
   Precedence: process env > local .env > safe runtime defaults; JSON is the
   explicit non-secret operation policy. Fail startup on invalid config.
3. **Done.** Inject one policy into API, mask and MediaPipe adapter; use its pinned
   artifact details in setupModel. Update start-dev to read the same config
   while retaining dynamic loopback port and fresh internal token.
4. **Done.** Add focused config/security/API checks, run the existing mask/Cinematic
   groups, inspect changed paths and report pilot-only gaps.

Focused checks: node scripts/test-post-processing.mjs --group=config,
--group=api, --group=mask, --group=security and --group=all. These tests use
injected detectors and never call a paid provider or mutate live Project data.
Direct .env values and browser layout are not part of isolated tests.

## Evidence And Remaining Gates

- node scripts/test-post-processing.mjs --group=all: 12 passed. Existing
  mask, API, security and Cinematic cases remained green; new config cases
  cover precedence, fail-closed startup, policy validation, advertised input
  bounds and model checksum/path.
- node post-processing-service/setupModel.mjs: pinned local model ready.
  A direct real-model loopback API smoke returned HTTP 200 with Faceless
  available. scripts/start-dev.mjs started Core 6500, Web 5173 and service on
  dynamic loopback port after Vite cache permission was granted.
- node --check on changed service/launcher modules and git diff --check passed;
  .env is ignored by Git. Review is sequential, not independently staffed.
- QA decision: pass for local configuration/structure only. No customer-data
  UAT, provider call, visual mask qualification or production release claim.
  Durable Jobs, signed private delivery, retention and model rights remain
  open under 001/007/008.
