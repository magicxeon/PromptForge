# Momelo — Comparison Image Download Specification

Version: 1.0 · 2026-09-09  
Status: Implementation specification / proposed layout presets  
Deliverable: One complete downloadable comparison image per export  
Theme: Original plain black design, WITHOUT comet trails or background gradients

## 1. Scope and authoritative design

สร้างฟังก์ชันประกอบภาพ Comparison สำหรับ Download เป็นไฟล์เดียว รองรับภาพ 2, 3, 4 ใบ ทั้ง Portrait และ Landscape

อ้างอิง Mockup พื้นดำก่อนเพิ่มลายดาวหาง:
- ภาพแต่ละใบเด่นเท่ากัน
- เว้น Margin รอบงานเล็กน้อย
- มี Provider / Model ใต้แต่ละภาพ
- Footer มีโลโก้ Momelo และข้อความตรงตัว **comparison by Momelo**
- พื้นหลังสีดำเรียบ; Gradient มีเฉพาะสีเดิมในโลโก้
- ไม่มี Header เว็บ, Sidebar, ปุ่ม, Scrollbar, Ratings, ราคา หรือข้อมูลที่ไม่เกี่ยวกับงาน Export

**ห้ามสร้างภาพเปรียบเทียบจริงด้วย Generative AI:** ฟังก์ชันนี้ใช้การวาด/ประกอบไฟล์ภาพจริงและข้อความแบบ deterministic เท่านั้น ไม่ส่งภาพไปให้ AI วาดซ้ำ เพราะรายละเอียดที่ต่างกันคือสิ่งที่ผู้ใช้กำลังเปรียบเทียบ

Mockup ที่สร้างในบทสนทนาเป็นภาพเสนอ Layout ไม่ใช่ Asset ภาพต้นฉบับ ห้าม Crop ภาพบุคคลจาก Mockup ไปใช้แทน output จริง

งานนี้ไม่รวมการ Generate ภาพใหม่, เปลี่ยน Provider, คิดคะแนนโมเดล หรือ Redesign หน้า Comparison ทั้งหน้า

## 2. Orientation definition — สำคัญ

ในสเปกนี้ **Portrait / Landscape หมายถึงแนวภาพต้นทางหรือช่องภาพ** ไม่ใช่การบังคับแนวไฟล์รวม

เหตุผล: ตัวอย่างที่ผู้ใช้ให้เป็นภาพ Portrait สองใบอยู่ข้างกันบนไฟล์รวมแนวนอน

- Portrait: source width < source height
- Landscape: source width > source height
- Square: source width = source height; ใช้ fallback ที่ระบุด้านล่าง
- Export canvas ratio คำนวณจาก Grid + ภาพ + Caption + Footer
- ไม่บังคับไฟล์รวมเป็น 9:16 หรือ 16:9 เพราะจะเพิ่มขอบดำหรือทำให้ต้อง Crop

หากอนาคตต้องเลือก “ไฟล์รวมแนวตั้ง/แนวนอน” ให้เพิ่ม canvasOrientation แยกจาก imageOrientation ห้ามนำสองความหมายมาใช้แทนกัน

## 3. Six required layout presets

ค่าตารางเป็นข้อเสนอในการ implement; แบบ 2 Portrait ยึดโครงที่ผู้ใช้เลือกแล้ว

| Preset ID | แนวภาพต้นทาง | จำนวน | Columns × Rows | ลำดับ |
| --- | --- | --- | --- | --- |
| portrait-2 | Portrait | 2 | 2 × 1 | A, B จากซ้ายไปขวา |
| portrait-3 | Portrait | 3 | 3 × 1 | A, B, C จากซ้ายไปขวา |
| portrait-4 | Portrait | 4 | 2 × 2 | A B แถวบน; C D แถวล่าง |
| landscape-2 | Landscape | 2 | 1 × 2 | A บน; B ล่าง |
| landscape-3 | Landscape | 3 | 1 × 3 | A, B, C จากบนลงล่าง |
| landscape-4 | Landscape | 4 | 2 × 2 | A B แถวบน; C D แถวล่าง |

