# Coordination Verification And Handoff

**ID:** AGENT-ORCH-010
**Status:** Independent conditional pass for offline/config delivery; fresh-session activation pending

This document records evidence for 008/009, not retroactive approval of old
adoption claims. No UI, paid model request, wallet, live data or worker change
is part of these checks.

## Planned Focused Commands

Run from the repository root with Node installed:

```powershell
node scripts/verify-agent-orchestration.mjs --group legacy
node scripts/verify-agent-orchestration.mjs --group contracts
node scripts/verify-agent-orchestration.mjs --group inventory
node scripts/verify-agent-orchestration.mjs --all
node scripts/verify-agent-orchestration.mjs --plan path/to/tasks/task-plan.json
node scripts/verify-agent-orchestration.mjs --plan requirements/015-professional-agent-orchestration/coordination-task-plan.json
node scripts/agent-orchestration/probe-codex.mjs
```

Aggregate checks are explicit and offline and require Node only. The optional
probe additionally requires local Codex on PATH (or CODEX_BIN) and Python 3.11+
with tomllib (or PYTHON_BIN). It parses TOML and calls initialize/config-read,
never thread/start or turn/start. It suppresses personal configuration output,
checks project-layer provenance and concurrency, and exits without leaving a
server running. No credentials or trust settings are changed.

## Evidence

- Requirements and handoff contract written before implementation (O01).
- Independent baseline audit: Volta, `01a1240c-fffb-7fd1-9f87-522712ea36d5`,
  found stale Backend/Commercial routing, obsolete guide paths and historical
  test restrictions. All identified active paths/guides were reconciled in place.
  Existing legacy checks improved from 5 passed / 5 failed to 10 passed.
- Final aggregate: 10 legacy + 22 contract tests passed (32 total), plus inventory.
  Includes actual owning-plan validation, simple work,
  sequential complex work, ready parallel dependencies, missing/cyclic inputs,
  case-insensitive write overlap, directory-prefix errors, absent-batch bypass,
  worker bounds, independent review identities and completion evidence.
- Inventory: passed; 13 roles, 14 profiles, 8 discoverable Skills, 14 retained
  requirement guides, 7 instruction files. No Skill moved or deleted.
- Native configuration probe on Codex 0.160.1: 15 TOML files parsed;
  `configRead=passed`, `projectLayerLoaded=true`, `concurrency=2`.
- Actual owning coordination-task-plan.json validates. O01-O04 are accepted with
  evidence/reviewer identities; O05 remains in review with pending fresh-session
  activation evidence. No runtime closure is claimed.
- Independent QA: Singer, `01a12417-5767-73a3-89a5-ae57c5950f20`, found
  cross-role self-review, directory-prefix and omitted-batch bypasses. Fixes and
  negative tests implemented. Final independent re-review returned no remaining
  offline/config blockers and conditional pass; the reviewer independently ran
  10 legacy + 22 contract tests, inventory, diff check and the native probe.
  Financial Security/UX requirements are explicit in both contract and validation.
- Scoped `git diff --check`: passed. No application runtime code changed.
- Independent configuration/security re-review: Volta returned conditional pass
  for configuration boundaries, no privilege escalation/secret/billing path.
  Native custom-profile activation remains outside that pass. Probe shutdown
  was hardened to reject nonzero exits/signals after a config response.
- Application/runtime tests: not applicable; application code unchanged.

## Remaining Live Gate

The already-running session rejected custom `qa-release-engineer` with
`unknown agent_type`. QA therefore ran independently through built-in explorer
with the QA charter/task packet, not a falsely claimed custom profile. Native
config loading and TOML syntax do not prove fresh-session custom-agent spawning.

1. Open a NEW Codex session in this trusted repository. Keep normal permissions.
2. Ask: "Use qa-release-engineer to read AGENT-ORCH-008 and report its own role,
   charter and task contract. Do not edit, spawn children or run paid actions."
3. Confirm the custom agent is recognized and returns the configured contract.
4. Ask for a simple local documentation correction; confirm one agent and no
   decomposition. Then use two independent read-only complex checks and confirm
   the Lead collects both before reporting, with no more than two children.
5. Record actual runtime evidence here. If unsupported, keep the disclosed
   built-in/sequential fallback; do not relax sandbox/trust or claim activation.

This live pilot consumes normal Codex usage and is deliberately separate from
the offline runner. Profile models inherit the session. No claim is made about
every specialist's future task quality, actual end-user acceptance, a full audit
of all 099 historical architecture notes, or historical blind-QA release gates.

## Operating Notes

### Windows Sandbox Recovery (2026-10-10)

Owner: agent-orchestration environment support; primary Platform, with Security
and QA checks. Architecture map unchanged; no application or runtime data change.

The user reported a successful direct custom QA spawn in a new session, with
the QA developer instructions present. This is user-reported activation evidence,
not proof of profile-path provenance or OS-enforced read-only access.

Before repair, even `Get-Location` failed before execution with
`helper_unknown_error: setup refresh had errors`. The sandbox log identifies
`deny ACE failed on D:\development\ModelPromptForge\.codex: open deny ACL target for update`.
The directory is not a reparse point; its owner is `CodexSandboxOffline`, while
the interactive Windows user has inherited Modify but not explicit FullControl.
This supports an ownership/WRITE_DAC mismatch as the recovery hypothesis.

