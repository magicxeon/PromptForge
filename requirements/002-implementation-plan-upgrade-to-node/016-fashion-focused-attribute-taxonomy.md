# 16. Fashion-focused Attribute Taxonomy and Reference-aware Character Workflow

**Status:** Implemented - Pending Runtime Verification  
**Scope:** Attribute library, Studio Creative Configurator, prompt compilation, presets, import/export and reference-aware UX  
**Depends on:** Requirement 015 - Mode-specific Character Reference Workflow  
**Created:** 2026-07-13

## 1. Objective

ปรับทิศทางของ attribute ให้สร้างภาพแฟชั่นได้อย่างต่อเนื่องและเป็นระบบ ตั้งแต่ภาพขายสินค้าสำหรับ TikTok Shop/Shopee ไปจนถึงภาพ lookbook, editorial, luxury campaign และ runway ระดับสากล โดยมีตัวเลือกหลากหลายแต่ไม่ขัดแย้งหรือทำให้ภาพกระจัดกระจาย

ขอบเขตหลักประกอบด้วย:

- revise `Hair`, `Body`, `Clothing` และ `Pose` ให้ใช้ vocabulary และ prompt direction เดียวกันในบริบท fashion
- revise `Environment` และ `Lighting` เพื่อลดตัวเลือกที่ซ้ำซ้อนและลดความยากในการใช้งาน
- ถอด field `Reference Image` แบบ legacy ออกจาก Character attribute UI
- กำหนดพฤติกรรม Character attributes เมื่อเปิด Face Match หรือ Story Character Reference โดยไม่สร้าง prompt ที่ขัดกับภาพอ้างอิง
- รักษาความเข้ากันได้กับ preset, configuration เดิม, prompt compiler และ provider ต่าง ๆ

Requirement นี้เป็นการวาง contract ก่อน implementation และยังไม่เปลี่ยน attribute JSON หรือ application code

## 2. Current Problems

### 2.1 Fashion direction is fragmented

- ตัวเลือกบางส่วนเป็น generic portrait, lifestyle, fantasy หรือ editorial โดยไม่มี use case กลางกำกับ
- Hair, Body, Clothing และ Pose สามารถเลือกพร้อมกันได้แม้มี visual intent ที่ไม่เข้ากัน
- ไม่มีระดับที่ช่วยให้ผู้ใช้เข้าใจว่าตัวเลือกเหมาะกับ marketplace, social commerce, lookbook, campaign หรือ runway
- prompt บางรายการใส่คำด้าน composition, beauty หรือ lighting ข้ามหมวด ทำให้ควบคุมผลลัพธ์ยาก

### 2.2 Environment and Lighting overlap

ข้อมูลปัจจุบันมี Environment 72 รายการใน `Location`, `Architecture`, `Background Activity`, `Foreground Layer`, `Props`, `Season`, `Time of Day` และ `Weather` ขณะที่ Lighting มี 28 รายการใน `Key Light`, `Fill Light`, `Back Light`, `Ambient`, `Flash`, `Golden Hour` และ `Neon`

ปัญหาที่พบ:

- ผู้ใช้ทั่วไปต้องประกอบระบบไฟแบบ technical หลายช่องด้วยตนเอง
- Environment บางตัวสื่อถึงแสง เวลา และ mood พร้อมกัน
- Lighting บางตัวสื่อถึงสถานที่หรือเวลา เช่น Golden Hour และ Neon มากกว่าหน้าที่ของแสง
- การเลือกหลายช่องพร้อมกันอาจสร้างคำสั่งแสงที่ขัดกัน เช่น high-key, hard shadow, neon ambient และ golden hour ในภาพเดียว

### 2.3 Character reference is duplicated at schema level

`attributes/spec/ui-schema.json` ยังมี Character field ชื่อ `Reference Image` แม้ reference workflow จริงถูกแยกไปอยู่ที่ Face Match และ Story Character Reference ตาม Requirement 015 แล้ว

ผลกระทบ:

- ผู้ใช้เห็นช่อง reference ที่ไม่ทราบบทบาท
- client และ server prompt maps ยังต้องรู้จัก `Reference Image` แบบ legacy
- Character attributes อาจระบุ Age, Gender, Ethnicity หรือ Beauty ขัดกับตัวละครในภาพ reference

## 3. Product Direction

ทุก fashion attribute ต้องรองรับ Fashion Direction กลาง 5 ระดับ:

| Direction | Primary use case | Visual priority |
|---|---|---|
| Marketplace Commerce | Shopee, marketplace catalog, product listing | เห็นสินค้าและทรงเสื้อผ้าชัด ฉากสะอาด pose ไม่บังสินค้า |
| Social Commerce | TikTok Shop, short-form content, creator selling | เป็นธรรมชาติ ดึงดูดสายตา เคลื่อนไหวได้ และเหมาะกับ mobile feed |
| Lookbook | Brand collection, seasonal catalog, boutique | styling ต่อเนื่อง ภาพมีเอกลักษณ์แต่ยังอ่านสินค้าได้ |
| Editorial / Campaign | Magazine, brand campaign, luxury communication | art direction ชัด dramatic และมี narrative |
| Runway / Couture | Fashion week, Paris-level runway, couture presentation | silhouette, movement, stage presence และความหรูระดับสูง |

หมายเหตุ:

- ชื่อ platform ใช้ใน UI description หรือ tags เพื่อช่วยค้นหาได้ แต่ prompt หลักควรใช้คำบรรยายเชิงภาพ เช่น `social-commerce fashion video frame` แทนการพึ่ง trademark
- Fashion Direction ไม่ควรเป็นเพียงข้อความเพิ่มท้าย prompt แต่เป็น recipe ที่กำหนด default และ compatibility ของหลายหมวดร่วมกัน
- ผู้ใช้ยังแก้รายละเอียดราย attribute หลังเลือก direction ได้

## 4. Taxonomy Design Principles

1. หนึ่ง field ควบคุมหนึ่ง visual axis เท่านั้น
2. ห้ามฝัง Environment, Camera หรือ Lighting ลงใน Hair, Body, Clothing และ Pose prompt โดยไม่จำเป็น
3. ห้ามใช้คำตัดสินคุณค่ารูปร่าง เช่น perfect body, ideal body หรือ inferior body
4. ตัวเลือกรูปร่างต้อง inclusive และใช้คำกลางที่เหมาะกับงาน fashion
5. Product visibility มาก่อน creative pose ใน Marketplace และ Social Commerce
6. ตัวเลือก advanced ต้องไม่รบกวนผู้ใช้ทั่วไป และแสดงภายใต้ `Advanced` เมื่อเหมาะสม
7. ทุก option ต้องมี `label.en`, `label.th`, prompt variants และ tags ที่สม่ำเสมอ
8. ID เดิมที่ความหมายยังเหมือนเดิมต้องคงไว้เพื่อลด migration cost
9. รายการที่เลิกใช้ต้อง deprecate ก่อนลบจริง และมี replacement mapping เมื่อทำได้
10. client preview prompt และ server prompt compiler ต้องให้ semantic result ตรงกัน

## 5. Proposed Attribute Structure

### 5.1 Hair

ปรับ `attributes/008-hair.json` จากรายการทรงผมทั่วไปให้เป็น fashion hair system โดยแยกแกนดังนี้:

| Field | Purpose | Example options |
|---|---|---|
| Length | ความยาวโดยไม่ระบุ styling | Buzz, Pixie, Bob, Shoulder, Long, Extra Long |
| Cut / Style | รูปทรงหลัก | Sleek Bob, Blunt Lob, Layered Cut, Ponytail, Chignon, Braided Style, Sculptural Updo |
| Texture | texture ตามธรรมชาติหรือที่จัดแต่ง | Straight, Soft Wave, Defined Curl, Coily, Textured Volume |
| Parting / Fringe | รายละเอียดกรอบหน้า | Center Part, Side Part, Curtain Bangs, Blunt Bangs, Swept Back |
| Finish | finish สำหรับงานแฟชั่น | Natural Clean, Glossy, Sleek, Wet Look, Airy, Wind-swept, High-volume Editorial |

แนวทาง content:

- Marketplace: neat straight hair, clean ponytail, tidy bun, tucked-behind-ear style
- Social Commerce: soft waves, bouncy ponytail, casual updo, natural movement
- Lookbook: sleek bob, polished waves, refined low bun, controlled texture
- Editorial/Campaign: wet look, sculpted waves, exaggerated volume, conceptual braids
- Runway/Couture: slick-back, architectural updo, couture braiding, deliberate high-volume form

สิ่งที่ต้องแก้:

- merge รายการที่ซ้ำกันระหว่าง Style, Finish และ Hair Texture
- ย้าย hair color ออกจาก style semantics และคงเป็น field แยก
- revise คำที่ผูก trend เฉพาะช่วงเวลาให้เป็นคำที่ใช้งานระยะยาว หรือใส่เป็น tags แทน
- ไม่ให้ Hair prompt เติมคำว่า fashion editorial โดยอัตโนมัติทุก option เพราะ Fashion Direction เป็นผู้กำหนดระดับงาน

### 5.2 Body

ปรับ `attributes/009-body.json` ให้สื่อถึง model presentation และ garment silhouette โดยไม่สร้าง beauty bias

โครงสร้างเป้าหมาย:

| Field | Purpose | Example options |
|---|---|---|
| Height Impression | การรับรู้สัดส่วนในภาพ ไม่อ้างค่าทางการแพทย์ | Petite, Average, Tall, Runway-tall impression |
| Build | มวลและโครงสร้างร่างกายโดยรวม | Slender, Lean, Balanced, Athletic, Broad, Soft |
| Body Silhouette | เส้น silhouette ที่มีผลต่อเสื้อผ้า | Straight, Curvy, Hourglass, Pear, Inverted Triangle, Plus-size |
| Limb / Hand Presentation | ใช้เฉพาะเมื่อจำเป็นกับ fashion pose | Long-line legs, Relaxed natural hands, Elegant hand line |

ข้อกำหนด:

- รองรับ petite, straight-size, curvy, athletic และ plus-size อย่างเท่าเทียม
- หลีกเลี่ยง prompt ที่ sexualize ร่างกายโดยไม่เกี่ยวกับสินค้า
- ไม่ใช้คำว่า `cute` เป็นผลจากความสูงหรือรูปร่างโดยอัตโนมัติ
- `Hands` และ `Legs` ที่เกี่ยวกับ action ควรย้าย responsibility ไป Pose; Body คงเฉพาะ physical presentation ที่จำเป็น
- Clothing fit ต้องไม่ถูกกำหนดจาก Body โดยอัตโนมัติ

### 5.3 Clothing

ปรับ `attributes/010-clothing.json` จากรายการเสื้อผ้าแบบ flat เป็น garment taxonomy ที่ขยายต่อได้

กลุ่มสินค้าเป้าหมาย:

- Tops
- Bottoms
- Dresses and One-piece
- Sets and Tailoring
- Outerwear
- Active and Casualwear
- Occasion and Eveningwear
- Couture and Runway Pieces
- Footwear
- Styling Accessories เฉพาะชิ้นที่มีผลต่อ outfit; accessories รายละเอียดสูงควรแยก module ในอนาคต

แกนข้อมูลของ garment:

| Axis | Examples |
|---|---|
| Product Type | T-shirt, Blouse, Shirt, Trousers, Skirt, Dress, Blazer, Coat, Jumpsuit |
| Silhouette | Fitted, Straight, Relaxed, Oversized, A-line, Column, Sculptural |
| Length / Proportion | Cropped, Waist-length, Hip-length, Mini, Midi, Maxi, Floor-length |
| Material / Surface | Cotton, Linen, Denim, Knit, Satin, Leather, Sheer Layer, Sequined, Technical Fabric |
| Construction / Detail | Draped, Pleated, Tailored, Ruched, Cut-out, Embroidered, Deconstructed |
| Styling | Tucked, Layered, Belted, Monochrome Coordination, Statement Layering |

ข้อกำหนด:

- Product Type ต้องเป็น source of truth; silhouette/material/detail เป็น modifiers
- ไม่รวมสีตายตัวใน option เมื่อระบบมี color control อยู่แล้ว
- Marketplace presets จำกัดรายละเอียดที่อาจทำให้ AI เปลี่ยนรูปสินค้า เช่น deconstructed หรือ exaggerated draping
- Editorial และ Runway เปิดใช้ construction/detail ที่ expressive มากขึ้น
- แต่ละ option ต้องมี compatibility tags เช่น `commerce-safe`, `social`, `lookbook`, `editorial`, `runway`
- ระบบต้องป้องกัน garment conflicts เช่นเลือก dress พร้อม top/bottom โดยไม่มี layering intent

### 5.4 Pose

ปรับ `attributes/011-pose.json` ให้เป็น fashion pose vocabulary โดยรักษาแกน Standing, Sitting, Walking, Hand Position และ Eye Contact แต่ revise options และ compatibility

กลุ่ม pose เป้าหมาย:

| Direction | Pose examples |
|---|---|
| Marketplace | Front product view, 3/4 product view, side silhouette, back garment view, relaxed symmetrical stance |
| Social Commerce | Mid-step reveal, fabric demonstration, playful turn, creator-style lean, natural candid movement |
| Lookbook | Weight shift, clean cross-step, architectural lean, seated garment display, controlled walking pose |
| Editorial / Campaign | Strong angular stance, asymmetrical line, dramatic seated pose, fabric-in-motion, expressive hand framing |
| Runway / Couture | Catwalk stride, runway pivot, end-of-runway stance, train-in-motion, sculptural couture pose |

ข้อกำหนด:

- pose สำหรับขายสินค้าต้องไม่บัง neckline, front print, waist detail หรือ product silhouette โดยไม่ตั้งใจ
- Hand Position ต้องมี product-aware options เช่น `hands clear of garment`, `one hand indicating fabric` และ `holding product naturally`
- Eye Contact แยก direct-selling, soft camera connection และ off-camera editorial gaze
- ห้ามประกอบ Standing, Sitting และ Walking พร้อมกัน
- compatibility rules ต้องประเมิน clothing type เช่น long train, fitted dress, trousers หรือ outerwear
- เพิ่มคำอธิบายภาษาไทยเพื่อบอกผลลัพธ์ของ pose ไม่ใช่แปลเพียงชื่อท่า

## 6. Environment Revision

### 6.1 Responsibility boundary

Environment ต้องตอบคำถามว่า “ถ่ายที่ไหนและฉากมีองค์ประกอบอะไร” เท่านั้น ไม่ควรกำหนดทิศทางแสง คุณภาพเลนส์ หรือ camera angle

โครงสร้างเป้าหมาย:

| Field | Purpose |
|---|---|
| Fashion Venue | สถานที่หลัก เช่น seamless studio, creator room, boutique, gallery, city street, runway venue |
| Set Design | ลักษณะฉาก เช่น minimal, retail display, luxury interior, brutalist, theatrical couture set |
| Background Activity | ระดับกิจกรรมและผู้คน เช่น clean, subtle shoppers, fashion-week audience, backstage crew |
| Props / Product Context | rack, mirror, plinth, shopping package, fitting-room detail หรือ runway structure |
| Atmosphere | clear, mist, rain-wet surface, wind movement โดยไม่กำหนด lighting recipe |
| Time / Season | optional context เฉพาะเมื่อมีผลต่อ story หรือ collection |

### 6.2 Curated fashion environments

- Marketplace: seamless white studio, neutral commerce studio, minimal home studio, clean product corner
- Social Commerce: creator room, modern cafe, boutique corner, urban storefront, lifestyle apartment
- Lookbook: minimalist gallery, modern architecture, hotel corridor, quiet city street, landscaped courtyard
- Editorial/Campaign: brutalist architecture, heritage interior, rooftop skyline, desert landscape, cinematic industrial set
- Runway/Couture: fashion-week catwalk, grand-hall runway, black-box runway, backstage dressing area, couture presentation salon

### 6.3 Merge and removal policy

- merge `Location` และ `Architecture` ที่ให้ผลลัพธ์เดียวกันเป็น Venue + Set Design
- `Foreground Layer` ต้องคงเฉพาะ option ที่ช่วย depth โดยไม่บังสินค้า; option ที่เป็น camera effect ให้ย้ายออก
- `Golden Hour`, `Neon Lighting` หรือคำคุณภาพแสงต้องไม่อยู่ใน Environment prompt
- `Season`, `Weather` และ `Time of Day` เป็น optional advanced context ไม่บังคับใน commerce workflow
- generic fantasy/sci-fi environments ที่ไม่ตอบ fashion MVP ให้ deprecate หรือย้ายไป optional creative pack ในอนาคต

## 7. Lighting Revision

### 7.1 Simple mode

ผู้ใช้ทั่วไปเลือก `Lighting Setup` หลักเพียงหนึ่งรายการ โดย setup เป็น recipe ที่ผ่านการออกแบบแล้ว:

- Even E-commerce Softbox
- High-key Seamless Studio
- Soft Window Creator Light
- Clean Ring-light Social Setup
- Polished Lookbook Studio
- Outdoor Open Shade
- Golden-hour Fashion Campaign
- Hard Directional Editorial Light
- Beauty Dish Campaign Light
- Controlled Color-gel Editorial
- Runway Overhead Wash
- Catwalk Follow Spot
- Backstage Ambient and Flash
- Couture Presentation Spotlight

### 7.2 Optional modifiers

เปิดเฉพาะเมื่อต้องการปรับเพิ่ม:

- Contrast: Soft, Balanced, High Contrast
- Color Temperature: Warm, Neutral, Cool
- Shadow Character: Minimal, Soft Defined, Crisp, Dramatic
- Accent: Rim Light, Practical Lights, Controlled Neon Accent, Camera Flash Accent

### 7.3 Advanced mode

`Key Light`, `Fill Light`, `Back Light`, `Ambient` และ `Flash` แบบแยกช่องสามารถคงไว้สำหรับผู้ใช้ advanced แต่ต้อง:

- ถูกซ่อนจาก default consumer workflow
- เริ่มจาก recipe ของ Lighting Setup ไม่ใช่ค่าอิสระทั้งหมด
- มี conflict validation
- มีปุ่ม reset กลับสู่ recipe
- ไม่อนุญาตให้ simple setup และ advanced values สร้าง prompt ซ้ำกัน

### 7.4 Ownership changes

