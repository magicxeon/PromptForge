# 023 — Voice Studio: Basic Release

Date: 2026-11-15  
Status: Basic Creator/Manager source implemented; live Google/Thai listening qualification remains open.
Revision 2: UX redesign and Custom Voice Design source implemented; offline integration passed. Live provider qualification remains open in 005.
Primary: Product Requirement Architect. UX design: `/root/voice_studio_ux` (`ux-ui-product-designer`).

## 1. เป้าหมายและขอบเขต

เครื่องมือสร้างบทพากย์แบบรายแถวสำหรับคนเขียนบทและคนตัดต่อ เปิดจากเมนู
**Voice Studio** ที่ `/create/voice-studio` โดยไม่ต้องสร้าง Cinematic Project ก่อน
ผู้ใช้เลือกเสียงประจำตัวละคร เขียนบท กำกับอารมณ์ สร้างเสียง ฟัง เปรียบเทียบ Take
แล้วบันทึกไฟล์ที่เลือกได้ หนึ่งแถวคือหนึ่งบทพูดของหนึ่งตัวละคร

Implementation authorized: source code/configuration สำหรับ Creator และ Manager
กำลังตรวจรับตาม 005. ไม่เรียก paid API ใน automated checks; actual entitlement,
usage payload และคุณภาพเสียงไทยยังต้องมี live listening evidence ก่อนปิด AC11

## 2. แบ่งส่วนงาน

| ID | ส่วน | เอกสารเจ้าของ |
|---|---|---|
| VS-01 | หน้าจอ เอกสารบทพูด แถวบทสนทนา ตัวละคร และคลังเสียง | [001 UX/UI](001-ux-and-workflows.md) |
| VS-02 | หมวด source code, API และขอบเขตบริการ | [002 Architecture](002-source-code-and-contracts.md) |
| VS-03 | โมเดล เสียงสำเร็จรูป ค่าควบคุม และ configuration JSON | [003 Configuration](003-model-configuration.md) |
| VS-04 | ข้อมูล เอกสาร Take ไฟล์เสียง ความเป็นส่วนตัวและวงจรชีวิต | [004 Data](004-data-and-lifecycle.md) |
| VS-05 | ลำดับงาน dependencies และเกณฑ์ตรวจรับ | [005 Delivery](005-delivery-and-acceptance.md) |

## 3. Basic release

รุ่นแรกมีสองส่วนหลักที่เปิดใช้ได้จริงในเมนูเดียวกัน:

| ส่วน | หน้าที่ |
|---|---|
| **สร้างเสียง (Voice Creator)** | เขียนบท เลือกตัวละคร/เสียง/โมเดล กำกับการแสดง สร้าง ฟัง และเลือก Take |
| **จัดการเสียง (Voice Manager)** | เปิดดูเสียงที่สร้างสำเร็จ ค้นหา/กรอง เปลี่ยนชื่อ ติดแท็กจัดหมวด ฟัง บันทึกเข้าคลัง ดาวน์โหลด และลบรายรายการ |

Voice Manager จัดการ character voice presets ได้ด้วย (เพิ่ม/แก้ชื่อ/เปลี่ยนเสียง/
archive) โดยแยกจากรายการไฟล์เสียง ไม่ต้องเปิดเอกสารต้นทางเพื่อจัดการไฟล์

- สร้าง/เปิด/เปลี่ยนชื่อ/เก็บถาวรเอกสารบทพูด พร้อม autosave และสถานะบันทึก
- สร้าง character voice preset แบบเบา: ชื่อ สี และเสียงสำเร็จรูปจาก catalog
- เพิ่ม/เรียง/ทำสำเนา/ลบแถว เลือกตัวละคร เขียนหลายบรรทัด กำกับ style และแทรก vocal tag
- โมเดลตั้งระดับเอกสาร; แต่ละ Take เก็บ model/version ที่ใช้จริง
- สร้างเสียงทีละแถว ป้องกันส่งซ้ำ ฟัง Take และเลือก/บันทึก Take โดยไม่สร้างเสียงซ้ำ
- เล่นแถวที่มี selected Take ต่อกันใน browser; ข้ามแถวที่ปิดใช้งาน
- จัดการเสียงทั้งที่สร้างสำเร็จและที่บันทึกเข้าคลัง เปลี่ยนชื่อ/ติดแท็ก/ค้นหา/กรอง/
  ฟัง/ดาวน์โหลด WAV/ลบราย Take พร้อมเปิดกลับไปยังบทต้นทางได้
- รองรับ desktop/tablet/mobile, theme และทุก locale ที่ระบบเปิดใช้

## 4. Deferred โดยตั้งใจ

Voice replication/remixing, อัปโหลดเสียงอ้างอิง, multi-speaker request,
สร้างทุกแถวด้วยปุ่มเดียว, นำเข้าบทจำนวนมาก, รวม WAV/ZIP, MP3, waveform editor,
ตัด/เร่ง/ปรับ pitch หลังสร้าง, timing แบบ frame-accurate, lip-sync, music/SFX,
public sharing, การผูก Project/Scene/Shot และการเชื่อม Character DNA/Profile แบบถาวร
อยู่ใน phase ถัดไปของ requirement นี้ ไม่เป็นเงื่อนไขปิด Basic release
งาน dialogue repair/voice conversion เดิมยังเป็นของ [021-VOICE](../021-post-processing-service/006-voice-dialogue-and-lipsync.md)

