# AI Template Marketplace — MVP Business & System Specification


> **หมายเหตุเรื่อง Diagram:** เอกสารฉบับนี้ใช้ไฟล์ภาพ PNG แทน Mermaid เพื่อให้เปิดได้ใน Markdown Viewer ทั่วไป  
> กรุณาเก็บไฟล์ `.md` และโฟลเดอร์ `assets` ไว้ในตำแหน่งเดียวกัน

> เอกสารสรุปแนวทางการเปิด Marketplace สำหรับให้สมาชิกใน Community สร้างและจำหน่าย AI Image Template ผ่านแพลตฟอร์ม  
> ครอบคลุมกระบวนการใช้งาน โมเดลรายได้ Commission การชำระเงิน การถอนรายได้ การจัดการ Template กฎหมาย ความปลอดภัย และขอบเขต MVP

---

## 1. Executive Summary

แพลตฟอร์มจะเปิดให้สมาชิกประเภท **Creator** สร้าง AI Image Template และนำมาจำหน่ายให้ผู้ใช้ประเภท **Buyer** โดยแพลตฟอร์มเป็นผู้ให้บริการพื้นที่ขาย ระบบชำระเงิน ระบบสิทธิ์การใช้งาน ระบบประมวลผลภาพ ระบบดูแลข้อพิพาท และระบบจ่ายรายได้ให้ Creator

แนวทางที่แนะนำสำหรับ MVP คือ:

- ผู้ซื้อเติมเงินหรือซื้อ Credit ผ่าน Payment Gateway
- ผู้ซื้อใช้ Credit เพื่อซื้อสิทธิ์ใช้งาน Template
- ค่า Template และค่า Generate ภาพแยกจากกัน
- Creator ได้ส่วนแบ่งเริ่มต้น 75%
- Platform Commission 25%
- รายได้ Creator ถูกบันทึกเป็นยอดเงินรอจ่าย ไม่ใช่ Credit ที่โอนให้สมาชิกอื่น
- รายได้พักไว้ 14 วันก่อนถอน
- ถอนขั้นต่ำ 1,000 บาท
- จ่ายรายได้เดือนละ 2 รอบ
- Template ทุกชิ้นต้องผ่านการตรวจสอบก่อน Publish
- Template ต้องมี Version และ Preview ที่สร้างจากระบบจริง
- Prompt หลักและ Workflow สำคัญเก็บฝั่ง Server
- MVP ใช้ License แบบ Standard Commercial License เพียงแบบเดียว
- ยังไม่เปิด Affiliate, Creator Subscription, Enterprise License หรือ Creator ต่างประเทศ

แนวคิดสำคัญคือ ผู้ซื้อไม่ได้ซื้อกรรมสิทธิ์ใน Prompt หรือ Workflow แต่ซื้อ **สิทธิ์เข้าถึงและใช้งาน Template ผ่านแพลตฟอร์มตามเงื่อนไข License**

---

## 2. Business Actors

| Actor | บทบาท |
|---|---|
| Buyer | ค้นหา ซื้อ และใช้งาน AI Template |
| Creator | สร้าง ส่งตรวจ เผยแพร่ และรับรายได้จาก Template |
| Platform | ให้บริการ Marketplace, Payment, License, Generation และ Support |
| Admin / Moderator | ตรวจ Creator, Template, รายงาน ข้อพิพาท และธุรกรรม |
| Payment Gateway | รับชำระเงินและส่งสถานะธุรกรรมกลับมายัง Platform |
| AI Provider | ประมวลผล Image Generation ตาม Template |
| Accountant / Finance | ตรวจยอดขาย Payout ภาษี และเอกสารทางบัญชี |

---

## 3. สิ่งที่ขายบน Marketplace

### 3.1 คำนิยามสินค้า

AI Template ในระบบอาจประกอบด้วย:

- Prompt และ Prompt Structure
- Input Variables
- Image References หรือ Placeholder
- Model และ Provider Configuration
- Aspect Ratio
- Generation Parameters
- Negative Instructions
- Post-processing Rules
- Workflow หรือชุดลำดับขั้นตอน
- UI Form สำหรับกรอกข้อมูล
- Preview และตัวอย่างผลลัพธ์
- คู่มือการใช้งาน

### 3.2 สิ่งที่ผู้ซื้อได้รับ

ผู้ซื้อได้รับ:

- สิทธิ์เข้าถึง Template ผ่านบัญชีของตน
- สิทธิ์ใช้งานภายใต้ License ที่กำหนด
- สิทธิ์ใช้ Template Version ที่ซื้อ
- สิทธิ์รับ Minor Update ตามนโยบาย Platform
- สิทธิ์สร้างภาพ โดยยังต้องชำระค่า Generation Credit แยกต่างหาก

