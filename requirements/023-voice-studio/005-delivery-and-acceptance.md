# VS-05 — แบ่งงานและเกณฑ์ตรวจรับ

Parent: [Basic release](000-master.md).
Status: Basic and Revision 2 source implemented; offline integration checks passed.
Live Basic AC11 / R2-AC12 remain open. Tracked in [task plan](task-plan.json).

## 1. ลำดับงาน

| Task | Owner / scope | Depends on | ผลที่ตรวจรับได้ |
|---|---|---|---|
| VS-T01 | Backend: config schemas, registry integration, safe catalog | requirement accepted | เพิ่ม/ปิด model และเพิ่ม voice ผ่าน JSON; schema error ไม่ทำให้บริการอื่นล้ม |
| VS-T02 | Backend: documents/characters repository + routes | T01 | CRUD/archive, revision conflicts, actor isolation และ reload ผ่าน |
| VS-T03 | Generation/Provider/Credits/Assets: speech operation | T01 | canonical job → validated WAV → owned asset; retry/usage/settlement ถูกต้อง |
| VS-T04 | Backend: Take projection, selection/save/library/metadata/delete | T02,T03 | จบงานแล้วมี Take; save/replay ไม่สร้างซ้ำ; rename/tags ไม่แก้เสียง; delete ตรวจ references; log แยกจาก library |
| VS-T05 | Frontend: route/document editor/row inspector/presets | T01,T02 | เขียนบท เลือกเสียง แทรก tag และ autosave ได้ทุก viewport |
| VS-T06 | Frontend: Voice Creator + Voice Manager/player/takes/download | T03,T04,T05 | สร้าง→ฟัง→เลือก→save→download จบ; manager ค้นหา/กรอง/rename/tag/delete/presets ได้; เล่นแถวตามลำดับได้ |
| VS-T07 | QA + scoped independent sensitive review | T01–T06 | acceptance ด้านล่างและ Thai listening ผ่าน; ระบุ live gaps ตามจริง |

หนึ่ง primary implementer เป็นค่าเริ่มต้น ไม่จำเป็นต้องแตก agent ตามทุกแถว
ก่อน T03 จัด JSON plan ของ cross-capability/sensitive implementation พร้อม write scopes,
contracts และ independent security/commercial review; งานเอกสารรอบนี้ไม่ได้เปิด gates เหล่านั้น
UX review ใช้ agent ที่ผู้ใช้ขอ; Product/architecture synthesis ใช้ root ไม่เพิ่ม BSA อีกคน

## 2. Acceptance traceability

| AC | เงื่อนไขผ่าน | Evidence ที่ต้องมี |
|---|---|---|
| VS-AC01 | model/voice/capability มาจาก catalog เดียว ไม่มี UI model table ซ้ำ | schema tests + config update integration |
| VS-AC02 | document/rows/presets แก้และ reload ได้; conflict ไม่สูญเสียงาน | repository/API tests + browser flow |
| VS-AC03 | text/style/tag ส่งถูกส่วน; newline ไม่เปลี่ยนเป็น speaker ใหม่ | pure compiler + adapter contract fixture |
| VS-AC04 | ใช้ Generation admission/queue; duplicate ไม่ส่ง paid call ซ้ำ | lifecycle/idempotency tests |
| VS-AC05 | quote/submit snapshot ตรงกัน; listen/save ไม่ซื้อซ้ำ | Credits invariant tests + independent review |
| VS-AC06 | output valid WAV; ฟัง/seek/download ได้; failed output ไม่เข้า library | malformed/success fixture + browser playback |
| VS-AC07 | selected/saved Take และ stale revision แสดงตรง ไม่ทับเสียงเก่า | UI state and event-order tests |
| VS-AC08 | A ไม่เข้าถึง B, logout หยุด private playback, log ไม่เผยบท/key | negative API/Range tests + security review |
| VS-AC09 | 390/820/1440px, keyboard, themes/locales, scroll/focus ไม่เด้ง | targeted browser evidence |
| VS-AC10 | image/video Generation, existing outputs และ nav เดิมไม่เสีย | nearest relevant existing regression checks |
| VS-AC11 | เสียงไทยตรงบท ชื่อตัวละครฟังรู้เรื่อง และ style/tag ใช้งานได้ | authorized live sample + human listening notes |
| VS-AC12 | Creator และ Manager อยู่ในรุ่นแรก; manager เปิดได้โดยไม่เลือกบท ค้นหา/กรอง/rename/tag/ฟัง/download ได้ | browser flow + metadata/filter tests |
| VS-AC13 | ลบเสียงตรวจ owner/reference ก่อน; selected Take ไม่ถูกลบจน pointer ถูกแก้; retry ไม่ทำข้อมูลเสีย | negative/reference/reconciliation tests + security review |