- Golden Hour เปลี่ยนจาก subcategory เป็น curated Lighting Setup
- Neon เปลี่ยนเป็น controlled accent หรือ editorial setup ไม่ใช่ ambient บังคับทุกส่วน
- Flash แยกเป็น clean commerce flash, direct editorial flash และ backstage press flash
- Lighting prompt ห้ามเพิ่ม environment หรือ camera framing เอง

## 8. Character Reference Policy

### 8.1 Remove legacy Character Reference Image field

ถอด `Reference Image` ออกจาก:

- Character fields ใน `attributes/spec/ui-schema.json`
- `FIELD_TO_GROUP` หรือ mapping ที่เกี่ยวข้องใน `client/app.js`
- prompt compiler mapping ใน `server/promptCompiler.js`
- preset/import migration ที่ยังอ้าง field นี้

การถอดส่วนนี้ต้องไม่ลบ:

- Face Match Reference สำหรับ Headshot และ Character Sheet
- Story Character Reference ตาม Requirement 015
- Style Match หรือ Pose Match ที่มี role แยกกัน

### 8.2 Do not disable the entire Character category

ไม่ควรปิด Character category ทั้งหมดทันทีเมื่อมี reference เพราะ:

- reference บางภาพอาจเห็นเฉพาะใบหน้าหรือไม่เห็นข้อมูลตัวละครครบ
- ผู้ใช้อาจต้องกำหนด age presentation หรือ casting direction เพิ่มเติม
- reference อาจใช้เพื่อ continuity ของ outfit/body มากกว่า facial identity

ให้ใช้ policy ตาม authority แทน:

| State | Character behavior |
|---|---|
| No identity reference | Character fields ทำงานตามปกติ |
| Face Match active | reference เป็น authority ของ facial identity; identity-conflicting fields ถูก lock หรือ suppress ตามขอบเขต Face Match |
| Story Character Reference active | reference เป็น authority ของ character continuity; Character fields แสดงแบบ read-only summary หรือ collapsed override section |
| Explicit Advanced Override | ผู้ใช้ปลดล็อก field ที่รองรับได้ พร้อม warning ว่าอาจลด reference consistency |

### 8.3 Reference-led default behavior

- เก็บค่าที่ผู้ใช้เคยเลือกไว้ใน state แต่ไม่ส่ง prompt field ที่ขัดกับ reference โดยอัตโนมัติ
- ห้าม clear ค่าเดิมแบบเงียบเมื่อเปิด reference
- แสดงข้อความ `Using identity from reference` หรือคำแปลไทยที่ชัดเจน
- แสดงเฉพาะ creative fields ที่ไม่ขัดกับ identity เช่น styling direction ตาม policy ที่กำหนด
- หากผู้ใช้เปิด override ต้องแสดง field ที่ override, ค่าเดิม และผลกระทบก่อน generate
- server เป็นผู้บังคับ reference authority ซ้ำอีกชั้น ไม่เชื่อเฉพาะ disabled state จาก client

### 8.4 Conflict matrix

ต้องจัดทำ matrix อย่างน้อยสำหรับ:

- Gender presentation
- Age presentation
- Ethnicity/appearance direction
- Beauty styling
- Hair
- Body
- Clothing
- Pose

แต่ละ field ต้องระบุหนึ่งสถานะ:

- `reference-owned`: ไม่ส่ง structured value ใน default reference-led mode
- `override-capable`: ส่งได้เมื่อผู้ใช้ยืนยัน Advanced Override
- `creative-independent`: ส่งได้ตามปกติและไม่เปลี่ยน identity

ค่าเริ่มต้นที่เสนอ:

- Face Match owns facial identity; Hair, Body, Clothing และ Pose ยังปรับได้ตาม mode
- Story Character Reference owns identity และ character continuity; Hair, Body และ Clothing เป็น override-capable ส่วน Pose และ Environment เป็น creative-independent
- Character field `Beauty` ต้องเปลี่ยนความหมายไปทาง beauty styling/presentation หรือ deprecate option ที่เป็น subjective ranking

## 9. Fashion Direction Recipes

เพิ่ม recipe/preset layer ที่เลือกค่าเริ่มต้นแบบสอดคล้องกัน ไม่ hard-code prompt ก้อนเดียว

ตัวอย่าง contract:

```json
{
  "id": "fashion.social-commerce",
  "label": {
    "en": "Social Commerce Fashion",
    "th": "แฟชั่นสำหรับโซเชียลคอมเมิร์ซ"
  },
  "defaults": {
    "hairFinish": "natural-movement",
    "poseIntent": "creator-product-reveal",
    "environmentVenue": "creator-studio",
    "lightingSetup": "soft-window-creator"
  },
  "compatibilityTags": ["social", "commerce-safe", "mobile-feed"],
  "advancedAllowed": true
}
```

