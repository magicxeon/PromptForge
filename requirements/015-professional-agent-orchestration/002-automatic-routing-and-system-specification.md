# Automatic Routing And System Specification

**Requirement ID:** AGENT-ORCH-002  
**Status:** Implemented; initial readiness validation passed  
**Owner:** Engineering governance

## 1. System Objective

Select the smallest sufficient role and Skill set from the user's request and
repository context. Prefer automatic routing. Ask the user only when different
role choices would materially change the product outcome, risk, permissions or
scope.

## 2. Routing Inputs

The router evaluates, in order:

1. explicit user role or review instruction;
2. requested artifact: discussion, requirement, design, implementation, review
   or release validation;
3. owning requirement and capability;
4. touched files and runtime contracts;
5. risk signals: Credits/money, auth/privacy, destructive support, public media,
   provider dispatch, persistence migration and shared UI;
6. domain signals: Cinematic, UX/UI, backend, commercial or generative media;
7. task size and number of lifecycle stages.

Artifact resolution uses the canonical map defined by AGENT-ORCH-006. Routing
must not assume every role and Skill lives under this requirement folder.

## 3. Deterministic Routing Matrix

| Trigger | Primary | Mandatory reviewer/Skill |
|---|---|---|
| New feature or changed cross-screen flow | Product And Requirement Architect | UX for user-facing work; Backend for new server capability |
| Layout, interaction, navigation, theme, accessibility | UX/UI Product Designer | QA when shared or substantial |
| Film, shot, sequence, continuity, motion or audio | Cinematic Experience Director | Generative Media Pipeline; UX for authoring UI |
| Approved Shot to AI video attempt, temporal prompt or drift diagnosis | Generative Cinematic Production Director | Cinematic Experience Director for intent; Generative Media Pipeline for qualification |
| API/domain/repository/database/job/infrastructure | Backend Platform Architect | QA; Security or Performance when triggered |
| Credits, pricing, payment, payout, refund, ledger, recovery | Commercial Operations And Financial Integrity | Backend plus QA; security review mandatory |
| Prompt/reference/provider qualification or visual consistency | Generative Media Pipeline Skill with owning domain primary | QA for qualification evidence |
| Bug in known feature | Owning feature/domain role | QA when regression or shared contract |
| Code review or requirement closure | QA And Release Engineer | Owning domain consulted, not self-approved |
| Tiny copy/CSS/local test correction | `base-implementation-owner` (no specialist charter) | No extra role unless risk emerges |

## 4. Selection Algorithm

```text
honor explicit user override
-> identify owning requirement and capability
-> select one primary role, or base implementation for a tiny local task
-> add mandatory risk reviewers
-> add only Skills whose trigger predicates match
-> remove duplicate perspectives
-> enforce three-role context limit
-> ask one clarification question only if material ambiguity remains
-> record routing decision before substantial work
```

If the environment cannot instantiate independent agents, apply the roles in
sequence and disclose that limitation. For independent QA, prefer a fresh
context that receives the requirement, diff and raw evidence without the
implementer's intended answer.

## 5. Clarification Policy

### Ask the user when

- the request can reasonably mean requirement-only or immediate implementation
  and the newest instruction does not resolve it;
- two different capabilities could own the new business state;
- a product decision changes price, public visibility, retention or user rights;
- a destructive or production action lacks explicit authorization;
- the user explicitly asks to choose the participating expert;
- required source assets or credentials are unavailable.

### Do not ask when

- the owning requirement and routing matrix identify a clear primary role;
- implementation details can follow existing code patterns safely;
- a mandatory reviewer follows automatically from risk;
- the question only shifts work the agent can discover from the repository;
- a low-risk fallback is documented by current contracts.

Clarification must be one concise question, include only materially different
choices and state the impact. It must not expose internal role mechanics unless
the user asks.

## 6. Explicit Override Contract

Users may say, for example:

```text
Use QA only; do not implement.
Have Product and UX prepare the requirement, then wait.
Use Backend as primary and Commercial as reviewer.
Skip Cinematic review for this isolated copy change.
```

An override cannot disable mandatory financial, security or destructive-action
gates. The agent must explain that exception briefly.

## 7. Context And Overhead Budget

- Load `AGENTS.md`, architecture master and owning requirement first.
- Load only the selected primary role charter initially.
- Load reviewer charters immediately before their review pass.
- Load a Skill body only after its metadata/trigger matches.
- Read linked references conditionally, never all role material by default.
- Keep each role charter below 180 lines and each Skill below 150 lines unless
  measured failures justify more.
- Do not duplicate schemas, pricing tables, routes or architecture maps in role
  files; link to their canonical owners.
- Default to no more than three active roles and two triggered Skills.
- Resolve role charters from their domain-owned canonical paths.
- Discover active repository Skills through `.agents/skills/`; do not scan
  arbitrary requirement folders as an alternative Skill registry.
- Treat nested `AGENTS.md` files as current-working-directory scope. Root
  routing remains sufficient for sessions launched at repository root.

## 8. Routing Record

For substantial work, place a concise routing block in the owning requirement
checkpoint or implementation plan. Do not create runtime logs or user data.

```yaml
routing:
  primary: backend-platform-architect
  reviewers:
    - qa-release-engineer
  skills:
    - implement-generation-workflow
  reason: changes queue settlement and terminal polling
  clarification: not_required
```

## 9. Failure And Fallback Behavior

- Unknown domain: use Product And Requirement Architect to establish ownership.
- Missing role file: continue under `AGENTS.md`, report stale configuration and
  do not invent a replacement path.
- Conflicting role guidance: follow the conflict order in AGENT-ORCH-001.
- Context limit reached: retain primary role and mandatory risk reviewer; defer
  optional polish review.
- No independent-agent support: run sequential review and mark independence as
  a residual validation gap.
- User changes direction mid-task: newest instruction re-routes the remaining
  work; completed changes are not silently reverted.

## 10. Security Boundary

Routing never grants permissions. Each selected role uses the same sandbox,
approval, actor, secret and production-access rules as the base agent. Role
files must not contain credentials, private prompts, raw customer data or
instructions to bypass approval.
