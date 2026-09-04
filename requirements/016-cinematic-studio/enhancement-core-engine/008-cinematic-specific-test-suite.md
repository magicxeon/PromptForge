# Cinematic-Specific Test Suite

**Status:** Automated implementation gates complete; live provider and responsive visual cases remain manual  
**Rule:** Add and run relevant cases at each checkpoint; do not wait until final cleanup

## 1. Fixture Set

Create sanitized deterministic fixtures under `test/fixtures/cinematic/` when
implementation begins:

1. `simple-single-character-project` with one approved Look and three Scenes.
2. `multi-character-look-continuity-project` with two Characters and distinct
   Looks across shared and solo Scenes.
3. `legacy-project-without-authoring-metadata`.
4. `stale-authority-project` with changed Story Source, Character or Look.
5. `storyboard-approved-project` with manual and batch attempts.
6. `video-duration-matrix-project` with Shots spanning supported and unsupported
   provider durations.

Fixtures use fake asset/job/reference IDs and must not contain private media,
API keys, raw provider responses or production user data.

## 2. Contract And Configuration Tests

| ID | Case | Expected result |
|---|---|---|
| CCE-CON-001 | Parse valid field manifest | Stable normalized manifest and fingerprint |
| CCE-CON-002 | Unknown canonical field path | Startup/config validation fails clearly |
| CCE-CON-003 | Dependency cycle | Configuration rejected |
| CCE-CON-004 | Legacy Project without metadata | Parses with inferred non-destructive state |
| CCE-CON-005 | New Project metadata round trip | Values, IDs, locks and provenance retained |
| CCE-CON-006 | Recipe/output contract mismatch | Proposal rejected before Project mutation |

## 3. Authoring State Tests

| ID | Case | Expected result |
|---|---|---|
| CCE-AUT-001 | Edit Simple field | Same canonical Scene field changes |
| CCE-AUT-002 | Switch Simple to Advanced and back | No mutation or value loss |
| CCE-AUT-003 | Save Simple with populated Advanced values | Advanced values preserved |
| CCE-AUT-004 | Lock user field then regenerate | AI proposal cannot replace it |
| CCE-AUT-005 | Change Scene emotional end | Only configured Shot/keyframe dependents become stale |
| CCE-AUT-006 | Keep stale AI value | Field becomes current with user provenance |
| CCE-AUT-007 | Version conflict on apply | Draft and proposal remain recoverable |

## 4. Data Lineage Tests

| ID | Case | Expected result |
|---|---|---|
| CCE-LIN-001 | Complete Setup-to-Finish Project | No unexplained blocking finding |
| CCE-LIN-002 | Duplicate Role Assignment | Cast-stage finding with Role Slot recovery target |
| CCE-LIN-003 | Inactive Character used by Scene | Scene linkage blocked |
| CCE-LIN-004 | Look belongs to another Assignment | Exact Scene/Shot Look field blocked |
| CCE-LIN-005 | Orphan Scene/Beat ID | Story Plan recovery target returned |
| CCE-LIN-006 | Shot Cast subset invalid | Shot recovery target returned |
| CCE-LIN-007 | Unrelated Project edit | Approved Shot/source linkage remains current |
| CCE-LIN-008 | Unauthorized actor | No report data returned |

## 5. AI Proposal Tests

| ID | Case | Expected result |
|---|---|---|
| CCE-AI-001 | Generate from Simple essentials | Missing Advanced fields proposed |
| CCE-AI-002 | Locked and user-authored fields present | Proposal marks them skipped/preserved |
| CCE-AI-003 | Provider transport failure | Current draft unchanged; retry available |
| CCE-AI-004 | Malformed provider structure | Stable error; no partial persistence |
| CCE-AI-005 | Apply selected fields | One optimistic Project mutation |
| CCE-AI-006 | Double Apply | One persistence operation |
| CCE-AI-007 | AI-generated Scene opens Advanced | Every generated value is inspectable |

## 6. Story And Cinematic Semantics Tests

| ID | Case | Expected result |
|---|---|---|
| CCE-STO-001 | Beat without visible change | Blocking readiness finding |
| CCE-STO-002 | Scene exit does not advance Beat | Actionable Scene/Beat warning or blocker by policy |
| CCE-STO-003 | Shot contains two actions/cuts | Split-required blocking finding |
| CCE-STO-004 | Opening Shot contains final emotional state | Future-state leakage finding |
| CCE-STO-005 | Rain outside and unexplained wet interior | Environment conflict finding |
| CCE-STO-006 | Required physical text plus no-text overlay policy | Non-conflicting scoped text authority |
| CCE-STO-007 | Dialogue/audio exceeds Shot | Timing blocker |
| CCE-STO-008 | Multi-Character Scene | Per-Character role, identity and Look retained |

