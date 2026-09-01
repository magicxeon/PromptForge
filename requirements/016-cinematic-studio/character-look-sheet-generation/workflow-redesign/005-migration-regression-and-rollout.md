# Migration, Regression And Rollout

**Requirement ID:** `016-CLWR-005`  
**Status:** Automated validation passed; manual release matrix pending  
**Priority:** Release gate  
**Primary owner:** QA Release Engineer at implementation closure

## 1. Release Strategy

Deliver the redesign in bounded checkpoints. Do not combine visual restructuring,
prompt correction, optional validation and runtime data migration into one
unreviewable change.

1. P0 prompt bug regression and adapter correction.
2. additive provenance/assurance projection with conservative legacy defaults.
3. source/preparation state and `Save & prepare` UX.
4. dynamic Generation references and corrected resume labels.
5. actual-media Review, rights placement and approve/bind recovery.
6. optional Character Match Check scaffold behind feature exposure.
7. manual responsive/provider qualification and production rollout.

Each checkpoint must leave free complete-Sheet upload and existing approved Look
reuse operational.

## 2. Legacy Data Migration

Migration must be additive and restart-safe:

- do not rewrite data in HTTP routes or React;
- repository migration/backfill uses stable Look/Version/Asset/Job IDs;
- existing generated reviews with trustworthy `generationLineage` derive
  `system_generated` and `lineage_bound`;
- existing uploaded Sheet reviews derive `user_uploaded`; if historical rights
  evidence is insufficient, use `legacy_unknown` rather than inventing consent;
- existing approved bindings retain exact Look/Version IDs;
- unknown/partial records remain readable and display conservative warnings;
- migration is idempotent and records schema/policy version;
- no generated Asset, Job, result, Credit ledger or retired Look audit is
  deleted.

Database readiness:

- repositories remain the persistence boundary;
- evidence and provenance use stable foreign-key-ready IDs;
- lists stay bounded/paginatable;
- large media remains in Asset storage, never embedded in relational/JSON Look
  rows;
- approve/bind partial success remains transactionally recoverable when storage
  moves from JSON to a database.

## 3. Protected Feature Traceability

| Protected behavior | Automated evidence | Manual evidence |
|---|---|---|
| AI suggestion remains editable | component/API test | Thai/English analysis flow |
| Save as draft remains resumable | component/domain test | refresh and reopen |
| Save & prepare creates one draft | idempotency test | no duplicate card |
| Full Look one-image upload | component/service test | long filename/mobile |
| Separate Pieces required/optional roles | component/service test | responsive grid |
| free completed-Sheet path | Credit absence + service test | upload through approval |
| prompt >300 as main prompt | adapter/server regression | successful local estimate/submit |
| Additional Direction limit retained | server negative test | clear error when explicitly used |
| dynamic actual references | payload parity tests | no empty outfit slots |
| exact quote/submit parity | Generation/Credit tests | provider/model/price summary |
| durable Job resume | Job Center integration | navigate/restart/reopen |
| result not auto-approved | service/component test | completed -> Review |
| actual image before approval | component accessibility test | contain inspection |
| upload rights only after preview | component tests | keyboard/mobile |
| generated media has no rights checkbox | component test | generated Review |
| optional validation skip/pass/fail | service/component tests | warning/badge copy |
| approve then bind recovery | Character/Cinematic integration | stale Project retry |
| unapproved discard retained | service/component test | confirm/cancel/refresh |
| approved Look protected | server negative test | no destructive action shown |
| Story Plan gate preserved | Cinematic regression | continue after bound Look |
| actor isolation | domain/API negative tests | actor switch |
| themes/i18n/responsive | catalog/style/component checks | 390/820/1440 all themes |

## 4. Automated Test Plan

### Character Profiles domain/repository

- lifecycle and projection for each provenance/assurance state;
- generated lineage population and tamper rejection;
- uploaded rights actor/timestamp ownership;
- legacy conservative backfill;
- review/approval and retired draft behavior;
- approved/superseded/bound deletion protection;
- actor ownership and reusable Character authorization.

### Generation/Credits

- full main prompt accepted over 300 characters;
- Additional Direction remains empty and is not duplicated;
- estimate/submit parity across zero/one/multiple outfit references;
- provider reference limit and unsupported capability handling;
- idempotent submit, reservation, capture, refund and stale quote;
- navigation/restart resume and terminal polling stop;
- completed result adoption preserves History and Job Center.

### Cinematic integration

- selected Cast identity reaches plan and binding unchanged;
- AI, Full Look, Separate Pieces and complete-Sheet paths;
- approve success/bind success;
- approve failure prevents bind;
- approve success/bind conflict retries only bind;
- assurance reaches Storyboard/video preparation;
- required-role gate remains blocked until an approved bound Look exists;
- replacing Look marks relevant downstream content stale through existing rules.

### React

