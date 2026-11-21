# Frontend ใหม่ — Playground สำหรับสร้างภาพและวิดีโอ

**ID:** FE24 · **วันที่:** 2026-11-19 · **สถานะ:** M1 Image, M2 Comparison และ M3 Video implemented (2026-11-20); scoped acceptance/evidence ใน005 และ task-plan.json; production cutover แยกจาก preview
**Owner:** Frontend experience · **Primary role:** Product Requirement Architect
**Review update:** 2026-11-20 — delegated UX, User Journey, Architecture, Security/Commercial และ BSA;
coverage/ข้อเสนอที่นำมาปรับและ QA document review บันทึกใน [004](004-delivery-migration-and-acceptance.md).

**Latest scope:** 2026-11-20 — ผู้ใช้อนุญาต implementation ของ Comparison/Video และเมนู
**Image → Comparison → Video**. เปิดผ่าน6502 โดยเชื่อมบริการเดิม; รายละเอียด006/007
และหลักฐาน005. M1/FE24-U1 คงเดิม; ไม่เปลี่ยน default frontend หรือเรียก paid provider ในการตรวจ.

## 1. เป้าหมายและขอบเขตที่ผู้ใช้ยืนยัน

สร้าง frontend แยกโฟลเดอร์จาก `web/` เริ่มจาก Playground แล้วทยอยย้ายหน้าที่เหลือ.
หน้าจอเรียบง่าย อ่านง่าย ใช้งานสะดวก ไม่มีระบบเลือก/สลับ theme และใช้ภาษาไทย/อังกฤษเท่านั้น.
งานหลักคือกรอก Prompt เลือกโมเดล/การตั้งค่า ส่งงานไป backend เดิม และตรวจภาพหรือวิดีโอ.
ภาพต่างขนาดต้องแสดงครบพอดีพื้นที่ดู มีซูม/เลื่อนดูรายละเอียดและดาวน์โหลดต้นฉบับ.
องค์ประกอบหลายส่วนต้องไม่ทับหรือแย่งพื้นที่เขียน Prompt.

ผู้ใช้อนุญาต implementation หลัง review และเลือก port6502. รอบส่งมอบแรกเป็น Image preview
ตาม [005](005-implementation-checkpoint.md); ไม่เปลี่ยน default route, ลบเว็บเดิม หรือเรียก provider เสียเงินในการตรวจ.

## 2. เอกสารในชุด

| เอกสาร | เจ้าของรายละเอียด |
|---|---|
| [001 UX และองค์ประกอบหน้าจอ](001-ux-and-screen-components.md) | Layout, controls, media viewer, responsive, accessibility, ไทย/อังกฤษ |
| [002 Workflow ภาพและวิดีโอ](002-image-video-workflows.md) | Input, capability, validation, job states, results และ error recovery |
| [003 โครงสร้างและสัญญาระบบ](003-source-architecture-and-contracts.md) | โฟลเดอร์ใหม่, API reuse, CSS isolation, session, data ownership |
| [004 งานย่อยและการย้ายใช้งาน](004-delivery-migration-and-acceptance.md) | ลำดับงาน dependencies, acceptance, cutover, rollback และข้อเสนอรอยืนยัน |
| [005 Preview implementation](005-implementation-checkpoint.md) | การตัดสินใจจริง วิธีเปิด ขอบเขต review/checks และข้อจำกัดของ Image/Comparison/Video |
| [006 Comparison workspace](006-comparison-workspace.md) | Image Comparison, shared/per-slot inputs, results/history, recovery dependencies, C01–C05 และ CMP01–09 |
| [007 Video workspace](007-video-workspace.md) | Video modes/references/duration/player, success-only previews, recovery dependencies, V01–V06 และ VID01–10 |

## 3. ขอบเขตรุ่นแรกและลำดับขยาย

- รุ่นแรก: โครงหน้ากลาง, Playground ภาพ, upload/เลือก reference เดิม, model/settings,
  estimate/generate/status, ผลลัพธ์/ซูม/ดาวน์โหลด, Recent outputs และไทย/อังกฤษ.
- ลำดับถัดมาในชุดเดียวกัน: Comparison ภาพ แล้ว Playground วิดีโอและ player.
  ต้องไม่ถือว่าจบทั้งชุดเมื่อเสร็จเฉพาะภาพ.
