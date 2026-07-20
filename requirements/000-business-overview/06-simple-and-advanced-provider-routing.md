# 06 - Simple and Advanced Provider Routing

## 1. Product principle

Simple mode ขายผลลัพธ์ ส่วน Advanced mode ขายการควบคุม

- Simple: ผู้ใช้เลือก Draft, Selling Quality หรือ Premium Campaign
- Advanced: ผู้ใช้เลือก provider, model, quality, resolution, references และ batch เอง
- ระบบต้องบันทึก route reason และ cost จริง แม้ไม่แสดงชื่อโมเดลใน Simple mode

## 2. Draft

คำสัญญา: ได้หลายแนวเร็วเพื่อเลือก composition ก่อนจ่ายแพง

```text
Output: 4 images
Resolution: 1K
Credits: 160
Technical retry: 1
```

| เงื่อนไข | Primary | Fallback |
|---|---|---|
| ไม่มี/1 reference | Grok Imagine Standard | Seedream 4.0 |
| 2+ references | Seedream 4.0 | Gemini Flash Lite |
| Provider latency สูง | ตัวที่มี health score ดีสุดภายใน cost ceiling | - |

เหตุผล: Grok Standard ต้นทุนต่ำสำหรับ exploration ส่วน Seedream เหมาะกับ multi-image และ subject consistency

## 3. Selling Quality

คำสัญญา: ภาพพร้อมลงร้าน เน้นสินค้า เสื้อผ้า ตัวละคร และ crop ที่ใช้จริง

```text
Output: 2 images
Resolution: 1K/2K
Credits: 180
Exports: 1:1, 4:5, 9:16
```

| งาน | Primary | Secondary |
|---|---|---|
| Fashion/outfit/character | Seedream 4.5 | Seedream 5 Lite |
| Lifestyle/editorial | Grok Imagine Quality | Seedream 4.5 |
| ข้อความ ป้าย หรือ layout | Gemini 3.1 Flash Image | Seedream 4.5 |
| Product + หลาย references | Seedream 4.5 | Gemini 3.1 Flash Image |

สองภาพต้องมีหน้าที่ต่างกัน เช่น cover/product clarity และ lifestyle ไม่ใช่ random variation ที่ใกล้กันเกินไป

## 4. Premium Campaign

คำสัญญา: ภาพ 3 ชิ้นที่มีตัวละคร สไตล์ แสง และ campaign direction ต่อเนื่อง

```text
Output: Hero + Lifestyle + Detail
Resolution: 2K; optional 4K Hero
Credits: 550
Character/style lock: enabled
```

| งาน | Model |
|---|---|
| Face/outfit/reference consistency | Seedream 5 Pro |
| Typography/complex layout | Gemini 3 Pro Image |
| Precise edit/final Hero | GPT Image 2 High |
| Supporting Lifestyle/Detail | Seedream 5 Pro หรือ Gemini 3 Pro |

GPT Image 2 High ไม่ควรเป็น default ทุกภาพเพราะ reference cost สูง ใช้เฉพาะ Hero หรือกรณีที่ benchmark ชี้ว่าคุ้มกว่า

## 5. Promote workflow

```text
Draft 4 images
  -> user selects one
  -> Promote to Selling (ประมาณ 100 credits/final image)
  -> approve
  -> Build Premium Campaign
```

การนำภาพที่อนุมัติไปเป็น reference ช่วยลดการสุ่มใหม่และเพิ่ม perceived value

## 6. Customer value by pack

| Pack | Draft sets | Selling sets | Premium campaigns |
|---|---:|---:|---:|
| Starter 2,000 | 12 sets / 48 previews | 11 sets / 22 finals | 3 / 9 images |
| Go 4,400 | 27 / 108 | 24 / 48 | 8 / 24 |
| Pro 8,400 | 52 / 208 | 46 / 92 | 15 / 45 |

## 7. Router inputs

- Task type: fashion, product, lifestyle, typography, edit
- Reference count และ reference roles
- Character consistency requirement
- Output resolution/aspect ratio
- Text rendering requirement
- Provider health, latency และ rate limit
- Expected provider cost และ tier cost ceiling
- Historical usable rate ของงานประเภทเดียวกัน

## 8. Fallback rules

- Fallback ต้องรักษาคำสัญญาระดับเดิม ไม่ downgrade แบบเงียบ
- Route ซ้ำได้หนึ่งครั้งสำหรับ technical failure
- ถ้าไม่มี provider ที่ผ่าน quality/cost ceiling ให้คืนเครดิตและแจ้งผู้ใช้
- Simple-mode price ต้องครอบคลุม fallback ที่แพงกว่าตาม blended P95

## 9. Benchmark before launch

สร้าง benchmark อย่างน้อย 100 jobs:

- 30 fashion/model + garment
- 20 product preservation
- 20 face/character consistency
- 15 Thai text/poster/layout
- 15 lifestyle/editorial

วัด garment fidelity, product fidelity, identity, hands/anatomy, Thai text, usable rate, latency และ cost per usable image

## 10. Sources

- [BytePlus Seedream image generation](https://docs.byteplus.com/en/docs/ModelArk/1824121)
- [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation)
- [xAI Grok Imagine](https://docs.x.ai/developers/models/grok-imagine-image)

