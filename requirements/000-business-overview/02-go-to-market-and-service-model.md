# 02 - Go-to-Market and Service Model

## 1. สมมติฐานสำคัญ

ร้านค้าจำนวนหนึ่งไม่ต้องการเรียนรู้และทำภาพเอง แต่ต้องการส่งสินค้า/รูปให้คนที่ทำเป็นและจ่ายราคาเหมา ดังนั้นผลิตภัณฑ์ไม่ควรบังคับให้ลูกค้าเป็น prompt engineer

ModelPromptForge ควรรองรับ 3 ระดับบริการใน platform เดียว

| รูปแบบ | ผู้ทำงานหลัก | รายได้ของระบบ |
|---|---|---|
| DIY | ร้านค้าใช้ Simple mode | Credit pack |
| Done-with-you | Template/Creator ช่วยตั้ง project | Credit + template fee |
| Done-for-you | Creator/Agency รับงานผ่านระบบ | Credit + commission |

## 2. วิธีแข่งขันกับผู้รับทำภาพแบบเหมา

ไม่ควรแข่งด้วยข้อความว่า “ทำเองถูกกว่า” เพียงอย่างเดียว แต่ควรแก้ pain point ของการจ้างงาน:

- ราคาและจำนวน output ชัดก่อนเริ่ม
- brief ด้วย visual choices ไม่ต้องอธิบายศัพท์ภาพ
- ได้ Draft ภายในไม่กี่นาที
- revision อยู่ใน workflow และมีประวัติ
- model, character และ style ใช้ซ้ำได้
- export ขนาด marketplace/social อัตโนมัติ
- ไม่ผูกกับผู้รับงานคนเดียว

## 3. Recommended customer flow

1. สร้าง Fashion Project
2. อัปโหลดสินค้าด้านหน้า/ด้านหลังและรายละเอียด
3. เลือกหรือสร้าง Model Profile
4. เลือก Simple mode หรือ Advanced mode
5. สร้าง Draft และเลือกภาพที่ชอบ
6. Promote เป็น Selling Quality
7. สร้าง Campaign Set จากภาพที่อนุมัติ
8. Export 1:1, 4:5, 9:16 และ 16:9
9. บันทึก project เพื่อทำสินค้า/สีถัดไป

## 4. Go-to-market ช่วง Pilot

### กลุ่ม Pilot แรก

- ร้านแฟชั่น 20 ร้าน
- Creator/Affiliate 5 คน
- Freelancer/ผู้รับทำภาพ 5 คน

รวม 30 คนแบบ invite-only เพื่อเก็บทั้ง demand side และ supply side

### สิ่งที่ต้องแลกกับ Pilot credit

- ยินยอมให้สัมภาษณ์ 20-30 นาที
- ส่งตัวอย่าง output ที่ใช้ได้และใช้ไม่ได้
- ระบุเวลาที่ประหยัดได้
- ระบุราคาที่เคยจ่ายให้ผู้รับงานหรือช่างภาพ
- อนุญาตให้เก็บ usage metrics แบบไม่เผยแพร่ภาพส่วนตัว

## 5. ช่องทางหาลูกค้าต้นทุนต่ำ

- กลุ่ม Facebook ร้านค้าออนไลน์และแฟชั่น
- Creator/Affiliate ที่มีสินค้าแต่ไม่มี asset
- Partnership กับผู้รับทำภาพที่มีลูกค้าอยู่แล้ว
- Case study ก่อน/หลัง โดยขอสิทธิจากร้านค้า
- Referral credit หลังเพื่อนซื้อครั้งแรก ไม่ให้ทันทีตอนสมัคร

## 6. Simple And Advanced Service Modes

ModelPromptForge should support two service modes because the target users have different levels of AI provider knowledge.

### Simple Mode

Simple Mode is for users who want an outcome, not provider control.

Expected behavior:

- User chooses workflow intent, quality tier and references.
- Platform shows a predictable credit estimate.
- Platform can later route to the best available provider/model behind the scenes.
- User does not need to understand provider-specific settings.

Simple Mode is important for shop owners, fashion sellers and commercial users who want repeatable outputs without becoming prompt engineers.

### Advanced Mode

Advanced Mode is for creators and power users.

Expected behavior:

- User chooses provider, model, resolution and reference strategy.
- Platform shows a more exact credit estimate.
- User accepts model-specific tradeoffs and cost.
- Community templates may preserve the original provider/model as a recommendation, but the active user can change it before generation.

### Business Decision

In the current phase, build the data structure and credit/routing contracts first. Do not build automatic provider routing yet.

Required foundation:

- `routingMode: simple | advanced`
- provider/model snapshot
- credit estimate snapshot
- pricing policy version
- provider fallback warning
- active user credit deduction

This makes Community remix, Scene Builder templates and future commercial workflows compatible with provider routing when the product has enough usage data to route intelligently.

## 7. Marketplace phase

เมื่อ workflow หลักพิสูจน์แล้วจึงเปิด:

- Photographer Style Template
- Character/Fashion Template
- Campaign Workflow
- Creator service package
- Revenue sharing และ commission 20-30%

ก่อนเปิด marketplace ต้องมี ownership, versioning, remix lineage, moderation, payout และ dispute policy
