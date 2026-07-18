# 03 - AI Provider Costs and Credits

> ราคาอ้างอิงวันที่ 18 กรกฎาคม 2026 อาจเปลี่ยนได้โดย provider

## 1. Exchange-rate policy

- เรตต้นทุนอ้างอิง ธปท.: 33.7594 บาท/USD
- เรต pricing ภายใน: 35 บาท/USD
- ทบทวนเรตเมื่อค่าเงินต่างจาก pricing FX เกิน 5% ต่อเนื่อง 7 วัน

## 2. Standard generation cost

| Provider / Model | เงื่อนไข | USD/ภาพ | บาทตามเรตอ้างอิง |
|---|---:|---:|---:|
| Grok Imagine Standard | 1K/2K | 0.020 | 0.68 |
| Seedream 4.0 | 1K-4K | 0.030 | 1.01 |
| Gemini 3.1 Flash Lite | 1K | 0.0336 | 1.13 |
| Seedream 5.0 Lite | 1K | 0.035 | 1.18 |
| Gemini 2.5 Flash Image | 1K | 0.039 | 1.32 |
| Seedream 4.5 | 1K-4K | 0.040 | 1.35 |
| Seedream 5 Pro | <=2.36 MP | 0.045 | 1.52 |
| Grok Imagine Quality | 1K | 0.050 | 1.69 |
| GPT Image 2 Medium | 1024x1024 | 0.053 | 1.79 |
| Gemini 3.1 Flash Image | 1K | 0.067 | 2.26 |
| Grok Imagine Quality | 2K | 0.070 | 2.36 |
| Gemini 3 Pro Image | 1K/2K | 0.134 | 4.52 |
| GPT Image 2 High | 1024x1024 | 0.211 | 7.12 |
| Gemini 3 Pro Image | 4K | 0.240 | 8.10 |

GPT Image 2 portrait/landscape มีราคาต่างจาก square: medium ประมาณ 0.041 USD และ high ประมาณ 0.165 USD ต่อภาพตามตารางปัจจุบัน

## 3. Reference-image cost

| Provider | วิธีคิด | ต้นทุนเพิ่มโดยประมาณ |
|---|---|---:|
| Seedream 4/4.5/5 Lite | Input ฟรีตาม price table ปัจจุบัน | 0 บาท |
| Seedream 5 Pro | ภาพแรกฟรี ภาพต่อไป 0.003 USD | 0.10 บาท/ภาพ |
| Gemini 3 Pro | 0.0011 USD ต่อ input image | 0.04 บาท/ภาพ |
| Gemini Flash Image | ตาม input token | โดยมากต่ำกว่า 0.02 บาท/ภาพ 1K |
| Grok Standard | 0.002 USD ต่อภาพ | 0.07 บาท/ภาพ |
| Grok Quality | 0.010 USD ต่อภาพ | 0.34 บาท/ภาพ |
| GPT Image 2 | 8 USD/1M image tokens | ราว 1.18 บาท square หรือ 1.77 บาท portrait |

OpenAI reference ต้องติดตามจาก usage จริง เพราะ GPT Image 2 ใช้ high fidelity อัตโนมัติ

## 4. Cost formula

```text
Provider cost =
  output image cost
  + text input cost
  + reference image cost
  + generated partial/intermediate cost (ถ้ามี)
  + technical retry cost
```

```text
Minimum retail price =
  (provider cost x 1.15) / (1 - target gross margin)
```

ที่ target gross margin 70% ราคาขายควรประมาณ 3.83 เท่าของ provider cost

## 5. Credit packs

กำหนดมูลค่าหน้าร้านประมาณ 10 credits = 1 บาท

| Pack | ราคา | Credits | บาท/100 credits | Bonus เทียบ Starter |
|---|---:|---:|---:|---:|
| Starter | 199 | 2,000 | 9.95 | Base |
| Go | 399 | 4,400 | 9.07 | ประมาณ 10% |
| Pro | 699 | 8,400 | 8.32 | ประมาณ 16% |

## 6. Advanced-mode credit guide

| Operation | Credits เริ่มต้น |
|---|---:|
| Grok Standard | 30-40 + reference surcharge |
| Seedream 4.0 | 40-45 |
| Gemini Flash Lite | 45 |
| Seedream 5 Lite | 50 |
| Gemini 2.5 Flash / Seedream 4.5 | 55-65 |
| Seedream 5 Pro <=2.36MP | 60 |
| Grok Quality 1K | 70 + 15/reference |
| GPT Image 2 Medium | 75 + measured reference surcharge |
| Gemini 3.1 Flash 1K | 90 |
| Gemini 3 Pro 1K/2K | 180 |
| GPT Image 2 High | 285 + measured reference surcharge |
| Gemini 3 Pro 4K | 320 |

Advanced mode ต้องแสดง credit estimate ก่อนกดสร้าง และล็อก estimate สำหรับ request นั้น ไม่ควรหักเพิ่มภายหลังโดยผู้ใช้ไม่เห็น

## 7. Pricing controls

- เก็บ provider pricing ใน configuration/versioned table ไม่ hardcode ใน UI
- ราคา simple mode อิง blended worst-case routing
- หักเครดิตเมื่อ provider รับ job สำเร็จ และคืนเครดิตเมื่อ technical failure
- ผลลัพธ์สำเร็จแต่ผู้ใช้ไม่ชอบถือเป็น generation ใหม่
- ตรวจ margin แยกตาม model, route และจำนวน reference

## 8. Sources

- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation#calculating-costs)
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
- [OpenAI vision cost](https://developers.openai.com/api/docs/guides/images-vision)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [xAI Grok Standard](https://docs.x.ai/developers/models/grok-imagine-image)
- [xAI Grok Quality](https://docs.x.ai/developers/models/grok-imagine-image-quality)
- [BytePlus ModelArk pricing](https://docs.byteplus.com/en/docs/ModelArk/1544106)