Rules:
- แต่ละ Cell มีขนาดและ Caption height เท่ากันทั้งชุด
- ไม่ขยายภาพใดให้เป็น Hero
- ชุด 3 Landscape ใช้ 3 แถวเท่ากัน ไม่ใช้แถวบนใหญ่หนึ่งใบกับแถวล่างเล็กสองใบ
- ลำดับมาจาก orderedItems ของผู้ใช้ ห้ามเรียงใหม่ตามชื่อ Provider หรือเวลาที่โหลดเสร็จ
- A/B/C/D เป็นคำอธิบายตำแหน่งในเอกสาร ไม่จำเป็นต้องพิมพ์เป็น Badge ในภาพจริง
- 4 ภาพใช้ 2×2 เสมอใน MVP เพื่อให้อ่านรายละเอียดได้

## 4. Frame ratio selection and mixed inputs

ก่อนวาง Layout ต้อง decode ภาพและ normalize orientation ให้ได้ขนาดที่ถูกต้อง

### Auto selection

1. หากทุกภาพเป็น Portrait: imageOrientation = portrait
2. หากทุกภาพเป็น Landscape: imageOrientation = landscape
3. หากมีภาพหลายแนวหรือมี Square ปน: ใช้ ratio ของภาพแรกเป็น reference frame; ทุกใบยังแสดงแบบ contain
4. หากภาพแรกเป็น Square: ใช้ frame ratio 1:1 และเลือก grid แบบ portrait preset ตามจำนวน; ระบุใน Preview ว่าเป็น square/mixed fallback
5. ไม่ปฏิเสธชุดภาพเพียงเพราะสัดส่วนแต่ละโมเดลต่างกัน

Frame ratio:
- ถ้าทุกใบ ratio เท่ากัน ใช้ ratio นั้น
- ถ้าต่างกัน ใช้ ratio ของภาพแรกจาก orderedItems
- การเปลี่ยนลำดับอาจเปลี่ยน frame ratio; Preview ต้องอัปเดตก่อน Download
- Optional override portrait/landscape ทำได้ใน export options หากระบบมี UI อยู่แล้ว; ใช้ ratio มาตรฐาน 3:4 / 16:9 ตาม override และยัง contain

**ไม่มีการยืด บีบ หรือ Crop ภาพเพื่อให้เท่ากัน** ภาพที่ ratio ต่างกันจะมีพื้นที่ดำภายในช่องอย่างสมมาตร

## 5. Composition geometry

ใช้หน่วย logical pixels สำหรับ Standard export ก่อนคูณ exportScale

| Constant | Value |
| --- | --- |
| M: Outer margin, every side | 24 |
| G: Gap ระหว่าง Cells/Rows | 16 |
| L: Caption rail minimum height | 72 |
| F: Footer area including divider | 64 |
| Background | #050505 |
| Caption text | #F4F4F5 |
| Provider text | #A5A5AB |
| Divider | #323238, 1px |
| Photo corner radius | 0 — รักษาภาพครบทุกพิกเซล |
| Logo size | 28 × 28 |
| Footer logo/text gap | 10 |

Mockup เดิมมีมุมโค้งเล็กน้อย แต่ Production export เลือกไม่ clip มุมภาพ เพื่อไม่ซ่อนรายละเอียดที่ใช้เปรียบเทียบ ถ้าต้องมีกรอบโค้งให้วาดเป็นกรอบด้านนอก ไม่ตัดตัวภาพ

### Base image frame dimensions

ตั้งค่าตาม ratio จริง ไม่ล็อกทุก Portrait เป็น 3:4:
- Portrait: frameH = 960; frameW = round(960 × ratio)
- Landscape: frameW = 1280; frameH = round(1280 / ratio)
- Square fallback: frameW = frameH = 960

