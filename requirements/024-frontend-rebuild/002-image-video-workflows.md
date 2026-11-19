# FE24-FLOW — ภาพ วิดีโอ และสถานะงาน

สถานะ: Draft; [UX](001-ux-and-screen-components.md) และ [สถาปัตยกรรม](003-source-architecture-and-contracts.md) ใช้ร่วมกัน.

## 1. Happy path ร่วม

Resolve session/actor → โหลด catalog/คืน draft → เลือก Image/Video → เขียน Prompt/reference
→ ตรวจโมเดล/mode/ค่าที่รองรับซึ่งมีค่าเริ่มต้นที่ใช้ได้ → estimate คำขอปัจจุบัน → Generate explicit → ติดตามงานเดิม
→ ดูผลงานสำเร็จ → ดาวน์โหลด/ใช้ reference/นำค่ากลับมาแก้สร้างอีกครั้ง.
ไม่ dispatch จากการเปิดหน้า เปลี่ยนโมเดล เลือกไฟล์ ดูตัวอย่าง หรือเปิดประวัติ.
รักษา confirmation/authorization ตาม backend policy ปัจจุบัน ไม่เพิ่ม modal ทั่วไป
สำหรับทุกคลิกและไม่ถอด required confirmation เพื่อให้หน้าโล่ง.

## 2. ภาพ

- Text to Image และ reference/edit ตาม catalog; ใช้ provider/model ID จริงและ API เดิม.
- Ratio, resolution, quality, output count, background/format/seed มีเฉพาะที่ contract
  ของระบบรองรับ; advanced field ที่ API ยังไม่รองรับไม่สร้างปุ่มหลอกไว้.
- Reference เก็บลำดับและ role ผ่าน canonical processing; โมเดลที่มี cap ต่างกัน
  แสดง N/max จาก configuration. เปลี่ยนโมเดลแล้วเกิน cap ต้องให้แก้ ไม่ drop ภาพเงียบ ๆ.
- เลือก output เดิมเป็น reference ผ่าน Assets/owner authorization; ไม่ส่ง private URL
  ตรงไป provider จาก browser. คืนผลแต่ละ output ตาม Generation Group เดิม.
- ผลสำเร็จปรากฏใน gallery; partial success เก็บชิ้นสำเร็จ พร้อมสถานะชิ้นที่ล้มเหลว.
- Use as reference คง Prompt/settings และเพิ่มใน slot ว่างที่มี role ตรงกัน; ถ้าเต็มให้เลือก slot
  ที่ต้องการแทนหรือแก้ cap ก่อน ไม่แทนภาพเดิมเงียบ ๆ และไม่สร้างงานทันที.
- Image to Video คง Image draft และส่ง authorized asset ไป role ที่รองรับใน Video.
  ถ้าปลายทางมีข้อมูลที่จะถูกแทน แสดงรายการ field ที่เปลี่ยนและให้เลือกแทนที่/ยกเลิกก่อน mutation;
  ยกเลิกแล้ว Video draft ต้องเหมือนเดิม ยืนยันแล้วเปลี่ยนเฉพาะ field ที่แจ้งและ refresh estimate ไม่ submit.
- Reuse settings ใช้กติกาเดียวกัน: แสดงขอบเขตค่าที่นำมาใช้ ไม่เขียนทับ draft โดยอาศัยการแจ้งเตือนอย่างเดียว.

## 3. วิดีโอ

- Catalog กำหนด text/image/first-last-frame/multimodal modes ที่เปิดจริง.
  แยก first frame, last frame และ ordinary references ตามบทบาท API.
- Duration, resolution, ratio, audio และจำนวน/ชนิด reference ตรวจ combination ด้วย
  ไม่ใช่แค่ตรวจแต่ละ field. ค่า FPS/Seed แสดงเมื่อ contract รองรับเท่านั้น.
- ความสามารถใหม่ เช่น extend/edit/video/audio references ที่ backend ยังไม่มี
  ไม่รวมการเพิ่ม backend โดยอัตโนมัติในงาน frontend นี้.
- ส่งงานแล้วเก็บ stable task ID และติดตาม task เดิม; ปิด/เปิดหน้าและ network retry
  ไม่สร้าง generation ซ้ำ. Unknown outcome ตรวจสถานะเดิมก่อนเปิดให้ retry การสร้าง.
- แสดงเฉพาะ completed ที่มี playable asset ใน Recent outputs; งานล้มเหลวมี status/log
  และ support reference ตามระบบเดิม ไม่สร้าง video card ดำหรือ player ว่าง.