ใช้ existing runners; tests เฉพาะ contract/negative cases และ UI ที่เปลี่ยน
ไม่ build สำหรับ requirement-only. ตอน implementation build หนึ่งครั้งหลัง source พร้อม
ไม่รัน paid synthesis ใน automated tests; live check แยกและต้องมี authorization
ไม่อ้างผ่าน AC11 จาก mock waveform หรือการมี model ID ใน config

## 3. Rollout / rollback ที่ต้องเตรียม

- เพิ่ม route/model แบบ additive; local development permissions ของเสียงต้องตรวจ owner
  เดิมก่อน ไม่สืบสิทธิ์จาก image/video bypass โดยอนุมานเอง
- API key, account entitlement, rate-limit และ pricing-policy version ต้องพร้อมก่อนเปิด Generate
  ไม่มีการคิด retail Credits ใหม่โดย requirement author
- เปิด feature ตาม exposure policy เดิมหลัง checks ผ่าน ไม่สร้าง toggle framework ใหม่
- ปิดรับ generation ใหม่ได้ด้วย provider/model availability; ยังเปิดเอกสารและฟังเสียงเดิมได้
- ไม่ลบข้อมูลเมื่อ rollback UI/catalog; ไม่ restart service ระหว่างมีงานโดยอัตโนมัติ

## 4. Documentation checkpoint

### Implementation evidence — 2026-11-15

Backend source T01–T04 implemented. Documents, presets and Take metadata use owning
actor-scoped repositories and optimistic revision commands. Creator/Manager share
successful Take data. Speech operations use shared QueueManager and durable Generation
records; re-open projects completed missing Takes and exposes activeOperationId.
Private WAV delivery reuses Assets with audio MIME/Range and protected browser blobs.
Qualified local Admin admission uses existing AUTH_DEV_BYPASS_GENERATION_ENABLED,
loopback/Origin/CSRF checks and the same private actor; no new login override.
Audio capacity is checked before reservation; physical disk failures never produce
a successful empty Take. UI scopes and runtime paths are mapped in 099.

Credits reserve the configured maximum token cost and capture only valid actual usage
under locked rates/FX/markup/rounding, releasing the remainder. Missing usage/unknown
dispatch retain explicit reconciliation state. Definitive rejections refund; refund
failure remains actionable without redispatch. Listen/save/download never synthesize.
Rates are effective-dated in existing Credit policy; no fixed speech retail tariff.

Root focused server check: **31 tests passed** across voiceStudio, voiceSpeech,
privateMedia, developmentAdmin, providerAvailabilityPolicy and creditReservationService.
Includes real isolated CreditAccountRepository partial capture/replay/wrong owner,
refund failure, duplicate job/Take, tombstone delete retry, WAV MIME/Range/isolation.
createApp import and JSON plan structure checks passed.

Independent `/root/voice_sensitive_review`: **26/26 tests passed**, Security,
Commercial, Backend and QA source review PASS after fixes; additional refund-failure
experiment passed. No paid generation or live financial mutation occurred.
Final narrow review of reload projection/storage preflight and WAV additions retained
PASS with 23 focused tests; this is source evidence, not a live account test.
Frontend T05–T06 source implemented: Creator/Manager, archived-script restore,
configuration presets with free text, localized recovery, protected Blob player/download,
and shared controlled ConfirmDialog for unsaved internal navigation.
Seven focused frontend tests passed, including cancel/stay, explicit leave and saved navigation.
Final `npm run build:web` passed after all source edits (TypeScript + Vite).
The existing vendor chunk-size warning remains; no dependency or bundling refactor added.
Isolated browser flow passed: newline/tag → generate → first selection → save → Manager →
rename/tags → native WAV playback → download. Exactly one generation POST and two private
audio fetches; no paid provider calls and no page errors.