ผู้ซื้อไม่ได้รับ:

- กรรมสิทธิ์ใน Prompt
- สิทธิ์ขายต่อ Template
- สิทธิ์แจกจ่าย Prompt หรือ Workflow
- สิทธิ์นำ Template ไปสร้างสินค้าที่แข่งขันโดยตรง
- สิทธิ์เข้าถึง Source Prompt ทั้งหมด หาก Platform กำหนดให้เป็น Server-side Template

---

## 4. ภาพรวมกระบวนการใช้งาน

![ภาพรวม AI Template Marketplace](assets/01_marketplace_overview.png)

---

## 5. Creator Journey

### 5.1 สมัคร Creator

Creator ต้อง:

1. สมัครสมาชิกหรือเข้าสู่ระบบ
2. เปิด Creator Account
3. ยอมรับ Creator Agreement เวอร์ชันล่าสุด
4. กรอกข้อมูลส่วนตัวและข้อมูลติดต่อ
5. ยืนยัน Email
6. ยืนยันเบอร์โทรเมื่อจำเป็น
7. ยืนยันตัวตนก่อน Publish หรืออย่างช้าก่อนถอนเงิน
8. เพิ่มบัญชีธนาคารที่ชื่อสอดคล้องกับข้อมูลผู้ขาย

### 5.2 สร้าง Template

Creator กรอกข้อมูล:

- Template Name
- Short Description
- Full Description
- Category
- Tags
- Supported Provider
- Supported Model
- Required Inputs
- Default Settings
- Prompt Schema
- Preview Images
- Usage Instructions
- Known Limitations
- Price
- Content Rating
- Confirmation of Rights
- Version Notes

### 5.3 ส่งตรวจ

ระบบตรวจเบื้องต้น:

- ข้อมูลครบหรือไม่
- Preview มีคุณภาพเพียงพอหรือไม่
- Template สามารถรันได้จริงหรือไม่
- Model ที่ระบุรองรับจริงหรือไม่
- มีคำต้องห้ามหรือเนื้อหาผิดนโยบายหรือไม่
- มีความเสี่ยงด้านลิขสิทธิ์ เครื่องหมายการค้า หรือภาพบุคคลหรือไม่
- มีเนื้อหา NSFW หรือไม่
- มี Prompt Injection หรือ Workflow ที่เป็นอันตรายหรือไม่

### 5.4 Publish และขาย

เมื่อผ่านการอนุมัติ:

- Template ได้สถานะ Published
- มี Template ID และ Version
- แสดงใน Marketplace
- Creator ดูยอดขาย รายได้ Pending และ Available ได้
- Creator แก้ไขได้ตามกติกา Versioning

---

## 6. Buyer Journey

![Buyer Journey](assets/02_buyer_journey.png)

### 6.1 ขั้นตอนซื้อ

1. ดูหน้า Template
2. ตรวจ Preview, Model, Input และ Limitations
3. อ่าน License Summary
4. ตรวจราคา Template
5. ตรวจว่า Generation Cost แยกจาก Template Price
6. ซื้อด้วย Credit
7. ระบบสร้าง License
8. Template แสดงใน My Templates

### 6.2 ขั้นตอนใช้งาน

1. เลือก Template
2. กรอกข้อมูลหรืออัปโหลดภาพ
3. ตรวจ Estimated Generation Credit
4. ยืนยัน Generate
5. ระบบประกอบ Prompt ฝั่ง Server
6. ส่ง AI Provider
7. บันทึก Job, Model, Version และ Cost
8. ส่งผลลัพธ์ให้ผู้ใช้

---

## 7. Pricing Model

### 7.1 ราคา Template

ช่วงราคาเริ่มต้นที่แนะนำ:

- 99 บาท
- 199 บาท
- 299 บาท
- 499 บาท

Platform อาจใช้ Price Tier เพื่อทำให้:

- UI เข้าใจง่าย
- ควบคุมคุณภาพสินค้า
- ลดการตั้งราคาผิดปกติ
- คำนวณ Promotion ได้ง่าย
- ลดข้อพิพาทเรื่องราคาที่เปลี่ยนตลอดเวลา

### 7.2 แยก Template Fee และ Generation Fee

```text
Template License Fee = ค่าซื้อสิทธิ์ใช้ Template
Generation Fee       = ค่า AI Provider และค่าบริการระบบต่อการ Generate
```

ตัวอย่าง:

```text
Template License       199 บาท
Generation ครั้งละ      8 Credits
```

การแยกสองส่วนนี้ช่วยป้องกันไม่ให้ผู้ซื้อเข้าใจว่าซื้อ Template แล้วสามารถ Generate ได้ฟรีไม่จำกัด

