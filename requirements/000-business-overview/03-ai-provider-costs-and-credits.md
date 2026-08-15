# 03 - AI Provider Costs and Credits

> ราคาอ้างอิงวันที่ 24 กรกฎาคม 2026 อาจเปลี่ยนได้โดย provider

## 1. Exchange-rate policy

- เรตต้นทุนอ้างอิง ธปท.: 33.7594 บาท/USD
- เรต pricing ภายใน: 35 บาท/USD
- ทบทวนเรตเมื่อค่าเงินต่างจาก pricing FX เกิน 5% ต่อเนื่อง 7 วัน

## 2. Standard generation cost

ตารางหลักใช้ค่าที่เหมาะกับการเปรียบเทียบงานทั่วไป โดยราคา OpenAI ด้านล่างเป็น **output image cost เท่านั้น** ยังไม่รวม text input, reference-image input, partial images และ technical retry

| Provider / Model | เงื่อนไข | USD/ภาพ | บาทตามเรตอ้างอิง |
|---|---:|---:|---:|
| GPT Image 1 Mini Low | 1024x1024 | 0.005 | 0.17 |
| GPT Image 1 Mini Medium | 1024x1024 | 0.011 | 0.37 |
| Grok Imagine Standard | 1K/2K | 0.020 | 0.68 |
| Seedream 4.0 | 1K-4K | 0.030 | 1.01 |
| Gemini 3.1 Flash Lite | 1K | 0.0336 | 1.13 |
| GPT Image 1.5 Medium | 1024x1024 | 0.034 | 1.15 |
| Seedream 5.0 Lite | 1K | 0.035 | 1.18 |
| Gemini 2.5 Flash Image | 1K | 0.039 | 1.32 |
| Seedream 4.5 | 1K-4K | 0.040 | 1.35 |
| GPT Image 1 Medium | 1024x1024 | 0.042 | 1.42 |
| Seedream 5 Pro | <=2.36 MP | 0.045 | 1.52 |
| Grok Imagine Quality | 1K | 0.050 | 1.69 |
| GPT Image 2 Medium | 1024x1024 | 0.053 | 1.79 |
| Gemini 3.1 Flash Image | 1K | 0.067 | 2.26 |
| Grok Imagine Quality | 2K | 0.070 | 2.36 |
| Gemini 3 Pro Image | 1K/2K | 0.134 | 4.52 |
| GPT Image 1.5 High | 1024x1024 | 0.133 | 4.49 |
| GPT Image 1 High | 1024x1024 | 0.167 | 5.64 |
| GPT Image 2 High | 1024x1024 | 0.211 | 7.12 |
| Gemini 3 Pro Image | 4K | 0.240 | 8.10 |

### 2.1 OpenAI GPT Image output price — complete comparison

อัตราเงินบาทด้านล่างคำนวณจากเรตต้นทุนอ้างอิง 33.7594 บาท/USD และปัดเป็นสองตำแหน่ง

| Model | Quality | 1024x1024 USD | บาท | 1024x1536 USD | บาท | 1536x1024 USD | บาท |
|---|---|---:|---:|---:|---:|---:|---:|
| GPT Image 2 | Low | 0.006 | 0.20 | 0.005 | 0.17 | 0.005 | 0.17 |
| GPT Image 2 | Medium | 0.053 | 1.79 | 0.041 | 1.38 | 0.041 | 1.38 |
| GPT Image 2 | High | 0.211 | 7.12 | 0.165 | 5.57 | 0.165 | 5.57 |
| GPT Image 1.5 | Low | 0.009 | 0.30 | 0.013 | 0.44 | 0.013 | 0.44 |
| GPT Image 1.5 | Medium | 0.034 | 1.15 | 0.050 | 1.69 | 0.050 | 1.69 |
| GPT Image 1.5 | High | 0.133 | 4.49 | 0.200 | 6.75 | 0.200 | 6.75 |
| GPT Image 1 | Low | 0.011 | 0.37 | 0.016 | 0.54 | 0.016 | 0.54 |
| GPT Image 1 | Medium | 0.042 | 1.42 | 0.063 | 2.13 | 0.063 | 2.13 |
| GPT Image 1 | High | 0.167 | 5.64 | 0.250 | 8.44 | 0.250 | 8.44 |
| GPT Image 1 Mini | Low | 0.005 | 0.17 | 0.006 | 0.20 | 0.006 | 0.20 |
| GPT Image 1 Mini | Medium | 0.011 | 0.37 | 0.015 | 0.51 | 0.015 | 0.51 |
| GPT Image 1 Mini | High | 0.036 | 1.22 | 0.052 | 1.76 | 0.052 | 1.76 |

