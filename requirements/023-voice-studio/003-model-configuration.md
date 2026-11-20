# VS-03 — Model, Voice และ Configuration JSON

Parent: [Basic release](000-master.md). Configuration source implemented.
The example below explains the schema; actual validated files and README are authoritative.
The Gemini adapter uses provider key `gemini`. The Dub & Sub adapter uses `byteplus-seed-speech`,
model alias `dola-seed-audio` and provider model `seed-audio-1.0`. Model languages live at
`capabilities.languages`. Seed speaker entries list compatible languages in `voices.v1.json`.
Both providers run through the same Voice Studio row quote, generation and take lifecycle.

## 1. Configuration ownership

| Proposed source | เนื้อหา |
|---|---|
| `server/config/voice-studio/models.v1.json` | schema/catalog version, model IDs, adapter key, capabilities, defaults, limits |
| `server/config/voice-studio/voices.v1.json` | curated prebuilt voice IDs, labels/traits, compatible models และ verified date |
| `server/config/voice-studio/policy.v1.json` | editor limits, style presets, allowed inline tags, page limits, concurrency |
| Existing `server/config/credit-pricing-policy.json` | audio operation pricing/effective dates เมื่อ Commercial owner ยืนยัน |
| Existing server secret configuration | Gemini credentials; ไม่อยู่ใน JSON public catalog |

Generation/provider configuration owner โหลดและ validate catalog; Voice Studio อ่าน
safe projection เท่านั้น ไม่สร้าง provider registry อิสระหรือความพร้อมของโมเดลอีกชุด
ต้องรวมกับ ProviderAvailabilityPolicyService เดิม: model enabled ในไฟล์ไม่ได้ bypass
global provider disable หรือ actor permission

## 2. ตัวอย่าง model entry

ตัวอย่างเป็น proposed application schema ไม่ใช่ payload ที่ส่ง Google โดยตรง

```json
{
  "schemaVersion": 1,
  "catalogVersion": "voice-studio-2026-11-15-v1",
  "defaultModelId": "gemini-3.8-flash-tts",
  "models": [{
    "id": "gemini-3.8-flash-tts",
    "providerId": "gemini",
    "adapterKey": "gemini-speech",
    "displayName": "Gemini 3.8 Flash TTS",
    "enabled": true,
    "capabilities": {
      "singleSpeaker": true,
      "prebuiltVoices": true,
      "turnStyle": true,
      "inlineVocalEvents": true,
      "languages": ["th", "en"],
      "outputFormats": ["wav"],
      "sampleRatesHz": [24000],
      "streaming": false
    },
    "limits": {"inputTokens": 8192, "outputTokens": 16384},
    "defaults": {"language": "th", "format": "wav", "sampleRateHz": 24000},
    "pricingPolicyKey": "gemini-3.8-flash-tts",
    "sourceUrl": "https://aistudio.google.com/docs/models/gemini-3.8-flash-tts",
    "verifiedAt": "2026-11-15"
  }]
}
```

`providerId` ต้อง reconcile กับ canonical registry key ตอน implementation ไม่สร้าง
Google provider ซ้ำเพราะชื่อไม่ตรง; adapterKey เป็น code allowlist ไม่ใช่ arbitrary import/URL
Application languages/formats เป็นขอบเขตรุ่นแรก ไม่ใช่รายการทั้งหมดที่ provider รองรับ
ไม่มี API key, endpoint ที่ผู้ใช้แก้ให้ชี้ arbitrary host หรือ raw filesystem path ใน projection

## 3. Policy และการแก้ config

ค่าตั้งต้นที่เสนอ: 100 rows/document, text 2,000 Unicode code points/row,
style 400 code points, list page 20/max 50, one active synthesis per actor
สำหรับ Voice Manager เสนอชื่อเสียงไม่เกิน 120 code points, 10 tags/Take,
tag ละ 40 code points โดยเก็บ limits เหล่านี้ใน policy เดียวกัน
ทั้งหมดอยู่ใน policy และ validate ทั้ง server/client; token budget ของ provider เป็นอีก
ข้อจำกัดหนึ่ง ห้ามตีความจำนวนอักษรเป็น token หรือ truncate บทเงียบๆ
Quota จำนวนเอกสาร/ไฟล์/bytes ให้ใช้ policy ของเจ้าของ storage; ต้องระบุค่าจริงก่อน rollout

