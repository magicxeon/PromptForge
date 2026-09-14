# 009 - Service Structure And Configuration

**Status:** Implemented for the local API pilot (2026-09-14). **Owner:** Post-Processing service.

## Scope

Keep one independent API process built with **Python 3.10+ FastAPI and Uvicorn** with cohesive `api`, `domain`, `adapters`, `config`, and `models` boundaries.
To protect Drive C: disk space, Python virtual environments, PyTorch/CUDA packages, and model checkpoints MUST be installed under **`D:\applications`** (e.g. `D:\applications\momelo-post-processing\venv` and `D:\applications\momelo-post-processing\models`).
Add a service-scoped AGENTS.md that explains placement, dependency direction, extension checks and Core ownership. No new endpoint, worker, database, credit flow or Storyboard UI is part of this change.

## Configuration Contract

- A local ignored `.env` holds deployment/runtime values: loopback host, preferred
  port, pilot switch, model path under `D:\applications` and internal token. Commit an
  `.env.example` without credentials. Process environment overrides the file.
- A versioned JSON policy owns non-secret Faceless limits, timeout, model
  artifact URL/checksum, detector thresholds and mask appearance. Parse and
  validate it once at startup; reject invalid or contradictory settings.
- All service endpoints (`/health`, `/v1/health`, `/v1/capabilities`, `/v1/metrics`, `/v1/faceless-previs`, `/v1/face-landmarks`) MUST return **100% JSON Responses** (`Content-Type: application/json; charset=utf-8`).
- Interactive OpenAPI documentation (Swagger UI) is automatically available at `/docs` when running FastAPI.
- The dev launcher and direct service entry must use the same config loader.
  The launcher may mint a fresh token and choose a free loopback port, but
  cannot silently bypass an explicit disabled pilot setting.
- Policy/model changes require version updates and focused regression evidence.
  No editable configuration may turn an unqualified model into a production
  capability or override Core actor/Asset/Credit ownership.

## Acceptance

Config values are reported consistently by capability, API enforcement,
detector, model setup and image renderer. Invalid booleans, ports, sizes,
hashes and thresholds fail startup. Missing token fails closed. The existing
binary API, pilot default, masks and protected Core workflow remain unchanged.
No secret or model binary is committed. See the ordered [implementation plan](implementation-plan/007-service-structure-and-configuration.md).

Production readiness remains governed by 001/007/008. Increasing a policy
bound also requires Core contract parity and benchmark evidence; this local
configuration work does not relax those gates.
