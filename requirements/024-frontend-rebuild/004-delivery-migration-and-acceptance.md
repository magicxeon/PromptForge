# FE24-DELIVERY — งานย่อย การตรวจ และการย้ายใช้งาน

สถานะ 2026-11-20: M0 review จบ; M1 Image, M2 Comparison และ M3 Video มี implementation;
scoped evidence/review ใน[005](005-implementation-checkpoint.md)/task-plan.json.
T08 production cutover ยังแยกต่างหาก; ไม่อ้าง full UAT หรือpaidprovider qualification.

Latest implementation: เมนูImage→Comparison→Video บน6502 ตาม006/007;
C01/V01 recovery prerequisites ลงcanonical ownerแล้ว; รอบนี้ส่งมอบT06/T07 preview.

## 1. งานที่เรียงตาม dependency

| ID | งาน / owner ที่เสนอ | Dependency | เกณฑ์รับงาน |
|---|---|---|---|
| FE24-T01 | Inventory + shared boundary + mockup / Product เป็น accountable owner, UX/Backend ให้ข้อมูล | คำสั่งเริ่ม implementation | ระบุ API/exports, dev origin, path/package, draft และ recovery contract; mockup390/820/1440ทั้งสองภาษา; ข้อเสนอสี/controlsชัดเจน |
| FE24-T02 | Scaffold และฐาน UI / Frontend | T01 | web-next เปิดแยกได้, paletteเดียว, TH/EN, controlsทุกสถานะอ่านได้; เว็บเดิมไม่เปลี่ยน |
| FE24-T03 | Shared transport/session/media integration / Backend | T01,T02 | ใช้ implementationเดียว; actor/CSRF/private-media parity; ไม่มี secrets/fetch bypass และมี independent sensitive review |
| FE24-T04 | Playground Image / Frontend | T02,T03 และ recovery dependency ของ Image | Prompt/reference→ตรวจค่า→quote→submit→status→results ใช้งานผ่านเจ้าของเดิม; draftคงอยู่; errorทุกภาพแก้ได้ |
| FE24-T05 | Image inspection / Frontend | T04มี result contract | fit/100%/zoom/pan/fullscreen/download original, thumbnail bounds, private load error และ resizeผ่าน |
| FE24-T07 / M2 | Comparison / Frontend | T04,T05 และ C01 ของ006; ไม่ต้องรอVideo | C01–C05, CMP01–09: ต่อslotแสดงค่า/สถานะถูก, estimateเฉพาะslotเปิด, partial successคงอยู่ |
| FE24-T06 / M3 | Playground Video / Frontend | T04,T05 และ V01 ของ007; ใช้sharednavigationจากM2 | V01–V06, VID01–10: mode/reference/duration/audioตามtypedcontract; playerและrecovery; failedtaskไม่เป็นpreviewดำ |
| FE24-T08 | ย้าย Playground / Backend owner, QA ตรวจ parity | T04–T07 ผ่านและระบุ route parity ครบ | userยืนยันcutover, deep links/session/mediaถูกต้อง, rollbackได้; Image preview อย่างเดียวไม่ผ่านข้อนี้ |

ลำดับปิดงานล่าสุด: M0 requirement review → M1 Image preview (T01–T05) → M2 Comparison preview (T07)
→ M3 Video preview (T06) → M4 เปลี่ยน Playground route (T08). เก็บTaskIDเดิมเพื่อไม่ทำลายtraceability.
แต่ละ milestone ใช้ได้และตรวจจบ
แยกกัน; M1 ไม่ต้องรอ M2/M3 แต่ต้องมีทางกลับ Video/Comparison เดิมและไม่เปลี่ยน default route.
T01 สรุป dependency ต่อ mode; contract gap ของ Video/Comparison ไม่ขวาง M1 หาก Image ผ่านเงื่อนไขตัวเอง.

