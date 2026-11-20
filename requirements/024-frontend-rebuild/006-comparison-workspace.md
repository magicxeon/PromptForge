# FE24-CMP — Comparison workspace

วันที่: 2026-11-20 · สถานะ: Implemented preview; acceptance/review ล่าสุดอยู่[005](005-implementation-checkpoint.md) และtask-plan.json.
Owner: Frontend experience / Comparison presentation; Product Requirement Architect
เป็น primary. UX และ QA review เอกสารตามลำดับโดยผู้เขียนเดียวกันในรอบนี้ ไม่ใช่ independent
implementation review. ใช้ [001](001-ux-and-screen-components.md),
[002](002-image-video-workflows.md), [003](003-source-architecture-and-contracts.md) ร่วมกัน.

## 1. ขอบเขตและเส้นทางผู้ใช้

เมนูหลักเรียง **Image → Comparison → Video** ทุกขนาดหน้าจอ.
English ใช้ `Image`, `Comparison`, `Video`; ไทยใช้ `ภาพ`, `เปรียบเทียบ`, `วิดีโอ`.
Comparison เป็น workspace ของตัวเอง ไม่ใช่ toggle ซ่อนใน Image หรือ Video.
รุ่นนี้เปรียบเทียบ **ภาพ** ด้วย Comparison owner เดิม; ไม่ใช้การส่ง Image หลายครั้งจาก browser
มาประกอบเป็น run เอง และไม่เปิด Video Comparison เพียงเพราะ catalog มี flag.

Flow: เปิด Comparison → คืน draft → เขียน Prompt/เพิ่ม reference → เลือกโมเดลในแต่ละ slot
→ ตรวจค่าที่ใช้ร่วมกันและราคาต่อ slot/รวม → กดสร้างชุดเปรียบเทียบ → ดูแต่ละผลลัพธ์
→ ขยายดู/ดาวน์โหลด/เลือกผลที่ชอบ/กลับแก้ input เพื่อสร้างชุดใหม่.
ไม่ต้องตั้งชื่อชุดก่อนสร้าง; ชื่ออัตโนมัติใช้ contract เดิมและแก้ชื่อในรายละเอียดได้.

การเปิดเมนูปกติคืน Comparison draft ของตัวเอง ไม่คัดลอก Image draft ทับอัตโนมัติ.
Image result เพิ่ม action “ใช้ใน Comparison” เมื่อหน้านี้พร้อม: ผู้ใช้เลือกใช้ Prompt/settings
หรือใช้เป็น reference; แสดงเฉพาะ field/slot ที่จะแทนก่อนยืนยันเมื่อปลายทางมีข้อมูล.
ยกเลิกแล้วทุก draft คงเดิม; ยืนยันแล้วไม่ Generate อัตโนมัติ.

นอก scope: Video Comparison, synchronized zoom, difference heatmap, ranking อัตโนมัติ,
public sharing/export sheet/deletion UI ใหม่. งานจัดการขั้นสูงมีทางไปหน้าเดิมโดยรักษา set ID.
ไม่เปลี่ยนสิทธิ์ ราคา retention หรือ provider qualification.

## 2. Layout และการใช้งาน

Desktop: แผงสร้างด้านซ้าย; result grid ด้านขวา. แผงสร้างเรียง Prompt พร้อมปุ่มขยาย
→ reference → model slots → shared settings → สรุปราคาและปุ่มสร้าง.
Prompt ไม่ถูกดันลงด้วย card รายละเอียดโมเดลขนาดใหญ่. ใช้ PromptEditor และ provider/model
picker ที่ FE24-U1 ทำไว้; slot แสดงข้อมูลกะทัดรัดและเปิดรายละเอียดเท่าที่จำเป็น.