---

## 8. Commission Model

### 8.1 โมเดล MVP ที่แนะนำ

| รายการ | สัดส่วน |
|---|---:|
| Creator Share | 75% |
| Platform Commission | 25% |

MVP ไม่ควรเริ่มด้วย Commission หลายระดับ เพราะจะทำให้ระบบบัญชี เงื่อนไข และการสื่อสารซับซ้อนเกินจำเป็น

### 8.2 ฐานคำนวณ Commission

ต้องกำหนดในสัญญาว่า Commission คำนวณจากยอดใด

สูตรที่แนะนำ:

```text
Net Revenue
= ราคาขาย
- ส่วนลดที่ Platform เป็นผู้รับภาระ
- Refund
- Chargeback
- Payment Gateway Fee
- ภาษีหรือค่าใช้จ่ายที่ Platform ต้องหักแทนตามโครงสร้างจริง
```

```text
Creator Earnings = Net Revenue × Creator Share
Platform Revenue = Net Revenue × Platform Commission
```

### 8.3 ตัวอย่าง

สมมติ Template ราคา 300 บาท และ Payment Gateway Fee 9.75 บาท

```text
Gross Sale                 300.00 บาท
Payment Gateway Fee          9.75 บาท
Net Revenue                290.25 บาท
Creator Share 75%          217.69 บาท
Platform Share 25%          72.56 บาท
```

> หมายเหตุ: การคำนวณจริงต้องสรุปเรื่อง VAT, Withholding Tax และลักษณะเงินได้กับนักบัญชีหรือที่ปรึกษาภาษีก่อนเปิดระบบ

---

## 9. Transaction and Ledger Design

ห้ามใช้ยอด Credit เพียงค่าเดียวแทนทุกอย่าง ระบบควรแยกบัญชีอย่างน้อย 3 ประเภท

### 9.1 User Credit

ใช้สำหรับ:

- ซื้อ Template
- จ่ายค่า Generate
- ซื้อบริการภายใน Platform

ข้อจำกัด MVP:

- โอนให้ผู้ใช้อื่นไม่ได้
- แลกคืนเป็นเงินสดไม่ได้ ยกเว้นกรณี Refund ตามกฎหมายหรือนโยบาย
- Creator ไม่ได้รับรายได้เป็น User Credit

### 9.2 Creator Pending Earnings

รายได้ที่ขายได้แล้ว แต่ยัง:

- อยู่ในช่วงพักเงิน
- เสี่ยง Refund
- เสี่ยง Chargeback
- อยู่ระหว่างตรวจสอบข้อพิพาท
- รอผ่านเงื่อนไขด้านภาษีหรือ KYC

### 9.3 Creator Available Earnings

รายได้ที่:

- พ้นช่วง Hold
- ไม่มีข้อพิพาท
- ผ่าน KYC
- พร้อมถอนตามรอบ

![สถานะรายได้ Creator](assets/03_earnings_state.png)

---

## 10. Payment Flow

![Payment และ Credit Flow](assets/04_payment_flow.png)

### 10.1 Payment Webhook Requirements

ระบบต้องมี:

- Signature Verification
- Idempotency Key
- Duplicate Webhook Protection
- Transaction Status Mapping
- Retry-safe Processing
- Immutable Transaction Log
- Reconciliation Report
- Manual Review Queue
- Handling สำหรับ Pending, Success, Failed, Cancelled, Refunded และ Chargeback

---

## 11. Payout Policy

### 11.1 ข้อเสนอ MVP

- Hold Period: 14 วัน
- Minimum Payout: 1,000 บาท
- Payout Frequency: เดือนละ 2 รอบ
- Payout Channel: บัญชีธนาคารที่ผ่านการตรวจสอบ
- Manual Approval ใน MVP
- Creator ต้องผ่าน KYC ก่อนถอน
- รายการที่มีข้อพิพาทสามารถ Hold เฉพาะรายการได้

### 11.2 Payout Statement

Statement ต้องแสดง:

- รอบรายได้
- Gross Sales
- Discount
- Refund
- Chargeback
- Gateway Fee
- Platform Commission
- Withholding Tax หากมี
- Adjustment
- Net Payout
- Bank Account
- Payout Status
- Reference Number

---

## 12. Template Versioning

AI Model และ Provider สามารถเปลี่ยนพฤติกรรมได้ Template จึงต้องมี Version อย่างชัดเจน

### 12.1 Required Metadata

```yaml
template_id:
version:
creator_id:
supported_provider:
supported_model:
prompt_schema_version:
required_inputs:
default_parameters:
published_at:
last_tested_at:
status:
change_log:
```

### 12.2 Version Rules

