# 18. Provider Pricing Catalog and Value Ranking

**ID:** `018-provider-pricing-catalog-and-value-ranking`  
**Application:** `ModelPromptForge`  
**Status:** Draft for review  
**Feature type:** Core provider pricing, credit transparency and model discovery  
**Depends on:** Requirement 017 - Config-driven Provider Registry and Grok Imagine  
**Required by:** Requirement 019 - AI Model Comparison Workspace  
**Created:** 2026-07-14  
**Pricing snapshot:** 2026-07-14  
**Implementation authorization:** Not yet approved

## 1. Objective

เพิ่ม pricing catalog กลางสำหรับ Provider และ Model เพื่อให้:

- Model ภายในแต่ละ Provider เรียงจากต้นทุนถูกที่สุดด้านบนไปแพงที่สุดด้านล่าง
- ผู้ใช้เห็นราคาประมาณการก่อนสร้างภาพ โดยไม่ต้องอ่าน pricing unit ที่แตกต่างกันของแต่ละ Provider
- แสดงต้นทุน Provider ใน USD แยกจากจำนวนเครดิตที่ระบบหักอย่างชัดเจน
- รองรับราคาแยกตาม generation/edit, quality, resolution, reference input และ processing tier
- Comparison Workspace คำนวณราคารวมของ 2-4 slots ก่อนยืนยันได้
- ผู้ดูแลเปลี่ยนราคา เครดิต และลำดับ Model ผ่าน configuration โดยไม่แก้ Client code
- มีตารางความคุ้มค่าที่อธิบายเกณฑ์ได้ ไม่จัดอันดับจากราคาถูกเพียงอย่างเดียว

Requirement นี้เป็น pricing/configuration layer ไม่ใช่ระบบชำระเงินหรือ subscription เต็มรูปแบบ

## 2. Scope

### 2.1 In scope

- pricing metadata ใน Provider Registry
- ราคาสรุปของ Google Gemini, OpenAI และ xAI Grok Imagine
- การ normalize ราคาเพื่อใช้เรียง Model
- UI price summary ใน Model selector
- preflight cost estimate ก่อนส่ง generation job
- credit quote และ Provider cost snapshot ใน job/history
- provisional value-for-money ranking สำหรับงาน fashion commerce
- policy สำหรับราคาเปลี่ยน, ราคาไม่ครบ และ Model deprecated

### 2.2 Out of scope

- payment gateway, invoice, VAT และ subscription renewal
- การดึงราคาจากหน้าเว็บไซต์ Provider ด้วย web scraping อัตโนมัติ
- การรับประกันว่าค่า estimate เท่ากับ invoice จริงทุกกรณี
- การเปลี่ยน pricing configuration โดย end user
- AI Comparison execution ซึ่งอยู่ใน Requirement 019

## 3. Pricing Principles

### 3.1 Source of truth

ใช้เอกสารทางการของ Provider เท่านั้น:

- Google Gemini API Pricing: https://ai.google.dev/gemini-api/docs/pricing
- OpenAI API Pricing: https://developers.openai.com/api/docs/pricing
- xAI Pricing: https://docs.x.ai/developers/pricing

ราคาใน requirement เป็น snapshot ณ วันที่ 2026-07-14 และต้องตรวจสอบอีกครั้งก่อน implement หรือ deploy production

### 3.2 Normalized comparison basis

การเรียงราคาเริ่มต้นใช้ฐานเดียวกันเท่าที่ Provider รองรับ:

| Field | Normalized value |
|---|---|
| Operation | Text-to-image generation |
| Output count | 1 image |
| Resolution | 1024x1024 หรือ 1K ที่ใกล้เคียงที่สุด |
| Quality | `medium` หาก Model มี quality; ไม่เช่นนั้นใช้ standard/default |
| Reference image | 0 images |
| Processing | Standard synchronous/real-time API |
| Grounding/tools | Disabled |
| Currency | USD, before tax |

`normalizedSortPriceUsd` ต้องเป็น estimate ตามฐานนี้ และไม่ใช่ราคาสุดท้ายของทุก request

### 3.3 Cost components

ราคาที่แสดงต้องแยก component เมื่อมีข้อมูล:

- text input cost
- image/reference input cost
- image output cost
- quality/resolution multiplier หรือ per-image rate
- grounding/tool cost
- processing tier เช่น Standard, Batch, Flex หรือ Priority
- internal credit charge

ห้ามนำ `creditCost` ไปแสดงเป็นต้นทุน USD และห้ามนำราคา Provider ไปหักเครดิตโดยตรงโดยไม่มี conversion policy