- หากไฟล์ของ completed task เล่นไม่ได้ ถือเป็น media delivery error มี retryโหลด
  ห้ามตีความว่า generation ล้มเหลวแล้วสร้างใหม่/คิดเงินใหม่อัตโนมัติ.

## 4. State และ recovery

| สถานะ | สิ่งที่เห็น | การกระทำที่อนุญาต |
|---|---|---|
| Session/catalog loading | ข้อความและ shared spinner; draft คงอยู่ | รอ/ลองโหลดใหม่ตามเหตุ |
| ไม่มีโมเดล/ไม่มีสิทธิ์ | เหตุผลจาก owner ไม่ใช้ข้อความ unqualified เดาเอง | เลือกตัวเลือกที่ใช้ได้/กลับ login ตาม flow |
| Empty input/results | Prompt พร้อมเริ่ม; empty viewer | เพิ่ม input |
| Reference selected/uploading/processing | สถานะต่อไฟล์และข้อจำกัดจาก owner; คงลำดับ/role | รอ/เปลี่ยน/ลบ; Generate ไม่ส่งชุดที่มี reference ยังไม่พร้อมโดยเงียบ ๆ |
| Reference failed/reselection-required | เหตุผลและ retry/เลือกไฟล์ใหม่ต่อรายการ | เก็บไฟล์ที่สำเร็จแล้ว; retry เฉพาะรายการเสีย ไม่ upload ใหม่ทั้งชุด |
| Invalid field/reference | ข้อความใกล้ field; highlight ทุก reference ที่ map ได้ | เปลี่ยน/ลบ/แก้; controls ยังอยู่ |
| Estimate pending/stale/error | สถานะข้าง Generate; ไม่แสดงราคาเก่าเสมือนใช้ได้ | โหลด estimateใหม่โดยไม่ dispatch |
| Submitting/queued/running | สถานะจริงและ duplicate prevention | ดูผลงานเก่า; cancel เฉพาะ API รองรับ |
| Unknown/reconciliation | บอกว่ายังยืนยันผลไม่ได้ | Check งานเดิม; ไม่ blind retry |
| Succeeded | Viewer และ actions ของ assetจริง | ดู/ดาวน์โหลด/ใช้ต่อ |
| Failed/cancelled | หยุด spinner; ข้อผิดพลาดที่แก้ได้และ log ID | แก้ draft แล้วส่งใหม่อย่างชัดเจน |
| Partial success | ชิ้นสำเร็จยังดูได้; ข้อผิดพลาดแยก | retry ตาม owner contract |
| Session expired/actor switch | หยุด private requests และ clear actor state | Login/resolve actorใหม่; ไม่เผยงานคนก่อน |

ห้ามเดา index reference โดยลบ1เสมอ: ใช้ mapping ของ provider dispatch เดิม.
ถ้าไม่รู้ว่าภาพใดผิด ให้แสดงระดับงาน ไม่ highlight ภาพแรกโดยพลการ.
Log ที่เก็บต้อง sanitized; ซ่อนการ์ดล้มเหลวไม่ใช่ลบ audit/history เบื้องหลัง.
Late upload response ของรายการที่ลบ/แทนแล้วต้องไม่ฟื้นรายการเก่า; ผูกผลกับ stable reference identity.
แยก mapped validation (แก้ field/ภาพที่ระบุ), unmapped provider refusal (ข้อความระดับงาน),
และ transport error (ตรวจสถานะเดิมก่อน retry). ทุกกรณีคง controls แก้ภาพ ไม่ retry generation อัตโนมัติ.

มีทางเข้า “งานที่กำลังทำ / งานล่าสุด” จาก status panel ทั้ง desktop/mobile เพื่อเปิด pending,
failed และ unknown เดิมหลังกลับหน้าใหม่ พร้อม support reference ที่ปลอดภัย; ไม่แทรกเป็น failed media card.
T01 ต้องยืนยัน recovery contract เมื่อ server รับงานแล้วแต่ response หายก่อน client ได้ job ID.
ใช้ correlation/idempotency และ reconciliation ของ owner เดิม; หากยังไม่มี ให้ระบุ dependency ของเจ้าของ
Generation/Video ชัดเจนก่อนทำ flow นี้ ห้ามแก้ด้วยการสร้างงานใหม่หรืออ้างว่า reload recovery ผ่านแล้ว.

## 5. Draft, results และ Comparison