Extreme ratios ต้องผ่าน dimension budget ก่อน Allocate canvas ถ้าตัวหนังสือใส่ไม่พอให้ขยาย frameW ตามข้อ 7 โดยรักษา frame ratio และตรวจ budget ใหม่ ห้ามปล่อยตัวหนังสือทับภาพข้างกัน

### Canvas size formula

~~~text
cellH = frameH + captionH
gridW = columns × frameW + (columns - 1) × G
gridH = rows × cellH + (rows - 1) × G
canvasW = 2 × M + gridW
canvasH = 2 × M + gridH + F

cellX(i) = M + (i % columns) × (frameW + G)
cellY(i) = M + floor(i / columns) × (cellH + G)

captionTop(i) = cellY(i) + frameH
footerTop = M + gridH
dividerY = footerTop
footerCenterY = footerTop + F / 2
~~~

Footer divider เริ่ม x=M ถึง canvasW-M  
Outer bottom margin = M หลังจบ Footer

### Verified baseline dimensions

ตัวเลขนี้ใช้ captionH=72 และ ratio ตัวอย่าง 3:4 / 16:9 เท่านั้น ข้อความยาวหรือ ratio อื่นทำให้ขนาดเปลี่ยนได้

| Preset | Frame per image | Canvas Standard 1× | Canvas High 2× |
| --- | --- | --- | --- |
| portrait-2 | 720 × 960 | 1504 × 1144 | 3008 × 2288 |
| portrait-3 | 720 × 960 | 2240 × 1144 | 4480 × 2288 |
| portrait-4 | 720 × 960 | 1504 × 2192 | 3008 × 4384 |
| landscape-2 | 1280 × 720 | 1328 × 1712 | 2656 × 3424 |
| landscape-3 | 1280 × 720 | 1328 × 2520 | 2656 × 5040 |
| landscape-4 | 1280 × 720 | 2624 × 1712 | 5248 × 3424 |

ขนาด High เป็นขนาดพื้นที่ Export ไม่ใช่คำรับรองว่าภาพต้นทางมีรายละเอียดเพิ่มขึ้น

## 6. Image integrity and fitting

- Load assets จริงจากแต่ละ outputId ไม่ใช่ CSS thumbnail, screenshot หรือ compressed preview ถ้ามีไฟล์ต้นฉบับที่ได้รับอนุญาต
- Normalize EXIF orientation หนึ่งครั้ง ไม่หมุนซ้ำหลัง decode
- Preserve framing, faces, poses, lighting และ proportions
- ห้าม sharpen, beautify, denoise, recolor, AI upscale หรือ color-match
- ใช้ Common SDR sRGB export path เท่ากันทุกภาพ; ICC conversion ที่จำเป็นเป็นเรื่อง color management ไม่ใช่การแต่งสี
- Do not promise byte-identical pixels after resize, decoding, color conversion or lossy encoding
- PNG เป็น lossless ของภาพประกอบที่ Render แล้ว ไม่ใช่การคงไฟล์ต้นฉบับแบบ byte-for-byte
- Transparency ของ Input flatten บน #050505
- Animated GIF/WebP หรือ Video ไม่อยู่ใน MVP; ให้เลือก Still frame ที่แน่นอนก่อน ห้ามเลือกเฟรมเองเงียบ ๆ

### Fit calculation

~~~ts
function contain(
  iw: number, ih: number,
  box: { x: number; y: number; w: number; h: number },
  allowUpscale = false
) {
  const fit = Math.min(box.w / iw, box.h / ih);
  const scale = allowUpscale ? fit : Math.min(1, fit);
  const w = iw * scale;
  const h = ih * scale;
  return {
    x: box.x + (box.w - w) / 2,
    y: box.y + (box.h - h) / 2,
    w, h
  };
}
~~~

Default allowUpscale=false. คำนวณ fit บน **physical export pixels** หลังใช้ exportScale เพื่อไม่เผลอขยายภาพด้วย ctx.scale โดยไม่รู้ตัว

