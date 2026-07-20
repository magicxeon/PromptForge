# 08 - Cost Risks, Controls, and Metrics

## 1. Cost risks ที่ต้องใส่ใน model

| Risk | Reserve/Control เริ่มต้น |
|---|---|
| Technical retry | 5-15% ของ API cost |
| FX/cross-border card | pricing FX 35 บาท/USD และ review threshold |
| Foreign-service VAT/tax | กัน 7% จนยืนยันวิธีปฏิบัติ |
| Refund/chargeback | 0.5-2% revenue |
| Free credits/promotion | จำกัดเป็น CAC budget |
| Fraud/abuse | 1-2% reserve ช่วงแรก |
| Prompt/attribute AI calls | 1-5 บาท/customer |
| Storage/processing | 1-3 บาท/customer ใน MVP |
| Provider price change | versioned pricing + monthly review |
| Human support time | บันทึกชั่วโมงแม้ยังไม่จ่ายเงินเดือน |

## 2. Foreign services and tax awareness

บริการ AI/cloud ส่วนใหญ่เป็นผู้ให้บริการต่างประเทศ บริการที่ทำในต่างประเทศและนำมาใช้ในไทยอาจมีประเด็น VAT/ภ.พ.36 ตามสถานะผู้ซื้อและเอกสารของ provider

ช่วง Pilot:

- เก็บ invoice/receipt ทุก provider
- เก็บยอด USD, exchange rate, VAT และยอดที่บัตรตัดจริง
- แยกบัญชี provider cost ตามนิติบุคคลผู้เรียกเก็บ
- ขอคำแนะนำภาษีเฉพาะกรณีก่อน scale แม้ทำบัญชีประจำเดือนเอง

อ้างอิง: [Revenue Department ruling on foreign services](https://www.rd.go.th/36190.html)

## 3. Payment controls

- ChillPay webhook ต้อง verify signature
- ใช้ idempotency key ป้องกันเติมเครดิตซ้ำ
- แยก payment pending/paid/failed/refunded/chargeback
- Reconcile ยอด ChillPay กับ credit ledger รายวัน
- ห้ามแก้ balance โดยตรง ใช้ immutable ledger entry
- Refund ต้องสร้าง reverse ledger transaction

## 4. Generation cost controls

- Reserve credits ก่อนส่ง provider
- Commit credit เมื่อ request accepted ตาม billing semantics
- คืน credits เมื่อ technical failure ที่กำหนด
- จำกัด automatic retry 1 ครั้ง
- ตั้ง max provider cost ต่อ Simple-mode job
- Circuit breaker เมื่อ provider error/latency สูง
- Alert เมื่อ actual cost สูงกว่า estimate เกิน threshold

## 5. Credit liability

เครดิตที่ขายแล้วยังไม่ใช้คือภาระต้นทุนในอนาคต ควรกันเงินอย่างน้อย:

```text
Outstanding credit reserve = outstanding paid credits x 0.03 บาท
```

กำหนด expiry 90-180 วันอย่างชัดเจน แยก paid credit, bonus credit และ free credit ใน ledger เพราะมีอายุและ accounting treatment ต่างกัน

## 6. Data/privacy cost controls

- Private object storage และ signed URL
- Lifecycle delete temporary/reference assets
- Account deletion workflow
- Consent สำหรับใบหน้าและภาพบุคคล
- ห้ามใช้ภาพลูกค้า train โดยไม่มี consent
- เก็บ audit log ของ owner, generation lineage และ deletion
- เตรียม Terms, Privacy Policy และ Acceptable Use Policy ก่อนรับเงินจริง

## 7. Metrics dashboard

### Revenue

- Gross revenue
- Net revenue after ChillPay/refund
- Revenue by pack
- ARPPU
- Repeat purchase rate

### Cost

- API cost by provider/model
- Cost per generation
- Cost per usable image
- Reference input cost
- Retry/failure cost
- Free-credit cost
- Storage cost

### Product

- Activation rate
- Draft selection rate
- Promote-to-Selling rate
- Premium Campaign rate
- Time to first usable image
- Export/download rate

### Business

- CAC
- Contribution/customer
- Trial-to-paid conversion
- 30/60/90-day retention
- Payback period
- LTV/CAC

## 8. Alert thresholds เริ่มต้น

- Provider failure >5% ใน 15 นาที
- Cost/job > estimate 20%
- Retry cost >10% ของ API cost รายวัน
- Free-credit cost >5% ของ revenue
- Refund/chargeback >2% ของ revenue
- Simple-mode contribution margin <55%
- Queue delay >2 นาทีโดยไม่ใช่ provider latency