Ordered repair and acceptance plan:
1. Preserve diagnostics and inspect the exact directory ACL without credentials.
2. With explicit elevated approval, back up its security descriptor outside git
   and change only this directory's owner to the interactive Windows user.
   Do not recurse, reset ACLs, remove Deny entries, alter global trust, switch
   sandbox implementation or disable protection.
3. Retry an ordinary sandboxed read; let Codex apply its own protection rules.
4. Inspect the resulting owner/ACL and rerun focused profile/config checks.
5. Request a direct custom QA read-only smoke check if the active runtime
   supports that name. Record runtime limitations separately from file validity.

Acceptance requires ordinary sandbox reads to succeed and protection to remain
in place. An escalated read alone is not a repair. If UAC or policy blocks the
ownership change, stop and provide the exact manual administrator step.

The first repair request was rejected before execution pending explicit user
approval of the persistent ownership change. The user subsequently approved
changing only this directory's owner to the verified interactive human account.
No alternate executable or weakened sandbox setting was used to bypass approval.

Repair result (2026-10-10):
- Approved UAC `icacls` owner-only operation exited 0. Owner is now
  `MAGICXEON-L5\punya`. The DACL was unchanged by that operation; no recursion.
- Original owner and DACL were saved before repair in an access-restricted
  temporary directory (human user, SYSTEM, Administrators only):
  `C:\Users\punya\AppData\Local\Temp\momelo-codex-acl-7e4cf776792e409998b99d421298adf4\original-security-descriptor.clixml`.
  This is recovery evidence outside git, not application runtime data.
- Ordinary, non-escalated shell reads of the QA profile and requirements now
  succeed. `whoami /user` identifies `CodexSandboxOffline`, not the human owner.
- Codex subsequently installed Deny entries on `.codex`; current setup log
  reports `errors=[]` and `setup binary completed`. No deny rule was removed.
- Focused inventory passed; contract tests passed 22/22 inside the sandbox.
- Native probe as the normal human user passed: 15 TOML files, loaded project
  layer, concurrency 2. No model turn, global trust or configuration change.
- Git's separate repository-owner check requires a command-scoped
  `git -c safe.directory=D:/development/ModelPromptForge ...` for this verified
  repository under the sandbox account. No global safe.directory entry was added.

Status: sandbox startup/read failure repaired. Custom QA activation was reported
by the user in a new session; this old session still returns `unknown agent_type`.
The smoke test here does not prove custom-session profile provenance or complete
OS-enforced read-only behavior. O05 stays open for those separate live checks.

Independent recovery review: Dewey (`01a12470-7649-7a50-9f49-8c72984c0fd9`),
built-in fallback applying QA/Security checks, independently confirmed ordinary
reads, the sandbox account, human directory owner, explicit/inherited Deny ACEs,
medium-integrity token with only SeChangeNotifyPrivilege, and passing inventory.
Conditional pass for narrow recovery; no write probes or claim of full custom QA
read-only enforcement. A stale-status documentation finding was fixed and the
reviewer reread the updated section to confirm resolution. Scoped diff check passed.

Independent security assessment: Lovelace (`01a12457-dc6d-7b22-9b2d-5aa581502460`),
built-in explorer applying the Security role because the current session still
rejects custom names, reviewed the supplied evidence without tool execution.
Conditional approval only: human ownership confers persistent WRITE_DAC
authority; verify the human SID before elevation, protect the descriptor backup,
and inspect both protective ACEs and restricted execution after repair. Successful
command startup alone does not prove read-only enforcement. Do not blindly
restore a saved DACL after Codex adds protection entries.

Changed owners: `.codex/` configuration/profiles; domain-adjacent role charters;
015 requirements/registry/task plan; root/server instructions; corrected six
conditional guides; 099 architecture map; isolated scripts/tests. No files moved,
no new discoverable Skill, no application runtime/data path and no dependency
installation. The two pre-existing AGENTS/099 documentation edits were preserved.

Command execution in the sandbox began failing with `setup refresh had errors`.
Focused offline checks were run through approved escalated execution. This did
not change Codex global permissions or the project application's configuration.

- You can assign an ordinary requirement; the main agent classifies complexity.
  Small work needs only a short checkpoint, not task-plan JSON or extra agents.
- For complex work the Lead prepares the owning plan, validates it before
  delegation, fixes contracts and file ownership, then integrates in dependency
  order. Architecture changes update 099 and affected registries in the same work.
- The validator checks declared metadata, not truthfulness of evidence, actual
  filesystem locking, automatic risk inference or automatic agent scheduling.
- Review/write scopes are instructions, not extra permissions or OS isolation.
- Write collisions are lexical, not physical junction/symlink containment. The
  Lead must resolve aliases before approving scopes; do not use symlink/junction
  paths to divide writes. Effective session permissions remain authoritative,
  including connector/API permissions. PATH/PYTHON_BIN/CODEX_BIN must be trusted.
- Configuration rollback removes only new .codex profiles/config and the bounded
  coordination instructions. Do not revert existing security or ownership gates.
