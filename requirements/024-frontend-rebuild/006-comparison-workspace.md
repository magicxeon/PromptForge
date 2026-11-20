# FE24-CMP — Comparison workspace

วันที่: 2026-11-20 · สถานะ: Requirement พร้อมสำหรับทบทวน; **รอคำสั่ง implement**.
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
  helper ปัจจุบันสร้าง key ใหม่ภายในทุก call จึงต้องขยาย owning contract ให้รับ stable key
  โดยรักษา backward compatibility ก่อนเชื่อมหน้าใหม่; ห้ามเรียก helperเดิมซ้ำเพื่อ recover.
- ส่งชุดเดียวผ่าน `submitComparison`; รับ set/run ID แล้วติดตาม canonical run.
  immutable submitted snapshot แยกจาก draft ที่แก้ต่อได้.
- ถ้า response หายก่อนทราบ ID: แสดง unknown + Check status, คืน intent หลัง reload,
  reconcile ผ่าน owner แบบ read-only. ต้องเพิ่ม/ยืนยัน lookup contract ก่อนปิดงานนี้.
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
| `web/src/features/generation/api/generationApi.ts` | `estimateComparison`, `submitComparison`; stable key ยังต้องเพิ่มเข้า public helper |
| `web/src/features/comparisons/api/comparisonApi.ts`, `schemas/comparisonSchemas.ts` | list/detail/name/winner และ typed run/slot |
| `web/src/components/comparisons/ComparisonConfigurator.tsx`, `ComparisonWorkspace.tsx` | อ้างอิง slot ordering/selection/partial result; ไม่ import legacy global CSS |
| `server/domain/comparisons/ComparisonOrchestrator.js`, `ComparisonValidator.js` | canonical estimate/create/read/winner; Image2–4 slots, server resolution fallback |
| `server/app/routes/comparisonRoutes.js` | HTTP façade; ยังไม่มี lookup-by-request endpoint ใน routes ที่ตรวจ |
| `web-next/src/lib/canonical.ts` | เพิ่ม explicit exports เท่าที่ต้องใช้ ไม่คัดลอก workflow |

`ComparisonValidator` ปฏิเสธ `mediaType: video` โดยตรงด้วย `video_comparison_not_qualified`.
schemaที่มี video fieldหรือcatalog comparison flag จึงไม่ใช่หลักฐานว่า Video Comparison
พร้อมใช้; รุ่นนี้ไม่สร้างปุ่มสั่งที่ใช้งานไม่ได้. Videoเดี่ยวอยู่ใน[007](007-video-workspace.md).

Presentation ที่วางแผน: `web-next/src/features/comparisons/{routes,components,hooks,state}/`.
Route ประกอบหน้าจอ; hooks ประสาน canonical workflows; state เก็บ typed/versioned draft
และ operation intent แยกกัน; components รับ props. แยก slot editor, run results และ
recent sets ไม่รวมทุกอย่างในไฟล์เดียว. ใช้ shared media/prompt/model controls ผ่าน public
exports ตามความเหมาะสม. Runtime storage owner/schemaเดิมไม่เปลี่ยน.

## 7. งานย่อยและ acceptance

งานทั้งหมด **ยังไม่เริ่ม implementation**; C01–C05 ทำตาม dependency ไม่เปิดหลายงานพร้อมกันเอง.

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
เอกสารเสร็จไม่เท่ากับ C01–C05 ผ่าน; ต้องรอคำสั่งและหลักฐาน implementation.