หากความละเอียดต่ำ:
- ช่องภาพยังมีขนาดเท่ากัน
- แสดงภาพกึ่งกลางในขนาดที่ไม่ขยาย; มีขอบดำเพิ่ม
- Preview แจ้งภาพที่ความละเอียดต่ำก่อน Download
- หากผู้ใช้เลือก allowUpscale=true ต้องอธิบายว่าเป็นการขยายด้วยการ resample ไม่ได้เพิ่มรายละเอียด
- ห้ามลด/ขยายรูปตามขนาด viewport ของผู้ใช้

## 7. Provider/model captions

แต่ละ Cell แสดง Provider บรรทัดบน และ Model/version ด้านล่าง:
- Provider font: 14px, weight 600
- Model font: 22px, weight 600, line-height 28px
- Caption padding top/bottom: 10px
- Provider line-height: 18px
- Provider/model gap: 6px
- Alignment: left, ตรงกับขอบ frame
- Text stays outside image; no overlays
- ใช้ Display name จาก data; ไม่แก้ชื่อโมเดลเองและไม่เดาจากภาพ

Formula for dynamic caption:
~~~text
captionH(i) =
  10 + providerLineCount(i) × 18
     + 6 + modelLineCount(i) × 28 + 10
captionH = max(72, max(captionH(i)))
~~~

ทุก Cell ใช้ captionH สูงสุดเดียวกันเพื่อให้แถวเสมอ

Long text policy:
1. Measure with actual loaded font.
2. Wrap ที่ whitespace, hyphen หรือ slash ก่อน
3. หาก token ยาวต่อเนื่อง ใช้ grapheme-safe fallback
4. ไม่ใช้ ellipsis ตัด version; ข้อมูลชื่อโมเดลต้องครบ
5. ไม่ลดฟอนต์ต่ำกว่า base size เพื่อฝืนให้พอ
6. ถ้าข้อความเกิน 4 Model lines ให้เพิ่ม common frame width ทีละ 10%, รักษา ratio และคำนวณทุกช่องใหม่ สูงสุด 4 รอบ
7. ถ้ายังเกิน ให้แจ้ง metadata too long; รอแก้ Display label หรือข้อมูลที่ถูกต้อง ไม่ Export ภาพที่ข้อความล้น
8. Provider ใช้ wrap ได้; ตั้งเพดานความยาวรวมของ labels 256 graphemes ต่อ field เป็น operational limit แล้วแสดง error ที่อธิบายได้

Missing metadata:
- Provider: “Provider not specified”
- Model: “Model not specified”
- แจ้งใน Preview แต่ไม่สร้างชื่อปลอม
- ไม่มีการใส่คำว่า Best / Winner / New หากไม่มี requirement

## 8. Footer specification

แสดงครั้งเดียวใต้ภาพทั้งหมด:
- Official Momelo icon จาก project asset ที่ versioned และ self-contained
- Exact phrase: **comparison by Momelo**
- comparison by: muted gray #A5A5AB
- Momelo: white #F4F4F5, semibold
- Font: 18px, same family as captions
- Logo width/height 28px, gap 10px
- Center whole group (logo + text), not text alone
- Compute total group width using measureText
- Footer ต้องอยู่ใน Canvas bitmap ที่ Encode จริง ไม่ใช่ DOM overlay
- ข้อความและโลโก้ไม่ชน divider หรือ bottom margin
- พื้นดำเรียบ ไม่มีดาวหาง แสงวิ่ง ลายดาว หรือ Gradient พื้นหลัง
- หาก official asset โหลดไม่ได้ ให้หยุดพร้อม Retry ไม่วาดโลโก้ขึ้นใหม่เอง

Use official bundled SVG/PNG; SVG ต้องไม่มี external dependencies ถ้าใช้ Raster logo ให้ resolution พอกับ High export

## 9. Export interaction

Default:
- Selection: 2–4 actual outputs
- Layout: Auto from source images
- Format: PNG
- Size: Standard 1×
- Background: fixed black
- Footer: required
- Ordering: follows selected item order