## 7. Storyboard Compiler And Generation Tests

| ID | Case | Expected result |
|---|---|---|
| CCE-SB-001 | Compile same Shot twice | Same contract fingerprint |
| CCE-SB-002 | Manual versus Generate All | Same contract fingerprint and references |
| CCE-SB-003 | Shot emotion conflicts with Project arc | Current Shot target wins |
| CCE-SB-004 | Video camera movement in still | Converted to one still-frame position |
| CCE-SB-005 | Missing identity or approved Look | Generation blocked before quote |
| CCE-SB-006 | Quote versus submit parameters | Exact provider/model/output/reference parity |
| CCE-SB-007 | Shot changes after quote | Re-quote required |
| CCE-SB-008 | Output approved against stale Shot | Approval rejected without losing output |
| CCE-SB-009 | Previous continuity frame unavailable | Explicit fallback, no silent invalid reference |

## 8. Produce/Video Tests

| ID | Case | Expected result |
|---|---|---|
| CCE-VID-001 | Supported exact duration | Eligible packet unchanged |
| CCE-VID-002 | Unsupported duration | Visible split/trim/extend decision required |
| CCE-VID-003 | Approved first frame plus current Shot motion | Both authorities present in packet |
| CCE-VID-004 | Provider lacks requested audio | Unsupported control hidden and packet valid |
| CCE-VID-005 | Look changes in one Scene | Only affected video packets stale |
| CCE-VID-006 | Provider task failure | Existing recovery/refund lifecycle retained |

## 9. Finish And Export Tests

| ID | Case | Expected result |
|---|---|---|
| CCE-FIN-001 | All Shots have current approved video sources | Timeline is export-eligible subject to qualification |
| CCE-FIN-002 | One approved video source is stale | Only owning entry blocks export |
| CCE-FIN-003 | Trim exceeds source duration | Stable validation error |
| CCE-FIN-004 | Transition creates invalid overlap | Stable validation error |
| CCE-FIN-005 | Same current timeline compiled twice | Same timeline fingerprint |
| CCE-FIN-006 | Qualification-only export placeholder | Cannot charge or complete Project |

## 10. UI And Accessibility Tests

| ID | Case | Expected result |
|---|---|---|
| CCE-UX-001 | First Simple Scene authoring | Only understandable essential groups required |
| CCE-UX-002 | Hidden Advanced blocker | Concise summary and direct focus target |
| CCE-UX-003 | AI loading/error/conflict | Stable dialog and recoverable work |
| CCE-UX-004 | Keyboard mode switch and fields | Complete keyboard operation and focus visibility |
| CCE-UX-005 | Thai and English | No clipped labels or missing keys |
| CCE-UX-006 | 390/820/1440 widths | No overlap or horizontal page overflow |
| CCE-UX-007 | Theme variants | Semantic states readable in every enabled theme |

## 11. Preservation Regression Tests

The implementation must retain tests for:

- Setup Story save, role analysis and Continue to Cast;
- Character assignment, replacement/removal and identity readiness;
- Look upload, AI suggestion, preparation, approval, binding and safe deletion;
- Story Plan proposal loading, failure, Apply and immutable approval;
- Scene/Shot add, remove, reorder and duration reconciliation;
- Stage back/forward navigation with version-conflict retry;
- Storyboard manual generation, Generate All, polling and source approval;
- provider/model preference restoration;
- estimate/submission parity and Credit lifecycle;
- History, Download, Collection, Share and media viewer;
- Produce provider capability and Job lifecycle;
- Finish timeline save, export eligibility and incomplete-source blocker.

## 12. E2E Presentation Case

One implementation-only E2E case must create a new Project from Setup through
one qualified Produce attempt with:

- at least one visible Character with an approved Look;
- a story with dialogue or offscreen voice;
- at least three Scenes and multiple Shots;
- distinct emotional start, turn and payoff;
- one physical prop and one continuity constraint;
- Storyboard manual generation for one Shot and Generate All for the remainder;
- one approved Storyboard source per video-eligible Shot;
- one current approved video source per required Finish timeline entry;
- exact Credit confirmation before each paid operation;
- a final Setup-to-Finish data-lineage report showing no unexplained blocker.

Provider execution may use qualified mocks for automated runs. Live paid
qualification is recorded separately and is never triggered by the test suite
without explicit approval.

## 13. Required Commands During Implementation

The implementation handoff must list the exact focused commands used for each
checkpoint plus final TypeScript, i18n, production build and full regression
commands. Test counts must be reported from actual output, not copied from this
requirement.