## 4. Official Pricing Snapshot

ตารางทุก Provider เรียงจากราคาฐานถูกไปแพง โดยใช้ normalized basis ในข้อ 3.2 หากราคาแบบต่อภาพไม่มีในเอกสาร ให้แสดง token rate และสถานะ `Needs calculator/runtime estimate` แทนการเดาราคา

### 4.1 Google Gemini

| Order | Model | Standard image output | Image/text input | Batch image output | Notes |
|---:|---|---:|---:|---:|---|
| 1 | `gemini-3.1-flash-lite-image` | $0.0336 / 1K image | $0.25 / 1M tokens | $0.0168 / 1K image | รุ่นต้นทุนต่ำและ latency ต่ำ |
| 2 | `gemini-2.5-flash-image` | $0.039 / image, up to 1024x1024 | $0.30 / 1M tokens | $0.0195 / image | Legacy generation path; ต้องติดตาม lifecycle |
| 3 | `gemini-3.1-flash-image` | $0.067 / 1K image | $0.50 / 1M tokens | $0.034 / 1K image | 0.5K $0.045, 2K $0.101, 4K $0.151 |
| 4 | `gemini-3-pro-image` | $0.134 / 1K or 2K image | $2.00 / 1M tokens; image inputประมาณ $0.0011/image | $0.067 / 1K or 2K image | 4K $0.24; premium/complex instruction |

หมายเหตุ:

- Standard sorting ต้องไม่ใช้ Batch price เพราะ workflow ปัจจุบันเป็น interactive generation
- ค่า prompt/input เพิ่มจาก image output แม้จะมีผลน้อยสำหรับ prompt สั้น
- หากเปิด Google grounding ต้อง quote ค่า grounding แยกต่างหาก

### 4.2 OpenAI

OpenAI Model เก่ามีราคา estimated per image ชัดเจน ส่วน `gpt-image-2` แสดง token rate และให้ใช้ official image calculator หรือ runtime usage สำหรับ estimate ต่อภาพ

| Order candidate | Model | Low 1024x1024 | Medium/Standard 1024x1024 | High/HD 1024x1024 | Image token rate, input/output per 1M | Status |
|---:|---|---:|---:|---:|---:|---|
| 1 | `gpt-image-1-mini` | $0.005 | $0.011 | $0.036 | $2.50 / $8.00 | Deprecated; cheapest legacy option |
| 2 | `gpt-image-1.5` | $0.009 | $0.034 | $0.133 | $8.00 / $32.00 | Deprecated |
| 3 | `dall-e-3` | N/A | $0.040 Standard | $0.080 HD | Per-image only | Deprecated; generation only |
| 4 | `gpt-image-1` | $0.011 | $0.042 | $0.167 | $10.00 / $40.00 | Deprecated |
| Pending calculated position | `gpt-image-2` | Official calculator required | Official calculator required | Official calculator required | $8.00 / $30.00 | Current recommended image model |

OpenAI sorting rule:

- ใช้ estimate ของ quality/resolution ที่เป็น default ของ Model ใน configuration
- `gpt-image-2` ต้องคำนวณ `normalizedSortPriceUsd` จาก official calculator data หรือ verified usage sample ก่อนเปิด price sorting
- หากยังไม่มี estimate ห้ามเดาราคาต่อภาพ และให้แสดง `Price estimate pending` ไว้ท้ายรายการชั่วคราว
- Model ที่ deprecated ต้องมี badge และไม่ควรเป็น default แม้ราคาถูกกว่า
- Regional processing ที่เข้าเงื่อนไขอาจมี uplift; estimate ต้องรองรับ multiplier จาก configuration

### 4.3 xAI Grok Imagine

| Order | Model | Media input | 1K output | 2K output | Generation total without input | Edit total with 1 input |
|---:|---|---:|---:|---:|---:|---:|
| 1 | `grok-imagine-image` | $0.002 / image | $0.020 | $0.020 | $0.020 | $0.022 |
| 2 | `grok-imagine-image-quality` | $0.010 / image | $0.050 | $0.070 | $0.050 | $0.060 at 1K |

xAI คิด output เป็น flat per-image และคิด media input เพิ่มสำหรับ edit/reference image แต่ละภาพ ทำให้ generation และ edit ต้องมี quote คนละค่า

## 5. Value-for-Money Ranking

### 5.1 Ranking is not price-only

