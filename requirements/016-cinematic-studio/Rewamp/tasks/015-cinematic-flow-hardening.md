# Task 015 - Implementation And Cinematic UAT

Owner: [requirement 015](../015-cinematic-flow-hardening.md).
Status: implementation and focused checks delivered, 2026-09-27; live UAT pending.

## Ordered Work

| Task | Scope | Dependency | State |
|---|---|---|---|
| FH01 | Audit canonical flow, write requirement, UX design | Existing tasks 008-014 | Delivered; protected surfaces retained |
| FH02 | Actor-scoped document recovery and navigation safety | FH01 | Implemented; 59 recovery/writer tests pass |
| FH03 | Render round-trip selection and readiness/impact presentation | FH01 | Implemented; Produce, route, advisory and adapter tests pass |
| FH04 | Partial portable-reference resolution and safe prompt numbering | FH01 | Implemented; backend and portable UI tests pass |
| FH05 | Chapter Final selected-clip review and exact Shot return | FH03, existing bundle | Implemented; 16 Final UI and 5 bundle tests pass |
| FH06 | Responsive/keyboard/zoom checks and focused regression groups | Each slice | Fixture browser checks pass; native zoom/IME/live playback remain UAT |
| FH07 | Cleanup audit, results and integrated user test guide | FH02-FH06 | Delivered; zero files deleted, one duplicate contract consolidated |

No obsolete module is deleted without consumer evidence. Preserve original media,
historical Takes, draft text, Engine/Target, Queue and Credit behavior.

## Test Policy

Reuse `scripts/test-cinematic-video.js` and existing isolated browser runners.
Register actual focused groups only after their tests exist. No full-suite run by
default. Backend/React tests mock paid providers and use temporary repositories.
Screenshots: 390, 820 and 1440; Thai/English; 200% equivalent 720 CSS-pixel layout.
Record unverified live-provider and native input behavior explicitly.

## User UAT Sequence

Use a disposable Project or intentional test revisions. AI/media generation may
cost Credits; no automated command in this packet performs it.

1. Open Brief and Full Story. Edit text, leave/reload, recover or discard. Check
   saved server content changes only after Save. Repeat for Chapter/Scene/Shot.
2. Revise one Chapter with no instruction. Review before Apply. Existing Scenes,
   Shots and media remain. Reorder Chapters/Scenes; verify order and selection.
3. Select Scene Characters/Looks. Open a Shot and inspect reference readiness;
   fix a missing Look, save, and verify warnings clear without regenerating media.
4. Edit Shot and Video Prompt. Save, open Render, switch/preview Takes, return to
   the same Shot and reload. Preview does not approve or select a different Take.
5. Change an upstream revision or Look. Inspect impact warnings; old media remain
   available. Never silently replace a previously approved result.
6. Prepare external Shot export with all references, then with an unavailable
   reference. Check labels, image numbers, errors and Copy/Download fallback.
   A custom prompt with stale image numbers must not be presented as ready.
7. Open Final with completed and missing clips. Follow a missing row to its Shot,
   return, and download selected clips. Partial ZIP requires explicit consent.
   Compare manifest Scene/Shot order and Take IDs with the selected results.
8. Repeat representative authoring/Final views on mobile, tablet, desktop and
   200% zoom. Use Tab/Enter/Escape; verify focus, no overlap and readable errors.

## Results And Remaining Risks

### ผลการดำเนินงาน

- เก็บ draft ของ Full Story, Chapter, Scene, Shot และค่า Trim ใน Timeline แยกตาม
  ผู้ใช้/Project/เอกสาร กู้คืนหรือทิ้งได้เอง ไม่เขียนทับข้อมูลบน server อัตโนมัติ
- กรณี server มี revision ใหม่ ต้องยืนยันก่อนกู้ draft เก่า การพิมพ์ระหว่างรอ Save
  รวมถึงแก้กลับเป็นค่าเดิม จะไม่ถูกผล Save ทับ หากพื้นที่เก็บ draft เต็มจะเตือนก่อนออก
- ไป Render แล้วเปลี่ยน Shot/Take สามารถกลับมายัง Shot เดิมที่เลือก และเปิด Take นั้น
  ต่อได้ การ Preview ไม่ได้เท่ากับ Approve และจะไม่เปิดงานภาพเป็นงานวิดีโอจาก URL
- เพิ่มรายการตรวจความพร้อมและผลกระทบจาก revision/Look/ภาพต้นทาง โดยเป็นคำเตือน
  ไม่เพิ่มกฎล็อกงานสร้างสรรค์ การตรวจสิทธิ์และข้อกำหนดจริงยังอยู่ที่ server
- Export ไปใช้ภายนอกได้บางส่วนเมื่อ reference บางภาพใช้ไม่ได้ แสดงว่าภาพใดมีปัญหา
  พร้อมเรียงเลขใหม่ หาก prompt ที่เขียนเองอ้างเลขเดิมจนกำกวม จะไม่ให้ Copy prompt นั้น
  แต่ยังดาวน์โหลดภาพที่ผ่านการตรวจสิทธิ์ได้
