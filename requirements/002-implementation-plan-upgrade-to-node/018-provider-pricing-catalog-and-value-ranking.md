# 18. Local Provider Price Ordering and Value Reference

**ID:** `018-provider-pricing-catalog-and-value-ranking`  
**Application:** `ModelPromptForge`  
**Status:** Implemented - Pending Runtime Verification  
**Feature type:** Local provider model ordering and pricing reference  
**Depends on:** Requirement 017 - Config-driven Provider Registry and Grok Imagine  
**Required by:** Requirement 020 - AI Model Comparison Workspace  
**Created:** 2026-07-14  
**Pricing snapshot:** 2026-07-14  
**Implementation authorization:** Approved with simplified local-only scope on 2026-07-14

## 1. Objective

เรียง Model ภายในแต่ละ Provider จากราคาถูกที่สุดด้านบนไปหารุ่นที่แพงที่สุดด้านล่าง เพื่อให้ผู้ใช้เลือก Model ได้ง่ายขึ้น โดยใช้ configuration ที่เตรียมไว้ภายใน project เท่านั้น

แนวทางที่อนุมัติ:

- ใช้ `displayOrder` ใน `server/config/providers.json` เป็น source of truth
- `ProviderRegistry` ใช้ sorting behavior เดิมตาม `displayOrder`
- ตารางราคาใน requirement นี้ใช้สำหรับตัดสินใจจัดลำดับและเป็นเอกสารอ้างอิง
- ไม่มีการเรียก pricing service ของ Provider ขณะ server start หรือขณะผู้ใช้เปิดหน้า
- ไม่มี web scraping, background refresh หรือ remote model-price discovery
- ไม่มี pricing database, quote endpoint หรือ price calculator ใน scope นี้
- ไม่เปลี่ยน credit deduction policy ปัจจุบัน

## 2. Scope

### 2.1 Implemented scope

- สรุปราคา Google Gemini, OpenAI และ xAI เป็นตารางแยก Provider
- กำหนดลำดับ Model แบบ local ผ่าน `displayOrder`
- แสดง Model dropdown ตามลำดับที่กำหนดไว้
- เพิ่ม regression test ยืนยันลำดับ public provider catalog
- ปรับชื่อ Grok ให้เห็นความต่างระหว่างรุ่นประหยัดและรุ่นพรีเมียม

### 2.2 Deferred scope

รายการต่อไปนี้ยังไม่ implement และให้พิจารณาเมื่อระบบ credits/billing พร้อม:

- แสดงราคา USD แบบ live ใน UI
- คำนวณราคาตาม quality, resolution และ reference count
- preflight quote API
- pricing version ใน job/history
- actual-cost reconciliation
- admin pricing UI
- การ update ราคาอัตโนมัติ
- การดึงราคา online จาก Provider

## 3. Local-Only Policy

Runtime ต้องอ่านเฉพาะไฟล์ local ที่มากับ application:

```text
server/config/providers.json
```

Sorting contract:

```javascript
provider.models
  .filter(model => model.enabled !== false)
  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
```

ข้อกำหนด:

- ค่า `displayOrder` น้อยอยู่ด้านบน
- ค่า `displayOrder` มากอยู่ด้านล่าง
- ไม่คำนวณลำดับใหม่จาก remote response
- ไม่เปลี่ยนลำดับตาม session หรือผู้ใช้
- Provider ยังคงเรียงตาม `provider.displayOrder`
- default Model ไม่จำเป็นต้องอยู่ลำดับแรก เช่น xAI สามารถ default รุ่น Quality แต่แสดงรุ่นราคาถูกไว้ด้านบนได้

## 4. Pricing Reference

ราคาเป็น snapshot เพื่อใช้กำหนด local order เท่านั้น ไม่ใช่ราคาที่ application รับประกันต่อผู้ใช้

Reference:

- Google Gemini API Pricing: https://ai.google.dev/gemini-api/docs/pricing
- OpenAI API Pricing: https://developers.openai.com/api/docs/pricing
- xAI Pricing: https://docs.x.ai/developers/pricing

### 4.1 Google Gemini

| Local order | Model | Reference price | `displayOrder` |
|---:|---|---:|---:|
| 1 | `gemini-3.1-flash-lite-image` | $0.0336 / 1K image | 10 |
| 2 | `gemini-2.5-flash-image` | $0.039 / image up to 1K | 20 |
| 3 | `gemini-3.1-flash-image` | $0.067 / 1K image | 30 |
| 4 | `gemini-3-pro-image` | $0.134 / 1K or 2K image | 40 |

หมายเหตุ: `gemini-2.5-flash-image` เป็นรุ่นเดิม แต่ยังวางตามราคาฐานใน local order ตามขอบเขตที่อนุมัติ

### 4.2 OpenAI

ใช้ราคา Medium/Standard 1024x1024 เป็นฐานเท่าที่มีข้อมูลต่อภาพชัดเจน:

| Local order | Model | Reference price | `displayOrder` | Note |
|---:|---|---:|---:|---|
| 1 | `gpt-image-1-mini` | $0.011 Medium | 10 | Cheapest known baseline |
| 2 | `gpt-image-1.5` | $0.034 Medium | 20 | Deprecated/compatibility |
| 3 | `dall-e-3` | $0.040 Standard | 30 | Legacy generation only |
| 4 | `gpt-image-1` | $0.042 Medium | 40 | Deprecated/compatibility |
| 5 | `gpt-image-2` | Per-image estimate not confirmed | 50 | วางท้ายรายการจนกว่าจะมี local decision ใหม่ |

`gpt-image-2` ไม่ได้ถูกระบุว่าแพงที่สุดจากการคำนวณ แต่ local policy เลือกวางไว้ท้ายรายการเพราะยังไม่มีราคาต่อภาพที่ยืนยันใน snapshot นี้ ห้ามตีความ `displayOrder: 50` เป็นราคา Provider ที่แท้จริง

### 4.3 xAI Grok Imagine

| Local order | Model | Reference price | `displayOrder` |
|---:|---|---:|---:|
| 1 | `grok-imagine-image` | $0.020 / 1K or 2K image | 10 |
| 2 | `grok-imagine-image-quality` | $0.050 / 1K, $0.070 / 2K | 20 |

ค่า image input สำหรับ edit ไม่ถูกนำมาเปลี่ยนลำดับใน scope นี้ เพราะ dropdown ใช้ text-to-image baseline

## 5. Value Reference

ตารางนี้เป็นแนวทางเลือกใช้งาน ไม่ถูกนำไปคำนวณหรือจัดลำดับใน runtime:

| Category | Suggested Model | Reason |
|---|---|---|
| Lowest flat-cost draft | `grok-imagine-image` | ราคา output แบบ flat ต่ำ เหมาะกับ concept variation |
| High-volume Gemini | `gemini-3.1-flash-lite-image` | ต้นทุนต่ำและออกแบบมาสำหรับงานปริมาณมาก |
| General fashion workflow | `gemini-3.1-flash-image` | สมดุลคุณภาพ ความเร็ว และ instruction following |
| xAI quality workflow | `grok-imagine-image-quality` | รุ่นคุณภาพสูงและรองรับ 2K |
| Premium complex composition | `gemini-3-pro-image` | เหมาะกับคำสั่งซับซ้อนและงาน campaign |
| OpenAI current premium | `gpt-image-2` | ต้อง benchmark และยืนยันราคาก่อนจัด value rank |

การจัดอันดับคุณภาพจริงต้องใช้ fashion benchmark ใน Requirement ถัดไป ไม่ควรสรุปจากราคาเพียงอย่างเดียว

## 6. Implementation

แก้ไข `server/config/providers.json` เท่านั้น:

### Gemini

```text
10 gemini-3.1-flash-lite-image
20 gemini-2.5-flash-image
30 gemini-3.1-flash-image
40 gemini-3-pro-image
```

### OpenAI

```text
10 gpt-image-1-mini
20 gpt-image-1.5
30 dall-e-3
40 gpt-image-1
50 gpt-image-2
```

### xAI

```text
10 grok-imagine-image
20 grok-imagine-image-quality
```

ไม่มีการเปลี่ยนแปลง:

- `ProviderConfigLoader`
- `ProviderRegistry` sorting algorithm
- generation route
- Queue Manager
- History schema
- credit policy
- Client API calls

Client dropdown รับลำดับที่ sort แล้วจาก `/api/providers` เหมือนเดิม

## 7. Testing

เพิ่ม regression test ใน `test/providerRegistry.test.js` เพื่อยืนยันว่า project catalog คืนลำดับดังนี้:

- Gemini: Lite, 2.5, 3.1 Flash, Pro
- OpenAI: Mini, 1.5, DALL-E 3, GPT Image 1, GPT Image 2
- xAI: Standard, Quality

Test ใช้ local configuration และ fake API-key environment เท่านั้น ไม่เรียก network หรือ Provider API

## 8. Acceptance Criteria

1. Gemini dropdown เรียงตาม local order 10, 20, 30, 40
2. OpenAI dropdown เรียงตาม local order 10, 20, 30, 40, 50
3. xAI dropdown แสดง `grok-imagine-image` ก่อนรุ่น Quality
4. xAI default Model ยังคงเป็น `grok-imagine-image-quality`
5. การเปิดหน้าและเปลี่ยน Provider ไม่เรียก pricing service ภายนอก
6. ไม่มี pricing scraper, quote endpoint หรือ background pricing refresh
7. generation, credits, references และ History behavior เดิมไม่เปลี่ยน
8. regression test ตรวจลำดับจาก public catalog ได้

## 9. Decisions Recorded

- Requirement 018 ใช้ simplified local-only implementation
- ตารางราคาเก็บไว้ใน requirement เพื่อเป็นข้อมูลตัดสินใจ
- Runtime ใช้ `displayOrder` ใน `providers.json` เท่านั้น
- ไม่สร้าง `provider-pricing.json`
- ไม่สร้าง `ProviderPricingService`
- ไม่เพิ่ม `/api/generation/quote`
- ไม่เรียกดู pricing หรือ model service online
- การแสดงราคาและระบบ quote เลื่อนไปพิจารณาพร้อม billing/AI Comparison ในอนาคต
- Implementation เสร็จแล้วและรอ runtime verification