ข้อสังเกต:

- GPT Image 2 รองรับขนาดภาพเพิ่มเติมได้ถึง 4K ภายใต้ข้อจำกัดของ model; ตารางนี้ใช้สามขนาดมาตรฐานเพื่อเปรียบเทียบกับรุ่นก่อนหน้า
- GPT Image 2 แบบ portrait/landscape บาง quality มี output cost ต่ำกว่า square แม้จำนวนพิกเซลมากกว่า จึงห้ามประมาณราคาจาก megapixel อย่างเดียว
- GPT Image 1 Mini เป็นตัวต้นทุนต่ำสุดของ OpenAI และควรมีใน Advanced Mode สำหรับ Draft/Economy tier
- GPT Image 1.5 เหมาะกับ Standard/Selling Quality ส่วน GPT Image 2 ควรเป็น Premium/Advanced option ตามคุณภาพและลักษณะงาน

### 2.2 OpenAI token price for image-generation models

ราคามาตรฐานต่อ 1 ล้าน tokens:

| Model | Modality | Input | Cached input | Output |
|---|---|---:|---:|---:|
| GPT Image 2 | Image | 8.00 USD | 2.00 USD | 30.00 USD |
| GPT Image 2 | Text | 5.00 USD | 1.25 USD | - |
| GPT Image 1.5 | Image | 8.00 USD | 2.00 USD | 32.00 USD |
| GPT Image 1.5 | Text | 5.00 USD | 1.25 USD | 10.00 USD |
| GPT Image 1 Mini | Image | 2.50 USD | 0.25 USD | 8.00 USD |
| GPT Image 1 Mini | Text | 2.00 USD | 0.20 USD | - |

หมายเหตุ: หน้า Pricing หลักไม่ได้แสดง token rate ของ GPT Image 1 ในตารางล่าสุด แต่หน้า Image Generation ยังแสดง per-image output price ของ GPT Image 1 อยู่ จึงควรใช้ราคา per-image จาก guide และตรวจ usage จริงสำหรับงาน edit/reference

### 2.3 OpenAI Batch API price

Batch API ลด token price โดยประมาณ 50% สำหรับรุ่นที่รองรับ แต่ไม่ควรใช้เป็นราคาหน้าร้านทันทีจนกว่าจะยืนยันว่า generation workflow, SLA และเวลารอเหมาะกับผู้ใช้

| Model | Modality | Batch Input | Batch Cached input | Batch Output |
|---|---|---:|---:|---:|
| GPT Image 2 | Image | 4.00 USD | 1.00 USD | 15.00 USD |
| GPT Image 2 | Text | 2.50 USD | 0.625 USD | - |
| GPT Image 1.5 | Image | 4.00 USD | 1.00 USD | 16.00 USD |
| GPT Image 1.5 | Text | 2.50 USD | 0.63 USD | 5.00 USD |
| GPT Image 1 Mini | Image | 1.25 USD | 0.13 USD | 4.00 USD |
| GPT Image 1 Mini | Text | 1.00 USD | 0.10 USD | - |

## 3. Reference-image cost

