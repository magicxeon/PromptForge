# Frontend ใหม่ — Playground สำหรับสร้างภาพและวิดีโอ

**ID:** FE24 · **วันที่:** 2026-11-19 · **สถานะ:** Requirement review complete (2026-11-20); implementation pending
**Owner:** Frontend experience · **Primary role:** Product Requirement Architect
**Review update:** 2026-11-20 — delegated UX, User Journey, Architecture, Security/Commercial และ BSA;
coverage/ข้อเสนอที่นำมาปรับและ QA document review บันทึกใน [004](004-delivery-migration-and-acceptance.md).

## 1. เป้าหมายและขอบเขตที่ผู้ใช้ยืนยัน

สร้าง frontend แยกโฟลเดอร์จาก `web/` เริ่มจาก Playground แล้วทยอยย้ายหน้าที่เหลือ.
หน้าจอเรียบง่าย อ่านง่าย ใช้งานสะดวก ไม่มีระบบเลือก/สลับ theme และใช้ภาษาไทย/อังกฤษเท่านั้น.
งานหลักคือกรอก Prompt เลือกโมเดล/การตั้งค่า ส่งงานไป backend เดิม และตรวจภาพหรือวิดีโอ.
ภาพต่างขนาดต้องแสดงครบพอดีพื้นที่ดู มีซูม/เลื่อนดูรายละเอียดและดาวน์โหลดต้นฉบับ.
องค์ประกอบหลายส่วนต้องไม่ทับหรือแย่งพื้นที่เขียน Prompt.

คำสั่งรอบนี้อนุญาตให้ review และปรับปรุง requirement ชุดใหม่ตาม flow ผู้ใช้ ไม่อนุญาตโดยปริยายให้เริ่ม
implementation, เปลี่ยนเส้นทางเว็บจริง, ลบ frontend เดิม หรือเรียก provider เสียเงิน.

## 2. เอกสารในชุด

| เอกสาร | เจ้าของรายละเอียด |
|---|---|
| [001 UX และองค์ประกอบหน้าจอ](001-ux-and-screen-components.md) | Layout, controls, media viewer, responsive, accessibility, ไทย/อังกฤษ |
| [002 Workflow ภาพและวิดีโอ](002-image-video-workflows.md) | Input, capability, validation, job states, results และ error recovery |
| [003 โครงสร้างและสัญญาระบบ](003-source-architecture-and-contracts.md) | โฟลเดอร์ใหม่, API reuse, CSS isolation, session, data ownership |
| [004 งานย่อยและการย้ายใช้งาน](004-delivery-migration-and-acceptance.md) | ลำดับงาน dependencies, acceptance, cutover, rollback และข้อเสนอรอยืนยัน |

## 3. ขอบเขตรุ่นแรกและลำดับขยาย

- รุ่นแรก: โครงหน้ากลาง, Playground ภาพ, upload/เลือก reference เดิม, model/settings,
  estimate/generate/status, ผลลัพธ์/ซูม/ดาวน์โหลด, Recent outputs และไทย/อังกฤษ.
- ลำดับถัดมาในชุดเดียวกัน: Playground วิดีโอและ player แล้ว Comparison.
  ต้องไม่ถือว่าจบทั้งชุดเมื่อเสร็จเฉพาะภาพ.
- หน้าที่ยังไม่ย้ายเปิดผ่านเว็บเดิมได้; Voice Studio, Character/Scene Studio,
  Fashion, Cinematic และ Admin จะได้ scope แยกเมื่อสั่งย้าย ไม่ทำเพิ่มอัตโนมัติ.
- ไม่สร้าง provider adapter, wallet, queue, job store, authentication หรือ media store ใหม่.
- ไม่เพิ่ม timeline editor, node workflow, inpainting editor, SVG/GIF authoring,
  upscale service หรือ public publishing ในรุ่นแรก.
- Provider/model ที่ยกตัวอย่าง เช่น OpenAI Image, Grok, Seedream, Seedance และ Gemini Omni
  เป็นรายการจาก catalog เท่านั้น ไม่ใช่ข้ออ้างว่าทุกรุ่นรองรับทุก mode/parameter.

## 4. สิ่งที่เสนอและยังไม่ใช่การอนุมัติ

- ใช้ชื่อโฟลเดอร์ `web-next/` และ React + TypeScript + Vite ต่อจากเทคโนโลยีเดิม.
- เสนอ shadcn/ui เป็นชุด controls เดียว; react-dropzone สำหรับรับไฟล์,
  Yet Another React Lightbox + Zoom สำหรับดูภาพ และ Media Chrome สำหรับวิดีโอ.
  ยังไม่ติดตั้งหรือล็อกรุ่น package; เลือก primitive family เดียวก่อน scaffold.
- ใช้ palette คงที่หนึ่งชุด; สีจริง light/dark, accent และ font scale ยังรอดู mockup.
  ไม่มี theme switcher, auto-theme หรือ palette ตาม route.
- ใช้ layout สองพื้นที่บน desktop และสร้าง/ผลลัพธ์บน mobile เป็นแบบตั้งต้นเพื่อทบทวน.

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

Definition of done ของรอบนี้: เอกสารครบ, ลิงก์ถูกต้อง, งานย่อยมีเกณฑ์ตรวจ,
architecture map ระบุ planned boundary ชัดเจน. Implementation ทั้งหมดยัง pending.
