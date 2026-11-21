# FE24-UX — องค์ประกอบและการใช้งาน

สถานะ: Draft สำหรับ frontend ใหม่; อ่าน [master](000-master.md) ก่อน.
ผู้ใช้หลัก: ผู้สร้างสื่อที่แก้ Prompt/อ้างอิง/ตั้งค่าและสร้างซ้ำบ่อย ต้องเห็นทั้ง input และผลงาน.

## 1. โครงหน้าจอที่เสนอ

### การขอคำยืนยันทุกหน้าของ frontend ใหม่

ทุกจุดที่ต้องขอคำยืนยันใช้ modal ภายในแอปแทน `window.confirm()` หรือ `window.alert()` ของเบราว์เซอร์ ระบุสิ่งที่จะเปลี่ยนและผลของการยืนยัน ปุ่มหลักใช้ชื่อการกระทำจริง เช่น “ลบเทคนี้” คู่กับ “ยกเลิก” การยกเลิกหรือกด Escape ต้องปิด modal และคืนโฟกัสโดยไม่ดำเนินการ

ครอบคลุมทั้งจุดเดิมและงานใหม่ ตัวอย่างใน Dub & Sub ได้แก่ ลบเทค พากย์ใหม่ทับทั้งชุด ยืนยันการประมวลผลซีน และแทนที่บทร่าง

Desktop: header กะทัดรัด → แผงสร้างงานซ้าย + พื้นที่ดูผลงานขวา.
แผงสร้างงานเรียง Model/Mode แบบกะทัดรัด → Prompt → References → ค่าหลัก → Generate.
เส้นทางหลักของผู้ใช้คือ เลือก Image/Comparison/Video → เขียนหรือคืน Prompt → เพิ่ม reference ตามต้องการ
→ ตรวจโมเดล/ค่าที่ตั้งไว้ → ดู estimate → Generate → ดูและนำผลไปใช้.
ใช้ค่าเริ่มต้นที่ถูกต้องจาก catalog หรือ draft ที่ยังใช้ได้ ไม่บังคับเลือกโมเดลใหม่ทุกครั้ง.
เปิดหน้า Create แล้วต้องเห็น label และช่อง Prompt โดยไม่ต้องขยาย panel; references และ advanced
ต้องไม่ขยายเหนือ Prompt จนบดบังพื้นที่หลัก. Mode ที่บังคับ source media แสดงช่องนั้นเด่นได้แต่ไม่ซ่อน Prompt.
ฝั่งผลลัพธ์มี viewer, toolbar ในพื้นที่ของตัวเอง และแถบ Recent outputs.
ไม่เอาเครดิต/เครื่องมือ/ประวัติลอยทับ Prompt หรือภาพที่กำลังตรวจ.
แผงสร้างงานต้องมีความกว้างพออ่าน Prompt ไทยยาวได้ ไม่บีบเพื่อใส่ทุกค่าบนแถวเดียว.

Tablet: ลดจำนวนคอลัมน์หรือเปลี่ยนเป็นส่วนเรียงตามพื้นที่จริง; ห้ามบีบปุ่มจนเหลือแต่ icon.
Mobile: ใช้แท็บ สร้าง / ผลลัพธ์ ใช้ state ชุดเดียวกัน; สลับแล้ว draft/job ไม่หาย.
หลังส่งงานอยู่แท็บเดิม แสดงสถานะรับงานและปุ่มดูความคืบหน้า; แท็บผลลัพธ์มีตัวบอกงานใหม่.
เปลี่ยนแท็บด้วยคำสั่งผู้ใช้เท่านั้น; งานเสร็จไม่ย้าย focus, scroll, selection หรือเปิดผลลัพธ์แทนภาพที่กำลังดู.
Reference/advanced settings ยุบได้แต่เห็นสรุป. เปิด keyboard แล้ว Prompt และ Generate
ยังเข้าถึงได้; sticky footer ต้องเผื่อ safe area และไม่บังช่องกรอก.

## 2. Inventory ที่ต้องออกแบบ

