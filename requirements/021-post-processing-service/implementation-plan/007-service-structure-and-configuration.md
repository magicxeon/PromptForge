# P0-config - Service Structure And Configuration

**Status:** Implemented and verified for the local pilot (2026-09-14). **Owner:** 009. Primary Backend Platform Architect;
QA/security review sequentially; no independent subagent available.

1. **Done.** Document current api/domain/adapter/config/model ownership and service
   rules in post-processing-service/AGENTS.md. Preserve Core boundaries.
2. **Done.** Add ignored local .env, committed .env.example and validated JSON policy.
   Precedence: process env > local .env > safe runtime defaults; JSON is the
   explicit non-secret operation policy. Fail startup on invalid config.
3. **Done.** Restructure service to Python 3.10+ FastAPI + Uvicorn returning 100% JSON responses. All heavy ML packages, virtualenv, and models are directed to `D:\applications` to preserve Drive C: space.
4. **Done.** Inject one policy into API, mask and MediaPipe adapter; use its pinned
   artifact details in setupModel. Update standalone launcher and start-dev scripts to read the same config
   while retaining dynamic loopback port and fresh internal token.
5. **Done.** Park automatic activation in the Windows development workflow:
   `scripts/start-dev.bat` passes `--skip-post-processing`; the shared launcher
   skips the Python dependency check/process and starts Core without a service
   token. Direct `node scripts/start-dev.mjs` activation remains available.

Focused checks: node scripts/test-post-processing.mjs --group=config,
--group=api, --group=mask, --group=security and --group=all. These tests use
injected detectors and never call a paid provider or mutate live Project data.
Direct .env values and browser layout are not part of isolated tests.

## Evidence And Remaining Gates

2026-10-18 bounded Windows startup repair: `scripts/start-service.bat` now selects
the user-supplied D-drive Python and an independent `venv-py313`, calls module pip
and Python directly, and stops on bootstrap/install failures. Fresh requirements
include startup-required Torch and exclude incompatible legacy tltk on3.12+.
Installed dependencies, pip consistency, batch failure handling and isolated
application/health200 checks pass. See009 for scope and evidence. Old3.10 ML
environment preserved; optional voice/GPU migration is not claimed. No user
process, live queue or model download was changed by validation.

2026-10-18 subsequent TTS/GPU repair completed: installed F5-TTS/TorchAudio and
official CUDA wheels in the separate D-drive environment, reused existing Thai
weights, prepared pinned Vocos support files on D, and configured D cache/temp
defaults. Actual RTX3060 speech synthesis passed (4.84s inference,28.3s including
initialization,1991.2MB peak allocation), with a finite/nonzero waveform. Package
consistency and offline manifest resolution passed. See009 for exact evidence.
No user-service restart, live queue mutation, paid API or Git action. Operator
restart and listening-quality assessment remain; no production qualification claim.

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
