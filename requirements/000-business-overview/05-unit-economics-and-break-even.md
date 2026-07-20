# 05 - Unit Economics and Break-even

## 1. Assumptions

- Starter 50%, Go 35%, Pro 15%
- ลูกค้าใช้เครดิตครบ 100%
- AI cost เฉลี่ย 0.026 บาท/credit
- Technical retry reserve 10%
- ChillPay 3.25%; กรณีค่าธรรมเนียมยังไม่รวม VAT ใช้ effective 3.4775%
- Refund/chargeback reserve 1% ของรายได้
- ต้นทุน service อื่นรวม prompt analysis, storage, email และ background job
- Fixed infrastructure 2,000 บาท/เดือน

## 2. Contribution by pack

| Pack | Revenue | API + retry | ChillPay | Service อื่น | Refund reserve | Contribution |
|---|---:|---:|---:|---:|---:|---:|
| Starter | 199 | 57.20 | 6.92 | 4 | 1.99 | 128.89 |
| Go | 399 | 125.84 | 13.88 | 6 | 3.99 | 249.29 |
| Pro | 699 | 240.24 | 24.31 | 10 | 6.99 | 417.46 |

Contribution margin โดยประมาณ: Starter 64.8%, Go 62.5%, Pro 59.7%

## 3. Average customer economics

| Metric | ค่าเฉลี่ย |
|---|---:|
| Revenue/customer | 344 บาท |
| Credits/customer | 3,800 |
| API + retry | 108.68 บาท |
| ChillPay | 11.96 บาท |
| Other variable/reserve | 9-10 บาท |
| Contribution ก่อน foreign-service reserve | ประมาณ 214 บาท |
| Conservative contribution | **ประมาณ 205 บาท** |

205 บาทเป็นตัวเลขที่ควรใช้วางแผนช่วง Pilot จนกว่าจะมี billing data จริง

## 4. Break-even formula

```text
Required paying customers =
  (fixed cost + target development profit)
  / (contribution per customer - CAC)
```

## 5. Customer targets

| เป้าหมาย | CAC 0 | CAC 75 | CAC 100 | CAC 150 |
|---|---:|---:|---:|---:|
| จ่าย infrastructure 2,000 | 10 | 16 | 20 | 37 |
| เหลือพัฒนา 20,000 | 108 | 170 | 210 | 400 |
| เหลือพัฒนา 30,000 | 157 | 247 | 305 | 582 |

## 6. Interpretation

- 10 paying customers ทำให้ระบบไม่เป็นภาระค่า cloud แต่ยังไม่ใช่ธุรกิจที่เลี้ยงการพัฒนาได้
- 30 paying customers ยืนยันว่ามีคนจ่ายและครอบคลุมค่าใช้จ่ายพื้นฐาน
- 100 paying customers มีข้อมูลพอเริ่มวัด retention และ provider routing อย่างจริงจัง
- 180-220 paying transactions/month เป็นเป้าหมายที่เริ่มมีเงินประมาณ 20,000 บาทกลับไปพัฒนาหาก CAC อยู่แถว 75-100 บาท
- 300 transactions/month ควรเริ่มเตรียม capacity, support process และ VAT planning

ถ้าลูกค้าซื้อเฉลี่ย 0.7 ครั้งต่อเดือน การต้องการ 200 purchases หมายถึง active paying base ประมาณ 286 คน

## 7. VAT threshold awareness

รายรับจากขายสินค้าหรือบริการเกิน 1.8 ล้านบาทต่อปีเข้าเกณฑ์จด VAT ตามข้อมูลกรมสรรพากร

```text
1,800,000 / 344 / 12 = ประมาณ 436 transactions/month
```

ต้องนับรายรับรวมของกิจการ ไม่ใช่เฉพาะ ModelPromptForge เมื่อใกล้ 350-400 transactions/month ควรวางแผนว่าราคา pack รวม VAT หรือบวก VAT เพิ่ม

## 8. ChillPay questions to confirm

- 3.25% รวม VAT แล้วหรือยัง
- มีค่าธรรมเนียมขั้นต่ำหรือค่ารายเดือนหรือไม่
- Refund คืนค่าธรรมเนียมหรือไม่
- Chargeback fee และหลักฐานที่ต้องใช้
- Settlement period และ minimum payout
- มี rolling reserve หรือเงินประกันหรือไม่

## 9. Source

- [Revenue Department VAT information](https://www.rd.go.th/7060.html)