ผลลัพธ์2 slot ใช้2คอลัมน์เมื่อพื้นที่พอ;3–4 slot ใช้2คอลัมน์และคงลำดับ slot.
กล่อง preview มีพื้นที่เท่ากันเพื่อเทียบง่าย แต่ภาพแต่ละใบต้อง contain ไม่ crop/ยืด.
แต่ละ slot มี label, provider/model, ค่าที่ใช้จริง, สถานะ และ action เฉพาะผลนั้น.
คลิกขยายใช้ ImageViewer/Fit/100%/zoom/pan/download contract เดิม; เปิดผลอื่นด้วย action
ผู้ใช้เท่านั้น ไม่สลับไปภาพที่เพิ่งเสร็จเอง.

Tablet: ปรับจำนวนคอลัมน์ตามความกว้างจริง ไม่บีบ model name/ปุ่มจนใช้ไม่ได้.
Mobile: ใช้แท็บ `สร้าง / ผลลัพธ์` เหมือน Image; ผลเรียง1คอลัมน์ มีปุ่มเลือก slot
หรือกระโดดไปผลที่ต้องการแบบ explicit. ไม่ทำ horizontal page scroll เพื่อแสดง4ภาพ.
Generate/status อยู่ใน flow ไม่ทับ Prompt; การสลับแท็บ/ภาษา/หน้าต่างไม่ล้างค่า.

## 3. Slot และค่าที่ใช้ร่วมกัน

| ข้อมูล | ขอบเขตและกติกา |
|---|---|
| Prompt / negative prompt | ใช้ร่วมกัน; editor เดียวและ modal เดียว ไม่มี prompt override ต่อ slot ในรุ่นนี้ |
| References | ชุดและลำดับเดียวกัน ผ่าน owner processing; ทุก slot ที่เปิดต้องรองรับชุดนี้ |
| Aspect ratio | ใช้ร่วมกัน; ตัวเลือกที่ใช้ได้คือ intersection ของโมเดลที่เปิด ไม่จำกัดไว้เท่าของ UI เก่า |
| Requested resolution | ใช้ร่วมกันเมื่อ API รองรับ; แสดง resolved resolution/fallback ที่ server คืนต่อ slot ก่อน Generate |
| Slot ID | stable ID แยกจาก index/ชื่อ; reorder ไม่เปลี่ยนตัวตนหรือผูกผลกับตำแหน่งผิด |
| Provider/model | แยกต่อ slot; picker มี provider categories/search เหมือน Image |
| จำนวนผล | หนึ่งผลต่อ slot ตาม Comparison contract ปัจจุบัน; ไม่มีตัวคูณ batch ของ Image มาปะปน |
| Enable/remove/reorder | เปลี่ยน draft เท่านั้น; ไม่ยกเลิกงานที่ส่งแล้ว ไม่ลบผล run เก่า |

Backend ปัจจุบันรับ Image2–4 slot; เริ่มด้วย2 slot ที่ใช้งานได้จาก catalog.
เพิ่ม/ปิด/ลบ/เรียง slot ได้ภายในขอบเขตดังกล่าว; minimum2 หมายถึง slot ที่เปิดก่อน submit.
slot ปิดเก็บค่าร่างไว้แต่ไม่ร่วม estimate, validation หรือ payload.
การเพิ่ม slot ไม่เลือกโมเดล/ราคาแบบ hard-code. หาก policy ไม่มี public limit ให้มีงาน
projection จาก Comparison owner ก่อนเปิด control; ไม่กระจายเลข2/4ในหลาย component.

เมื่อเปลี่ยนโมเดลแล้ว ratio/reference ใช้ร่วมกันไม่ได้ ให้ระบุ slot/field ที่ติดปัญหา
พร้อมแก้ได้ทันที ไม่ตัด reference/เปลี่ยน ratio/ลดคุณภาพอย่างเงียบ ๆ.
กรณี server ใช้ resolution fallback ที่รองรับอยู่แล้ว ต้องแสดงทั้งค่าที่ขอและค่าต่อ slot
เพื่อให้ทราบว่าไม่ใช่การเทียบความละเอียดเท่ากัน; ไม่มีการเพิ่ม per-slot resolution API เอง.
ถ้า intersection ว่าง แสดงเหตุผลกับทางเลือกเปลี่ยนโมเดล ไม่ส่งเพียงบาง slot โดยพลการ.

