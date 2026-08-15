# Backend Requirement Instructions

This file extends the repository root `AGENTS.md` for work launched under this
backend program. Root safety, actor, financial and capability rules still
apply.

Read `roles/backend-platform-architect.md` as the primary professional charter.
Use `verify-release-regressions` for substantial implementation or release
work, and add the domain-specific Skill selected by root routing.

- Define one capability owner and canonical application entry point.
- Specify API, domain, repository and adapter boundaries before implementation.
- Include authorization, lifecycle, idempotency, failure recovery,
  observability, performance bounds and migration checkpoints.
- Do not create a second workflow facade or direct foreign-repository mutation.