คำว่า “ความคุ้มค่า” สำหรับ ModelPromptForge หมายถึงความเหมาะสมกับงาน fashion selling ของร้านค้ารายย่อย ไม่ใช่ Model ที่ถูกที่สุดเสมอไป

คะแนน production ต้องได้จาก benchmark ชุดเดียวกัน:

| Criterion | Weight |
|---|---:|
| Fashion image quality and realism | 30% |
| Garment/product fidelity | 25% |
| Prompt adherence and Thai commerce context | 15% |
| Character/reference consistency | 10% |
| Normalized Provider cost | 15% |
| Latency and generation success rate | 5% |

### 5.2 Provisional value table

ตารางนี้เป็น shortlist ก่อน benchmark ไม่ใช่คำรับรองคุณภาพ และต้องแทนที่ด้วย measured score ก่อนแสดง ranking ต่อผู้ใช้ production

| Provisional rank | Model/tier | Baseline cost | Best-fit fashion workflow | Value assessment |
|---:|---|---:|---|---|
| 1 | `gemini-3.1-flash-image` | $0.067 / 1K | ภาพขายสินค้าทั่วไปที่ต้องสมดุลคุณภาพ ความเร็ว และ instruction following | Best all-round candidate |
| 2 | `grok-imagine-image-quality` | $0.050 / 1K; $0.070 / 2K | เปรียบเทียบงานคุณภาพสูงที่ต้องการราคา flat และ 2K | Strong price/resolution candidate |
| 3 | `gemini-3.1-flash-lite-image` | $0.0336 / 1K | ภาพจำนวนมาก, listing draft, iteration เร็ว | Best high-volume candidate |
| 4 | `grok-imagine-image` | $0.020 / 1K or 2K | draft, concept variation และ budget batch | Lowest flat-cost current candidate |
| 5 | `gemini-3-pro-image` | $0.134 / 1K or 2K | campaign/premium composition และคำสั่งซับซ้อน | Premium value candidate |
| Unranked pending benchmark | `gpt-image-2` | Token-based; per-image estimate pending | current OpenAI premium generation/edit | Must benchmark before ranking |
| Legacy only | `gemini-2.5-flash-image` | $0.039 / image | compatibility/fallback | Do not promote above current models solely by price |
| Deprecated only | `gpt-image-1-mini`, `gpt-image-1.5`, `gpt-image-1`, `dall-e-3` | See OpenAI table | compatibility/fallback | Exclude from recommended ranking |

เหตุผลที่ไม่จัด `gpt-image-1-mini` เป็นอันดับหนึ่งแม้ราคา Low ถูกที่สุด คือ official catalog ระบุเป็น deprecated และ Low quality ไม่ใช่ baseline ที่เทียบกับ Model flat-quality อื่นได้อย่างยุติธรรม

### 5.3 Benchmark dataset

ก่อนเผยแพร่ value score ต้องทดสอบอย่างน้อย:

- fashion product-only 5 prompts
- model wearing product 5 prompts
- Thai social commerce/TikTok/Shopee 5 prompts
- editorial/runway 5 prompts
- face reference consistency 5 prompts
- garment/reference fidelity 5 prompts
- prompt เดียวกัน, aspect ratio เดียวกัน และ resolution ใกล้เคียงกัน
- อย่างน้อย 3 generations ต่อ Model เพื่อลดผลจาก randomness

เก็บ raw score, reviewer notes, latency, success/failure และ actual provider cost โดยไม่แก้ผลย้อนหลัง

## 6. Configuration Design

เพิ่ม pricing metadata ใน `server/config/providers.json` หรือแยกเป็น server-owned `server/config/provider-pricing.json` แล้ว merge ตอนโหลด Registry โดยแนะนำให้แยกไฟล์ราคาเพื่อให้แก้ราคาโดยไม่แตะ capability configuration

ตัวอย่าง schema:

```json
{
  "schemaVersion": 1,
  "currency": "USD",
  "effectiveAt": "2026-07-14",
  "sourceUrl": "https://docs.example.com/pricing",
  "models": {
    "provider:model-id": {
      "status": "current",
      "pricingMode": "per_image",
      "normalizedSortPriceUsd": 0.05,
      "rates": [
        {
          "operation": "generation",
          "quality": "standard",
          "resolution": "1k",
          "outputImageUsd": 0.05,
          "inputImageUsd": 0.01
        }
      ],
      "creditPolicyId": "fashion-standard-v1"
    }
  }
}
```

Required validation:

- currency ต้องเป็น ISO currency code
- ราคาเป็นเลขตั้งแต่ 0 ขึ้นไป
- `effectiveAt`, `verifiedAt`, `sourceUrl` ต้องมีเมื่อเปิดเผยราคาต่อผู้ใช้
- Model enabled ทุกตัวต้องมี pricing status: `verified`, `estimate_pending`, `deprecated` หรือ `unpriced`
- `normalizedSortPriceUsd` ต้องตรงกับ documented normalized basis
- pricing config ผิดต้องไม่ทำให้ server start ด้วยราคาเก่าแบบเงียบ ๆ

## 7. Sorting Rules

ลำดับ Model ภายใน Provider:

1. enabled + current + verified price
2. `normalizedSortPriceUsd` จากน้อยไปมาก
3. value score จากมากไปน้อยเมื่อราคาเท่ากัน
4. stable `displayOrder` เป็น tie-breaker
5. `estimate_pending` หรือ `unpriced`
6. deprecated Models อยู่ท้ายสุดเสมอ

Provider order ยังใช้ `provider.displayOrder` ไม่เรียง Provider ตามราคา เพื่อไม่ให้ UI สลับตำแหน่งแบรนด์ตลอดเวลา

หากผู้ใช้เปลี่ยน quality/resolution ให้ Client แสดงราคาใหม่ แต่ไม่จำเป็นต้อง reorder dropdown ระหว่างที่เปิดอยู่ เพื่อลดการกระโดดของรายการ

## 8. API Contract

`GET /api/providers` ต้องคืน pricing summary ที่ปลอดภัยต่อ Client:

```json
{
  "id": "grok-imagine-image-quality",
  "pricing": {
    "currency": "USD",
    "status": "verified",
    "estimatedGenerationUsd": 0.05,
    "estimatedEditUsd": 0.06,
    "basis": "standard:1k:no-reference",
    "effectiveAt": "2026-07-14",
    "creditCost": 2
  }
}
```

เพิ่ม preflight quote endpoint หรือ utility กลางที่ Requirement 019 เรียกใช้ได้:

```text
POST /api/generation/quote
input: provider, model, operation, quality, resolution, outputCount, referenceCount
output: providerCostEstimateUsd, creditCost, perItemBreakdown, pricingVersion, warnings
```

Server ต้องคำนวณ quote ซ้ำตอนสร้าง job ห้ามเชื่อค่าราคาจาก Client

## 9. UX/UI Requirements

ใน Model dropdown:

- เรียงราคาถูกไปแพงภายใน Provider
- แสดงชื่อ Model, badge `Best value`, `Budget`, `Premium`, `Deprecated` หรือ `Price pending`
- แสดงราคาสั้น เช่น `~$0.05/image` และเครดิต เช่น `2 credits`
- tooltip แสดงฐานราคา quality/resolution และวันที่ตรวจสอบ
- ห้ามแสดงคำว่า “ถูกที่สุด” หาก Model deprecated หรือเทียบคนละ quality โดยไม่มีคำอธิบาย

ใต้ Engine & Target Output:

- แสดง `Estimated provider cost`
- แสดง `Credits to charge`
- แสดง breakdown เมื่อมี reference input, หลายภาพ หรือ resolution สูงขึ้น
- ราคาเปลี่ยนทันทีเมื่อเปลี่ยน Provider, Model, quality, resolution หรือ reference count
- ก่อน Generate แสดง final quote หากต่างจาก quote ล่าสุดเกิน threshold ที่กำหนด

UI ต้องใช้ theme และ component pattern เดิมของ application ไม่สร้าง pricing card style ที่แยกจาก visual language ปัจจุบัน

## 10. Credits and Billing Safety

- เครดิตเป็นราคาขายภายในและไม่จำเป็นต้องเท่ากับ Provider cost แบบ 1:1
- credit policy ต้องรองรับ margin, FX buffer, retry allowance และ minimum charge
- แสดงจำนวนเครดิตที่จะหักก่อนเริ่มทุก paid process
- เก็บ `pricingVersion`, quoted cost และ actual cost ที่ Provider ส่งกลับเมื่อมีข้อมูล
- refund ใช้จำนวนเครดิตที่หักจริง ไม่คำนวณใหม่จากราคาปัจจุบัน
- retry ที่ระบบทำเองต้องมี policy ชัดเจนว่าจะคิดเครดิตเพิ่มหรือเป็น operating cost
- ห้ามเผย API key, provider invoice identifier หรือ internal margin ใน public API

## 11. Price Lifecycle