## 4. Estimate, submission และ recovery

- ใช้ estimate ของทั้งชุดจาก owner พร้อมราคาต่อ slotและรวมเฉพาะ slot ที่เปิด.
  ระบุจำนวน slotที่จะส่งบน action; quote stale/expired/เงินไม่พอคง draft และไม่ใช้ราคาเก่า.
  ปรับ Prompt/reference/ค่าร่วม/slot แล้ว invalidate estimate ตาม normalized input.
- ก่อน POST เก็บ actor-scoped request intent และ idempotency key ของ operation นี้.
  helper รับ stable keyเป็นoptionalตัวที่5และรักษาbackward compatibility;
  FE24ส่งkeyที่persistแล้วเสมอ ห้ามเรียกsubmitซ้ำเพื่อrecover.
- ส่งชุดเดียวผ่าน `submitComparison`; รับ set/run ID แล้วติดตาม canonical run.
  immutable submitted snapshot แยกจาก draft ที่แก้ต่อได้.
- ถ้า response หายก่อนทราบ ID: แสดง unknown + Check status, คืน intent หลัง reload,
  reconcile ผ่าน `getComparisonRequestStatus` แบบ read-only.
  ไม่เดาว่าไม่มีงานเพราะไม่พบในหน้าแรกของ list; ไม่วน POST หรือออก key ใหม่เอง.
- ปิด/เปิดหน้า หรือสลับเมนูไม่หยุดงานที่ server รับแล้ว. Recent sets มี cursor/limit
  ใช้ API เดิม; กดดู run ที่ค้าง/ผิดพลาดได้. ไม่ใช้ current draft ทับข้อมูลของ run เก่า.

## 5. ผลลัพธ์และการแก้ปัญหา

| สถานะ | หน้าจอ / action |
|---|---|
| queued/running | slot status ใช้ ProcessingSpinner; ไม่อ้าง progress ที่ไม่มี; ผลสำเร็จเก่ายังดูได้ |
| completed + image | preview และรายละเอียดค่าที่ส่งจริง; ขยาย/download/เลือก winner ได้ |
| failed/cancelled | ข้อความสถานะกะทัดรัดใน slot พร้อมรหัสงาน; **ไม่มีกล่องภาพดำ/ภาพว่าง** |
| partial success | คงภาพที่สำเร็จและลำดับ slot; สรุปจำนวนสำเร็จ/ล้มเหลว แยก error log |
| all failed | แสดงสรุปสถานะกับทางกลับแก้ input; ไม่สร้าง gallery preview ของชุดที่ไม่มีภาพ |
| image delivery error | retry โหลดภาพเดิม ไม่ Generate หรือคิดเงินใหม่ |
| unknown | ตรวจ operation เดิมก่อนอนุญาตสร้างใหม่; ปุ่ม Check ไม่ dispatch |

Recent preview ใช้เฉพาะภาพสำเร็จ; Activity และประวัติยังเก็บ failed run/slot/error.
การซ่อน preview ไม่ลบ audit/log ของ server. Error reference highlight จาก structured mapping
ของ owner; ถ้าระบุตำแหน่งไม่ได้แสดงระดับ slot/run ไม่เดาว่าภาพแรกผิด.
ปุ่มแก้/เปลี่ยน/ลบ reference ต้องไม่หายเมื่อเกิด error.

