# Backend Agent Instructions

This file extends the repository root `AGENTS.md` for work launched under
`server/`. Root architecture, security, ownership and approval rules still
apply.

## Professional Owner

Read
`requirements/017-implementation-backend/roles/backend-platform-architect.md`
for API, domain, repository, database, durable Job, provider or infrastructure
work. Add Commercial and QA review when Credits, money or billable recovery are
affected.

## Backend Deltas

- Name the owning capability and canonical application entry point first.
- Keep routes thin, business rules in `server/domain/<capability>/`, and storage
  behind `server/repositories/<capability>/`.
- Use `req.actorContext` for ownership and authorization decisions.
- Keep provider dispatch behind Generation and Credit mutation behind Credits.
- Define idempotency, terminal failure, restart recovery, correlation and
  bounded performance behavior for external side effects.
- Add domain and route regression tests before changing shared lifecycle
  contracts.