ตารางนี้คือ scope/rollup; ผู้ใช้อนุญาต implementation แล้ว และ task-plan.json เก็บการส่งมอบ M1/B1.
เมื่อเริ่ม implementation ให้สร้าง execution JSON plan ข้างเอกสารนี้ก่อนงาน migration/
sensitive extraction มี write scopes, dependencies, acceptance และ independent reviews.
Defaultหนึ่ง implementer; เพิ่ม agentเฉพาะ required sensitive review หรือ independentงานใหญ่
ที่ลดเวลาได้จริง. UX/QAที่ไม่ sensitiveทำ sequentialและบอกระดับ independence.
T01 จบเมื่อ common/Image contract และ mockup พร้อม โดยบันทึก gap ของ mode ถัดไปเป็น dependency
ที่มี owner/stop condition; ไม่ต้อง implement recovery ของทุก mode เพื่อปิด T01. Inventory ตาม003 §4.1
และ environment matrix ต้องพร้อมก่อน integration ที่เกี่ยวข้อง. Execution JSON เป็นแหล่งสถานะ/หลักฐาน
implementation ชุดเดียว; Markdown นี้เป็น scope/milestone rollup ไม่สร้าง status ซ้ำกัน.
T03 และ T04/T06/T07 ส่วนที่แตะ quote/submit/recovery/identity ต้องมี Backend, Commercial,
Security ตาม invariant ที่เปลี่ยน และ independent QA/sensitive review ก่อนปิดงาน; ไม่เพิ่ม reviewer
ให้งาน CSS อย่างเดียว. Documentary reviews รอบนี้ไม่ทดแทนการตรวจ implementation จริง.

## 2. Acceptance ที่ต้อง trace ถึงหลักฐาน