### Revision 2 — UX correction and Custom Voice Design (2026-11-15)

ผู้ใช้ยืนยัน reference คือ **ElevenLabs** และ Custom Voice คือ **ออกแบบเสียงจาก
คำบรรยายแล้วบันทึกใช้ซ้ำ** ไม่รวมโคลนเสียงจากไฟล์ในรอบนี้. Voice Design ย้ายออกจาก
deferred มาเป็นขอบเขตรอบถัดไปที่ต้อง implement ตาม 001–005 และ task-plan.json.

- เปลี่ยน navigation เป็น **บทพากย์ / เสียงของฉัน / คลังไฟล์เสียง** ภายใน route เดิม
- Editor เน้นบทพูดเป็นแถวกระชับ; ตั้งค่าแสดงเฉพาะแถวที่เลือก
- แทรก voice event จาก toolbar ติดช่องบท: กดหนึ่งครั้งแทรกที่เคอร์เซอร์
  ไม่ใช้ dropdown + ปุ่ม Insert แยกหลังส่วนตั้งค่า
- เสียงของฉันมี preset ตัวละครและ Custom Voice Design ที่ใช้ซ้ำได้
- แยกชื่อเสียง, ตัวตนเสียงถาวร, อารมณ์รายแถว และไฟล์เสียงออกจากกันชัดเจน

ใช้รูปแบบการทำงานจาก ElevenLabs โดยรักษา theme/component ของ Momelo และ Google
provider เดิม. ไม่เพิ่ม ElevenLabs API หรือคัดลอกข้อจำกัด/ราคา/voice tags ของ ElevenLabs.
ผู้ใช้อนุมัติ implementation ต่อจาก requirement amendment. Backend source และ
independent sensitive review ผ่านแล้ว; frontend source และ integration evidence อยู่ใน 005.
Primary requirement: Product Requirement Architect; backend implementation: root,
frontend: voice_frontend; root ตรวจ UX/QA ตาม review-product-ux และ
voice_sensitive_review ตรวจ Security/Commercial/Backend/QA เฉพาะส่วนที่เปลี่ยน.

## 5. หลักการที่ต้องรักษา

1. **สร้าง / ฟัง / บันทึก** เป็นคนละคำสั่ง: ฟังและบันทึกไม่สร้างหรือคิดค่าสังเคราะห์ซ้ำ
2. เสียงประจำตัวละครแยกจากอารมณ์เฉพาะแถว; เปลี่ยน preset ไม่เปลี่ยน Take เก่า
3. เอกสารและไฟล์เป็น private ของ actor; ไม่ส่ง API key หรือ path เครื่องให้ browser
4. ข้อมูล draft ที่แก้แล้วไม่ทำให้เสียงเดิมหาย; แสดงชัดเมื่อบทปัจจุบันไม่ตรง Take
5. Provider/model/voice/limits อ่านจาก server catalog; ไม่มี model switch หรือเสียงลิสต์ซ้ำใน UI
6. Generation, Credits และ Assets ใช้ facade เจ้าของเดิม; ห้ามสร้าง pipeline ซ้อน
7. ชื่อไฟล์และ function ต้องบอกหน้าที่ คนอ่านต้องตามจาก route ถึง service/repository ได้

## 6. Evidence และสถานะ

เอกสาร Google ที่ตรวจใน session วันที่ 2026-11-15:
[model](https://aistudio.google.com/docs/models/gemini-3.8-flash-tts),
[TTS](https://aistudio.google.com/docs/speech-generation),
[API](https://aistudio.google.com/api-reference),
[pricing](https://aistudio.google.com/docs/pricing#gemini-3.8-flash-tts).
Provider evidence อยู่ใน 003; ราคา runtime ต้องยืนยันกับ Credits ก่อน implementation
และไม่อนุมานสิทธิ์บัญชีจากการมีหน้าเอกสาร

Reviewed existing sources: GenerationApplicationService, GeminiProvider,
AssetRepository, AssetDeliveryService, paths.js และ architecture ownership map
ขยาย Generation facade/Queue แบบ additive สำหรับ speech พร้อม WAV Assets โดยเฉพาะ
ไม่ส่ง speech เป็น image request; image export และ Cinematic ไม่ถูกแทนที่

Delivery: root ประสาน domain/routes/storage, voice_generation ทำ speech pipeline,
voice_frontend ทำ UI; write scopes และ review อยู่ใน [task-plan.json](task-plan.json)
Independent `/root/voice_sensitive_review` ผ่าน Security/Commercial/Backend/QA source gates
เหตุผลที่ใช้สี่มุมมอง: private media และ actual-usage billing ข้าม Generation/Credits/Assets
เป็น reviewer คนเดียว ไม่ใช่เพิ่มสี่ agent; ผล UI/live checks แยกใน 005