การ retry failed slot ไม่ใช่ acceptance ที่ API ปัจจุบันรองรับแล้ว: ยังไม่เปิดปุ่ม retry
ที่แอบสร้างชุดใหม่ทั้งหมด. ให้แก้ draftและสร้างชุดใหม่อย่างชัดเจนพร้อมราคาใหม่ หรือเลือก
“ใช้โมเดลนี้ใน Image” เพื่อทำงานเดี่ยว; ผลสำเร็จเดิมคงอยู่. เพิ่ม retryเฉพาะslot เป็นงาน
owner แยกเมื่อมี contractจริง. Winner ใช้ `setComparisonWinner` กับ jobที่สำเร็จในsetนี้
เท่านั้น; pending mutation/error แสดงตรงปุ่ม ไม่เปลี่ยนผลอื่นหรือเผยแพร่สู่ Community.

## 6. Source และ dependency ที่ตรวจแล้ว

| Owner/source ปัจจุบัน | ใช้ทำอะไร / ช่องว่าง |
|---|---|
| `web/src/features/generation/api/generationApi.ts` | `estimateComparison`, `submitComparison` รับstable keyเป็นoptionalตัวที่5; `getComparisonPolicy`/`getComparisonRequestStatus` |
| `web/src/features/comparisons/api/comparisonApi.ts`, `schemas/comparisonSchemas.ts` | list/detail/name/winner และ typed run/slot |
| `web/src/components/comparisons/ComparisonConfigurator.tsx`, `ComparisonWorkspace.tsx` | อ้างอิง slot ordering/selection/partial result; ไม่ import legacy global CSS |
| `server/domain/comparisons/ComparisonOrchestrator.js`, `ComparisonValidator.js` | canonical estimate/create/read/winner; Image2–4 slots, server resolution fallback |
| `server/app/routes/comparisonRoutes.js` | HTTP façade; GET `/policy` และ `/requests/:requestId` ผ่านComparison owner; lookupไม่mutate/poll/dispatch |
| `web-next/src/lib/canonical.ts` | เพิ่ม explicit exports เท่าที่ต้องใช้ ไม่คัดลอก workflow |

`ComparisonValidator` ปฏิเสธ `mediaType: video` โดยตรงด้วย `video_comparison_not_qualified`.
schemaที่มี video fieldหรือcatalog comparison flag จึงไม่ใช่หลักฐานว่า Video Comparison
พร้อมใช้; รุ่นนี้ไม่สร้างปุ่มสั่งที่ใช้งานไม่ได้. Videoเดี่ยวอยู่ใน[007](007-video-workspace.md).

Presentation ที่ใช้งาน: `web-next/src/features/comparisons/{routes,components,hooks,state}/`.
Route ประกอบหน้าจอ; hooks ประสาน canonical workflows; state เก็บ typed/versioned draft
และ operation intent แยกกัน; components รับ props. แยก slot editor, run results และ
recent sets ไม่รวมทุกอย่างในไฟล์เดียว. ใช้ shared media/prompt/model controls ผ่าน public
exports ตามความเหมาะสม. Runtime storage owner/schemaเดิมไม่เปลี่ยน.

## 7. งานย่อยและ acceptance

งาน C01–C04 ลงimplementationแล้ว; C05 หลักฐาน/reviewและข้อจำกัดอยู่005/task-plan.json.
ชื่อชุดจำกัด100ตัวอักษรตามserver; ราคาexpiredมีปุ่มประเมินใหม่. ข้อผิดพลาดหลังPOST
ทุกHTTPstatusเก็บintentเพราะserverอาจบันทึกset/runแล้ว; ตรวจmappingด้วยGETก่อนเสมอ.

| Task / owner | Dependency | ผลที่ส่งมอบและตรวจจบได้ |
|---|---|---|
| C01 — Contract readiness / Backend | ตรวจ sourceตาม§6 | stable request key + owner-scoped lookup + slot policy projection; unknown/foreign/conflict contractชัด; sensitive gatesตามinvariantที่เปลี่ยน |
| C02 — Navigation/draft/editor / Frontend | C01 contractพร้อม, M1/U1 | route `/comparison`, menu order, sharedPrompt/reference,2–4slot, enable/reorder; เก็บ Image draftและรองรับTH/EN390/820/1440 |
| C03 — Quote/submit/status / Frontend | C01,C02 | หนึ่งcanonical submission, quoteตรงenabled slots, duplicate prevention, reload unknown recovery; ไม่มี localfan-out |
| C04 — Results/history/winner / Frontend | C03 | fit/zoom/resultactions, partial/allfailed, paginated recent, rename/winner mutationและerrorsถูกscope |
| C05 — Scoped acceptance / QA + applicable reviewers | C02–C04 | ทวนACด้านล่างและprotectedImageflow; build/browserเมื่อimplementจริง; ไม่เรียกpaidproviderโดยอัตโนมัติ |