| ส่วน | Component และพฤติกรรม | การแสดง |
|---|---|---|
| Header | Image → Comparison → Video, ชื่อหน้า, ไทย/English, บัญชี/เครดิตอย่างกะทัดรัด | ลำดับเหมือนกันทุกviewport; สื่อที่ยังไม่ย้ายมีทางไปหน้าเดิม |
| Model picker | Searchable combobox แบ่ง provider แสดงชื่อโมเดลและความสามารถสั้น ๆ | ค่าปัจจุบันเห็นเสมอ |
| Mode picker | ปุ่มแบ่งส่วนเมื่อมีน้อย; selector เมื่อมีหลายโหมด | เฉพาะ mode ที่โมเดลรองรับ |
| References | เพิ่มไฟล์/เลือก output เดิม, thumbnail, label, จำนวน/max | แสดงตาม mode |
| Reference actions | ดูใหญ่, เปลี่ยน, ลบ, จัดลำดับเมื่อ API ให้ความหมายกับลำดับ | เข้าถึงได้แม้รายการ error |
| Prompt | Textarea หลายบรรทัด, ขยายพื้นที่เขียน, ตัวนับ/max จาก catalog/policy | พื้นที่หลักของแผงสร้าง |
| Output settings | Ratio, resolution, quality, จำนวนผลลัพธ์ หรือ duration/audio | ค่าที่รองรับและใช้บ่อย |
| Advanced | Seed, format, background และตัวเลือกเฉพาะ provider | พับไว้; แสดงสรุปค่าที่เปลี่ยน |
| Generate bar | ราคา estimate ตามคำขอปัจจุบัน, Generate, สถานะ/เหตุผลที่ยังสร้างไม่ได้ | ตำแหน่งแน่นอน ไม่บังเนื้อหา |
| Status panel | Queue/running/failed/unknown และ action ที่ใช้ได้จริง; ทางเข้ารายการงานที่กำลังทำ/งานล่าสุดเพื่อกลับมาตรวจหลัง reload | แยกจาก success gallery; รายการมีขอบเขต |
| Main viewer | ภาพหรือวิดีโอที่เลือก, fit, toolbar | พื้นที่หลักฝั่งผลลัพธ์ |
| Recent outputs | Thumbnail, ชนิดสื่อ, เวลา/โมเดลสั้น ๆ; load more เมื่อมี continuation contract | ขนาดจำกัด ไม่แย่ง viewer; หากมีเพียง recent limit ให้ระบุขอบเขตและทางไปประวัติเดิม |
| Details | Prompt และค่าจากงานที่สร้างจริง, คัดลอก/นำค่ามาใช้ | เปิดเมื่อขอ |
| Comparison | เปิดเพิ่ม แยกการตั้งค่าต่อ slot และผลลัพธ์ | ระยะถัดไป; ไม่ทำให้ normal mode ซับซ้อน |

## 3. กติกาของ controls

- Ratio: มีรูปทรงพร้อม label เช่น 1:1/16:9; ใช้กลุ่มปุ่มสำหรับค่าหลักและ picker
  เมื่อจำนวนมาก ทุกค่าที่ configuration เปิดต้องเข้าถึงได้ ไม่ซ่อนทิ้งเอง.
- Resolution แยกจาก ratio และ quality; แสดง pixel dimensions เมื่อ backend ระบุได้.
  ไม่อ้างว่า 2K คือค่าเดียวกันทุก provider และไม่เสนอ custom size เมื่อไม่รองรับ.
- Duration: ช่วงต่อเนื่องใช้ slider + ช่องตัวเลขที่ sync กัน; ค่าตายตัวใช้ตัวเลือก.
  min/max/step มาจาก model configuration ไม่ hard-code 4–30 ให้ทุกโมเดล.
- Prompt: Enter ขึ้นบรรทัดใหม่; Generate เป็นการส่งชัดเจน ไม่ส่งงานระหว่าง composition
  ของ IME. ส่งสำเร็จแล้วคง Prompt/reference; ไม่ autofocus/scroll กลับบนจาก polling.
- Dropdown เปิดแล้วอ่านได้ทั้งตัวเลือกปกติ selected, focus, hover และ disabled.
  More/details ต้องเห็นว่าเป็นปุ่ม; icon สำคัญมีชื่อหรือ accessible label.
- Picker ไม่ตัด/ทับช่อง Prompt ในการใช้งานปกติ; เปิดชั่วคราวต้องปิดง่าย คืน focus
  และมีตำแหน่งที่ไม่ปิดพื้นที่พิมพ์หลัก; mobile ใช้ sheet/dialog เมื่อพื้นที่ไม่พอ.
- เปลี่ยนโมเดลแล้วเก็บค่าที่ compatible; ค่าที่ใช้ต่อไม่ได้แจ้งใกล้ field ไม่ reset ทั้งฟอร์ม.
  เก็บค่าที่ขัดแย้งไว้ให้แก้ แต่ไม่ส่งค่าที่ใช้ไม่ได้; ไม่ clamp duration หรือลบ reference เงียบ ๆ และ invalidate estimate.
  Controls ที่ไม่รองรับซ่อน; controls ที่รองรับแต่ยังโหลด/ไม่มีสิทธิ์/combination ใช้ไม่ได้ แสดงเหตุผลที่แก้ได้.
  หากต้องเปลี่ยน mode เพื่อเพิ่ม reference ให้เสนอ mode ที่รองรับอย่างชัดเจน ไม่เปลี่ยนเอง.

