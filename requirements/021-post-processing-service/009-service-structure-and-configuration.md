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
- The default Windows `scripts/start-dev.bat` workflow does not auto-start the
  Post-Processing pilot while the capability is parked. It must pass the
  launcher's explicit skip option, leave the Core client unconfigured, and
  preserve direct launcher/service activation for future local work.
- Policy/model changes require version updates and focused regression evidence.
  No editable configuration may turn an unqualified model into a production
  capability or override Core actor/Asset/Credit ownership.

## Acceptance

### 2026-10-18 Thonburian dependency and D-drive cache completion

User requests fixing `No module named torchaudio`, preparing required models and
keeping all new installations/downloads/cache/temp on D. Existing Thonburian
weights/vocabulary are already present under the configured D model directory.
Scope: pin a matching Torch/torchaudio pair with F5-TTS, declare the speech runtime
dependencies, set launcher cache/temp defaults on D and replace the adapter's
C-drive cache fallback with a config-owned D path. Reuse the existing checkpoint;
download only missing vocoder support files. No voice/policy/model replacement,
Core/Credits integration or public release. Ordered checks: dependency resolution,
imports/pip consistency, bounded model initialization and one short local speech
smoke; report compute/device and any listener-quality gap. No Git, live queue
rewrite, listener termination or user-service restart. Preserve legacy venv.
User follow-up explicitly requires GPU. The machine has an RTX3060 Laptop6GB
and driver596.49. Install official CUDA13.0 wheels for the existing pinned
Torch2.14.1/TorchAudio2.11.0 runtime, retaining all D-drive cache/model paths.
Windows startup detects NVIDIA, prepares CUDA if needed and verifies availability
instead of silently leaving this machine on CPU. Keep CPU-only hosts supported.
Validate the same short speech path on GPU and compare the measured CPU baseline
(247.07s;24000Hz,32300-byte output). No new model or text is needed.
Dependency choice follows the [official TorchAudio stable-ABI compatibility
table](https://docs.pytorch.org/audio/master/installation.html): TorchAudio2.11
supports Torch2.11 and later. Resolved official CUDA wheels are
`torch2.14.1+cu130` and `torchaudio2.11.0+cu130` for Python3.13/Windows.
Existing Thonburian checkpoint integrity passed:366 tensors,1348517681 bytes,
with vocabulary present. Missing Vocos files were prepared at the new configured
D path using repository revision `0feb3fdd929bcd6649e0e7c5a688cf7dd012ef21` and
SHA256 pins in the existing downloader. No existing checkpoint was re-downloaded.

Completed local GPU validation: the same short Thai speech sample produced a
nonzero finite 24000Hz waveform (32300 bytes) with the model on CUDA and execution
mode `thonburian_f5_dit_335m_cuda_chunked`. RTX3060 synthesis took4.84s;
total including initialization was28.3s, versus247.07s for the CPU baseline.
Peak allocated GPU memory was1991.2MB. Sample:
`D:/development/temp/momelo-models/tts-smoke-gpu.wav`.
Post-install `pip check` passed, and an offline requirements dry-run passed
without replacing the installed CUDA wheels. Models, downloads and configured
caches/temp remain on D. No user service was restarted; the operator must restart
the existing service to load the repaired environment. Human listening quality,
OpenVoice and production qualification remain outside this bounded runtime fix.

### 2026-10-18 Windows launcher interpreter repair

User reports that the existing external Python3.10 venv points to an unavailable
Windows Store executable. The supplied working interpreter is
`D:/Program Files/Python3/python.exe` (locally verified3.13). Bounded local startup
fix: use that explicit base (overridable by `POST_PROCESSING_BASE_PYTHON`), create
a separate `D:/applications/momelo-post-processing/venv-py313` by default and
honor an explicit `VENV_DIR`. Never replace/delete/upgrade the old3.10 environment.
Invoke the selected venv's Python directly for pip and startup; no activation or
standalone pip launcher dependency. Fail before service startup on interpreter,
venv or dependency failures. Keep pip cache on D and current service policy intact.
Plan: fix launcher, validate isolated interpreter/package setup, then check app
import/readiness without calling the existing port-termination/model-download
startup routine. Architecture ownership unchanged; versioned venv remains under
the existing external service runtime root. No model download or Core restart.
Fresh-environment validation also exposed two existing manifest gaps: ASR imports
Torch during application startup but requirements omitted it; legacy optional
`tltk` pins scikit-learn1.2, whose metadata build failed on the supplied3.13 runtime.
Declare Torch and restrict that legacy voice-tooling dependency to Python<3.12.
The preserved3.10 model environment is not migrated or represented as3.13-qualified.
Verification: the new3.13 environment was created and dependencies installed;
`python -m pip check` reports no broken requirements. Missing-interpreter and
forced pip-failure batch checks pass, including paths with spaces and recovery
from the old launcher's leaked legacy `VENV_DIR`. Application import and an ASGI
`GET /health` return200 with model startup disabled and persisted queue loading
suppressed. No user listener was terminated/started and no model was downloaded.
The architecture index and service README now document the direct-launcher
default. Optional legacy F5/OpenVoice/CUDA stacks remain unqualified in the new
environment; their existing3.10 installations were preserved.

Config values are reported consistently by capability, API enforcement,
detector, model setup and image renderer. Invalid booleans, ports, sizes,
hashes and thresholds fail startup. Missing token fails closed. The existing
binary API, pilot default, masks and protected Core workflow remain unchanged.
No secret or model binary is committed. See the ordered [implementation plan](implementation-plan/007-service-structure-and-configuration.md).

Production readiness remains governed by 001/007/008. Increasing a policy
bound also requires Core contract parity and benchmark evidence; this local
configuration work does not relax those gates.