| ID | Acceptance |
|---|---|
| CMP01 | เมนู Image→Comparison→Video; back/forward/reloadคืน routeและdraftของแต่ละworkspace |
| CMP02 | เพิ่ม/ปิด/ลบ/เรียงslotแล้ว stable IDถูกต้อง; payload/ราคามีเฉพาะslotเปิดและlimitจากowner |
| CMP03 | เปลี่ยนmodelแล้วratio/referenceขัดกันเห็นเหตุผลตรงslot; prompt/referenceเดิมไม่หาย; fallback resolutionแสดงตามquote |
| CMP04 | quoteตอบสลับลำดับ/หมดอายุ/doubleclick ไม่ส่งstale requestหรือสร้างrunซ้ำ |
| CMP05 | responseหายก่อนIDแล้วreloadกู้operationเดิมได้; lookupไม่POST/จองเครดิตใหม่; foreignrequestอ่านไม่ได้ |
| CMP06 | บางslotfail/ทุกslotfail ไม่มีpreviewว่าง; successเดิม/log/statusยังอยู่; ไม่retryชิ้นสำเร็จเอง |
| CMP07 | expand/closeFit,100%,zoom,downloadและwinnerทำงานต่อผลที่เลือก ไม่ผูกกับdraftใหม่ |
| CMP08 | เปลี่ยนภาษา/แท็บ/กลับหน้าต่างเดิมไม่มีscroll/focusjump; logout/actorchangeเอาข้อมูลเก่าออกและปฏิเสธlate response |
| CMP09 | TH/EN390/820/1440, keyboard/focusreturn,200%reflow ใช้ได้; empty/loading/error/disabledถูกทดสอบ |

Scope review รอบเอกสาร: ไล่ empty draft→เลือกslot→แก้combination→submit→partialfail→ดูผลเก่า
→reloadunknown→กลับImage. ไม่เพิ่มconfirmationทั่วไป; มีเฉพาะการแทนinputหรือpolicyเดิม.
Checkpointเอกสารข้างบนเป็นประวัติ; ผลimplementationล่าสุดให้อ่าน005/task-plan.json.

## 8. History preview and legacy function parity (2026-11-20)

User authorized this correction after inspecting existing history UI. Primary UX;
one implementer, scoped UX/QA review sequentially. Existing export authorization,
Credit calculation and generation submission contracts are unchanged.

| Existing function | FE24 application |
|---|---|
| Comparison list previewImages (up to4 successful outputs) | Thumbnail mosaic per set, name/date/models/status; failed sets retain status without fake media |
| Cursor-paginated list | JSON pageSize5 controls actual API request; lazy next page near list end, manual Load more/retry fallback; bounded retained items |
| Comparison detail/run selection | Nearly full-window history modal, independent of active result/draft; every run slot rendered in a large horizontal comparison strip, with optional stacked layout; selected run count explicit |
| ComparisonExportDialog | Reuse existing2–4-output selection, auto/side-by-side/stacked, PNG/JPEG, standard/high, preview/zoom/download; never call generation |
| GenerationResultMetadata | Reuse duration, actual dimensions/ratio versus requested ratio, actual/estimated Credits and MIME; absent values remain absent |
| Prompt, rename, winner, single image inspection | Retain actions and show submitted prompt/settings; read from selected historical run, not current draft |