| Provider | วิธีคิด | ต้นทุนเพิ่มโดยประมาณ |
|---|---|---:|
| Seedream 4/4.5/5 Lite | Input ฟรีตาม price table ปัจจุบัน | 0 บาท |
| Seedream 5 Pro | ภาพแรกฟรี ภาพต่อไป 0.003 USD | 0.10 บาท/ภาพ |
| Gemini 3 Pro | 0.0011 USD ต่อ input image | 0.04 บาท/ภาพ |
| Gemini Flash Image | ตาม input token | โดยมากต่ำกว่า 0.02 บาท/ภาพ 1K |
| Grok Standard | 0.002 USD ต่อภาพ | 0.07 บาท/ภาพ |
| Grok Quality | 0.010 USD ต่อภาพ | 0.34 บาท/ภาพ |
| GPT Image 2 | 8 USD/1M image-input tokens | ขึ้นกับขนาด/จำนวน reference; ต้องอ่าน usage จริง |
| GPT Image 1.5 | 8 USD/1M image-input tokens | ขึ้นกับ input fidelity และขนาดภาพ |
| GPT Image 1 Mini | 2.50 USD/1M image-input tokens | ถูกกว่า GPT Image 2/1.5 แต่ยังต้องวัด usage จริง |
| GPT Image 1 | ไม่มี token rate ใน pricing table ล่าสุด | ใช้ usage จริงและ per-image guide เป็นฐาน |

OpenAI reference ต้องติดตามจาก usage จริง โดยเฉพาะ GPT Image 2 ซึ่งประมวลผล image input แบบ high fidelity อัตโนมัติ ค่า reference จึงอาจสูงกว่าค่า output image ของโหมด Low/Medium บางกรณี

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

Credit ด้านล่างเป็นค่าเริ่มต้นที่ปัดขึ้นเพื่อรองรับแพ็ก Pro ซึ่งมีมูลค่าต่ำสุดประมาณ 0.0832 บาท/credit และสูตร margin เป้าหมาย 70% พร้อม reserve 15% ค่า reference ให้คิดเพิ่มตาม usage จริง

| Operation | Credits เริ่มต้น |
|---|---:|
| GPT Image 1 Mini Low square | 10 + reference surcharge |
| GPT Image 1 Mini Low portrait/landscape | 10-15 + reference surcharge |
| GPT Image 1 Mini Medium square | 20 + reference surcharge |
| GPT Image 1 Mini Medium portrait/landscape | 25-30 + reference surcharge |
| GPT Image 1 Mini High square | 60 + reference surcharge |
| GPT Image 1 Mini High portrait/landscape | 85-90 + reference surcharge |
| Grok Standard | 30-40 + reference surcharge |
| Seedream 4.0 | 40-45 |
| Gemini Flash Lite | 45 |
| Seedream 5 Lite | 50 |
| Gemini 2.5 Flash / Seedream 4.5 | 55-65 |
| Seedream 5 Pro <=2.36MP | 60 |
| Grok Quality 1K | 70 + 15/reference |
| GPT Image 1.5 Medium square | 55-60 + measured reference surcharge |
| GPT Image 2 Medium portrait/landscape | 70 + measured reference surcharge |
| GPT Image 2 Medium square | 85 + measured reference surcharge |
| GPT Image 1 Medium square | 70 + measured reference surcharge |
| GPT Image 1.5 Medium portrait/landscape | 85 + measured reference surcharge |
| Gemini 3.1 Flash 1K | 90 |
| GPT Image 1 Medium portrait/landscape | 105 + measured reference surcharge |
| GPT Image 1.5 High square | 220 + measured reference surcharge |
| Gemini 3 Pro 1K/2K | 180 |
| GPT Image 1 High square | 275 + measured reference surcharge |
| GPT Image 2 High portrait/landscape | 270 + measured reference surcharge |
| GPT Image 1.5 High portrait/landscape | 325 + measured reference surcharge |
| GPT Image 2 High square | 345 + measured reference surcharge |
| GPT Image 1 High portrait/landscape | 410 + measured reference surcharge |
| Gemini 3 Pro 4K | 320 |

Advanced Mode ต้องแสดง model, quality, resolution, reference count และ credit estimate ก่อนกดสร้าง จากนั้นล็อก estimate สำหรับ request นั้น ไม่ควรหักเพิ่มภายหลังโดยผู้ใช้ไม่เห็น

