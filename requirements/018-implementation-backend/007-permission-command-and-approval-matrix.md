# Admin And Support Permission, Command And Approval Matrix

**Status:** Requirement ready for implementation planning  
**Owner:** Identity policy with Support command orchestration  
**Primary role:** Product And Requirement Architect  
**Reviewers:** Backend Platform Architect, Commercial Financial Integrity  
**Skills:** `review-commercial-integrity`, `verify-release-regressions`  
**Implementation in this change:** None

## 1. Outcome

Every staff route, data reveal and command shall have one explicit permission,
risk tier, capability owner, approval policy and audit requirement. A staff role
never gains authority merely because the React UI renders a control.

This matrix refines Requirements 017-000 through 017-006. Threshold amounts,
refund policy and creator/platform allocation remain owned by Requirement 018
and server configuration.

## 2. Current-To-Target Role Compatibility

Current development actors expose only `admin` and `support`. Target production
roles are more granular. During migration:

| Current role | Temporary capability profile | Explicit exclusions |
|---|---|---|
| `support` | `support_agent` read/search/Case behavior | no finance mutation, user status mutation, moderation or restricted raw-media reveal |
| `admin` | Admin oversight plus configured moderator/Support Lead operations for development | no automatic financial approval, no self-approval, no unrestricted private-data reveal |

Production must not infer every granular role from `admin`. Identity shall
store explicit role/permission grants before Gate E. Temporary compatibility is
feature-flagged, environment-bounded and covered by authorization tests.

Target roles:

- `support_agent`
- `support_lead`
- `finance_ops`
- `moderator`
- `admin`
- `super_admin`

Ordinary `user` and `creator` actors have no staff permission.

## 3. Permission Vocabulary

```text
operations.overview.read
users.search.read
users.detail.read
users.status.command
users.sessions.revoke
cases.read
cases.create
cases.assign
cases.transition
cases.note.internal
cases.note.customer
traces.lookup
generation.recovery.preview
generation.recovery.execute
credits.read
credits.command.preview
credits.command.execute
payments.read
payments.command.preview
payments.command.execute
content.search
content.restricted.reveal
content.moderate.preview
content.moderate.execute
audit.read
audit.export
staff.approval.review
staff.emergency.command
```

Permissions are server-owned constants or policy configuration. Client source
may consume a server capability projection but must not duplicate policy.

## 4. Route And Data Access Matrix

Legend: `R` read, `M` mutate within policy, `A` approve when independent,
`-` denied.

| Surface | Support Agent | Support Lead | Finance Ops | Moderator | Admin | Super Admin |
|---|---:|---:|---:|---:|---:|---:|
| Operations overview | R | R | R finance | R moderation | R | R |
| User search / masked Customer 360 | R | R | R financial subset | R public/content subset | R | R |
| Support Cases | R/M own | R/M team | R linked finance | R linked moderation | R/M | R/M |
| Trace lookup sanitized | R | R | R financial | R content | R | R |
| Finance queue | - | R summary | R/M | - | R summary | R/M |
| Community moderation | - | R linked | - | R/M | R/M configured | R/M |
| Content search | R metadata | R metadata | - | R/M | R/M | R/M |
| Restricted media reveal | - | reasoned/configured | - | reasoned/configured | reasoned/configured | reasoned/emergency |
| Audit search | R Case-linked | R team | R financial | R moderation | R | R |
| Audit export | - | - | configured | - | configured | configured |

Customer scope, team scope and Case linkage further restrict every `R`, `M` or
`A`. The table is an upper bound, not a grant by itself.

## 5. Risk Tiers And Approval

| Tier | Meaning | Minimum control |
|---|---|---|
| R0 | sanitized read | role policy and Audit where sensitive |
| R1 | reversible operational recovery | eligible Case, reason, idempotency and Support Lead policy |
| R2 | customer/account or content availability change | explicit impact confirmation, expected version and enhanced Audit |
| R3 | financial mutation within configured limit | Case evidence, immutable dry-run and Finance/Support policy |
| R4 | high-value, irreversible, role/security or emergency action | independent two-person approval, expiry and reconciliation |

Rules:

- requester cannot approve their own R4 command;
- approver sees and approves the immutable dry-run fingerprint;
- target/version/impact change expires the approval;
- limits are server configuration, never client constants;
- `super_admin` bypass is not automatic; emergency commands remain reasoned,
  time-bound and separately audited;
- production financial commands remain disabled until durable Command,
  Approval, Ledger and Audit persistence is active.

## 6. Command Catalog

### 6.1 Generation

| Command | Owner facade | Tier | Requester | Approval | Terminal proof |
|---|---|---:|---|---|---|
| `generation.retry` | Generation | R1 | Support Lead | policy-based | new/existing operation reaches known state; no duplicate Credit effect |
| `generation.cancel` | Generation | R1/R2 | Support Lead | required after dispatch by policy | cancellation or non-cancellable owner result |
| `generation.recover_terminal` | Generation | R1 | Support Lead | no second approver by default | durable Job/result state reconciled |