- การแก้คำอธิบายเล็กน้อยไม่จำเป็นต้องสร้าง Major Version
- การเปลี่ยน Prompt หลักต้องสร้าง Version ใหม่
- การเปลี่ยน Model หรือ Workflow ต้องส่งตรวจใหม่
- ผู้ซื้อเดิมต้องดู Version ที่เคยซื้อได้
- Platform ต้อง Rollback Version ได้
- Preview ต้องผูกกับ Version
- ทุก Generation Job ต้องบันทึก Template Version

![Template Versioning](assets/05_template_versioning.png)

---

## 13. Preview Integrity

Preview อย่างน้อยหนึ่งภาพต้องสร้างจาก Template Version ที่ขายจริงผ่านระบบ Platform

ระบบควรบันทึก:

- Template ID
- Version
- Provider
- Model
- Seed หากมี
- Aspect Ratio
- Input Variables
- Generation Date
- Post-edit Status

ข้อความแจ้งผู้ซื้อควรระบุว่า:

> Preview สร้างจาก Template และ Model ที่ระบุ ณ วันที่ทดสอบ ผลลัพธ์จริงอาจแตกต่างตาม Input, Model Update และ Generation Variability

ห้ามใช้เฉพาะภาพจากภายนอกที่ไม่สามารถพิสูจน์ว่า Template สร้างได้จริง

---

## 14. License สำหรับ MVP

MVP ใช้ License เดียวคือ **Standard Commercial License**

### 14.1 อนุญาต

- ใช้สร้างภาพส่วนตัว
- ใช้สร้างภาพเชิงพาณิชย์
- ใช้ในงานโฆษณา Social Media และ E-commerce
- ใช้สร้างงานให้ลูกค้าของผู้ซื้อ
- ใช้ผลลัพธ์ภาพตามเงื่อนไขของ AI Provider

### 14.2 ไม่อนุญาต

- แจกหรือขายต่อ Template
- เปิดเผย Prompt หรือ Workflow ที่เป็นทรัพย์สินของ Creator
- Clone Template เพื่อจำหน่ายแข่ง
- แชร์บัญชีเพื่อหลีกเลี่ยงการซื้อ License
- ใช้สร้างเนื้อหาผิดกฎหมาย
- ใช้ภาพบุคคล เครื่องหมายการค้า หรืองานมีลิขสิทธิ์โดยไม่มีสิทธิ์
- อ้างว่า Platform หรือ Creator รับประกันสิทธิ์ใน Output ทุกกรณี

### 14.3 สิทธิ์ใน Output

ต้องแยกให้ชัดเจนว่า:

- License ของ Template ไม่เท่ากับการรับรองกรรมสิทธิ์ใน AI Output
- สิทธิ์ใน Output ขึ้นกับกฎหมายที่ใช้บังคับ เงื่อนไข AI Provider และ Input ของผู้ใช้
- ผู้ใช้รับผิดชอบสิทธิ์ในภาพ อัตลักษณ์ แบรนด์ และข้อมูลที่ตนอัปโหลด

---

## 15. Refund and Dispute Policy

### 15.1 กรณีที่พิจารณา Refund

- ชำระเงินซ้ำ
- ระบบไม่สร้าง License หลังชำระเงิน
- Template ไม่สามารถรันกับ Model ที่ประกาศรองรับ
- Template มีเนื้อหาหลักไม่ตรงกับรายละเอียด
- Template ถูกลบเนื่องจากละเมิดก่อนผู้ซื้อได้ใช้งานอย่างสมเหตุสมผล
- ระบบ Platform ผิดพลาดและไม่สามารถแก้ไขได้

### 15.2 กรณีที่อาจไม่ Refund

- ผู้ซื้อเปลี่ยนใจ
- ไม่ชอบ Style ทั้งที่ Preview และคำอธิบายถูกต้อง
- Input ของผู้ซื้อไม่ตรงตามข้อกำหนด
- ใช้งานผิดวิธี
- ผลลัพธ์แตกต่างจาก Preview ภายในความผันแปรที่แจ้งไว้
- Model Provider เปลี่ยนผลลัพธ์หลังจากวันที่ขาย โดย Platform มีแนวทางแก้ไขหรือ Version Update ที่เหมาะสม

### 15.3 Dispute Flow

![Refund และ Dispute Flow](assets/06_dispute_flow.png)

---

## 16. KYC และ Creator Verification

### 16.1 Buyer Verification

MVP ใช้:

- Email Verification
- Google Login
- Risk-based Phone Verification
- Fraud Detection ตาม Device, IP และ Payment Pattern

### 16.2 Creator Verification

ก่อน Publish หรือถอนเงิน:

- ชื่อ–นามสกุลตามกฎหมาย
- Email
- เบอร์โทร
- เลขประจำตัวผู้เสียภาษีหรือข้อมูลที่จำเป็น
- บัญชีธนาคาร
- ชื่อบัญชีต้องสอดคล้องกับผู้ขาย
- ยอมรับ Creator Agreement
- รับรองสิทธิ์ในผลงาน
- ยืนยันข้อมูลภาษี

### 16.3 Data Minimization

เก็บเฉพาะข้อมูลที่จำเป็นต่อ:

- ยืนยันตัวตน
- ป้องกัน Fraud
- จ่ายเงิน
- ออกเอกสารภาษี
- แก้ข้อพิพาท
- ปฏิบัติตามกฎหมาย

---

## 17. Legal and Compliance Scope

> ส่วนนี้เป็นแนวทางออกแบบระบบ ไม่ใช่คำปรึกษากฎหมายเฉพาะกรณี ก่อนเปิด Marketplace ควรให้ทนาย นักบัญชี และผู้ให้บริการ Payment ตรวจโครงสร้างจริงอีกครั้ง

### 17.1 กฎหมายแพลตฟอร์มดิจิทัล

แพลตฟอร์มที่ทำหน้าที่เป็นสื่อกลางระหว่าง Creator และ Buyer อาจอยู่ภายใต้ข้อกำหนดการประกอบธุรกิจบริการแพลตฟอร์มดิจิทัล ซึ่งควรตรวจ:

- หน้าที่แจ้งการประกอบธุรกิจ
- ข้อมูลที่ต้องแสดงต่อผู้ใช้
- Terms and Conditions
- ช่องทาง Complaint
- การเปลี่ยนแปลงเงื่อนไข
- การระงับหรือเลิกให้บริการ
- การจัดเก็บข้อมูลผู้ประกอบการบน Platform

อ้างอิง:

- ETDA — กฎหมาย/หลักเกณฑ์บริการแพลตฟอร์มดิจิทัล  
  https://www.etda.or.th/th/regulator/Digitalplatform/law.aspx
- ETDA — การควบคุมดูแลบริการแพลตฟอร์มดิจิทัล  
  https://www.etda.or.th/th/regulator/Digitalplatform/regulate.aspx
- พระราชกฤษฎีกาการประกอบธุรกิจบริการแพลตฟอร์มดิจิทัลที่ต้องแจ้งให้ทราบ พ.ศ. 2565  
  https://www.etda.or.th/getattachment/40875cd4-39f4-478a-a386-f5e17a4709df/

### 17.2 ระบบการชำระเงินและ Credit

หาก Credit หรือ Wallet สามารถ:

- โอนระหว่างผู้ใช้
- ถอนเป็นเงินสด
- ใช้ชำระแทนเงินให้บุคคลอื่น
- รับชำระแทน Creator
- มีลักษณะเก็บมูลค่าทางอิเล็กทรอนิกส์

อาจต้องพิจารณาว่าเข้าข่ายบริการชำระเงินภายใต้การกำกับหรือไม่

MVP จึงควร:

- จำกัด User Credit ให้ใช้ภายใน Platform
- ไม่อนุญาตโอน Credit
- ไม่ให้ Creator ถอน User Credit เป็นเงิน
- แยก Creator Earnings เป็นบัญชีเจ้าหนี้รอจ่าย
- ใช้ Payment Gateway ที่ได้รับอนุญาต
- ขอคำปรึกษาจากผู้เชี่ยวชาญหรือ ธปท. หากโมเดลมีลักษณะรับชำระแทนผู้ขาย

อ้างอิง:

- ธนาคารแห่งประเทศไทย — พ.ร.บ. ระบบการชำระเงิน พ.ศ. 2560  
  https://www.bot.or.th/th/laws-and-rules/bot-takes-responsibilities-and-other-relevant-laws-and-regulations/law04.html
- ธนาคารแห่งประเทศไทย — การกำกับตาม พ.ร.บ. ระบบการชำระเงิน  
  https://www.bot.or.th/th/our-roles/payment-systems/payment-act-oversight.html
- ธนาคารแห่งประเทศไทย — คู่มือการขออนุญาตบริการการชำระเงิน  
  https://www.bot.or.th/th/our-services/public-handbook/payment-public-handbook1.html

### 17.3 PDPA

ระบบต้องมี:

- Privacy Notice
- Data Inventory
- Processing Purpose
- Legal Basis
- Data Retention Policy
- Access Control
- Data Subject Request Channel
- Incident Response
- Vendor / Processor Agreement
- Consent Management เฉพาะกรณีที่ต้องใช้ความยินยอม
- Log การยอมรับ Privacy Notice และ Terms