ข้อกำหนด:

- recipe เก็บ ID ไม่เก็บ label หรือ prompt text
- การเลือก recipe ไม่ล้าง custom values โดยไม่แจ้งผู้ใช้
- เมื่อเปลี่ยน direction ให้แสดง diff ก่อน apply หากมีค่าที่ผู้ใช้ปรับเอง
- preset ต้องผ่าน compatibility validation ก่อน generate

## 10. Data Contract

attribute ที่เพิ่มหรือ revise ต้องรองรับขั้นต่ำ:

```json
{
  "id": "pose.commerce.front-product-view",
  "category": "pose",
  "subcategory": "Standing",
  "label": {
    "en": "Front Product View",
    "th": "ยืนด้านหน้าเพื่อให้เห็นสินค้าชัดเจน"
  },
  "description": {
    "en": "Keeps the front construction and silhouette visible.",
    "th": "เปิดให้เห็นโครงสร้างด้านหน้าและทรงของเสื้อผ้าอย่างชัดเจน"
  },
  "prompt": {
    "default": "front-facing fashion product pose, garment front fully visible",
    "gpt-image": "front-facing fashion product pose with natural posture, garment front and silhouette unobstructed"
  },
  "tags": ["fashion", "marketplace", "commerce-safe", "standing"],
  "compatibility": {
    "directions": ["marketplace", "social", "lookbook"],
    "conflictsWith": ["pose.walking", "pose.sitting"]
  },
  "enabled": true
}
```

หมายเหตุ: หาก loader ปัจจุบันยังไม่รองรับ `description` หรือ `compatibility` ให้เพิ่มแบบ backward-compatible และไม่ส่ง metadata เข้า prompt โดยตรง

## 11. Migration and Backward Compatibility

### 11.1 ID policy

- คง ID เดิมเมื่อ semantic meaning ไม่เปลี่ยน
- option ที่ rename เฉพาะ label ไม่ต้องเปลี่ยน ID
- option ที่เปลี่ยนความหมายต้องสร้าง ID ใหม่
- option ที่เลิกใช้ให้กำหนด `enabled: false`, `deprecated: true` และ `replacementId` ใน migration catalog

### 11.2 Existing configuration

- import configuration เก่าต้องไม่ fail เพราะ ID ที่ deprecate
- ระบบ map ID เก่าไปค่าใหม่เมื่อมี replacement ที่ชัดเจน
- หาก map ไม่ได้ ให้แสดง `Needs Review` และไม่เลือกค่าอื่นแทนแบบเงียบ
- export ใหม่ใช้ canonical ID เท่านั้น
- session/preset เดิมที่มี Character `Reference Image` ให้ละทิ้งเฉพาะ field legacy และคง reference assets ที่อยู่ใน contract ของ Requirement 015

### 11.3 Prompt compatibility

- update client preview compiler และ `server/promptCompiler.js` ใน change set เดียวกัน
- provider-specific prompt variants ต้องรักษา visual intent เดียวกัน
- ห้ามมี prompt fragment ซ้ำจาก simple Lighting Setup และ advanced lighting channels
- log/debug view ควรระบุ source attribute และ recipe เพื่อ trace ความขัดแย้งได้

## 12. UX/UI Requirements

### 12.1 Progressive disclosure

- เริ่มด้วย Fashion Direction และ essential controls
- แสดง Hair, Body, Clothing และ Pose ที่เกี่ยวข้องกับ direction ก่อน
- Environment และ Lighting ใช้ curated setup ใน simple mode
- optional/technical fields อยู่ภายใต้ Advanced

### 12.2 Option explanation

- option ที่ผลลัพธ์เข้าใจยากต้องมี description ภาษาอังกฤษและไทย
- visual configurator ใน Phase 2 สามารถนำ thumbnail/template มาใช้กับ taxonomy นี้ได้ภายหลัง
- ในรอบนี้ requirement ต้องเตรียม `previewKey` หรือ asset mapping contract โดยไม่บังคับให้มีภาพครบทุก option

### 12.3 Compatibility feedback

- ไม่ควรซ่อน option ที่ไม่เข้ากันทันทีจนผู้ใช้ไม่เข้าใจ
- แสดงสถานะ `Recommended`, `Advanced`, `Conflicts` หรือ `Not ideal for product visibility`
- ให้ผู้ใช้ override ได้เฉพาะความขัดแย้งที่ไม่ทำให้ request invalid
- conflict ที่เป็น mutually exclusive ต้อง block และอธิบายวิธีแก้

### 12.4 Reference state