Creator/Manager checked at 390/820/1440px in English; Thai checked with all three themes
at 390/1440px, with no horizontal overflow. Root UX review visually inspected Creator
390/820px and Manager1440px screenshots; component/theme review is scoped, not a claim
that every state/theme/device permutation was tested. Desktop/tablet use a bounded
normal-flow document list instead of a drawer; row delivery stays inline as recorded in001.
Screenshots: `%TEMP%/voice-creator-{390,820,1440}.png`,
`%TEMP%/voice-studio-{390,820,1440}.png`, `voice-studio-th-{390,1440}.png`.
Root applies UX/QA review sequentially to frontend evidence; independent sensitive
review is provided separately by voice_sensitive_review.

Remaining required release evidence: actual Google account/usage response and human
Thai pronunciation/acting listening (AC11). Requirement is not marked fully complete
from mocked audio. Source and UX checks do not establish live voice quality.
T01–T06 source tasks and scoped reviews are complete in JSON plan. T07 offline/source
gates passed; live AC11 remains open. No service restart or deployment performed.

### Earlier documentation delivery (historical)

Completed scope: requirement breakdown, UX proposal, proposed code/data/config ownership,
delivery dependencies และ acceptance. Runtime implementation ทั้งหมดคง planned
architecture map เพิ่ม planned ownership rows พร้อมลิงก์ requirement นี้
Documentation validation passed: เอกสาร 6 ไฟล์, relative links 12 จุด,
JSON example parsing, shared-component reuse paths และ whitespace checks
UX agent review รวมแล้ว; ไม่มี independent backend/security/commercial implementation
review ในรอบเอกสารนี้ และไม่ถือว่า sensitive release gates ผ่านแล้ว
ไม่มี application tests, build, runtime data, deployment หรือ Git operations ในรอบนี้

Requirement amendment: รุ่นแรกมีทั้ง Voice Creator และ Voice Manager อย่างชัดเจน
พร้อมจัดการไฟล์และ character voice presets. เพิ่ม metadata/actions ใน owner เดิม
ไม่เพิ่ม capability boundary, storage path หรือ provider workflow; architecture map unchanged
การเสริมนี้เป็นเอกสารโดย root ไม่ใช่การรีวิว UX agent รอบใหม่หรือ implementation ที่เสร็จแล้ว

## 5. Revision 2 — ordered delivery and acceptance

User confirmed ElevenLabs reference and description-based Custom Voice only on 2026-11-15.
Primary: Product Requirement Architect. Root applies UX review sequentially using
review-product-ux; no new agent or independent review claimed in this documentation pass.
Recorded original UI findings: event dropdown separated from transcript, oversized rows,
navigation/action label collision, hidden direction controls and filters dominating library.

| Task | Scope / dependency | Acceptance |
|---|---|---|
| VS-R2-UX | Existing frontend, independent of remote design implementation | Three clear tabs; compact script rows, selected-row inspector, toolbar at caret, simplified library; preserve every existing action/data |
| VS-R2-DESIGN | Generation/Voice Studio/Assets/Credits; qualified provider and price contracts before dispatch | Durable actor-owned voice identity, sample, save/reuse/archive/delete; bounded candidates, recovery and actual commercial rules |
| VS-R2-INTEGRATE | Depends on both above | My Voices + design form + in-row voice picker, custom-voice synthesis, data compatibility, focused browser/security/commercial checks |

Use one implementer sequentially by default. UX/QA review is scoped to changed controls;
required independent Security/Commercial/Backend/QA review applies to the new private
provider identities and paid design operation, not to delaying the isolated toolbar fix.
These sensitive perspectives are recorded in JSON because design crosses billing and private
data; they may be reviewed in waves, not four simultaneous agents. Do not reuse the Basic
review PASS as evidence for new contracts. No live generation during automated checks.