อ้างอิง:

- สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล  
  https://www.pdpc.or.th/
- GPPC Privacy Policy ตัวอย่างองค์ประกอบ Privacy Notice  
  https://gppc.pdpc.or.th/privacy-policy/
- PDPC e-Learning  
  https://elearning.pdpc.or.th/

### 17.4 ภาษีและเอกสารบัญชี

ต้องสรุปกับนักบัญชีว่าเงินที่จ่าย Creator เป็น:

- ค่าบริการ
- ค่าลิขสิทธิ์
- ส่วนแบ่งรายได้
- หรือค่าตอบแทนรูปแบบอื่น

เพราะมีผลต่อ:

- Withholding Tax
- VAT
- ใบเสร็จรับเงิน
- ใบกำกับภาษี
- หนังสือรับรองหัก ณ ที่จ่าย
- การรับรู้รายได้ Gross หรือ Net
- การบันทึกเจ้าหนี้ Creator

MVP ควร Export:

- Sales Report
- Platform Fee Report
- Creator Earnings Report
- Payout Report
- Refund Report
- Tax Information
- 50 Tawi Data

อ้างอิง:

- กรมสรรพากร — โปรแกรมออกหนังสือรับรองหัก ณ ที่จ่าย ตามมาตรา 50 ทวิ  
  https://www.rd.go.th/65920.html
- กรมสรรพากร  
  https://www.rd.go.th/

---

## 18. Creator Agreement — หัวข้อที่ต้องมี

Creator Agreement ควรระบุ:

1. คุณสมบัติผู้ขาย
2. การยืนยันตัวตน
3. สิทธิ์ของ Creator ในผลงาน
4. สิทธิ์ที่มอบให้ Platform เพื่อจัดแสดงและประมวลผล
5. ประเภท License ที่ขายให้ Buyer
6. การกำหนดราคา
7. Platform Commission
8. ฐานคำนวณ Net Revenue
9. Payment Gateway Fee
10. Discount และ Promotion
11. Refund และ Chargeback
12. Pending Period
13. Payout Schedule
14. Minimum Payout
15. Withholding Tax
16. Platform Right to Hold
17. Template Review
18. Content Policy
19. Copyright Complaint
20. Suspension และ Termination
21. การจัดการรายได้คงเหลือเมื่อปิดบัญชี
22. Version Update
23. Model Deprecation
24. Limitation of Liability
25. Governing Law และ Dispute Resolution
26. Version ของ Agreement และวันที่ยอมรับ

---

## 19. เอกสารนโยบายที่ต้องมีก่อนเปิด

### P0 — ต้องมี

- Terms of Service
- Creator Agreement
- Privacy Notice
- Refund and Dispute Policy
- Standard Commercial License
- Content Policy
- Copyright / IP Complaint Policy
- Payout Policy
- Credit Terms
- Cookie Notice หากใช้ Tracking ที่เกี่ยวข้อง
- AI Output Disclaimer

### P1 — เพิ่มภายหลัง

- Community Guidelines
- Review Policy
- Promotion Policy
- Affiliate Terms
- Enterprise Terms
- Cross-border Creator Policy

---

## 20. Admin Console Requirements

### 20.1 Dashboard

- Gross Sales
- Net Revenue
- Platform Revenue
- Creator Pending
- Creator Available
- Payout Due
- Refund Rate
- Chargeback Rate
- Active Templates
- Templates Pending Review
- Open Disputes
- Failed Generations

### 20.2 Creator Management

- Search Creator
- View KYC Status
- Approve / Reject KYC
- View Bank Information แบบจำกัดสิทธิ์
- Suspend Account
- Hold Payout
- View Agreement Version
- View Sales History

### 20.3 Template Management

- Review Queue
- Test Run
- View Prompt Securely
- Approve
- Request Changes
- Reject
- Hide
- Remove
- View Version History
- View Preview Evidence
- View Report History

### 20.4 Transaction Management

- Search Transaction
- View Payment Status
- View Webhook Log
- Retry Reconciliation
- Refund
- Credit Adjustment
- Earnings Adjustment
- Hold / Release Earnings
- Export Report

### 20.5 Audit Log

ทุก Admin Action ต้องเก็บ:

- Admin ID
- Timestamp
- Action
- Target Type
- Target ID
- Previous Value
- New Value
- Reason
- Evidence
- IP / Device Information ตามความเหมาะสม

ห้ามให้ Admin แก้ยอด Wallet หรือ Earnings โดยไม่มี Adjustment Transaction

---

## 21. Security Requirements

### 21.1 Payment Security

- Verify Gateway Signature
- Idempotency
- Encrypt Sensitive Data
- Do not store full card data
- Secret Rotation
- IP Allowlist หาก Gateway รองรับ
- Reconciliation Job
- Alert เมื่อยอดไม่ตรง