- source-specific progressive disclosure;
- no close/reopen for Save & prepare;
- one source/review dialog visible at a time with separate Generation modal;
- correct focus restoration and Escape behavior;
- no rights checkbox before uploaded preview or on generated media;
- no empty outfit reference placeholders;
- generated actual image and crop Review before approval;
- validation unavailable/pass/review/fail/skip states;
- partial approve/bind recovery;
- protected Cast sibling sections remain rendered.

## 5. Manual Test Scenarios

Run with at least:

- one AI-suggested wardrobe with no outfit image;
- one uploaded Full Look image;
- one Separate Pieces set;
- one valid completed Character Look Sheet;
- one uploaded image with no Character or a visibly mismatched Character;
- one generated result accepted and one rejected/retried;
- two Cast members to verify selected-Character context;
- one stale Project version during binding;
- one queued Job across backend restart;
- actor switching before review/validation/binding.

Verify at approximately 390px, 820px and 1440px, in Thai/English and every
supported theme. Check keyboard-only operation, visible focus, screen-reader
dialog title/description, non-occluding terminal actions, long filenames,
wrapped warnings and no horizontal scroll.

## 6. Provider And Validation Qualification

Look Sheet image Generation retains the existing `016-CLSG-005` qualification
matrix. Character Match Check requires separate evidence:

- supported input/reference limits;
- privacy and retention behavior;
- latency, availability and terminal recovery;
- price and Credit conversion;
- false pass/false fail review on varied Characters and styles;
- behavior for no Character, multiple Characters, stylized faces, occlusion and
  low-resolution uploads;
- stable policy/model version in evidence;
- clear non-biometric product language.

Do not enable paid validation merely because the UI scaffold exists.

## 7. Observability

Record bounded structured events without raw private media/prompt content:

- source mode selected;
- draft save/save-and-prepare outcome;
- plan and estimate outcome;
- reference count/roles, provider/model and prompt fingerprint;
- submit/queue/provider/result/adoption duration;
- Review approve/reject outcome;
- validation requested/status/duration when enabled;
- approval and binding outcomes, including partial success;
- error code, request/correlation ID and actor-safe resource IDs.

Do not log Base64, complete private prompts, provider secrets or raw validation
reasoning.

## 8. Rollback

- UI rollback restores existing source/preparation entry using the same Look
  records; no data conversion reversal is required for additive fields.
- Prompt hotfix may remain even if redesign rolls back because it restores the
  intended main-prompt contract.
- Optional validation rolls back by disabling feature/provider exposure;
  historical evidence remains readable.
- Generation provider rollback uses existing publication/qualification controls.
- Approved Looks, uploaded Sheets, Jobs, Assets and Credit history remain
  accessible throughout rollback.

## 9. Release Decision

**Pass** only when all automated gates and manual viewport/locale/theme evidence
pass, and no P0/P1 actor, Credit, lineage, approval or binding defect remains.

**Conditional pass** may ship the workflow with Character Match Check hidden if
the base Generation/upload/review paths pass. It may not ship with the prompt
duplication bug, invisible Review media, premature rights checkbox, quote parity
failure or missing approved-Look protection.

**Fail** when any protected behavior disappears, unverified media receives a
validated claim, paid operations bypass exact consent, or actor-private data can
cross ownership boundaries.

## 10. Validation Record (2026-09-01)

Automated evidence:

- 56 backend tests passed across Reference Assets, Character Looks, Cinematic,
  prompt parity and Template Core.
- 71 focused React tests passed across Character Look, Cinematic and Generation
  API contracts.
- web TypeScript typecheck passed.
- focused ESLint passed with zero errors; six pre-existing warnings remain in
  `CinematicStageContent.tsx` for Fast Refresh and hook dependencies.
- production web build passed (2,162 modules transformed).
- Thai/English Cinematic locale JSON parsed with exact parity at 797 keys.
- scoped `git diff --check` passed.
- Playwright opened the owner-scoped Cast route, Preparation dialog and separate
  Generation dialog in Thai at 390/820/1440. All measured viewport widths had
  zero horizontal overflow; terminal actions and the Credit dock remained
  reachable. No Generation was submitted and no Credits were charged.

Repository-wide residual evidence:

- `npm test` completed with 578 passes and 56 failures outside this capability.
  The failures include an existing Character prompt expectation, missing role /
  scoped-AGENTS requirement artifacts, and the root Node runner attempting to
  execute Vitest TypeScript files without the Vitest resolver. The focused
  Reference Asset, Character Look, Cinematic, Generation and Template suites
  listed above remain green. These unrelated failures are not waived as a full
  repository release gate.

Release state is **conditional pass**: the base workflow may proceed to human
testing while Character Match Check stays hidden. English, supported themes,
keyboard/focus and live provider/Credit consent scenarios remain manual gates
and must be recorded before changing the master to Closed.