Suggested compact export dialog:
1. Full-board preview with zoom/fit controls
2. Image count + actual output dimensions
3. Format: PNG / JPEG
4. Size: Standard / High
5. Download image

ไม่เพิ่ม Theme selector หรือตัวเลือกตกแต่งหลายชุดใน MVP นี้

On-screen Preview:
- ใช้ layoutPlan เดียวกับ Download
- Scale ทั้งบอร์ดเพื่อ fit container; Mobile ห้ามเปลี่ยน Grid ตาม CSS breakpoint
- Allow zoom/pan เพื่ออ่านภาพและชื่อโมเดล
- Semantic summary ของลำดับและโมเดลอยู่ใน DOM สำหรับ accessibility
- Final ready preview ควรแสดง Blob เดียวกับที่จะ Download เพื่อไม่ให้ font/wrap/layout ต่างกัน
- Early low-resolution preview ได้ แต่ต้องแทนที่ด้วย final encoded preview ก่อน enable Download

## 10. Proposed architecture

ใช้โมดูลภายในระบบเดิม ไม่จำเป็นต้องสร้าง Service ใหม่

| Suggested module | Responsibility |
| --- | --- |
| comparison-export/types.ts | Input/output types |
| comparison-export/presets.ts | Six layouts and constants |
| comparison-export/resolve-assets.ts | Access checks, URLs, decoding |
| comparison-export/layout.ts | Pure dimensions, text placement |
| comparison-export/draw.ts | Images, captions and footer |
| comparison-export/encode.ts | Blob encoding, type checking |
| comparison-export/download.ts | Download lifecycle |
| comparison-export/ComparisonExportDialog | Preview, settings, status |

ปรับ Path ตาม AGENTS.md และ Folder convention ใน repository จริง ห้ามสร้าง root folder ใหม่จากตัวอย่างโดยไม่ดูโครงเดิม

Browser Canvas 2D เป็น MVP default เพื่อประกอบภาพและ encode Blob; ถ้า Project มี renderer อยู่แล้วให้ใช้ของเดิม
Server render เป็น fallback เฉพาะที่มีระบบรองรับ/ต้องการผลเหมือนกันทุก platform ไม่เพิ่ม Infrastructure โดยอัตโนมัติ

## 11. Suggested contracts

~~~ts
type ExportItem = {
  outputId: string;
  assetId: string; // resolve authorized source internally
  providerLabel?: string;
  modelLabel?: string;
};

type ComparisonExportRequest = {
  orderedItems: ExportItem[]; // runtime validate length 2, 3 or 4
  imageOrientation: 'auto' | 'portrait' | 'landscape';
  format: 'png' | 'jpeg';
  size: 'standard' | 'high';
  allowUpscale: boolean; // default false
  theme: 'momelo-black';
  layoutVersion: 'comparison-black-v1';
};

type ComparisonExportResult = {
  blob: Blob;
  filename: string;
  mimeType: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
  presetId: string;
  warnings: Array<{
    code: 'LOW_RESOLUTION' | 'MIXED_RATIOS' | 'MISSING_LABEL';
    outputId?: string;
    message: string;
  }>;
};

type Rect = { x: number; y: number; w: number; h: number };

type LayoutPlan = {
  logicalWidth: number;
  logicalHeight: number;
  scale: 1 | 2;
  items: Array<{
    outputId: string;
    imageFrame: Rect;
    providerLines: string[];
    modelLines: string[];
    caption: Rect;
  }>;
  footer: Rect;
};
~~~

Store asset URL expiration only in transient resolver state; no private URL in filename, footer or export metadata.

## 12. Render pipeline