| ID | กรณีทดสอบเมื่อ implement | ผลที่ต้องได้ |
|---|---|---|
| AC01 | TH/EN,390/820/1440, keyboardเปิด | อ่านและกดได้ ไม่มี horizontal overflow, toolbarไม่บังPrompt |
| AC02 | เปิด/ค้นหา model, เปลี่ยนprovider | รายการจากcatalog ค่าที่compatibleคงอยู่; incompatibleแก้ได้ ไม่สูญinput |
| AC03 | referenceเต็มcap, เกินcap, providerแจ้งหลายภาพผิด | แสดงจำนวนจริง highlightตรงmapping ทุกภาพเปลี่ยน/ลบได้ |
| AC04 | Promptหลายบรรทัด,IME,สร้างสำเร็จ,สลับImage/Video | Enterไม่ส่งงาน draftแต่ละmodeคงอยู่ ไม่jumpจากbackgroundevent |
| AC05 | เปลี่ยนขนาด/referenceแล้ว Generate, doubleclick/networktimeout | quoteตรงคำขอ, canonical idempotency, ตรวจงานเดิมไม่dispatchซ้ำ |
| AC06 | ภาพportrait/landscape/squareเล็กและใหญ่, resize/fullscreen | fitครบ,100%นิยามถูก, zoom/pan/resetได้, originaldownloadไม่ถูกย่อ |
| AC07 | completed/failed/partial/media404/unknown | successคงอยู่ failedไม่เป็นการ์ดว่าง; logs/statusไม่หาย; media retryไม่สร้างงานใหม่ |
| AC08 | Video rangeและdiscrete duration, first/lastและreference modes | จำกัดตามmodel/combination, sliderเลขsync, playerfitและไม่มีautoplaysound |
| AC09 | Reload/logout/switchactor/privatefile access | draftคืนตามowner ไม่มีข้อมูลหรือpreviewactorเก่าค้าง ไม่มีauthbypass |
| AC10 | Comparisonเปิด/ปิดslotและบางslotfail | ราคา/จำนวน/ผลลัพธ์ตรงslotที่ส่ง; pending/failedแยกและเก็บชิ้นสำเร็จ |
| AC11 | Recent outputsจำนวนมาก, เข้าออกviewerซ้ำ | query/pageและbuffersมีขอบเขต ไม่โหลดoriginalทุกชิ้น; objectURLsคืนทรัพยากร |
| AC12 | เปิดเว็บเดิมควบคู่, deep link, rollback | oldroutes/data/sessionยังใช้ได้; ไม่มีglobalCSS/themeรั่วและไม่มีdraftoverwrite |
| AC13 | Add reference 3 ไฟล์ สำเร็จ 2/เสีย 1; ลบหรือแทนขณะ upload | เก็บ 2 ไฟล์เดิม retry เฉพาะไฟล์เสีย; late response ไม่คืนไฟล์ที่ลบ; ไม่ submit โดยตัดไฟล์ที่ยังไม่พร้อมเงียบ ๆ |
| AC14 | Use reference/Image→Video/Reuse เมื่อมี draft เดิม | เห็น field/slot ที่จะเปลี่ยน; cancel แล้วข้อมูลเดิมครบ; confirm แล้วเปลี่ยนเฉพาะที่แจ้งและ quote ใหม่ ไม่มี dispatch |
| AC15 | Server รับ POST แต่ response หายก่อนมี job ID แล้ว reload | คืน request intent ภายใต้ actor เดิมและ reconcile ผ่าน owner โดยไม่ออก identity ใหม่; failed/unknown ยังเปิดตรวจจากรายการงานได้ |
| AC16 | งานเสร็จระหว่างพิมพ์บน mobile; เปลี่ยน TH/EN | ไม่เปลี่ยนแท็บ/focus/scroll/draft; ตัวบอกผลใหม่เข้าถึงได้; submitted snapshot ไม่เปลี่ยนตาม draft |
| AC17 | เข้า/ออก Comparison และ retry slot ที่ fail | normal draft คงอยู่; แยก shared/per-slot ชัด; retry scope/estimate ตรง contract ไม่สร้าง slot สำเร็จซ้ำ |
| AC18 | Browser text zoom 200%, keyboard/pinch/expanded viewer | reflow ใช้ได้; ลูกศร pan เฉพาะ focused zoom surface; Fit เลื่อนหน้าได้; ปิด viewer คืน focus |
| AC19 | Quote ตอบสลับลำดับ/หมดอายุ/เงินไม่พอ/slot เปลี่ยน | แสดงราคาคำขอปัจจุบันก่อน explicit submit; ไม่ dispatch ด้วย stale quote; same-operation retry ไม่จองซ้ำ |
| AC20 | Missing/invalid CSRF, forged actor, auth-mode change, cross-tab logout, late JSON/blob | ไม่ mutate/แสดง private data ข้ามสิทธิ์; cache/draft/media แยก canonical scope และล้างตาม lifecycle ทั้งสอง frontend |
| AC21 | Private thumbnail/original/download/poster/playback/range กับ actor ผิด/หมด session | server ปฏิเสธ bytes/metadata ที่ไม่มีสิทธิ์; UI หยุดเล่น/ล้างสื่อเก่า; ไม่มี public URL workaround |
| AC22 | Cancel race/partial success/repeated terminal observation/media retry | settlement จาก owner ครั้งเดียว; ไม่สัญญา refund จาก UI; success คงอยู่และไม่สร้างใหม่เอง |
| AC23 | Recent limit/continuation และเปิด deep link/login return ใน preview | ไม่โหลดเกิน bound/รายการซ้ำ; selection คงอยู่; route/base/return destination ถูกต้องและกลับเว็บเดิมได้ |

AC07/22: Cancel มีเฉพาะ API ที่รองรับ; pending cancel ยังไม่ใช่ cancelled. ถ้า completion ชนะ
ต้องเก็บผลสำเร็จ; cancelled ที่ยืนยันแล้วหยุด spinner. ไม่แสดงปุ่มสั่งที่ backend ทำไม่ได้.

| Task / milestone | Acceptance scope |
|---|---|
| T01 | รายการ contract/dependency ตาม003 §4.1, environment matrix และ mockup; ไม่อ้าง runtime PASS |
| T02 | AC01/18 ด้าน shell/controls/TH/EN |
| T03 | AC09/12/20/21/23 ด้าน common transport/identity/mount; video range ทวนใน T06 |
| T04 / M1 | AC02–05/07/09/11/13–16/19/22/23 เฉพาะ Image; AC14 เฉพาะ Use reference/Reuse |
| T05 / M1 | AC06/11/18/21 ด้าน Image viewer/download |
| T07 / M2 | CMP01–09 ใน006; AC10/17 และ AC02–07/09/11/15/19/22 เฉพาะ Comparisonภาพ |
| T06 / M3 | VID01–10 ใน007; AC08 และ AC02–05/07/09/11/13–16/19/21–23 เฉพาะ Video รวม Image→Video |
| T08 / M4 | AC12/23 route parity/rollback และ UAT ของ scope ทั้งหมด; ใช้หลักฐานก่อนหน้าที่ยังตรง ไม่รันซ้ำโดยไม่มีเหตุ |

