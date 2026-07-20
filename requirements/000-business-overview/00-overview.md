# ModelPromptForge Business Overview

> เอกสารชุดนี้รวบรวมการวิเคราะห์ธุรกิจ ราคา ต้นทุน และแผน provider routing สำหรับ MVP/Pilot
> อัปเดตตัวเลขอ้างอิง: 18 กรกฎาคม 2026

## 1. Executive summary

ModelPromptForge ไม่ควรวางตำแหน่งเป็นเพียงเครื่องมือช่วยเขียน prompt แต่เป็น **AI Visual Commerce Studio** ที่เปลี่ยนรูปสินค้า ตัวละคร และความต้องการทางการตลาดให้เป็นภาพพร้อมขาย โดยผู้ใช้ไม่ต้องรู้เรื่อง prompt กล้อง แสง หรือโมเดล AI

ลูกค้าหลักช่วงแรกคือร้านค้าออนไลน์ แบรนด์แฟชั่นขนาดเล็ก Creator/Affiliate และผู้รับทำภาพให้ร้านค้า จุดแข็งทางธุรกิจไม่ได้อยู่ที่การให้แม่ค้าทำทุกอย่างเอง แต่อยู่ที่การลดขั้นตอน brief ทำราคาและผลลัพธ์ให้ชัด และรองรับทั้ง DIY, assisted service และ creator marketplace ในอนาคต

## 2. ข้อเสนอหลักสำหรับ MVP

- ตลาดเริ่มต้น: ร้านค้าแฟชั่นออนไลน์ไทย และ Creator ที่ทำภาพขายสินค้า
- รูปแบบรายได้: Credit pack ราคา 199 / 399 / 699 บาท
- Gross contribution เป้าหมาย: 60-70% หลัง API, retry และ payment fee
- Fixed infrastructure ช่วง Pilot: ประมาณ 1,900-2,100 บาทต่อเดือน
- Contribution เฉลี่ย: ประมาณ 205 บาทต่อ paying customer หลังเผื่อต้นทุนแฝง
- Infrastructure break-even: ประมาณ 10 organic paying customers ต่อเดือน
- เป้าหมายมีเงินกลับไปพัฒนา 20,000 บาท: ประมาณ 108 organic customers หรือ 170 customers เมื่อ CAC เฉลี่ย 75 บาท
- เป้าหมายเชิงปฏิบัติ: 200 ธุรกรรมต่อเดือน ก่อนถือว่าธุรกิจเริ่มมีเงินหมุนเพื่อพัฒนาต่อ

## 3. โครงสร้าง Simple mode

| Mode | ผลลัพธ์ | Credits แนะนำ |
|---|---|---:|
| Draft | 4 ภาพตัวอย่าง 1K สำหรับเลือกแนว | 160 |
| Selling Quality | 2 ภาพพร้อมขาย 1K/2K | 180 |
| Premium Campaign | 3 ภาพเข้าชุด: Hero, Lifestyle, Detail | 550 |

Simple mode ต้องขายผลลัพธ์ ไม่ใช่ชื่อ provider ส่วน Advanced mode เปิดให้ Creator เลือก provider, model, resolution, reference และ quality ได้เอง

## 4. Free credit

ข้อเสนอทั่วไปคือ **160 free credits หลังยืนยัน email** ใช้ได้กับ Draft เท่านั้น หมดอายุใน 7 วัน และไม่สามารถโอนหรือรวมหลายบัญชีได้ ต้นทุนประมาณ 2.8-4.7 บาทต่อผู้สมัครที่ใช้สิทธิครบ

สำหรับ Pilot แบบเชิญ 30 คนแรก สามารถให้ 300 credits ต่อคน แลกกับ interview และ feedback โดยจัดเป็น research budget ไม่ใช่โปรโมชันถาวร

## 5. สารบัญตามลำดับความสำคัญ

1. [01-business-target-and-positioning.md](01-business-target-and-positioning.md) - ลูกค้าเป้าหมายและ positioning
2. [02-go-to-market-and-service-model.md](02-go-to-market-and-service-model.md) - วิธีแข่งกับผู้รับทำภาพและรูปแบบบริการ
3. [03-ai-provider-costs-and-credits.md](03-ai-provider-costs-and-credits.md) - ราคา API, reference และ credit packs
4. [04-mvp-infrastructure-costs.md](04-mvp-infrastructure-costs.md) - Server, database, storage และ service
5. [05-unit-economics-and-break-even.md](05-unit-economics-and-break-even.md) - กำไรต่อแพ็กและจำนวนลูกค้าที่คุ้มทุน
6. [06-simple-and-advanced-provider-routing.md](06-simple-and-advanced-provider-routing.md) - การจัด Draft, Selling และ Premium
7. [07-free-credit-and-promotion-policy.md](07-free-credit-and-promotion-policy.md) - Free credit และการป้องกัน abuse
8. [08-cost-risks-controls-and-metrics.md](08-cost-risks-controls-and-metrics.md) - ต้นทุนแฝง ความเสี่ยง และ metrics
9. [09-glossary.md](09-glossary.md) - คำศัพท์ธุรกิจและเทคนิค

## 6. หลักการใช้ตัวเลข

- ต้นทุนเงินบาทตามประกาศใช้เรตขาย ธปท. 33.7594 บาท/USD ณ วันที่อ้างอิง
- ระบบ pricing ภายในใช้ 35 บาท/USD เพื่อกัน FX และค่าธรรมเนียม
- ตัวเลขทั้งหมดเป็นสมมติฐานสำหรับ MVP ต้องแทนด้วย usage จริงจาก provider billing
- ทุก generation ต้องเก็บ provider, model, input/output usage, reference count, cost USD, credits charged, failure และ retry
- ทบทวน provider price และ credit table อย่างน้อยเดือนละครั้ง

## 7. แหล่งข้อมูลหลัก

- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation#calculating-costs)
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [xAI Grok Imagine Quality](https://docs.x.ai/developers/models/grok-imagine-image-quality)
- [BytePlus ModelArk pricing](https://docs.byteplus.com/en/docs/ModelArk/1544106)
- [Bank of Thailand exchange rates](https://www.bot.or.th/en/statistics/exchange-rate.html)