Flow: open Comparison → first5 history sets with previews → scroll/load next page
→ open set modal → inspect all2/3/4slots and metadata → expand an image or download
comparison → close returns focus/scroll to history card; authoring draft/current run
unchanged. Explicit Use in Image retains existing scoped handoff. Modal supports
Escape, close button, loading/error/retry, keyboard focus and TH/EN.

Confirmed before change: sampled real4-slot sets contain4 API outputs and4 rendered
images; existing fixed-height2-row layout obscures the lower row rather than losing
data. Modal gallery sizes to available viewport and always exposes total count.

Configuration owner: `web-next/src/features/comparisons/config/comparison-ui.json`.
`history.pageSize` default5, `lazyLoad` true, `prefetchMarginPx`300,
`maxLoadedSets`100. Values validated/clamped in owning config module; max cap shows
the retained history count without redirecting to the old frontend. Vite reloads JSON changes in development;
production builds must be rebuilt after editing.
Keep API helper default18 for legacy callers; optional pageSize argument only.

Ordered implementation/checks:
1. Add config/optional list page size; preserve old callers and owner cursor scope.
2. Preview gallery + independent modal; reuse result component and existing actions.
3. Add legacy metadata/export and isolated FE24 styling/localization.
4. Focused browser: actual5-item request, next page/no duplicates, all4images,
   active result/draft preservation, modal focus/close, metadata and export inputs,
   TH/EN390/820/1440/200% bounds; no paid generation. Typecheck/build once ready.

Acceptance/status: implemented and scoped checks passed (2026-11-20).
- `node web-next/test/comparison-history-check.mjs`: isolated browser PASS for
  five-set requests, lazy pagination/retry, thumbnails, four-slot modal, metadata,
  legacy export selection/layout/download, unchanged active draft/results, focus
  return, TH/EN at390/820/1440, CSS200% bounds and identity cleanup. No paid calls.
- Canonical `ComparisonExportDialog.test.tsx`:3 tests passed; FE24 typecheck and
  `npm.cmd run build:web-next` passed. Existing bundle-size warning remains
  (entry814.77kB); bundle optimization is outside this history correction.
- Live read-only browser against6502/6500: first5 cards, API limit5, historical
  four-slot set rendered4 loaded images and4 metadata blocks. No live mutations.
- Screenshots inspected for desktop/tablet/mobile and live historical images;
  modal body scrolls for lower actions at shorter heights. TH/EN keys and
  interpolation parity and new architecture-map paths checked.
- UX/QA performed sequentially by the implementation agent, not independently.
  Export download was verified with intercepted isolated data; live export and
  paid Comparison creation were not exercised in this correction.
- New files belong to FE24 Comparison: config JSON/validator, ComparisonHistory
  and the focused browser check. No moved files or runtime data-path changes;
  architecture map updated for configuration ownership and locale adaptation.

### 8.1 Preview fill and large comparison view — user correction

Scope: existing history mosaics/modal and removal of previous-workspace links in
Comparison and the application header. Authentication entry remains unchanged.
Previews fill their tiles with cover cropping, without surrounding padding; one,
two, three and four successful outputs fill the rectangular mosaic. Full images
in the modal keep contain fitting and use original outputs, not thumbnails.

The history modal uses nearly the whole window. Default is large images side by
side in a keyboard-focusable, horizontally scrollable strip; all slots remain
available, without shrinking four images into a tiny2x2 grid. A stacked option
supports landscape inspection. Mobile keeps a large full-width image per column
and scrolls to the next. Existing zoom, download/export, metadata, rename, run
selection, winner, pending/errors and draft preservation remain available here.

Implementation: scoped CSS, optional history presentation in ComparisonResults,
localized layout controls, no service or storage contract changes. Verification:
existing isolated history check plus layout/cover assertions at390/820/1440;
inspect representative captures and typecheck. Architecture map unchanged.
Status: implemented; focused browser assertions passed for cover thumbnails,
large image widths/source aspect ratio, side-by-side and stacked modes, scrolling
to the last slot, absence of legacy navigation, draft/export/focus preservation
and TH/EN390/820/1440. Responsive captures inspected. Typecheck/build passed;
existing chunk-size warning remains. No paid generation. No new files, moved
files, runtime data or architecture boundaries introduced.