Shared checks ทวนเฉพาะ input/contract/layout ที่เปลี่ยน; ไม่มีข้อกำหนด Video/Comparison มาขวาง M1.

เลือก focused checks ตามส่วนที่เปลี่ยนและ runnerเดิม; ไม่สร้าง aggregate runnerเพียง
เพราะมีหลายงาน. ใช้ mocked transport/isolated fixturesก่อน; livepaid UATต้องแยกและได้รับ
อนุญาต. Mockupไม่ใช่หลักฐาน integration; mocked APIไม่ใช่หลักฐาน providerคุณภาพจริง.
Buildเมื่อถึง sourceพร้อมส่ง; ไม่มี build/testsในรอบ requirementนี้.

## 3. Cutover และ rollback

เปิดหน้าใหม่แบบpreviewแยกก่อน; defaultเว็บเดิมคงอยู่. ภาพ→Comparison→วิดีโอ
เป็น milestone แต่ไม่ตัดฟังก์ชันเดิมเพื่อเรียก migrationว่าจบ.
ก่อนcutoverจัด parity listของPlaygroundเดิม: reference picker/trustedhandoff,
activejobs, comparisons, history, downloads, creditsและreturnnavigation.
Look Sheet/Character-specific flow ที่ยังไม่ย้ายต้องมีลิงก์กลับเดิมชัดเจน.
เลือก route/deep-link mapping และ test recovery/sessionทั้งสองfrontendsก่อนเปลี่ยน default.
ผู้ใช้ยืนยันผลและcutoverแยกจากอนุมัติimplement. Rollbackสลับ frontend entryกลับเดิม
โดยไม่ย้อน ledger/job/media หรือเอาdraftใหม่เขียนทับเก่า.
เลิกใช้oldPlaygroundหลังparity/UATและobservationผ่าน; ไม่ลบwebทั้งชุดเมื่อหน้าอื่นยังใช้อยู่.
กำหนด removal checkpointของtemporary adaptersในexecutionplan ไม่ปล่อยสองownerถาวร.

## 4. ฐานสำหรับ milestone ถัดไป

ใช้M1/U1ที่ส่งมอบแล้ว: web-next, fixedlightpalette, TH/EN, Radix, canonicalbridge
และpreview6502. ไม่ต้องตกลงscaffoldใหม่. เพิ่มเฉพาะComparison/Video presentationตาม006/007
และowningcontract prerequisitesที่ระบุไว้. ไม่มีการตัดสินใจใหม่ด้านราคา สิทธิ์เผยแพร่
หรือretention; การเลือกplayer packageใหม่ต้องมีเหตุผลเมื่อreuseของเดิมไม่เพียงพอ.

## 5. Checkpoint รอบเอกสาร

รอบแรก 2026-11-19 สร้าง000–004 และ planned ownership ใน architecture map โดย root review ตามลำดับ.
รอบ 2026-11-20 ผู้ใช้สั่ง delegated review และปรับปรุง requirement ตาม flow; root เป็นผู้แก้เอกสารคนเดียว.
บันทึก coverage/disposition ของ review ด้านล่าง; ไม่ใช่การอนุมัติ sensitive implementation หรือ production release.
ไม่มี app source/config/runtime data เปลี่ยน ไม่มี tests/build, paid calls, service restart หรือ Git.
Architecture map unchanged ในรอบ review: ขอบเขต planned frontend และ runtime owner เดิมไม่เปลี่ยน.

### Review coverage และ disposition (2026-11-20)

ใช้ agents แยกตามงาน review ที่เกี่ยวข้อง ไม่แยก agent เพิ่มสำหรับแต่ละมุมมองที่ตรวจร่วมกันได้.
ทุก reviewer อ่านอย่างเดียว; root ใช้ Product Requirement Architect/Technical Lead รวมข้อเสนอและแก้000–004.