- เมื่อ reference active ให้ Character panel แสดง reference authority summary
- field ที่ lock ต้องยังมองเห็นค่าเดิมและเหตุผลที่ lock
- มี action `Use reference identity` และ `Enable advanced character overrides`
- UI ต้องไม่กลับมาแสดง Character `Reference Image` แบบ legacy

## 13. Implementation Plan

### Step 1: Full attribute audit

- export inventory ของ Hair, Body, Clothing, Pose, Environment และ Lighting
- ระบุ duplicate, overlap, unsafe wording, cross-category prompt และ missing Thai descriptions
- จัดแต่ละ option เข้า Fashion Direction และ compatibility class
- สร้าง retain/rename/merge/deprecate/add matrix สำหรับ review ก่อนแก้ JSON

### Step 2: Freeze taxonomy and contracts

- ยืนยัน field names, canonical IDs, tags และ compatibility metadata
- ยืนยัน Simple/Advanced lighting contract
- ยืนยัน Character reference authority matrix
- เพิ่ม schema validation สำหรับ metadata ใหม่

### Step 3: Remove legacy Character Reference Image path

- remove field จาก UI schema
- remove stale client/server mappings
- เพิ่ม migration สำหรับ configuration เก่า
- ตรวจว่า Requirement 015 references ยังทำงานครบ

### Step 4: Revise Hair and Body

- normalize field ownership
- revise labels, Thai translations และ prompts
- เพิ่ม fashion direction tags
- deprecate duplicates และ biased wording

### Step 5: Revise Clothing

- แยก product type และ garment modifiers
- เพิ่ม Sets, Tailoring, Outerwear และ Couture coverage
- เพิ่ม garment compatibility rules
- ตรวจ product color และ accessory ownership

### Step 6: Revise Pose

- เพิ่ม commerce, social, lookbook, editorial และ runway pose sets
- เพิ่ม product visibility rules
- ป้องกัน stance/action conflicts
- ตรวจ pose-to-garment compatibility

### Step 7: Revise Environment

- ย้ายไป Venue + Set Design + optional context model
- merge Location/Architecture duplicates
- deprecate non-fashion MVP content หรือแยก optional pack
- ลบ lighting/camera semantics ออกจาก environment prompts

### Step 8: Revise Lighting

- เพิ่ม curated Lighting Setup recipes
- ย้าย technical channels ไป Advanced
- เพิ่ม conflict validation และ reset-to-recipe
- ป้องกัน prompt duplication

### Step 9: Add Fashion Direction recipes

- Marketplace Commerce
- Social Commerce
- Lookbook
- Editorial / Campaign
- Runway / Couture

แต่ละ recipe ต้องมี default, recommended options, compatibility rules และ cost-neutral behavior; การเลือก preset ต้องไม่เพิ่มจำนวนภาพหรือเรียก AI เพิ่มเอง

### Step 10: Migration and compiler integration

- update loader/schema
- update client state, import/export และ preset handling
- update client/server prompt compilation
- update provider prompt variants เมื่อจำเป็น
- เพิ่ม migration report สำหรับ unknown/deprecated IDs

### Step 11: QA and visual evaluation

- schema and translation validation
- unit tests สำหรับ compatibility, migration และ reference authority
- prompt snapshot tests ทุก Fashion Direction
- visual smoke tests อย่างน้อย direction ละ 3 ชุด outfit/body diversity
- ตรวจ mobile/desktop UX และ keyboard accessibility

## 14. Acceptance Criteria

1. Hair, Body, Clothing และ Pose มี fashion vocabulary ครบทั้ง 5 directions และไม่ใช้ prompt ข้าม responsibility โดยไม่จำเป็น
2. Marketplace และ Social Commerce สามารถสร้าง composition ที่เห็นสินค้า/เสื้อผ้าชัดโดยใช้ curated options
3. Lookbook, Editorial และ Runway มีทางเพิ่มความ creative โดยไม่ต้องใช้ generic options ที่ขัดกัน
4. Clothing แยก product type, silhouette, material และ detail ได้โดยไม่สร้าง garment conflict
5. Environment ไม่กำหนด lighting/camera และ Lighting ไม่กำหนด venue
6. Simple Lighting เลือก setup หลักได้หนึ่งรายการ และ Advanced Lighting ไม่สร้าง prompt ซ้ำ
7. Character `Reference Image` แบบ legacy ไม่แสดงใน UI และไม่มี stale prompt mapping
8. Face Match และ Story Character Reference จาก Requirement 015 ยังทำงานตาม mode policy เดิม
9. เมื่อ reference active ระบบไม่ส่ง Character field ที่ขัดกับ reference โดยไม่แจ้งผู้ใช้
10. Character category ไม่ถูกปิดทั้งหมวด; ผู้ใช้เห็น reference authority และเปิด Advanced Override ได้อย่างชัดเจน
11. configuration/preset เก่าถูก migrate หรือแสดง `Needs Review` โดยไม่สูญหายแบบเงียบ
12. ทุก option ที่ใช้งานมี English/Thai labels และทุก option ใหม่ที่ต้องอธิบายมี bilingual description
13. client preview และ server compiled prompt ให้ semantic result ตรงกัน
14. automated tests ครอบคลุม schema, migration, exclusivity, reference authority และ prompt snapshots