- หน้า Final แสดงคลิปที่เลือกใช้จริง พร้อมเหตุผลของ Shot ที่ยังขาด/ข้อมูลเปลี่ยน
  เปิดกลับไปแก้ Shot ได้ ดาวน์โหลด ZIP บางส่วนต้องยืนยันก่อน ค่า Trim เป็น metadata
  ไม่ได้แปลว่าไฟล์วิดีโอต้นฉบับถูกตัดหรือรวมแล้ว
- รวม schema/API อ่าน clip bundle ไว้ที่เจ้าของเดิม ไม่เพิ่ม generation pipeline,
  polling, คิดเครดิต หรือ post-processing service และไม่ลบไฟล์หรือข้อมูลเก่า

### Role And Review Evidence

Product Requirement Architect owned scope and requirement reconciliation. UX agent
Turing audited the flow and implemented the bounded Final view. Implementation
agent Curie handled recovery and reviewed integration for data loss, actor isolation
and partial references. Parent applied Backend/security and final QA checks.
Review independence is limited: recovery QA included its implementation author;
this is not claimed as independent release certification.

Review found and corrected: in-flight A -> B -> Save -> A overwrite; failed-storage
SPA navigation data loss; URL restoration accepting an image attempt; old Timeline
resetting unsaved trims on project refresh; explicit empty Shot Cast incorrectly
inheriting Scene Cast in advisory checks. Each has focused regression coverage.

Skills used: `review-product-ux`, `implement-generation-workflow`,
`verify-release-regressions`. No settlement/provider-dispatch rule was changed.

### Files And Configuration

New Cinematic-owned source files (each has its matching focused test):

- `web/src/features/cinematic/state/useCinematicTextRecovery.ts`
- `web/src/features/cinematic/components/CinematicRecoveryNotice.tsx`
- `web/src/features/cinematic/components/CinematicChapterFinal.tsx`
- `web/src/features/cinematic/components/authoring/ShotProductionReadiness.tsx`

Extended existing owners:

- Writers: `CinematicFullStoryWriter`, `CinematicChapterWriter`,
  `CinematicSceneOverview`, `CinematicShotWriter`; existing actor storage reused.
- Render/route: `CinematicStageContent.tsx`, `CinematicStudioRoute.tsx` and tests.
- Export: `CinematicPortableShot.tsx`, `produce/ClipBundleDownload.tsx`,
  `api/cinematicApi.ts`, `schemas/cinematicSchemas.ts`, `cinematicSeriesSchemas.ts`.
- Reference/advisory Cast IDs: existing `storyboardGenerationAdapter.ts` helper.
- Backend: `server/domain/cinematic/CinematicApplicationService.js`,
  `CinematicVideoReferencePlanService.js`, `server/domain/assets/VideoClipBundleService.js`.
- Presentation: scoped `web/src/styles/cinematic.css` and TH/EN `cinematic.json`.
- Validation: existing `scripts/test-cinematic-video.js` and
  `scripts/verify-cinematic-shot-workspace.mjs`, plus affected backend/UI tests.
- Docs: requirement/task 015, Rewamp master/index, task 009/010/011/014 and technical
  architecture master. Earlier task completion is not silently upgraded to full UAT.

Configuration: `RECOVERY_LIMITS` in `useCinematicTextRecovery.ts` owns recovery
capacity/retention; there is no new `.env` or server policy. Final manifest uses
actor/Project/version query keys, 60-second GC, no interval/focus/reconnect polling.
No new server runtime data paths. New local browser key:
`mpf.react.draft:cinematic-text-recovery:<actorId>`, schema 1.
No files moved/deleted; no source-file reduction percentage is claimed. Existing
unrelated dirty-worktree changes are not part of this task.

### Focused Automated Evidence

Commands run separately; no full-suite, production build or paid provider call:

| Command/group | Evidence |
|---|---|
| `node scripts/test-cinematic-video.js rewamp-flow-recovery` | 59 tests pass: recovery, notice, four writers |
| `node scripts/test-cinematic-video.js rewamp-flow-media` | 30 backend + 69 UI tests passed before the final Cast helper refinement |
| Targeted Vitest: `ShotProductionReadiness.test.tsx`, `storyboardGenerationAdapter.test.ts` | 7 tests pass after that refinement; media group now includes both |
| Targeted Node test: `partial portable packets` in `test/cinematicFullStory.test.js` | Pass after extending unsafe-number detection to English and Thai image references |
| `node scripts/test-cinematic-video.js rewamp-flow-final` | 5 backend + 16 UI tests pass |
| `node ../node_modules/typescript/bin/tsc --noEmit --project tsconfig.app.json` from `web/` | Type checking passes |
| `node scripts/verify-cinematic-shot-workspace.mjs --flow` | Isolated TH/EN Shot/Final layout, references, recovery, keyboard and partial-ZIP checks pass |
| `git diff --check` and scoped TH/EN key/interpolation checks | Whitespace/catalog checks; unrelated existing locale duplicates not removed |