| AC | Pass condition |
|---|---|
| R2-AC01 | From active dialogue, one event click inserts at stored caret without leaving editor; selected text preserved; undo/redo and Thai IME work |
| R2-AC02 | Popover Escape cancels; keyboard/touch restores active row focus and scroll; another row completing/refetching never moves insertion target |
| R2-AC03 | At 1440px/normal zoom, a six-row script with one selected and ordinary two-line dialogue shows at least three rows without opening Takes; 820/390px need no horizontal scroll; no clipping when text grows |
| R2-AC04 | A user can find character, text, event, Generate and playback without guidance; tabs cannot be mistaken for generation actions; no duplicate Generate controls |
| R2-AC05 | Library begins with files and compact search/filter controls; prior metadata, source link, rename/tags/download/delete/restore actions remain reachable |
| R2-AC06 | Design → hear returned sample → save → bind character → synthesize two rows reuses one remote voice identity; repeat listen/save never creates a voice or speech |
| R2-AC07 | Closing/reloading during or after design recovers the same operation/candidate; unknown timeout/replayed save or sample failure does not silently create another remote voice |
| R2-AC08 | Old prebuilt presets/documents/Takes still work; rename/new design/row style never rewrites old audio or frozen voice snapshot |
| R2-AC09 | Actor B cannot list/bind/synthesize/preview/delete A's custom voice; arbitrary provider ID and incompatible model rejected; logout clears private previews |
| R2-AC10 | Archive, in-use deletion block, remote delete retry, project quota and expired voice recovery preserve existing Takes and audit records |
| R2-AC11 | Documented design/audition pricing maps actual provider responses to frozen quote/settlement; no guessed rates or full-cap capture on unknown usage |
| R2-AC12 | Approved live Google design and Thai reuse listening evidence recorded separately; fixture IDs/audio do not establish account capability or vocal consistency |

Implementation checks: extend existing rowCommands and voiceStudio/voiceSpeech fixtures,
then one focused browser pass at 390/820/1440px, keyboard/Thai insertion, tab preservation,
design failure/recovery, player and filters. Check enabled themes/locales with representative
states; build once after source edits. Usability observation must verify shortest path in
R2-AC04, not merely absence of overflow. Keep existing failed-job-log-only behavior.

Rollout is additive. If remote design is unavailable, existing prebuilt speech and saved
audio remain usable; show actionable status only in design. UI rollback preserves versioned
voice bindings and new records; older code must not overwrite unknown custom bindings.
No service restart, deletion, provider call or Git operation is part of this requirement update.

Documentation checkpoint: updated 000–005, appended proposed tasks in task-plan.json and
planned custom voice ownership in 099. No application/config/runtime-data edits. Remaining
implementation evidence includes reference-image comparison (official guides read; image
download unavailable), design API/account/pricing qualification, sensitive review and Thai
listening. Earlier source completion describes Basic only, not revision 2 acceptance.
Documentation validation passed: task-plan structure via
`node scripts/verify-agent-orchestration.mjs --plan requirements/023-voice-studio/task-plan.json`
and relative links across all six requirement documents. No app tests or build run for
this documentation-only revision. No source files moved or new runtime data created.

### Revision 2 implementation checkpoint — 2026-11-15

User authorized implementation. VS-R2-DESIGN source and scoped sensitive review passed.
CustomVoiceService remains internal to VoiceStudioApplicationService; actor-owned
customVoices projection uses existing repository/paths. Google identities and credential
bindings remain private in Generation speechOperations. Design/create/get/delete use
GeminiSpeechProvider and shared Queue/Credits/Assets. Save is metadata-only; duplicate
admission, preview recovery, tombstone deletion and old prebuilt presets have isolated tests.
Local Admin admission extends only exact custom-voice routes under the existing live flag,
same Origin/CSRF/actor requirements. No new authentication bypass.

Root focused run: 32 tests passed across voiceStudio, voiceSpeech, developmentAdmin and
privateMedia. Independent `/root/voice_sensitive_review` reproduced an orphan WAV from
concurrent recovery. Fixed AudioAssetService to remove the losing file after repository
deduplication; regression proves one asset/one file. Independent final 17 speech/Studio
tests passed with Security/Commercial/Backend/QA source PASS. Review included billing
modality validation and documented model-rate inference; no live endpoint/invoice claim.