Simple Mode ควรใช้ tier ที่จำง่าย:

| Simple Tier | Suggested default route | Credit policy |
|---|---|---:|
| Draft | GPT Image 1 Mini Low/Medium หรือ provider ต้นทุนใกล้เคียง | blended fixed rate |
| Selling Quality | GPT Image 1.5 Medium, GPT Image 2 Medium portrait/landscape หรือ route คุณภาพใกล้เคียง | blended fixed rate |
| Premium Campaign | GPT Image 2 High, GPT Image 1.5 High หรือ premium provider | estimate ตาม resolution/reference |

## 7. Pricing controls

- เก็บ provider pricing ใน configuration/versioned table ไม่ hardcode ใน UI
- ราคา simple mode อิง blended worst-case routing
- หักเครดิตเมื่อ provider รับ job สำเร็จ และคืนเครดิตเมื่อ technical failure
- ผลลัพธ์สำเร็จแต่ผู้ใช้ไม่ชอบถือเป็น generation ใหม่
- ตรวจ margin แยกตาม model, route และจำนวน reference

## 8. Sources

- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation#calculating-costs)
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
  - Image generation models checked 24 July 2026: GPT Image 2, GPT Image 1.5, GPT Image 1 Mini token pricing; GPT Image 1 per-image pricing from the generation guide
- [OpenAI vision cost](https://developers.openai.com/api/docs/guides/images-vision)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [xAI Grok Standard](https://docs.x.ai/developers/models/grok-imagine-image)
- [xAI Grok Quality](https://docs.x.ai/developers/models/grok-imagine-image-quality)
- [BytePlus ModelArk pricing](https://docs.byteplus.com/en/docs/ModelArk/1544106)

## 9. Credit Deduction Module Requirement

The platform must deduct credits through a central ledger service, not inside individual UI modules or Community-specific code.

Generation credit lifecycle:

```text
estimate -> reserve -> enqueue/provider call -> capture on success
                                      -> refund on technical failure
```

Required ledger events:

```text
grant
reserve
capture
refund
adjustment
```

Business rules:

- Show estimated credits before generation.
- Reserve credits before a real provider job is accepted into the queue.
- Capture reserved credits only once for the final successful job.
- Refund technical/provider failures automatically.
- Do not refund because the user dislikes a successful image; that is a new generation.
- Store `pricingPolicyVersion`, provider, model, reference count and generation mode for audit.
- Community remix and Use Template generations charge the active user, not the template owner.
- Comparisons reserve/capture per selected slot according to the displayed estimate.

Technical ownership:

- `server/credits/*` owns ledger, balance, reservation and refund rules.
- `server/generationRequestService.js` and `server/queueManager.js` call credit services.
- Community, Scene Builder, Headshot and Character Sheet request generation through the shared generation service.

## 10. Simple And Advanced Routing Cost Policy

Simple and Advanced generation modes must be costed differently.

### Simple Mode

Simple Mode hides provider choice and should eventually use platform routing:

```text
intent + quality tier + reference count -> approved provider/model route -> blended credit estimate
```

For the first implementation, Simple Mode may still use a fixed provider/model or existing UI selection, but the request should already carry:

```text
routingMode: simple
qualityTier
generationMode
referenceCount
pricingPolicyVersion
```

This preserves future compatibility with automatic routing.

### Advanced Mode

Advanced Mode exposes provider/model choices:

```text
provider + model + resolution + references -> direct model credit estimate
```

Advanced Mode must:

- Display credit estimate per selected provider/model.
- Preserve provider/model snapshot on the generation request.
- Lock the displayed estimate for that request.
- Show fallback warnings if the provider/model becomes unavailable before generation.

### Routing Foundation

The routing layer should return:

```text
ProviderRoutingResult
- providerId
- modelId
- routingMode
- pricingPolicyVersion
- estimatedCredits
- estimateConfidence
- fallbackApplied
- warnings
```

Automatic provider routing is deferred, but contracts must be ready before public Community remix because remix can multiply generation demand.
