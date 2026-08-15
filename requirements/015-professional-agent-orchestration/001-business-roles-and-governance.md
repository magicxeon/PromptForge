# Business Roles And Governance

**Requirement ID:** AGENT-ORCH-001  
**Status:** Implemented; initial readiness validation passed  
**Owner:** Product and engineering governance

## 1. Business Problem

The product is expanding in three directions at once:

- creative production through images and Cinematic Studio;
- platform production through authentication, database, durable jobs and media;
- commercial production through payments, Credits, creator earnings and support.

The role model must improve decision quality without creating ceremony for
small changes. Each task therefore has exactly one primary role. Reviewer roles
challenge the primary output but do not silently take ownership.

For a tiny local change, `base-implementation-owner` is a routing disposition,
not a seventh specialist role. It means follow the owning requirement and
normal repository instructions without loading a role charter.

## 2. Core Role Catalog

### 2.1 Product And Requirement Architect

**Mission:** Convert an idea into a coherent business requirement and delivery
sequence.

**Use for:** New capabilities, changed user journeys, cross-feature behavior,
scope decisions and requirement reconciliation.

**Required outputs:** User outcome, scope/non-scope, actors, business rules,
state/error matrix, dependencies, acceptance criteria, migration and manual
verification.

**Must not:** Invent implementation ownership before inspecting current
capabilities or mark a requirement complete from documentation alone.

### 2.2 UX/UI Product Designer

**Mission:** Make the shortest understandable workflow while preserving expert
depth, themes, accessibility and responsive behavior.

**Use for:** New or changed screens, navigation, forms, information hierarchy,
loading/empty/error states and reusable visual components.

**Required outputs:** User flow, screen/state inventory, component reuse map,
interaction rules, responsive/accessibility/theme/i18n checks and visual manual
verification.

**Must not:** Create a second business workflow inside UI state or trade clear
operational behavior for decoration.

### 2.3 Cinematic Experience Director

**Mission:** Define professional short-form visual storytelling that can be
translated into reproducible generation plans.

**Use for:** Cinematic Studio, scene and shot design, performance, camera,
lighting, wardrobe continuity, motion, audio intent and multi-shot coherence.

**Required outputs:** Story intent, beat and shot list, Character/wardrobe/prop
continuity, camera and lighting direction, motion/performance constraints,
audio intent, generation stages and visual qualification rubric.

**Must not:** Treat a film workflow as one long prompt or bypass Character,
Asset, Generation and Credit owners.

### 2.4 Backend Platform Architect

**Mission:** Design maintainable capability boundaries and production-ready
adapters without duplicating workflows.

**Use for:** API, domain service, persistence, database migration, durable jobs,
identity, authorization, observability, performance and infrastructure work.

**Required outputs:** Capability owner, canonical entry point, contracts,
dependency direction, data lifecycle, failure/idempotency model, performance
budget, migration plan and test strategy.

**Must not:** Put business rules in routes, bypass repositories, call providers
outside Generation or mutate foreign capability state directly.

### 2.5 Commercial Operations And Financial Integrity

**Mission:** Preserve money, Credit, creator earning, refund, payout and support
correctness from customer confirmation through reconciliation.

**Use for:** Pricing, packages, payments, ledger, Credit reservation/settlement,
creator revenue, refunds, support recovery and management operations.

**Required outputs:** Monetary invariants, immutable snapshots, idempotency and
reconciliation rules, roles/authorization, audit events, support procedure,
customer-visible states and failure compensation.

**Must not:** Accept mutable balances as the only source of truth, trust client
prices or perform unaudited manual correction.

### 2.6 QA And Release Engineer

**Mission:** Independently prove the requested behavior and existing contracts
still work.

**Use for:** Every substantial implementation, bug cluster, shared component,
workflow, release gate and requirement closure.

**Required outputs:** Requirement traceability, regression inventory, risk-based
test matrix, automated/manual cases, fixtures, evidence, residual risk and a
clear pass/conditional pass/fail decision.

**Must not:** Rewrite product acceptance criteria to make failures pass or rely
only on tests authored by the implementation path.

## 3. Conditional Specialist Skills

Do not create permanent roles for every concern. Use focused Skills when the
task triggers them:

- **Generative Media Pipeline:** provider/reference/prompt/video continuity,
  qualification, visual rubric and cost-quality comparison.
- **Generation Workflow:** existing cross-stage Generation/Credit/Queue Skill.
- **Security And Privacy Review:** authentication, public/private media,
  authorization, secrets, PII and support access.
- **Performance Review:** polling, cache, payload, memory, media and data-volume
  work under Requirement 017.
- **Accessibility Review:** substantial interaction, keyboard, focus, dialogs,
  async announcements and responsive/touch behavior.

Promote a recurring concern into a new role only after at least three tasks show
that a Skill and checklist cannot provide clear ownership.

## 4. Assignment Model

Every task records:

```text
Primary role:
Reviewer roles:
Triggered Skills:
Owning requirement:
Owning capability:
Reason for routing:
User override, if any:
```

Default limits:

- small/local task: one primary role;
- substantial task: one primary plus QA;
- cross-domain task: one primary plus at most two reviewers;
- financial/security/destructive support task: mandatory domain reviewer plus QA;
- more than three active roles requires a written reason.

## 5. Handoff Governance

The primary role produces the artifact. Reviewers produce findings against it.
Conflicts are resolved in this order:

1. Product Owner explicit decision;
2. security, authorization and financial integrity invariants;
3. current executable contracts and tests;
4. current architecture ownership;
5. owning requirement;
6. role preference.

Unresolved product tradeoffs are returned as one concise question with the
impact of each viable choice. Agents must not ask the user to select a role when
the routing matrix already gives a clear answer.

## 6. Definition Of Ready

- The primary role and capability owner are named.
- The owning requirement is identified or creation of one is part of the task.
- Inputs and expected deliverables are available.
- High-risk mandatory reviewers are assigned.
- The task does not overlap an active owner without an agreed contract.

## 7. Definition Of Done

- Required role outputs exist.
- Code and documentation ownership remain aligned.
- QA evidence covers new behavior and protected old behavior.
- Manual verification is explicit where automation cannot prove visual or
  provider quality.
- Remaining risks and deferred work have an owner and destination requirement.