Remaining operational limits: cached provider expiry may be conservative after reuse;
credential rotation requires explicit binding reconciliation. Live Google entitlement,
usage/invoice mapping and Thai listening remain open (Basic AC11 / R2-AC12).
Frontend implementation/visual acceptance is recorded separately when available.

VS-R2-UX: frontend typecheck and 10 focused tests passed. Browser evidence covers
selection-preserving event insertion, native Undo/Redo, Escape/caret return, simulated
Thai IME guard, row/tab draft preservation and compact filter close/clear. Editing sent
zero generation requests. Six-row desktop fixture shows five complete rows at 1440x1000;
390/820px checks have no horizontal overflow. Root inspected 1440/820/390 screenshots,
found a too-narrow mobile script title and required full-width correction; corrected
screenshots rechecked. Scoped UX/QA source and browser-evidence review passed by root,
separate from frontend implementer (not a live end-user usability study).
Screenshots: `%TEMP%/voice-r2-script-{390,820,1440}.png`. Custom Voice integration follows;
these editor checks do not close R2-AC06–12 or qualify provider quality.

Additional isolated application integration passed: VoiceStudio facade → durable design
operation → sample projection → repeated save → custom character binding → two speech
rows. Exactly one remote-create fixture call and two synthesis fixture calls, two dialogue
Takes only, and no provider voice ID in public responses. Custom list checks saved/search
filters without rewriting existing projections. Server syntax checks passed.

Revision 2 frontend integration: 13 focused tests and TH/EN key parity passed. Browser
fixtures exercised design, returned sample playback, metadata-only save, character binding
and two dialogue generations using the same application voice ID. Exactly one design and
two speech requests; listening/saving issued no additional generation. Sample controls
inside the modal share the canonical audio element (play/pause/seek/time/stop).
In-use deletion shows bound character names; existing prebuilt and library actions remain.

Responsive checks passed at 390/820/1440px, with representative Thai/English and three
themes. Root inspected Script, My Voices and design-modal screenshots. A clipped mobile
voice action menu was corrected and its viewport bounds checked explicitly. Screenshots:
`%TEMP%/voice-r2-myvoices-{390,820,1440}.png` and
`%TEMP%/voice-r2-design-modal-{390,1440}.png`, alongside Script captures above.

The final browser regression holds a speech operation in dispatching, switches to My
Voices, completes the operation, then returns to Script and finds its completed Take.
Bounded current-document row pointers in VoiceStudioRoute survive tab unmounts; canonical
Generation polling remains unchanged. Pointers clear on terminal outcome, row/document
removal and actor scope change; unresolved reconciliation remains available for recovery.
Dirty script text is preserved. The targeted browser regression and 13 frontend tests
passed after this correction. This is fixture-based source acceptance, not live Google
voice quality or an independent end-user usability study.

Architecture ownership rows updated for CustomVoiceService, customVoices data, private
Generation identities, configuration and frontend components. No files moved. New runtime
projection path: `server/data/voice-studio/customVoices.json`, created on use; no live data
was populated by tests. Source reviews passed; integrated release remains in review until
approved Google usage/invoice and Thai listening evidence is supplied (R2-AC12).

Final `npm run build:web` passed after the running-row recovery correction (TypeScript
and Vite; VoiceStudioRoute 53.44 kB / 14.46 kB gzip). Existing vendor chunk warning remains.
Temporary test Vite server stopped. Task-plan structure and all 14 local requirement links
passed. No live services restarted, deployment, paid API calls or Git operations performed.

### Recovery and navigation correction — authorized 2026-11-15

Case F for settlement; primary Backend Platform Architect (root), independent
Commercial/Backend/QA review. Independent frontend scope uses existing frontend owner;
root performs scoped UX review. Two disjoint implementation scopes save time.

1. Fix delivered design settlement for observed Google usage: input total 287, text
   breakdown 137, audio output 470, thought metadata 979. Preserve raw usage and frozen
   quote/rates, caps, owner checks and idempotent capture. Do not add thought metadata to
   audio tokens or invent a thought tariff. Record rate/usage interpretation explicitly.