| Agent / perspective | สิ่งที่พบและปรับใน requirement |
|---|---|
| `fe24_ux_review` / UX/UI | Prompt-first layout, defaults, mobile ไม่ย้ายแท็บเอง, explicit handoff, reference lifecycle, viewer keyboard และ200% reflow → 001/002, AC13/14/16/18 |
| `fe24_user_journey_review` / user walkthrough | ป้องกัน draft overwrite, ทางกลับงานค้าง/failed, mixed upload failure, unmapped refusal, Comparison เข้าออก, Image-only milestone → 002/004, AC13–17 |
| `fe24_architecture_review` / System Architecture รวม Frontend, Backend/API และ data ownership | ตรวจ dependency/identity lifecycle, recovery-before-ID, bounded lists, preview mount และแยก draft/operation/result → 003 §2–4.1, T01/T03 และ prerequisite ต่อ mode |
| `fe24_security_commercial_review` / Security/Privacy และ Credits | same-operation identity, stale quotes, negative auth/CSRF/epoch, private media ทุกทางและ settlement owner → 002 §6,003, AC19–22; implementation gates ยัง pending |
| `fe24_bsa_review` / BSA + delivery traceability | T08 ให้ Backend เป็น owner, acceptance แยก Image/Video/Comparison, T01 มีขอบเขตจบ, cancel race → 004 task/AC mapping |
| `fe24_qa_review` / independent QA | Documentary PASS หลังรวมข้อเสนอ: ไม่มี blocking contradiction/essential gate ขาด; AC01–23 trace ถึง task, milestone จบแยกได้ และ protected behavior/cutover ครบ; ไม่ใช้แทน runtime/UAT |

การขยายที่รับไว้จำกัดเพื่อให้ flow จบ: recovery entry, draft protection, per-reference retry,
per-mode contract inventory และ acceptance ที่ตรวจได้. ไม่เพิ่ม timeline/node editor/Voice/ใหม่ทั้ง backend.
Library/palette/package path ยังคงเป็น T01 decision; ไม่แปลงข้อเสนอเป็นการอนุมัติโดยอัตโนมัติ.
ไม่เรียก Cinematic/production-generation agents เพราะไม่ได้ออกแบบเรื่อง/ช็อตหรือเปลี่ยน provider dispatch/คุณภาพสื่อ.
Database review ครอบคลุม ownership โดย Architecture; ไม่มี schema migration จึงไม่เปิดงานฐานข้อมูลเพิ่ม.

ผลตรวจเอกสารรอบM0เดิม: local Markdown links ของ000–004 resolve ครบและไม่มี Unicode replacement character.
ณรอบM0นั้น M1–M4ยังไม่เริ่ม; สถานะล่าสุดM1/U1และruntimeevidenceให้อ่าน005/task-plan.json.

### Comparison/Video requirement checkpoint (2026-11-20)

ส่งมอบ006/007พร้อมflow,sourceownership,dependencies,tasksและacceptance; ปรับเมนู/
milestone/linksใน000–004ให้สอดคล้อง. Productเป็นprimary, UX/QAตรวจเอกสารตามลำดับ
โดยrootคนเดียว (ไม่ใช่independentimplementationreview). ไม่มีapp/source/config/runtime
dataเปลี่ยน ไม่มีbuild/tests,paidcalls,service restartหรือGit. Architecture mapเพิ่มเพียง
plannedComparisonpresentationในขอบเขตFE24. ตรวจlocalMarkdownlinksและnavigation/milestone
consistencyก่อนส่งมอบ. JSONexecutionplanของงานที่เสร็จแล้วคงเดิม; เมื่อได้รับคำสั่ง
implementจึงเพิ่มC/Vexecutiontasksและindependentsensitivegatesตามcontractที่เปลี่ยนจริง.

ผลตรวจรอบนี้: เอกสาร024จำนวน8ไฟล์อ่านUTF-8ได้, localMarkdownfilelinks30รายการresolveครบ,
menu/milestone orderสอดคล้องและไม่มีข้อความลำดับM2Video/M3Comparisonเก่าค้างในชุด.
Requirement006/007และการเชื่อมmasterเสร็จแล้ว; app implementationยังไม่เริ่มและรอคำสั่งผู้ใช้.