- หน้าที่ยังไม่ย้ายเปิดผ่านเว็บเดิมได้ เช่น Character/Scene Studio,
  Fashion, Cinematic และ Admin จะได้ scope แยกเมื่อสั่งย้าย ไม่ทำเพิ่มอัตโนมัติ.
- ไม่สร้าง provider adapter, wallet, queue, job store, authentication หรือ media store ใหม่.
- ไม่เพิ่ม timeline editor, node workflow, inpainting editor, SVG/GIF authoring,
  upscale service หรือ public publishing ในรุ่นแรก.
- Provider/model ที่ยกตัวอย่าง เช่น OpenAI Image, Grok, Seedream, Seedance และ Gemini Omni
  เป็นรายการจาก catalog เท่านั้น ไม่ใช่ข้ออ้างว่าทุกรุ่นรองรับทุก mode/parameter.

## 4. ฐานที่ใช้ต่อและสิ่งที่ยังไม่อนุมัติ

- ใช้ฐาน M1 ที่มีแล้ว: `web-next/`, React/TypeScript/Vite, Radix controls,
  paletteสว่างคงที่, TH/EN และ canonical bridge; ไม่เริ่มscaffoldใหม่.
- FE24-U1 มี provider/model picker, Prompt modal, Fit viewer และ session returnแล้ว;
  Comparison/Videoต้องreuse behaviorนี้. ไม่มีtheme switcherหรือpaletteแยกตามroute.
- Libraryภายนอกใน001เป็นreferenceเดิม ไม่ใช่คำสั่งเพิ่มdependencies. Videoตรวจreuse
  playerเดิมก่อนเลือกpackageเพิ่ม และต้องคงauthorized media/keyboard/responsive behavior.
- รอบนี้ยังไม่อนุญาตimplementationของ006/007, เปิดVideoComparisonหรือproductioncutover.

## 5. ความสัมพันธ์กับ requirement เดิม

[GEN-UX-021](../009-migration-to-react/021-generation-options-ux.md) และ
[visual language](../Knowledge/ui-design-system-and-visual-language.md) ยังดูแล `web/`.
ชุด024 ดูแลประสบการณ์ frontend ใหม่เท่านั้น และใช้ข้อกำหนด single-palette ตามคำสั่งผู้ใช้
แทนข้อกำหนดหลาย theme/กรอบเรืองแสงของหน้ารุ่นเดิมสำหรับพื้นที่ใหม่.
ข้อกำหนด accessibility, ownership, authorization และ feedback ยังคงใช้.
Component ใหม่แยกจาก CSS เก่า; กฎธุรกิจและข้อมูลจาก
[Providers](../020-generation-providers/000-master.md), Credits, Generation และ Assets ไม่เปลี่ยนเจ้าของ.

## 6. หลักฐานและข้อจำกัด

สำรวจ source: `web/src/components/generation/GenerationExperience.tsx`, Playground route/video
workspace, `web/src/styles/globals.css`, API client, catalog APIs และ i18n.
พบ UI หลาย workflow รวมใน component ใหญ่และ stylesheet หลาย feature รวมใน global entry.
นี่เป็นเหตุผลในการแยก presentation ไม่ใช่หลักฐานว่าทุก bug เกิดจาก theme หรือ CSS.
เอกสารออนไลน์และตัวอย่าง component ใน001 เป็น reference; ยังไม่มีการตรวจเว็บจริง/
responsive mockup หรือทดสอบ paid generation สำหรับ frontend ใหม่.

M0 document review จบแล้ว. M1 มี source และ scoped mock/browser evidence ตาม005;
ไม่ได้อ้าง full Image UAT, production authentication หรือ paid-provider qualification.

พื้นที่ทำงาน Dub & Sub Studio อยู่ที่ `/dub-sub` ใน frontend ใหม่ ดู [workflow](008-dub-sub-studio.md), [การออกแบบ Editor](010-dub-sub-editor-design.md), [คู่มือใช้งานและสถานะการตรวจ](011-dub-sub-operations.md) และ [คู่มือ Seed Audio](009-seed-audio-manual.md)