Preview must show Job/Group, current state, provider dispatch, output state,
Credit settlement and whether retry is safe.

### 6.2 Credits

| Command | Owner facade | Tier | Requester | Approval | Terminal proof |
|---|---|---:|---|---|---|
| `credits.refund_reservation` | Credits | R3 | Finance Ops or configured Support Lead | limit-based | original reservation released/refunded once |
| `credits.compensate` | Credits | R3/R4 | Finance Ops or configured Support Lead | amount/policy-based | separate compensation ledger event |
| `credits.reconcile` | Credits | R3 | Finance Ops | configured | account projection equals immutable ledger |

Client-supplied balance, price or Credit amount is never authoritative. Preview
references the original Quote/Reservation/Capture where available.

### 6.3 Payments

| Command | Owner facade | Tier | Requester | Approval | Terminal proof |
|---|---|---:|---|---|---|
| `payments.refund` | Payments | R3/R4 | Finance Ops | threshold-based | provider refund and local settlement reconcile |
| `payments.reconcile` | Payments | R3 | Finance Ops | configured | payment and granted Credits reconcile once |
| `payments.replay_webhook` | Payments | R3 | Finance Ops | configured | event deduplicated and projected once |

These commands remain unavailable until the Payments capability and durable
provider event/idempotency contracts from Requirement 018 are implemented.

### 6.4 Identity And Sessions

| Command | Owner facade | Tier | Requester | Approval | Terminal proof |
|---|---|---:|---|---|---|
| `identity.suspend` | Identity | R2/R4 | Admin | policy/risk-based | account status changed, sessions handled, evidence retained |
| `identity.reactivate` | Identity | R2 | Admin | configured | current policy allows active status |
| `identity.revoke_sessions` | Identity | R2 | Admin | explicit confirmation | targeted sessions invalidated |

Staff cannot mutate their own role/status or use these commands as hidden
impersonation. Impersonation remains deferred.

### 6.5 Community, Templates And Assets

| Command | Owner facade | Tier | Requester | Approval | Terminal proof |
|---|---|---:|---|---|---|
| `community.moderate` | Community | R2 | Moderator | policy-based | post visibility projection updated |
| `templates.disable_reuse` | Templates | R2 | Moderator/Admin | configured | new use sessions rejected |
| `templates.quarantine` | Templates | R2/R4 | Moderator/Admin | scope-based | Template and unsafe placements fail closed |
| `templates.restore` | Templates | R2 | Moderator/Admin | dependency review | all required dependencies allowed |
| `templates.retire` | Templates | R2/R4 | Admin | reversibility/policy | lifecycle updated; history retained |
| `assets.quarantine` | Assets | R2/R4 | Moderator/Admin | affected-scope based | original/derivatives/delivery/reuse blocked |
| `assets.restore` | Assets | R2 | Moderator/Admin | dependency review | allowed delivery restored consistently |
| `assets.replace_presentation` | Assets | R2 | Moderator/Admin | configured | presentation lineage and placements updated |

There is no generic delete command. Legal hold and evidence retention override
ordinary cleanup without making content public.

## 7. Command Request Contract

Every material command includes:

```text
caseId
commandType
targetCapability
targetType / targetId
expectedVersion
reasonCode / reason
evidenceLinks
customerVisibleNote when applicable
idempotencyKey
dryRunFingerprint
requestedActor derived from authentication
```

The server derives permission, target owner, current state, amount, units and
approval policy. Support stores the owner operation ID and observes the owner
result; it never emulates the mutation.

## 8. Self-Action, Scope And Separation Rules

- no staff actor approves their own two-person command;
- no staff actor compensates their own customer account;
- no staff actor changes their own roles or status;
- Finance access alone grants no private-media access;
- Moderator access alone grants no financial mutation;
- Support access alone grants no moderation mutation;
- restricted reveal expires and does not create a reusable public URL;
- bulk destructive action is out of MVP scope;
- every denial returns a stable code and safe support reference.

## 9. Acceptance IDs

- `POL-017-01`: every route, reveal and command maps to a server permission.
- `POL-017-02`: current `admin`/`support` compatibility is explicit, bounded and
  cannot enable financial mutation accidentally.
- `POL-017-03`: every command maps to one capability facade and one risk tier.
- `POL-017-04`: self-action and same-person approval are denied server-side.
- `POL-017-05`: approval is bound to an immutable, unexpired dry-run.
- `POL-017-06`: repeated command submission resolves to one owner operation and
  one settlement.
- `POL-017-07`: Money, Credits and content commands retain separate policy and
  Audit evidence.
- `POL-017-08`: unauthorized UI and direct API attempts both fail.
- `POL-017-09`: high-risk commands remain disabled until their durability and
  owner-capability prerequisites pass.

Requirement 017-006 owns validation evidence for this matrix.