### 21.2 Template Security

- Prompt เก็บฝั่ง Server
- จำกัดสิทธิ์การเข้าถึง Prompt
- Encrypt Secret Prompt Fields
- Prevent Template Export
- Input Validation
- File Scanning
- Prompt Injection Filtering
- Rate Limiting
- Abuse Detection

### 21.3 Account Security

- OAuth Login
- Email Verification
- MFA สำหรับ Admin
- Session Management
- Device / IP Risk Detection
- Login Audit Log
- Account Recovery
- Role-based Access Control

### 21.4 Data Security

- Encryption in Transit
- Encryption at Rest
- Backup
- Restore Test
- Data Retention
- Secure Deletion
- Access Review
- Incident Response Plan

---

## 22. Suggested Module Structure

```text
src/
├── auth/
├── users/
├── creators/
├── creator-verification/
├── marketplace/
├── templates/
├── template-versions/
├── template-runtime/
├── licenses/
├── pricing/
├── credits/
├── transactions/
├── payments/
├── payment-webhooks/
├── creator-earnings/
├── payouts/
├── refunds/
├── disputes/
├── reports/
├── reviews/
├── notifications/
├── legal-consents/
├── audit-logs/
├── admin/
├── ai-providers/
├── generation-jobs/
├── storage/
├── security/
└── accounting-export/
```

---

## 23. Suggested Core Data Entities

![Core Data Entities](assets/07_core_entities.png)

---

## 24. MVP Scope

### P0 — ต้องมีก่อนเปิดขาย

- User Login
- Creator Registration
- Creator Agreement
- Creator Verification
- Template Builder
- Template Review
- Template Version
- Marketplace Listing
- Template Detail
- Preview Evidence
- Credit Purchase
- Payment Webhook
- User Credit Ledger
- Template Purchase
- License Creation
- Generation Credit
- Generation Job Log
- Creator Pending Earnings
- Creator Available Earnings
- Payout Request
- Manual Payout
- Refund
- Dispute
- Admin Console
- Audit Log
- Privacy Notice
- Content Policy
- License
- Accounting Export

### P1 — หลังเริ่มมีการขาย

- Rating และ Review
- Creator Analytics
- Coupon
- Promotion
- Automated Payout Statement
- Automated Tax Export
- Creator Notification
- Buyer Favorites
- Search Ranking
- Creator Public Profile

### P2 — หลังพิสูจน์ Product-Market Fit

- Affiliate Commission
- Creator Tier
- Subscription
- Template Bundle
- Extended License
- Enterprise License
- Team Account
- Creator ต่างประเทศ
- Multi-currency
- Automated Copyright Detection
- Dynamic Revenue Sharing
- Reseller Program

---

## 25. สิ่งที่ไม่ควรทำใน MVP

- Credit Transfer ระหว่างสมาชิก
- Creator ถอน User Credit เป็นเงินสด
- Auto Payout รายวัน
- Affiliate Commission
- Creator Subscription
- Dynamic Commission หลายระดับ
- Creator ต่างประเทศ
- Multi-currency
- Enterprise Contract
- Resale License
- Template Auction
- Blockchain / NFT
- AI Copyright Detection แบบเต็มระบบ
- Revenue Sharing ตามจำนวน Generate
- การรับประกันผลลัพธ์ AI แบบ 100%

---

## 26. Decision Checklist ก่อนเริ่ม Development

### Business

- [ ] Template Price กำหนดโดย Creator หรือ Platform
- [ ] Commission คำนวณก่อนหรือหลัง Gateway Fee
- [ ] ส่วนลดออกโดยใคร
- [ ] Refund หักจาก Creator หรือ Platform ในแต่ละกรณี
- [ ] Creator Share เริ่มต้น 75% ใช่หรือไม่
- [ ] Hold Period 14 วันใช่หรือไม่
- [ ] Minimum Payout 1,000 บาทใช่หรือไม่
- [ ] จ่ายเดือนละ 2 รอบใช่หรือไม่

### Product

- [ ] Prompt เปิดให้ Buyer เห็นแค่ไหน
- [ ] Template ซื้อครั้งเดียวหรือจำกัดเวลา
- [ ] Minor Update ฟรีหรือไม่
- [ ] Major Version ต้องซื้อใหม่หรือไม่
- [ ] Preview ต้องสร้างจาก Platform กี่ภาพ
- [ ] Generation Cost แสดงก่อนกด Generate อย่างไร
- [ ] License ครอบคลุมงานลูกค้าของ Buyer หรือไม่

### Legal

