# Distributed Agent And Skill Placement

**Requirement ID:** AGENT-ORCH-006
**Status:** Implemented; structural and routing validation passed
**Owner:** Engineering governance
**Applies to:** Repository instructions, professional role charters and
repository-local Codex Skills

## 1. Problem

The first orchestration implementation placed all role charters and Skills
under `requirements/015-professional-agent-orchestration/`. That layout was
useful for initial validation, but it mixes three different responsibilities:

1. cross-project routing and governance;
2. domain-owned professional guidance; and
3. artifacts that Codex must discover automatically at runtime.

Keeping these concerns together makes ownership unclear. More importantly, a
`SKILL.md` stored in an arbitrary requirement folder is not, by location alone,
a repository-discoverable Skill.

## 2. Terminology And Supported Files

- Use `AGENTS.md` for repository or directory-scoped agent instructions.
- Do not introduce `.agent`, `.agent.md` or another custom filename as an
  automatic discovery mechanism.
- Use a Skill directory containing `SKILL.md` for a repeatable procedure.
- `agents/openai.yaml` is optional Skill metadata; it is not a replacement for
  `AGENTS.md` and does not define a professional role by itself.
- A role charter is project documentation. It becomes operational only when a
  loaded `AGENTS.md` or Skill explicitly routes work to it.

## 3. Architecture Decision

Use a hybrid structure that separates **domain ownership** from **runtime
discovery**.

### 3.1 Root routing

The repository root `AGENTS.md` remains the always-available router and contains
only:

- project-wide architecture and safety gates;
- the compact primary-role routing matrix;
- mandatory reviewer rules;
- links to canonical role charters; and
- Skill trigger boundaries.

It must not copy complete domain manuals or Skill bodies.

### 3.2 Domain-owned role guidance

Move each domain-specific role charter beside the requirement that owns its
decisions. Keep cross-project roles in the orchestration requirement.

```text
requirements/015-professional-agent-orchestration/
  roles/
    product-requirement-architect.md
    qa-release-engineer.md

requirements/009-migration-to-react/
  roles/
    ux-ui-product-designer.md

requirements/016-cinematic-studio/
  roles/
    cinematic-experience-director.md
    generative-cinematic-production-director.md

requirements/017-implementation-backend/
  roles/
    backend-platform-architect.md

requirements/018-implementation-commercial-feature-plan/
  roles/
    commercial-financial-integrity.md
```

Product and QA stay central because they operate across every capability. UX,
Cinematic, Backend and Commercial belong to their corresponding programs.

### 3.3 Runtime-discoverable Skills

Publish each active repository-wide Skill exactly once under the supported root
discovery location:

```text
.agents/skills/
  design-cinematic-experience/
  direct-generative-cinematic-production/
  review-commercial-integrity/
  review-generative-media-pipeline/
  review-product-ux/
  verify-release-regressions/
  implement-generation-workflow/
  plan-database-migration/
```

Each Skill links to its owning requirement and role charter. The directory is a
discovery catalog, not a second business source of truth. Skill instructions
must contain only the repeatable procedure, inputs, outputs, non-triggers and
links needed to execute it.

The existing Generation Workflow Skill must be moved into the catalog rather
than copied. During migration, the old path may exist only as a temporary
compatibility source with a documented deletion checkpoint. Two discoverable
Skills must never share the same `name`.

Do not place an active Skill only under a nested requirement directory when it
must be available to sessions launched from the repository root. A nested
`.agents/skills/` directory is allowed only for a genuinely subtree-local
workflow and only when its launch/discovery behavior is tested.

### 3.4 Nested `AGENTS.md`

Add nested `AGENTS.md` files only where repeated local rules justify them:

```text
web/AGENTS.md
server/AGENTS.md
requirements/016-cinematic-studio/AGENTS.md
requirements/017-implementation-backend/AGENTS.md
requirements/018-implementation-commercial-feature-plan/AGENTS.md
```

Their responsibilities are:

- `web/AGENTS.md`: React, UX/UI, accessibility, theme, i18n and browser
  validation deltas;
- `server/AGENTS.md`: route/domain/repository/provider, persistence,
  observability and failure-recovery deltas;
- domain requirement `AGENTS.md`: professional role and deliverable rules for
  authoring that requirement set.

Nested files extend root instructions. They must not duplicate the full root
file and must never relax security, actor isolation, Credit consistency,
approval or destructive-action gates.

Codex builds the instruction chain from the repository root down to the current
working directory when a run starts. Therefore nested instructions are scoped
by launch directory, not dynamically loaded merely because a file elsewhere is
edited. The root router must continue to link all canonical role charters so a
root-launched session remains correct.

## 4. Canonical Artifact Map

Create `requirements/015-professional-agent-orchestration/agent-artifact-map.json`
during implementation. Every artifact entry must contain:

```json
{
  "id": "cinematic-experience-director",
  "kind": "role",
  "owner": "cinematic-studio",
  "canonicalPath": "requirements/016-cinematic-studio/roles/cinematic-experience-director.md",
  "discoveryPath": null,
  "scope": "domain",
  "status": "active"
}
```

Skill entries additionally record the `.agents/skills/.../SKILL.md` discovery
path. The map is the testable location registry; it must not become a second
routing policy.

## 5. Migration Sequence

1. Add failing placement tests for the target artifact map and supported
   discovery paths.
2. Create the artifact map and update routing fixtures to resolve paths through
   it.
3. Move domain role charters to their owning requirement folders.
4. Move active Skills into root `.agents/skills/`, preserving their names,
   metadata, references and trigger descriptions.
5. Add minimal nested `AGENTS.md` files only at the approved paths.
6. Update root `AGENTS.md`, tests, requirement links and architecture maps.
7. Remove old role and Skill copies after all consumers resolve the canonical
   paths.
8. Restart Codex and verify Skill discovery, implicit trigger behavior and
   explicit invocation.

Do not perform partial moves that leave root routing pointed at stale paths.

## 6. Regression And Overhead Gates

- One canonical file exists for each role and each Skill.
- No duplicate Skill `name` appears in discovered locations.
- Root-launched tasks can discover every repository-wide Skill.
- A Cinematic task selects Cinematic guidance and does not load Commercial
  guidance.
- A Credit/refund task selects Commercial, Backend and QA gates.
- A small CSS or translation correction does not activate unrelated Skills.
- Work launched under `web/` and `server/` receives the expected nested deltas.
- Work launched at root remains correct without relying on nested discovery.
- Existing Generation Workflow positive and negative routing cases still pass.
- Combined `AGENTS.md` guidance remains within the configured instruction-size
  budget.

## 7. Acceptance Criteria

- [x] Product Owner approves the canonical artifact map through implementation
      authorization.
- [x] Repository-local Skills are under supported `.agents/skills` discovery
      paths.
- [x] Role charters are beside their owning domain or central governance owner.
- [x] Nested `AGENTS.md` files contain scoped deltas only.
- [x] Root `AGENTS.md` resolves every role and Skill without stale links.
- [x] Placement, duplicate-name, routing and non-trigger tests pass.
- [x] Existing orchestration and Generation tests pass unchanged or with only
      canonical path updates.
- [x] No compatibility copy remains after the migration checkpoint.

## 8. Implementation Result

- `agent-artifact-map.json` owns canonical path resolution.
- Domain roles were moved to their owning requirement sets.
- All seven active Skills are available in `.agents/skills/` with metadata; the
  seventh adds focused database migration planning without creating a new role.
- Five scoped `AGENTS.md` files were added at the approved boundaries.
- Root routing and Generation references now use canonical discovery paths.
- Compatibility copies were removed and placement regression tests protect the
  result.