- Style presets มี stable ID, i18n label key และ directive; delivery compiler รวม
  อารมณ์ จังหวะ วิธีพูด และ free text อย่างชัดเจน มี compilerVersion
- Inline tag allowlist เริ่มจากชุดเล็กที่ตรวจเอกสาร เช่น `<gasp>`, `<sigh>`, `<laugh>`,
  `<sob>`, `<breath>`, `<short pause>`, `<long pause>`; ไม่รับ arbitrary SSML
- Native provider parameters กับ application style controls เป็นคนละ schema
- Unknown schema/duplicate IDs/default ไม่ถูกต้อง/voice อ้าง model ที่ไม่มี → catalog error
  แจ้งเฉพาะ Voice Studio unavailable ไม่ทำให้ image/video หรือทั้ง server start ไม่ขึ้น
- Implementation โหลดและ validate JSON เมื่อเรียก catalog/new operation; แก้ไฟล์มีผล
  ต่อคำขอถัดไปโดยไม่เพิ่ม file watcher. งาน accepted ใช้ snapshot เดิม
- ไม่เปลี่ยน model/voice ของเอกสารเก่าอัตโนมัติเมื่อ default เปลี่ยน
- งาน accepted เก็บ catalog/model/compiler/pricing snapshot; config รุ่นใหม่ไม่ rebill งานเก่า
- Disable model หยุดงานใหม่ตาม availability policy; ยังอ่าน/ฟังงานเดิมได้
- เพิ่ม model ที่ใช้ adapter/schema เดิมได้ด้วย JSON; provider protocol ใหม่ยังต้องเขียน adapter
  ไม่สัญญาว่าเพิ่ม provider ทุกแบบด้วย JSON อย่างเดียว

คู่มือผู้ดูแลต้องมีตัวอย่าง “เพิ่ม model”, “ปิด model”, “เพิ่ม voice”, “ปรับ editor limit”
พร้อมคำสั่ง validate ที่ใช้ schema เดียวกับ runtime ไม่สร้าง runner ซ้ำถ้ามีของเดิม

## 4. Provider evidence และสิ่งที่ยังไม่ยืนยัน