- [ ] Platform อยู่ภายใต้ข้อกำหนด Digital Platform ระดับใด
- [ ] Credit Model เข้าข่ายบริการชำระเงินหรือไม่
- [ ] เงินจ่าย Creator จัดเป็นค่าบริการ ค่าลิขสิทธิ์ หรือส่วนแบ่งรายได้
- [ ] ต้องหักภาษี ณ ที่จ่ายในกรณีใด
- [ ] Platform จด VAT แล้วหรือยัง
- [ ] เอกสารใดออกโดย Platform
- [ ] ระยะเวลาเก็บ KYC และ Transaction Log
- [ ] กระบวนการรับคำร้อง PDPA
- [ ] กระบวนการ Copyright Takedown

### Technical

- [ ] Ledger ใช้ Double-entry หรือ Event-based Ledger
- [ ] Webhook Idempotency
- [ ] Refund Workflow
- [ ] Payout Reconciliation
- [ ] Audit Log
- [ ] Role-based Access Control
- [ ] Template Version Rollback
- [ ] Provider Model Deprecation
- [ ] Secure Prompt Storage
- [ ] Backup และ Restore Test

---

## 27. Recommended MVP Configuration

```yaml
marketplace:
  currency: THB
  creator_share_percent: 75
  platform_commission_percent: 25
  pricing_tiers:
    - 99
    - 199
    - 299
    - 499

license:
  type: standard_commercial
  access_model: platform_only
  generation_fee_included: false

payout:
  hold_days: 14
  minimum_amount_thb: 1000
  frequency: twice_monthly
  approval: manual

credit:
  transferable: false
  cash_redeemable: false
  creator_payout_credit: false

template:
  admin_review_required: true
  versioning_required: true
  server_side_prompt: true
  verified_preview_required: true

creator:
  kyc_required_before_payout: true
  bank_account_name_match: true

refund:
  admin_review_required: true

admin:
  audit_log_required: true
```

---

## 28. สรุปสุดท้าย

MVP Marketplace ที่ปลอดภัยและพัฒนาได้จริง ไม่ควรเริ่มจาก Marketplace ที่มีฟีเจอร์ครบทุกอย่าง แต่ควรเริ่มจากวงจรหลักที่ตรวจสอบได้:

![วงจรหลักของ MVP](assets/08_mvp_closed_loop.png)

หัวใจของระบบมี 5 เรื่อง:

1. ต้องระบุชัดว่าผู้ซื้อซื้ออะไร
2. เงินอยู่ในสถานะใดและเป็นของใคร
3. Commission คำนวณจากฐานใด
4. Template และ Preview ตรวจสอบย้อนหลังได้
5. Platform มีหลักฐานและ Workflow สำหรับ Refund, Dispute, Tax และ Compliance

เมื่อ 5 เรื่องนี้ชัด ระบบสามารถขยายไปสู่ Affiliate, Subscription, Creator Tier และ Enterprise Marketplace ได้โดยไม่ต้องรื้อโครงสร้างการเงินและสิทธิ์ใหม่ทั้งหมด

---

## 29. Official References

1. ธนาคารแห่งประเทศไทย — พระราชบัญญัติระบบการชำระเงิน พ.ศ. 2560  
   https://www.bot.or.th/th/laws-and-rules/bot-takes-responsibilities-and-other-relevant-laws-and-regulations/law04.html

2. ธนาคารแห่งประเทศไทย — การกำกับตาม พ.ร.บ. ระบบการชำระเงิน  
   https://www.bot.or.th/th/our-roles/payment-systems/payment-act-oversight.html

3. ธนาคารแห่งประเทศไทย — คู่มือการขออนุญาตบริการการชำระเงิน  
   https://www.bot.or.th/th/our-services/public-handbook/payment-public-handbook1.html

4. ETDA — กฎหมายและหลักเกณฑ์บริการแพลตฟอร์มดิจิทัล  
   https://www.etda.or.th/th/regulator/Digitalplatform/law.aspx

5. ETDA — การควบคุมดูแลบริการแพลตฟอร์มดิจิทัล  
   https://www.etda.or.th/th/regulator/Digitalplatform/regulate.aspx

6. สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล  
   https://www.pdpc.or.th/

7. GPPC — ตัวอย่างนโยบายคุ้มครองข้อมูลส่วนบุคคล  
   https://gppc.pdpc.or.th/privacy-policy/

8. กรมสรรพากร — โปรแกรมออกหนังสือรับรองหัก ณ ที่จ่าย ตามมาตรา 50 ทวิ  
   https://www.rd.go.th/65920.html

---

**Document status:** MVP Draft  
**Recommended review:** Business Owner, Software Architect, Accountant, Legal Advisor และ Payment Gateway Provider