### 8.2 Detail Compare — authorized implementation (2026-11-20)

User goal: inspect differences in image detail across the same Comparison run,
with all compared images visible together and synchronized navigation.

- Move the submitted prompt/description and settings below the image results in
  the Comparison view. Keep them accessible in their existing collapsible section.
- Add a `Detail Compare` action for runs with at least two successful images.
  Open a dedicated near-fullscreen inspection mode within the new frontend;
  retain the ordinary large-image history view and existing actions.
- Fit every successful image from the selected run (2–4) into the available
  screen at once. Choose rows/columns from viewport size, image count and aspect
  ratios; a2x2 arrangement is appropriate when four side-by-side images would be
  too small. No horizontal paging or page scrolling to reach another image in
  this mode. Reserve space for a compact toolbar and provider/model labels.
- Initially show each complete original image with contain fitting. Load original
  outputs for detail inspection, not history thumbnails. Do not stretch or crop
  the initial fit. Keep failed/pending slots out of image panes without discarding
  their logs/status from the ordinary Comparison view.
- Pan any image to move every image together. Zoom in/out on any pane or through
  shared controls to apply the same relative zoom to all panes. Synchronization
  is enabled by default; use normalized image coordinates/shared focal point for
  different dimensions and aspect ratios. This is coordinated navigation, not
  automatic alignment of subjects in different generated images.
- Provide Zoom in, Zoom out, current zoom and Fit/Reset controls. Fit/Reset
  restores all images together. Clamp zoom/pan, support pointer/touch and keyboard
  operation, and recalculate pane sizes on resize/orientation changes without
  losing the selected run. Compact screens still show every image in one screen.
- Closing Detail Compare returns to the same Comparison/run and restores focus;
  preserve draft, winner, history position, metadata and export actions. No new
  generation requests, Credit mutations or navigation to the old frontend.

Implementation starting point: inspect existing synchronized pan/zoom logic in
`web/src/components/comparisons/ComparisonWorkspace.tsx` and its layout helper;
reuse suitable behavior through the owning presentation boundary. Its existing
three-image pagination must not override the all-images-in-one-screen requirement.

Acceptance for the later implementation:2/3/4 images and mixed aspect ratios at
390/820/1440 widths; every pane within the inspection viewport; shared pan/zoom
and reset; original-resolution loading/error states; resize, keyboard/focus return;
prompt/settings below results; existing export/draft/winner behavior preserved.
Status: implemented and scoped checks passed under001§10. Shared view uses normalized focal
coordinates and relative fit zoom; a dedicated all-image grid replaces legacy
three-image paging. Resize chooses columns by available image area and aspect
ratios. Existing private-media loader and modal primitives reused; generation,
authorization and storage contracts unchanged. Ownership map lists new
presentation helpers; no runtime data added or moved.

Acceptance evidence: isolated history browser check covers all2/3/4 panes,
landscape/portrait inputs,390/820/1440 resize bounds, shared zoom and normalized
keyboard pan, pointer drag, Fit/Reset, modal focus/export/draft preservation and
identity cleanup with Detail Compare open. Submitted settings now render after
the result grid. Live existing four-image set loaded original images in all
panes; screenshot inspected. Build/typecheck and locale parity passed. Shared
scrollbars follow001§10. No live generation or export mutation performed.
### History modal toolbar refinement

Keep the artwork directly below a compact toolbar. Show date and completion
count together, with Detail Compare and Download grouped on the right. A single
Options disclosure holds rename, run selection and image arrangement. On narrow
screens the actions may wrap above the artwork. Keep submitted settings below
the images and preserve zoom, export and draft behavior.