## 4. ภาพพอดีหน้าต่างและซูม

- Initial fit: ภาพครบ ไม่ crop ไม่ยืดผิดสัดส่วน ใช้พื้นที่ viewer ที่หัก toolbar แล้ว.
  Fit scale = min(availableWidth/imageWidth, availableHeight/imageHeight, 1).
  ภาพเล็กไม่ถูกขยายเกินขนาดจริงโดยอัตโนมัติ; พื้นที่ว่างรอบภาพใช้สีกลาง.
- Fit/100%/Zoom +/-/Reset และ Fullscreen หรือ expanded viewer ต้องเข้าถึงได้.
  นิยาม100%: image pixel หนึ่งหน่วยต่อ CSS pixel หนึ่งหน่วยของพื้นที่ภาพ;
  ไม่ใช้ค่า1ของ library ซึ่งอาจหมายถึง fit แล้วติดป้ายว่า100%.
- Zoom เก็บจุดที่ผู้ใช้กำลังตรวจ; drag/pan มีขอบเขตไม่ทำให้ภาพหายจนหาไม่เจอ.
  รองรับ pinch และ keyboard; ล้อเมาส์ปกติไม่ขโมย page scroll ขณะกรอก Prompt.
  Arrow keys pan เฉพาะ surface ภาพที่มี focus และ zoom อยู่; Previous/Next เป็น controls แยก.
  Fit ไม่ดัก touch/page scroll; ปิด expanded viewer แล้วคืน focus ไปปุ่มเปิด.
- Resize ใน fit mode คำนวณ fit ใหม่; manual zoom รักษาจุดดูเท่าที่ทำได้และยังมี Reset.
  เปลี่ยนไปภาพอื่นเริ่ม fit; background status update ไม่ reset zoom ของภาพเดิม.
- Thumbnail เป็น preview; เปิดดูรายละเอียดต้องโหลด original ที่มีสิทธิ์เข้าถึง.
  มี loading/error/retry ไม่แสดง thumbnail แตกแล้วอ้างว่าเป็นต้นฉบับ.
- ดาวน์โหลด original; การ fit/zoom ไม่ resample หรือเขียนทับไฟล์จริง.
- ภาพหลายอัตราส่วนใช้กล่อง thumbnail คงที่แบบ contain ใน workspace นี้;
  ขนาดไฟล์ไม่ทำให้ layout กระโดด. กำหนด width/height/aspect ก่อนโหลดถ้ารู้ metadata.
- Zoom เป็นการแสดงผล ไม่เพิ่มรายละเอียดแบบ AI upscale.

## 5. Video viewer

Fit ภาพครบตามสัดส่วน พร้อม play/pause, seek, current/total time, mute/volume,
loop และ fullscreen. เสนอ Media Chrome เป็นชุด player controls; ไม่ใช่ video editor.
ไม่ autoplay เสียงหรือเปิดเล่นหลายผลลัพธ์พร้อมกัน. ใช้ poster/metadata ในรายการก่อน
โหลด video bytes เต็ม; buffering/media-load-error ต้องต่างจาก generation-failed.
ระยะเวลาที่ขอสร้างในฟอร์มแยกจากแถบ seek ของวิดีโอที่สร้างแล้ว.
การ zoom วิดีโอรายเฟรมยังไม่อยู่รุ่นแรก; ไม่มี frame-accurate editing claim.

## 6. Visual, language และ accessibility

ใช้ palette คงที่ชุดเดียวกับ semantic tokens ไม่โหลด theme preference เดิม.
สีจริงและ font scale ต้องทบทวน mockup; ไม่บังคับ gradient/glow ของหน้ารุ่นเดิม.
ไทย/อังกฤษทุก label/error/aria/status; ใช้ react-i18next ไม่ inline language maps.
โค้ดภาษา/ชื่อโมเดล/Prompt ผู้ใช้ไม่แปลอัตโนมัติ. ข้อความแปลยาวต้องไม่ทำปุ่มล้น.
Contrast ข้อความปกติอย่างน้อย4.5:1, controls/focus3:1; touch targets44px,
desktop controls36pxและ Generate40px ขึ้นไป. มี focus-visible, Escape/focus return,
label ของ slider/inputs, aria-live ที่ไม่ประกาศ polling ทุกครั้ง และ reduced motion.
Spinner ใช้ ProcessingSpinner owner เดิมผ่าน shared boundary ตาม003;
presentation ของกรอบสถานะเป็นแบบเรียบ ไม่บังคับกรอบเรืองแสงข้ามจากเว็บเก่า.
กำหนด fixed semantic token ที่ ProcessingSpinner ต้องใช้ รวมถึง warning โดยไม่โหลด theme selector.
ตรวจ browser text zoom 200%/reflow และ mobile keyboard ทั้งเปิดและปิด.
สลับไทย/อังกฤษแล้ว Prompt/reference/settings/job identity ไม่เปลี่ยน และไม่ submit งาน.