- ตรวจสอบราคาอย่างน้อยรายเดือนและก่อนเปิด Model ใหม่
- เปลี่ยนราคาโดยเพิ่ม pricing version ไม่แก้ history snapshot เดิม
- เมื่อ official source เปลี่ยน ให้ update `verifiedAt`, `effectiveAt` และ change note
- หากราคาหมดอายุเกิน configured TTL ให้แสดง `Estimate may be outdated`
- หาก Provider ส่ง actual usage cost ให้บันทึกเพื่อเทียบ estimated vs actual
- alert เมื่อค่า actual เบี่ยงเบนจาก estimate เกิน threshold เช่น 10%

## 12. Implementation Steps

### Phase A: Pricing schema and catalog

- เพิ่ม schema, loader และ validation
- ใส่ราคา official snapshot ของ 3 Providers
- เชื่อม pricing status กับ Provider Registry

### Phase B: Quote engine

- สร้าง normalized cost calculator
- รองรับ per-image, per-token และ mixed pricing
- รองรับ generation/edit/reference/quality/resolution
- เพิ่ม tests ด้วย deterministic pricing fixtures

### Phase C: Provider and Model UI

- เรียง Model ตาม sorting rules
- แสดง price/credit badge และ tooltip
- เพิ่ม live estimate ใต้ Engine & Target Output

### Phase D: History and observability

- เก็บ quote snapshot และ pricing version ใน job/history
- เก็บ actual cost เมื่อ Provider รองรับ
- เพิ่ม estimate variance logging

### Phase E: Value benchmark

- สร้าง fashion benchmark dataset
- รัน blind review และบันทึกคะแนน
- publish value ranking หลังผ่าน minimum sample size

### Phase F: Comparison integration

- ให้ Requirement 019 quote ทุก slot และยอดรวม
- ป้องกัน submit เมื่อ pricing/credit policy ไม่สมบูรณ์

## 13. Acceptance Criteria

1. Models ภายใน Google, OpenAI และ xAI เรียงราคาฐานจากถูกไปแพงตาม pricing metadata
2. Deprecated Model อยู่ท้ายรายการและมี badge แม้ราคาต่ำกว่า
3. ผู้ใช้เห็น USD estimate และเครดิตแยกกันก่อน Generate
4. เปลี่ยน quality, resolution หรือ reference count แล้ว estimate เปลี่ยนถูกต้อง
5. xAI edit รวม media input fee ต่อ reference image
6. Gemini แยกราคา Standard กับ Batch และ UI interactive ใช้ Standard
7. OpenAI token-based Model ไม่แสดงราคาต่อภาพที่ไม่มีข้อมูลรองรับ
8. Server re-quotes และ validate credit cost ก่อน enqueue job
9. Job/history เก็บ pricing version และ quote snapshot เดิมได้แม้ราคา config เปลี่ยน
10. ราคาไม่ครบไม่ทำให้เกิด `NaN`, free generation หรือการเรียงลำดับผิดแบบเงียบ ๆ
11. Value ranking ที่แสดง production มี benchmark evidence และวันที่ประเมิน
12. Requirement 019 สามารถใช้ quote engine เดียวกันรวมต้นทุน 2-4 Models ได้

## 14. Open Decisions Before Implementation

1. internal credit conversion rate, margin และ FX buffer
2. default OpenAI quality ที่ใช้เป็น normalized sorting basis
3. วิธีนำ official GPT Image 2 calculator data มาเป็น verified per-image estimate
4. pricing config จะแก้ผ่านไฟล์อย่างเดียวหรือมี admin UI ในระยะถัดไป
5. benchmark reviewer เป็นทีมภายใน, user vote หรือใช้ทั้งสองแบบ
6. threshold ที่ต้องให้ผู้ใช้ยืนยันใหม่เมื่อราคา quote เปลี่ยน

## 15. Final Decisions Recorded

- Requirement นี้ใช้เลข 018
- AI Model Comparison Workspace เดิมเลื่อนไปเป็น Requirement 019
- Model ในแต่ละ Provider ต้องเรียงถูกที่สุดด้านบนและแพงที่สุดด้านล่าง
- ราคา Provider และเครดิตภายในต้องแสดงแยกกัน
- ใช้ official Provider documentation เท่านั้นสำหรับ published rate
- ราคาไม่ครบต้องแสดง pending ไม่ประมาณเองโดยไม่มีหลักฐาน
- value ranking ต้องคำนึงถึง fashion quality และ product fidelity ไม่ใช่ราคาอย่างเดียว
- ยังไม่อนุมัติ implementation จนกว่าจะได้รับคำสั่งถัดไป