ตรวจ 2026-11-15: รุ่นนี้มี model ID ตามตัวอย่าง รองรับ input text/output audio,
แยก `speech_metadata.style` จากบท และมี token limits ตาม entry
[Model reference](https://aistudio.google.com/docs/models/gemini-3.8-flash-tts)

TTS guide ระบุภาษาไทย, prebuilt voices, inline angle-bracket events และ unary WAV
ค่าเริ่มต้น 24kHz mono 16-bit. Basic ใช้หนึ่ง speaker ต่อ request และเก็บ response
ที่ validate แล้วเป็นไฟล์; ไม่ wrap WAV header ซ้ำ ไม่ใช้ streaming ในรุ่นแรก
[TTS guide](https://aistudio.google.com/docs/speech-generation)

ใช้ API ฝั่ง server ผ่าน `v1beta`; key ไม่ออก browser; adapter ทำตาม API version
ที่ตรวจสอบกับ SDK/REST จริงใน implementation [API reference](https://aistudio.google.com/api-reference)

Pricing source มี effective-date transition จึงต้องเก็บ rate version ใน Credits
ไม่ hard-code ตัวเลขใน UI/catalog นี้ ไม่มีการกำหนด retail Credit ใหม่ใน requirement
[Pricing reference](https://aistudio.google.com/docs/pricing#gemini-3.8-flash-tts)

Account entitlement, rate limit, usage metadata, Thai pronunciation และ acting fidelity
ยังไม่ได้พิสูจน์ด้วย live request; ต้องมี scoped listening/usage evidence ก่อนอ้างว่าพร้อมจริง

## 5. Revision 2 configuration (source implemented)

Settlement correction (2026-11-15): observed live design usage includes total input 287
but explicit text input 137, audio output 470 and thought metadata 979. The application
charges only explicitly priced text/audio modalities at the original frozen rates; it
does not assign unclassified input or thoughts an invented tariff. The returned
`providerCostUsd` is a **priced modality subtotal** when unpriced counters exist,
identified by `usageEvidence.costCoverage`. Raw provider usage remains in the operation;
capture evidence preserves the reported totals and unpriced counters for invoice review.
This conservative customer charge does not assert that Google's complete invoice expense
is known. Input/output total caps, nonnegative integer validation, unsupported modalities,
cached/tool usage restrictions and the customer's consent cap remain enforced.
References: [Voice usage fields](https://aistudio.google.com/api-reference/voices) and
[text/audio pricing](https://aistudio.google.com/docs/pricing#gemini-3.8-flash-tts).
No existing rate or frozen quote is rewritten. Check status can recover an old delivered
operation using its saved usage without calling CreateVoice again.

- Model capabilities add `voiceDesign` and `customVoiceSynthesis`; define compatible
  languages and design-description limits separately from spoken-text limits.
  Provider availability remains authoritative; no new hard-coded model list in UI
- Policy adds event presentation metadata keyed by the existing allowed token:
  stable ID, i18n label/help keys, category and quick-access order. Existing inlineTags
  remains the canonical allowed set; validate metadata references and duplicate IDs
- Policy defines design description/name limits, saved and unselected candidate limits,
  one candidate per request, page size and bounded request/sample sizes. Freeze numeric
  values against provider documentation and storage policy before enabling the operation
- Private custom voices are actor runtime records, never entries in public voices.v1.json.
  Catalog only advertises support and prebuilt options; My Voices uses owned list API
- Revision 2 has no `voiceReplication` support; planned Revision 3 is defined in section 6.
  Do not expose ElevenLabs stability/similarity sliders or square-bracket tags as Google
  parameters. Delivery controls continue compiling to the canonical Google style contract
- Design creation and optional audition require separately qualified pricing/usage mappings
  in credit-pricing-policy.json. Do not assume creation is free or reuse TTS token rates
  without provider evidence; this is an implementation dependency, not a new blanket
  confirmation dialog or a reason to disable existing TTS

Implemented policy defaults: maxDesignLength 1000, maxCustomVoices 30 per actor,
maxDesignCandidates 5, maxProjectVoices 180 (headroom below provider project limit).
New fields are validated with the same catalog loader. EventGroups and eventToolbarTags
reference the allowed tokens; user-created voices never enter public config.
Credit policy speechGeneration.voiceDesign explicitly records model-rate inference based
on the model capability/pricing link and the documented CreateVoice usage response.
Only validated text/audio usage is settled; missing modalities, thoughts/tool/cache tokens
remain unresolved. No separate confirmed creation tariff or invoice evidence is claimed.

Google evidence checked 2026-11-15:
[Voice Design](https://aistudio.google.com/docs/voice-design) documents prompted voice
creation via `/v1beta/voices`, a reusable voice ID and sample audio, synthesis with that ID,
and get/list/delete operations. It documents a project-wide 200 stored-voice limit and
one-year TTL. These are provider limits, not a 200-voices-per-user allowance. Use returned
expiry when available and handle missing/expired identities; do not promise permanence.
Account access, actual creation charges/usage and Thai sample quality remain unverified.

## 6. Revision 3 — Provider evidence and planned configuration

Checked 2026-11-16: [Google Voice Replication](https://aistudio.google.com/docs/voice-replication).
Provider facts: `POST /v1beta/voices`, `type: replicated`, source and consent audio from
the same adult human; source clip 10–30 seconds; 24kHz mono PCM16 WAV recommended.
Synthetic/watermarked inputs are rejected. Paid Tier 1+ required. Stored mode returns
`voice_...`; prompted/replicated voices share a project limit of 200 and sliding one-year
expiry. Thai and Chinese consent phrases are listed in the linked guide.

Application proposal: use stored mode for reusable My Voices, retaining existing private
remote-ID management. Stateless keys, remix and voice conversion are outside this draft.
Do not assume replicated responses contain the prompted voice sample or usage fields;
verify the [Voices API contract](https://aistudio.google.com/api-reference/voices) before
implementation. Missing preview must not classify an otherwise created voice as failed.

Proposed model JSON: `capabilities.voiceReplication`, supported source/consent languages
and synthesis-language capability remain distinct. Policy JSON owns accepted MIME types,
source-duration bounds, separate consent limits, maximum bytes, temporary-upload lifetime,
consent text/version/source and per-actor/project quota; no duplicate constants in React.
Exact bytes/consent-duration bounds await adapter qualification; do not infer source
duration bounds apply to consent too. Defaults are proposals until implementation approval.
Keep Chinese source metadata possible without claiming Chinese-to-Thai quality. Current
runtime still exposes th/en only; this documentation does not change config or enable API.

Open evidence: creation pricing/billing semantics, account entitlement for replication,
decoded-file limits, retention proposal and the user's Chinese-to-Thai listening result.
No arbitrary new Credit rate, global warning or extra approval UI is authorized here.