Image/Video มี draft แยกและ versioned ต่อ actor. ไม่เก็บ Base64/Blob/private tokens
ใน browser durable state. refresh คืน lightweight draft และ active job ID ตาม003.
เมื่อมีไฟล์ที่ยังไม่ upload ต้องแจ้งเลือกใหม่ ไม่อ้างว่ากู้คืนไฟล์แล้ว.
ไม่แย่ง scroll/focus/ผลลัพธ์ที่ผู้ใช้กำลังดูเมื่อ job อื่นเสร็จ; ใช้ป้ายงานใหม่ให้เลือกเอง.
Generation result ในประวัติยังตามนโยบายเดิม; requirement Save ของ Custom Voice
ไม่ถูกนำมาบังคับภาพ/วิดีโอใน Playground.
เมื่อรับงานแล้ว submitted snapshot ไม่เปลี่ยนตาม draft ที่ผู้ใช้แก้ต่อ; ผูก status/result กับ request เดิม.
แก้ draft ถัดไปและดูผลเดิมได้ระหว่างงานกำลังทำ; ส่งงานใหม่ได้เฉพาะ explicit Generate พร้อม quote ใหม่
และเมื่อ concurrency policy เดิมอนุญาต. เก็บหลาย operation ตาม owner แทนการเขียนทับ activeJobId เดียว.
ช่วง submitting/unknown ของคำขอเดียวกันต้องป้องกันการส่งซ้ำ; เปลี่ยนแท็บไม่ unmount เจ้าของ observer/draft.
การสลับภาษา/แท็บหรือ completion ระหว่างเปิด keyboard ไม่ล้าง draft หรือแย่งตำแหน่งพิมพ์.

Comparison ระยะถัดไปต้องใช้ endpoint และ run ownership เดิม; จำนวน slot และ limit
ตาม contract. estimate รวมเฉพาะ slotเปิดใช้งาน; ค่าแต่ละ slotตรงกับคำขอจริง.
Grid เปรียบเทียบไม่ crop ภาพ; แต่ละ slotมี pending/error/complete ของตัวเอง.
ข้อเสนอ sync zoom แยกเป็นภายหลัง ไม่บังคับใน Comparison รุ่นแรก.
ก่อน T07 ระบุ shared inputs กับ per-slot overrides ตามสัญญา Comparison เดิมให้ชัดเจน.
เข้า/ออก Comparison แล้ว normal draft คงอยู่; ปิด slot ไม่ยกเลิกงานที่ส่งไปแล้วโดยปริยาย.
Retry ต้องแสดง scope/estimate ตาม owner; ห้ามสร้าง slot ที่สำเร็จซ้ำเงียบ ๆ.
ถ้า owner ยังไม่รองรับ retry เฉพาะ slot ให้แสดงทางแก้ที่รองรับจริง ไม่ทำ client fan-out ใหม่.

## 6. ข้อจำกัดทางธุรกิจที่รักษา

ราคาจาก Credits, model capabilities จาก catalog, session จาก Identity, references
จาก Reference Processing/Assets. Estimate/reserve/enqueue/capture/refund/idempotency
ใช้เจ้าของเดิม. ไม่มี API key, ราคาคงที่ หรือ provider endpoint ใน browser.
การลด UI ไม่ใช่การยกเลิกสิทธิ์หรือ fee. ใช้หลักฐาน live เฉพาะเมื่อผู้ใช้อนุญาตให้เรียก API.

Quote response ผูก normalized request identity; response เก่าห้ามทับราคาของค่าที่เลือกใหม่.
Quote หมดอายุ/ไม่ตรงต้อง estimate ใหม่และแสดงราคาปัจจุบันก่อนผู้ใช้สั่ง Generate ใหม่; เครดิตไม่พอคง draft
และไม่ dispatch. Operation ใหม่ที่ตั้งใจสร้างใช้ identity ใหม่; transport retry/reconciliation ใช้ identity เดิม.
ก่อน POST เก็บ request intent ตามสัญญา003; ห้ามใช้ key เดิมกับ input ที่แก้แล้ว หรือถือว่าไม่พบใน Recent = ไม่เคยรับงาน.
สถานะ capture/refund/reconciliation แสดงจาก Credits owner เท่านั้น; UI cancel, media error หรือ terminal observation
ไม่ใช่หลักฐานคืนเงินเอง. ไม่เพิ่ม confirmation modal ทั่วไป; คงเฉพาะ policy ที่ใช้อยู่จริง.