Browser fixtures cover 390, 720, 820 and 1440 CSS pixels. Final covers three themes;
writer text contrast meets 4.5:1 in the tested states. Screenshots were inspected
for Thai mobile/desktop Final and saved to `%TEMP%/mpf-shot-workspace-*`. The 720px
case is a 200%-zoom-equivalent reflow check, NOT native browser 200% zoom evidence.
Video fixture verifies poster/framing/selection only, not encoded-media playback.
Latest browser evidence: `%TEMP%/mpf-shot-workspace-7cXUEO`; previous run:
`%TEMP%/mpf-shot-workspace-a0Oijv`. Scoped catalog validation passed for 58 TH/EN
keys and matching interpolation variables. Final's 16 UI tests passed again after
disabling implicit focus/reconnect manifest refetch in the shared download dialog.

### Commands For Later Retesting

Prerequisites: installed root/web dependencies. Run from the repository root:

```powershell
node scripts/test-cinematic-video.js rewamp-flow-recovery
node scripts/test-cinematic-video.js rewamp-flow-media
node scripts/test-cinematic-video.js rewamp-flow-final
```

Explicit task-only aggregate (registered, not needed for the separate runs above):

```powershell
node scripts/test-cinematic-video.js rewamp-flow-015
```

These commands use mocked providers/temporary repositories, fail on errors and do
not start workers, mutate live Projects or generate paid media. `rewamp-all` remains
the much broader existing suite; do not use it for every small edit.

Browser runner requires a Vite-only dev server on an unused port (6502 by default),
not a backend restart. In one terminal from `web/`:

```powershell
node ../node_modules/vite/bin/vite.js --configLoader runner --host 127.0.0.1 --port 6502 --strictPort
```

Then from the repository root:

```powershell
$env:CINEMATIC_WEB_ORIGIN = 'http://127.0.0.1:6502'
node scripts/verify-cinematic-shot-workspace.mjs --flow
```

### ขั้นตอนทดสอบต่อเนื่องสำหรับผู้ใช้

1. ใช้ Project ทดสอบ เปิด Full Story แล้วพิมพ์โดยยังไม่ Save เปลี่ยนหน้าและกลับมา
   กดกู้ draft ตรวจว่าข้อความครบ ลอง Reload และทิ้ง draft โดยข้อมูลที่ Save ไว้ยังอยู่
2. ทำซ้ำกับ Chapter, Scene, Shot และ Timeline ลองพิมพ์เพิ่มขณะที่ Save กำลังทำงาน
   ข้อความล่าสุดต้องอยู่ ไม่ถูกผล Save ที่เก่ากว่าทับ
3. เปลี่ยน Chapter revision แล้วกลับมา Scene/Shot ตรวจคำเตือนผลกระทบ ภาพและ Take
   เดิมต้องยังอยู่ ไม่เกิดการสร้างใหม่เอง
4. เปิด Shot เลือก Look/First Frame ตรวจคำเตือนความพร้อม จากนั้นไป Render เปลี่ยน
   Shot/Take กดกลับ ต้องกลับตรง Shot ที่เลือก Reload แล้วลองเปิด Render อีกครั้ง
5. เปิด Export ตรวจชื่อเจ้าของภาพและลำดับ @Image ลองกรณี reference ขาด
   ต้องยังดาวน์โหลดภาพอื่นได้ และไม่เสนอ prompt ที่เลขภาพผิดว่าใช้ได้แล้ว
6. เปิด Final ตรวจว่าแต่ละคลิปตรง Take ที่ Approve ไม่ใช่ Take ล่าสุดเสมอ
   คลิก Shot ที่ยังไม่มีคลิป ต้องไปยัง Shot นั้นโดยตรง และย้อนกลับ Final ได้
7. ดาวน์โหลด ZIP ที่มีคลิปขาด ต้องติ๊กยอมรับก่อน ตรวจไฟล์/manifest ว่าเรียงตาม
   Scene/Shot ปัจจุบันและเป็นต้นฉบับเดิม ไม่คาดหวังไฟล์รวมหนังหรือตัด Trim แล้ว
8. ลองจอเล็ก/แท็บเล็ต/เดสก์ท็อป, ซูมจริง 200%, พิมพ์ไทยด้วย IME และ Tab/Enter/Escape
   หากเลือกทดสอบสร้าง AI จริง ให้ตรวจเครดิตก่อนกด เพราะเป็น UAT ที่ผู้ใช้สั่งเอง

### Remaining Limits

- Native Thai IME, browser-native leave dialogs, actual 200% zoom, assistive tech,
  real signed-media playback and live-provider quality remain integrated UAT.
- Recovery is local to this browser/actor, not cloud backup. Explicit consent to
  leave when storage fails can discard that unsaved text; OS/browser termination
  cannot be prevented. Multi-tab collaborative conflict merging is not implemented.
- No full-series assembly, new audio policy, provider retry, Credit settlement or
  post-processing service activation. Old timeline/protected Render owners remain.
- Size bounds prevent unlimited drafts/ZIPs, but no low-end-device performance
  improvement or live hash/network latency benchmark is claimed.
- Fixture tests are not proof of paid settlement, provider acceptance or live
  long-running network/session recovery. Release closure waits for those checks.