1. Snapshot orderedItems, labels, settings and layoutVersion.
2. Validate count and access; avoid duplicate outputIds unless an existing product use case permits them.
3. Resolve authorized original/approved full-size assets.
4. Decode dimensions and apply source orientation.
5. Load exact caption fonts and official logo.
6. Determine preset and frame ratio.
7. Measure text; compute caption height and LayoutPlan.
8. Verify pixel/dimension budget.
9. Allocate canvas at physical pixel dimensions.
10. Fill full background opaque #050505.
11. Draw each original image with contain/no-crop rules.
12. Draw provider/model labels outside each image.
13. Draw footer divider, logo and text.
14. Encode PNG/JPEG and validate Blob.
15. Decode exported Blob once to validate actual dimensions and show final Preview.
16. Download the same Blob via user action.
17. Clean up temporary decoded assets and object URLs when no longer needed.

Use snapshot identity/runId: if user changes selection or settings while processing, ignore stale result and create a new run. Abort requests where possible. Download button only acts on the latest ready result.

Loading completion order must never determine tile order.

## 13. Canvas and image delivery implementation notes

Browser implementation:
- Canvas backing dimensions come from LayoutPlan, independent of devicePixelRatio.
- Render geometry and fonts scaled by exportScale; image fitting must use physical dimensions.
- Prefer toBlob over base64 data URLs for encoded output.
- Null Blob, SecurityError or unsupported encoder is an error, not success.
- PNG is default; JPEG quality proposed 0.95.
- Verify blob.type; if requested MIME falls back, match real extension and notify or require retry.
- Read back exported dimensions; reject a Blob with unexpected width/height.
- Capture layoutVersion and font asset version for reproducibility.
- Pixel-identical output across different browser engines is not guaranteed. If this becomes required, use one pinned server renderer and fonts.

CORS:
- Displayable remote images are not automatically exportable from canvas.
- Use correct origin permissions from the existing media service.
- For HTMLImageElement set crossOrigin before src when using anonymous CORS.
- Signed URL alone does not guarantee CORS permission.
- Do not use no-cors opaque responses as a workaround.
- If a URL expires, refresh through the authorized asset service and retry once.
- Existing same-origin media endpoint may deliver owned assets by assetId; never build an unrestricted URL proxy.
- In a server fallback resolve owned asset IDs, validate media, and block arbitrary user-controlled fetch URLs.

Font readiness:
- Await explicit font loads for required weights plus document.fonts.ready in browser path.
- Confirm Thai glyph coverage if labels contain Thai.
- If font fails, present Retry; do not Export with a silent fallback that changes line wrapping.

These API properties are grounded in references at the end; geometry and operational policies are Momelo design choices.

## 14. Resolution and resource budgets

Proposed application defaults, not universal browser limits:

- Standard: exportScale=1
- High: exportScale=2
- Max output side: 8192px
- Max output pixels: 24,000,000
- Decode budget: at most 16 megapixels per source and 64 megapixels total for 4 items
- Source compressed byte limit: 30 MiB per image
- Load concurrency: 2; release decoded sources after drawing if they are not needed again
- Actual device limits may be lower; handle allocation/encode errors gracefully

If High exceeds budget: explain and offer Standard. Do not silently downscale a High download.
If Standard also exceeds budget: stop with actionable message, or route to an existing supported server export path.
If source exceeds decode budget: use an authorized deterministic downsample derivative sufficient for target size, or existing server renderer. No AI resynthesis.
If neither exists, state the limit instead of pretending the image exported.

RGBA memory lower bound is approximately width × height × 4 bytes; peak usage includes source decoding, buffers and encoder copies, so this is not a peak-memory estimate.

## 15. Encoding, filename and download lifecycle

PNG:
- image/png, opaque black canvas
- Primary format for comparison exports
- Compression does not recover detail lost by resizing

JPEG:
- image/jpeg, quality 0.95 proposed
- Opaque black background; smaller lossy alternative
- Preview must reflect JPEG artifacts of the encoded Blob if JPEG selected

Filename:
~~~text
momelo-comparison-{count}-{preset}-{YYYYMMDD-HHmmss}.{ext}
Example: momelo-comparison-3-portrait-3-20260909-203500.png
~~~