## 7. Reference ที่สำรวจ (2026-11-19)

- [shadcn Combobox](https://ui.shadcn.com/docs/components/base/combobox): ค้นหา/จัดกลุ่มตัวเลือก.
- [Prompt Input](https://ui.shadcn.com/docs/ai-elements/base/prompt-input): แนวทางจัด input;
  ปรับ keyboard และคง draft ตามงานสร้างภาพของเรา ไม่คัดลอก chat submit/reset behavior.
- [react-dropzone](https://react-dropzone.js.org/): รับไฟล์; upload/สิทธิ์เป็น backend owner.
- [YARL Zoom](https://yet-another-react-lightbox.com/plugins/zoom): image zoom/pan gestures.
- [Media Chrome](https://www.media-chrome.org/docs/en/react/get-started): React player controls.
- [Runway generation flow](https://help.runwayml.com/hc/en-us/articles/46974685288467-Creating-with-Gen-4-5): input/settings/result actions.
- [MDN object-fit](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-fit): contain สำหรับดูภาพครบ.

ทั้งหมดเป็น reference ไม่ใช่การอนุมัติ library หรือการคัดลอก provider limits.

## 8. Approved interaction correction — FE24-U1 (2026-11-20)

Scope: Image Playground in `web-next/`; preserve references, settings, estimates,
Generate, activity, history and the links to the existing Video/Comparison pages.
Primary: UX/UI; focused QA and independent Security review for session revalidation.

1. **Provider / model menu:** reuse the existing `GenerationModelPicker` through
   the canonical bridge. One trigger shows the current provider/model; inside the
   menu, search and provider categories narrow the model list. Options come from
   the current catalog. Choosing a model preserves the prompt/references/settings;
   unsupported combinations retain the existing validation. Clear search/empty
   results, selection, Escape, keyboard navigation and focus return must work.
2. **Expanded prompt:** an explicit expand button beside the prompt label opens
   a near-fullscreen modal. It edits the same actor-scoped draft immediately;
   Close/Escape returns to the form with all edits retained, with no second Save
   or implicit generation. Preserve text selection and provide the same count/
   limit. The modal fits mobile, tablet and desktop, traps focus and returns focus.
3. **Expanded image:** opening and closing the expanded viewer always resets to
   Fit, even after manual zoom/pan. Measure the actual image surface after layout
   and on resize; preserve aspect ratio and show the entire image. Existing
   small-image no-upscale policy and explicit 100%/zoom/download remain unchanged.
4. **Return to workspace:** ordinary window focus/visibility checks the session
   in the background, coalescing overlapping checks. If the resolved actor and
   security/config context are unchanged, retain draft, selection, scroll, open
   modal, image object URL and zoom; do not cancel/invalidate every query. Explicit
   logout/session invalidation, changed identity/security context or failed checks
   retain the canonical hard identity gate, abort stale requests and remove stale
   private state. Background responses cannot overwrite a newer identity epoch.

Implementation order: canonical session correction; reuse picker and add prompt
editor; viewer Fit transitions; focused lifecycle and browser checks. No paid
generation, new storage contract or backend provider/billing changes.
Acceptance evidence belongs to `005-implementation-checkpoint.md` and FE24-U1 in
`task-plan.json`. Required checks cover unchanged and changed identity, delayed
responses, both modal transitions, provider/search keyboard flow and TH/EN at
390/820/1440px. Architecture ownership remains unchanged.

## 9. Navigation contract — Comparison/Video expansion (requirement only)

- เมนูเรียง **Image → Comparison → Video** บนdesktop/tablet/mobile โดยไม่สลับตามactivepage.
  Englishใช้คำเต็ม`Comparison`; ไทยใช้`ภาพ → เปรียบเทียบ → วิดีโอ`.
- Implemented preview routes: `/image`, `/comparison`, `/video`; `/`เป็นทางเข้าImageเพื่อคงURL6502
  ที่ผู้ใช้เปิดอยู่. ใช้ReactRouterและdeep-link/back/forward; ไม่ใช้location reloadเพื่อสลับworkspace.
- Active itemชัดเจนและมีaccessible current-page semantics. Image,Comparison,Videoมีicon
  คนละแบบพร้อมข้อความ; mobileต้องอ่านและกดได้ ไม่ซ่อนComparisonในoverflowเมนู.
- คงImage/Comparison/Video draftแยกต่อactor. Navigationไม่copyinputข้ามหน้าเอง;
  การนำไปใช้ข้ามworkspaceเป็นexplicithandoffพร้อมป้องกันoverwriteตาม002/006/007.
- ระหว่างทยอยเปิดหน้าใหม่ ถ้ายังไม่มีrouteที่พร้อม ให้itemเปิดหน้าเดิมพร้อมexternal-link
  indicatorตามM1; เปลี่ยนเป็นinternalrouteเมื่อmilestoneนั้นผ่านเท่านั้น. ไม่ทำdeadlink
  หรืออ้างว่าทั้ง3workspaceพร้อมเพราะเปลี่ยนlabelแล้ว.
- Header/language/account/activityและImage behaviorที่ส่งมอบแล้วต้องคงอยู่.
  รายละเอียดComparisonอยู่[006](006-comparison-workspace.md), Videoอยู่[007](007-video-workspace.md).

## 10. Recent-image inspection and quiet scrollbars (2026-11-20)

Authorized implementation; primary UX, one implementer, sequential scoped QA.
Flow: click Recent image → large modal at current gallery position → previous/
next or collapsible thumbnail strip → zoom/download/reuse/reference/handoff →
close back to the same gallery scroll position with the selected item highlighted.
Reuse ImageViewer and the existing image actions; do not create provider or
generation workflows. Previous/next operate on loaded results, with explicit Load
more when history has another page. Disable navigation at loaded boundaries.
Arrow keys change images at Fit; zoomed-surface arrow keys pan instead. Ignore
navigation shortcuts in editable fields. Touch swipe changes images at Fit;
zoomed drag/pinch retain image navigation. Each newly selected image starts at Fit.

Image scrollbars fade after1500ms idle and reappear on pointer movement within
the surface, scrolling, touch or keyboard input. Keep them visible during pointer
drag and keyboard focus. Preserve scrollbar space so showing/hiding never shifts
the image. Apply to inline/expanded image viewing and Detail Compare panes; do not
hide page scrollbars or toolbar controls. Reduced-motion disables fading animation.

Protected behavior: private-media loading/error/retry, identity cleanup, stable
draft, original-resolution download, existing prompt-replacement confirmation,
reference validation and Comparison/Video handoff. Modal close/Escape restores
focus without scrolling the page; TH/EN and390/820/1440 supported.

Ordered plan: shared idle-scroll observer; extend ImageViewer gallery navigation
and shared result actions; implement006§8.2 Detail Compare and move submitted
settings below results; focused browser checks and typecheck/build. Record evidence
here and006; no paid generation. Status: implemented and scoped checks passed.

Evidence (2026-11-20):
- `node web-next/test/media-inspection-check.mjs`: previous/next, keyboard,
  thumbnail collapse, Load more, idle hide/wake and keyboard visibility, touch
  swipe, media error/retry, preserved draft/selection and390/820/1440 bounds PASS.
- Existing `node web-next/test/browser-check.mjs`: quote/submission recovery,
  Fit/100%, TH/EN responsive behavior, focus return and private-portal suspension
  PASS. All provider/mutation requests intercepted in these checks.
- `node web-next/test/comparison-history-check.mjs`: history/export regressions
  plus Detail Compare acceptance in006§8.2 PASS.
- Live read-only inspection loaded existing original images in gallery modal and
  four-pane Detail Compare; captures `_temp/fe24-media/` and `_temp/fe24-history/`
  inspected. `npm.cmd run build:web-next` (including TypeScript) PASS. Existing
  chunk-size warning remains (824.98kB entry); no bundle tuning in this scope.
- TH/EN key/interpolation parity and new ownership paths PASS. New shared idle
  scrollbar helper, ImageResultActions and DetailCompare live in mapped FE24
  capability folders; architecture map updated. No files moved or runtime paths
  introduced. Review was sequential UX/QA by the implementer, not independent.
- Browser evidence is Chromium with emulated touch/viewports; physical-device
  multi-touch and OS-specific scrollbar rendering remain manual UAT coverage.
