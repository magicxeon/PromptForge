# 07 - Free Credit and Promotion Policy

## 1. Recommendation

ให้ **160 free credits** หลังยืนยัน email ซึ่งพอดีกับ Draft 1 ชุด 4 ภาพ

| รายการ | ข้อเสนอ |
|---|---|
| Welcome credit | 160 credits |
| ใช้ได้กับ | Draft simple mode เท่านั้น |
| อายุ | 7 วัน |
| Transfer | ไม่ได้ |
| Cash value/refund | ไม่มี |
| Accounts | 1 คน/อุปกรณ์/เครือข่ายตาม risk rule |
| Premium/Advanced | ไม่อนุญาตด้วย welcome credit |

## 2. เหตุผลที่เลือก 160

- ลูกค้าได้เห็น 4 outputs และเข้าใจ workflow จริง
- ต้นทุนประมาณ 2.8-4.7 บาทต่อ activated signup
- ไม่เพียงพอสำหรับ Premium Campaign
- หลังเลือก Draft แล้วมีเหตุผลชัดให้ซื้อเพื่อ Promote เป็น Selling Quality
- คำนวณ marketing cost ได้ง่าย: activated trials x ต้นทุนต่อ Draft

## 3. ไม่แนะนำ free credit น้อยเกินไป

40-80 credits อาจสร้างได้เพียงภาพเดียวและมีความเสี่ยงที่ output แรกไม่ดี ผู้ใช้จะสรุปว่าระบบใช้ไม่ได้ก่อนเห็นความสามารถจริง

## 4. ไม่แนะนำ free credit มากเกินไป

300-500 credits แบบ public ทำให้ผู้ใช้สร้าง final assets ได้โดยไม่ต้องจ่าย เพิ่ม abuse และทำให้ CAC สูงโดยไม่รู้ตัว

## 5. Pilot exception

สำหรับลูกค้า 30 คนแรกแบบ invite-only ให้ 300 credits ต่อคนได้ โดยมีเงื่อนไข:

- Interview/feedback 20-30 นาที
- ส่งคะแนน output และเหตุผลที่ใช้ไม่ได้
- ให้ข้อมูล workflow และค่าใช้จ่ายเดิม
- Credit หมดอายุ 14 วัน

ต้นทุนสูงสุดโดยประมาณ 8-10 บาทต่อคน หรือ 240-300 บาทสำหรับ Pilot 30 คน ถือเป็น research cost

## 6. Abuse prevention

- ยืนยัน email ก่อน grant
- จำกัดบัญชีต่อ device fingerprint/IP แบบไม่ block บ้านหรือร้านที่ใช้ร่วมกันโดยอัตโนมัติ
- Rate limit signup และ generation
- ตรวจ disposable email และรูปแบบสมัครผิดปกติ
- ไม่ grant ซ้ำหลัง delete/re-register
- Free credit ใช้ provider routing ต้นทุนต่ำเท่านั้น
- จำกัด concurrent job เป็น 1
- Referral credit grant หลังผู้ถูกแนะนำชำระเงินและพ้นช่วง refund

## 7. First-purchase promotion

Pack มี volume bonus อยู่แล้ว จึงไม่ควรแจกเครดิตซ้อนมากเกินไป ตัวเลือกที่เหมาะ:

| Pack | First purchase bonus สูงสุด |
|---|---:|
| Starter | 100 credits |
| Go | 200 credits |
| Pro | 400 credits |

โบนัสครั้งแรกหมดอายุ 30 วันและไม่ควรเกิดพร้อม coupon ลดราคาแรง ใช้ A/B test ระหว่าง bonus credit กับส่วนลดเงินสด

## 8. Free-credit budget

```text
Trial cost = activated free-credit users x actual API cost per trial
Trial CAC = (trial cost + acquisition spend) / new paying customers
```

ตัวอย่าง: 1,000 activated trials x 4 บาท = 4,000 บาท หาก conversion 5% จะได้ 50 customers และ trial infrastructure CAC เท่ากับ 80 บาทต่อ paying customerก่อนรวมค่าโฆษณา

## 9. Metrics

- Signup-to-activation
- Draft completion rate
- Percentage selecting at least one Draft
- Draft-to-paid conversion ภายใน 7 วัน
- Cost per activated trial
- Cost per new paying customer
- Abuse rate
- Conversion แยกตาม acquisition channel

เกณฑ์เริ่มต้นที่ควรต้องการ: ผู้ใช้ที่สร้าง Draft สำเร็จอย่างน้อย 10-15% เปลี่ยนเป็นผู้จ่ายภายใน 7-14 วัน หากต่ำกว่านี้ควรแก้ onboarding/value ก่อนเพิ่มเครดิตฟรี