## 15. Out of Scope

- การสร้าง thumbnail preview ด้วย AI สำหรับทุก option
- virtual try-on หรือการรับประกันความเหมือนของสินค้าแบบ pixel-perfect
- product catalog database และ SKU ingestion
- multi-character casting ใน Story Mode
- automatic trend scraping จาก TikTok, Shopee หรือ fashion week
- credit/pricing changes เนื่องจาก taxonomy และ preset selection
- การลบ creative attributes เดิมแบบถาวรโดยไม่มี migration period

## 16. Post-implementation Review Decisions

1. ยืนยันชื่อ Fashion Direction ทั้ง 5 ระดับและชื่อภาษาไทย
2. ยืนยันว่าจะย้าย generic fantasy/sci-fi environment ไป optional pack หรือเพียง deprecate
3. ยืนยัน default authority ของ Story Character Reference ต่อ Hair, Body และ Clothing
4. ยืนยันว่า `Beauty` จะ revise เป็น beauty styling/presentation หรือถอดออกจาก Character ใน phase นี้
5. review retain/rename/merge/deprecate/add matrix หลังจบ Step 1 ก่อนแก้ attribute files

## 17. Implementation Notes

Implemented on 2026-07-13:

- เพิ่ม modular fashion pack ที่ `attributes/024-fashion-commerce.json` จำนวน 168 options พร้อม English/Thai labels
- เพิ่ม Fashion Direction 5 ระดับพร้อม non-destructive recommended defaults
- เปลี่ยน UI taxonomy ของ Hair, Body, Clothing และ Pose ให้เน้น fashion commerce, lookbook, editorial และ runway
- เปลี่ยน Environment เป็น Fashion Venue, Set Design และ Atmosphere
- เปลี่ยน Lighting เป็น curated Lighting Setup พร้อม Contrast, Color Temperature, Shadow Character และ Lighting Accent
- เปลี่ยน Scene Story เป็น Fashion Story และ Photographic Context เป็น Fashion Photography Context พร้อม curated options ตั้งแต่ product listing ถึง couture/runway
- เชื่อม Fashion Direction recipes ให้เติม Story และ Photography Context ที่สัมพันธ์กันโดยไม่ทับค่าผู้ใช้
- ถอด Character `Reference Image` แบบ legacy ออกจาก UI schema และ client/server maps
- เพิ่ม reference authority ที่เก็บ selection เดิมไว้แต่ suppress reference-owned fields ระหว่าง compile
- เพิ่ม Advanced Character Override และบังคับ policy ซ้ำใน server compiler
- เปลี่ยน Face Match lockout ให้ไม่ลบค่าที่ผู้ใช้เลือกไว้
- แก้ reference lock refresh ให้ uncheck, clear slot, import และ provider policy ปลดทั้ง DOM disabled state และ reference authority state ทันที
- ปรับ generation validation ให้ข้าม Gender/Ethnicity เมื่อ Story Character Reference เป็น identity authority และไม่ block required field ที่ถูก disable
- deduplicate reference image bytes ข้าม Character/Face/Style roles ก่อนส่ง provider และรวม Parent Lineage ID เดียวเป็น thumbnail เดียวพร้อม multi-role badge
- เพิ่ม option descriptions ใน Studio UI และ custom color สำหรับ Product Type
- เพิ่ม migration สำหรับ `Reference Image` selection ใน saved configuration
- เพิ่ม migration alias จาก `Story Event` และ `Context Type` ไปยัง fashion fields ใหม่
- เพิ่ม regression tests สำหรับ fashion pack, schema, Fashion Direction compilation และ Character Reference authority
- revise Camera Motion Blur ทั้งหมวดให้ควบคุมเฉพาะ optical motion behavior และไม่เพิ่มบุคคล ยานพาหนะ ฉาก street, pose หรือ fashion details ที่ผู้ใช้ไม่ได้เลือก

Implementation ใช้แนวทาง optional attribute pack เพื่อให้ข้อมูลเดิมยังคงอยู่สำหรับ backward compatibility ขณะที่ UI ใหม่ใช้ curated taxonomy เป็นค่าเริ่มต้น ข้อมูล legacy สามารถถอดออกจริงได้ใน migration phase ภายหลังเมื่อไม่มี preset/configuration เก่าอ้างถึงแล้ว