2. Check status retries settlement of the existing delivered asset; no remote creation
   or duplicate capture. Surface a safe settlement-specific error instead of silently
   returning a misleading generation-in-progress status on failure. Historical completed
   assets/voice identities remain unchanged. No direct runtime ledger/file edits.
3. Implement UX 7.1 status box with right-aligned Check status, accessible pending state,
   long ID wrapping and exact existing-operation recovery. Repair Audio Library filter
   control sizing. Preserve search/filter results, drafts, saved voices and Takes.
4. Voice Studio becomes an expandable navigation group for existing Script / My Voices /
   Audio Library views, with distinct voice icon. Rename existing Studio group to
   Character & Scene Studio (localized) with distinct visual icon; preserve its children.
   Reuse shell submenu conventions, direct links and back/forward; no duplicate tabs/state.

Checks: actual-shaped usage regression plus invalid/cap/owner/replay checks; delivered
recovery with zero provider calls; focused UI status/filter/navigation tests and browser
390/820/1440px; final build. Live creation is not required for this correction. Existing
usage evidence establishes account response shape, not invoice or Thai listening quality.

Recovery source evidence: 20/20 focused voiceSpeech/voiceStudio tests passed, reproduced
independently by `/root/voice_sensitive_review` with Security/Commercial/Backend/QA PASS.
Four review perspectives are required by the sensitive task validator; one independent
reviewer applies them to this narrow delta. Actual-shaped usage charges evidenced text137
and audio470; unpriced input150/thought979 remain explicit partial-cost evidence. Frozen
caps, invalid usage, wrong actor, capture outage, concurrent read/replay and zero-provider
recovery tested with an isolated real Credit repository. Error codes persist on delivered
failure and clear after capture. No raw prompts or private IDs are emitted in diagnostics.

Read-only recalculation of the reported stored operation with its frozen quote now passes
(5 Credits under that quote's existing rounding). The live reservation/ledger/operation
was not mutated. After backend reload, Check status uses the canonical capture/recovery
path to finish the same job. No new provider generation is necessary. Source changes stay
inside existing mapped ownership boundaries; navigation map delta follows UI completion.

UI correction evidence: 23 focused tests passed for status/form, draft guard, sidebar
and route registry. Browser fixtures verified phase-aware delivered/failed-check status,
long-ID wrapping, right-aligned Check action and duplicate-click lock with form preserved;
Filters button dimensions/dialog access at 390/820/1440px; query-driven submenu selection,
Back/Forward, dirty-draft preservation, mobile menu dismissal and distinct icons. No design
or speech POST was issued. Root inspected status screenshots at all three widths, including
the scrolled mobile action, filters at 390/1440 and navigation at 1440 plus Thai mobile
content. Scoped UX/QA review passed; fixture save failure verifies the draft recovery UI,
not an actual application failure. Screenshots: `%TEMP%/voice-nav-status-{390,820,1440}.png`,
`voice-nav-filters-{390,820,1440}.png`, `voice-nav-sidebar-1440.png` and
`voice-nav-sidebar-th-390.png`.

New feature-local VoiceDesignStatus isolates display from recovery/provider orchestration;
no files moved or new runtime data paths. Navigation ownership map now records existing
Voice Studio views as URL submenus; Character & Scene Studio retains all original child
routes. No other navigation sections or creation workflow were replaced.

Final correction validation: `npm run build:web` passed (TypeScript + Vite,
VoiceStudioRoute 54.79 kB / 14.95 kB gzip); existing vendor-size warning remains.
TH/EN Voice Studio key parity and affected shell labels passed. Frontend command:
`npm.cmd run test --workspace web -- src/features/voice-studio/components/VoiceDesignForm.test.tsx src/features/voice-studio/components/UnsavedChangesGuard.test.tsx src/components/layout/SidebarNavigation.test.tsx src/app/routeRegistry/routes.test.ts`.
Backend command: `node --test --test-reporter=dot test/voiceSpeech.test.js test/voiceStudio.test.js`.
Temporary Vite stopped. Requirement links and task-plan validation passed. This requested
correction is complete; prior live invoice/Thai quality qualification remains separate.
Reload the backend and use the existing job's Check status to apply normal recovery;
no live service restart, direct ledger repair, new paid generation or Git action performed.