- Sanitize filename; no full prompt, personal names, signed URLs or secret IDs
- Use Blob object URL + existing download utility
- Keep final Blob URL alive while Preview/Download remains available
- Revoke replaced results and unmount/cancel resources when safe, not immediately before download consumes the URL
- If platform requires opening an image for Save, show that option explicitly using the same Blob
- Browser initiating download is not proof the user saved the file to disk; UI status should say “Download started”, not “Saved to your device” without such evidence

## 16. Error handling

| Case | Required response |
| --- | --- |
| Less than 2 / more than 4 items | Require valid selection |
| Missing or unauthorized asset | Identify failed item; retry or replace selection |
| One of four images fails | Do not silently export three |
| Expired asset URL | Authorized refresh and bounded retry |
| CORS failure | Explain export delivery error; no security bypass |
| Font/logo unavailable | Retry required |
| Corrupt or unsupported format | Explain unsupported item |
| Long metadata cannot fit | Ask for valid display label; do not clip |
| High exceeds budget | Offer Standard or supported server fallback |
| Encode returns null | Keep selection and retry |
| User cancels | Stop current run; retain selection |
| Stale export finishes | Discard result; never overwrite current Preview |
| Output dimensions wrong | Reject export as incomplete |
| Source ratio differs | Contain + preview notice, not error |

No partial comparison file with missing photos, empty footer or placeholder model names concealed from user.

## 17. Essential tests and acceptance criteria

Meaningful automated tests for this functionality:

1. Six presets: exact columns, rows, baseline dimensions from table.
2. Same ratio vs mixed ratio: image rectangles remain inside frames; contain never crops.
3. No upscale: low-resolution image drawn at <= native size in physical export pixels.
4. Ordering: asynchronous load completion does not change association of image/provider/model.
5. Caption wrapping: long version strings and Thai names fully fit; every caption rail uses common height.
6. Footer bounds: logo/text/divider are within canvas on all six presets.
7. Export scale independent of browser DPR and viewport.
8. Source failure: export fails atomically; no partial file.
9. Stale run: cancelled/changed selection cannot produce active Download result.
10. Decode actual PNG/JPEG output and verify expected size/type and non-empty Blob.

Visual QA:
- [ ] All six Standard layouts inspected.
- [ ] High 2× inspected for representative 4-image and long-caption cases.
- [ ] Black margin visible on every side.
- [ ] Original images shown completely, no warped body/face or clipped corners.
- [ ] Labels belong to correct images and are readable.
- [ ] Footer exact “comparison by Momelo” and official logo present.
- [ ] No comet, gradient background, UI buttons or debug controls included.
- [ ] Preview and downloaded file use same final rendered result.
- [ ] Low-resolution sources do not falsely appear enhanced.
- [ ] Download handles supported desktop/mobile browsers in project's target matrix.

Use synthetic fixtures with visible corner markers to verify no crop; use real comparison fixtures for visual QA. Do not use generated mockups as pixel-truth fixtures.

## 18. Implementation sequence

1. Inspect existing comparison selection, media resolver, brand assets, fonts and download utility.
2. Implement six preset definitions and pure LayoutPlan calculation.
3. Implement text wrapping and image contain logic with targeted tests.
4. Integrate decoder, Canvas renderer and encoder.
5. Add preview/download states to existing action.
6. Validate real assets, failures, resource limits and six layouts.
7. Hand off representative exported files plus concise results.

Deliver production output through the actual export function; do not hand-compose screenshots as proof of implementation.

## 19. References

Source design: user-approved plain black comparison mockup and requirements in this conversation. Model labels in example images are user-supplied data, not independent verification of product names.

Primary implementation standards:
- [WHATWG HTML — Canvas, drawing, bitmap serialization and origin security](https://html.spec.whatwg.org/multipage/canvas.html)
- [W3C — CSS Font Loading Module Level 3](https://www.w3.org/TR/css-font-loading-3/)

Supplementary API documentation:
- [MDN — Canvas toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [MDN — Cross-origin images in canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [MDN — drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)

References checked 2026-09-09. Layout choices, dimensions, export budgets and component paths are proposed Momelo implementation rules, not requirements imposed by the cited standards.

