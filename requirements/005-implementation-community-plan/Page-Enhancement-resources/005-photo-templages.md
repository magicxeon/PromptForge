# Momelo — Template Detail UX/UI Specification

Version: 1.0 · 2026-09-06  
Status: Proposed MVP design / developer handoff  
Page: Template detail, not Template Gallery  
Reference: Screenshot supplied by the product owner in this conversation.  
Companion mockup: exec-fe5d8c58-6e65-4b5c-90b7-b518d71e50ba.png

## 1. Implementation brief

ปรับหน้ารายละเอียด Template ให้ professional ใน Momelo Neon theme โดยมีเนื้อหาหลักเพียงสองส่วน:

1. ภาพต้นแบบหนึ่งภาพ พร้อมข้อมูล Owner และปุ่ม Use template
2. ภาพผลงานที่ผู้ใช้งานสร้างจาก Template นี้ พร้อมเครดิตผู้สร้างของแต่ละภาพ

คง App header, Sidebar และโครง Navigation เดิม ใช้ shared components ของโครงการ ไม่สร้าง App shell ใหม่ซ้ำกับระบบเดิม

**Important:** Mockup เป็นภาพเสนอการออกแบบ ไม่ใช่หน้าเว็บที่ implement แล้ว และภาพบุคคลอาจถูกตีความใหม่จากกระบวนการสร้าง Mockup การพัฒนาจริงต้องใช้ไฟล์ภาพต้นฉบับจากระบบ ห้ามตัดส่วนรูป/ตัวหนังสือ/ปุ่มจาก Mockup ไปใช้เป็น UI asset

ชื่อ “Sunlit Editorial” และชื่อผลงานภาษาอังกฤษใน Mockup เป็นตัวอย่าง Copy เท่านั้น ห้ามเปลี่ยนชื่อ Template หรือผลงานที่บันทึกไว้จริงโดยอัตโนมัติ

## 2. Product meaning and non-negotiable rules

- Original template image = ภาพต้นแบบหลักหนึ่งภาพ ไม่ใช่ภาพที่ต้องแสดงหลายมุม
- Community creation = ผลงานที่เกิดจากการใช้ Template นี้ ไม่ใช่ภาพอ้างอิงเพิ่มเติม
- Template owner และ Output creator เป็นคนละบทบาท แม้บางครั้งเป็นคนเดียวกัน
- Template นำแนวทาง Pose, Framing, Composition และ Style ไปใช้ต่อได้ แต่ไม่รับประกันผลลัพธ์เหมือนต้นแบบทุกพิกเซล
- เปลี่ยน Character หรือใช้ภาพของผู้ใช้ได้เฉพาะ Input mode ที่ Template และ Workflow รองรับจริง
- ห้ามอนุมานว่า Output มาจาก Template นี้เพียงเพราะใช้ Tag เหมือนกัน ต้องอ้างอิง templateId จากระบบ
- ข้อมูลผู้ใช้ รูปส่วนตัว และผลงาน Private ต้องไม่หลุดเข้าหน้า Public
- ไม่เพิ่มรายได้ Creator, Rating, Ranking, Tutorial sections หรือสถิติที่ยังไม่มีใน MVP นี้

## 3. Layout and hierarchy

| Area | Desktop | Mobile |
| --- | --- | --- |
| App shell | Shared header ~64–72px; Sidebar ~200–224px | Header + navigation drawer |
| Breadcrumb | Templates / Template detail ใน Main | Breadcrumb แบบสั้น |
| Original image | ซ้ายของ Hero; เห็นภาพเต็ม | แสดงก่อนรายละเอียด |
| Template information | ขวาของ Hero; ชื่อ → Owner → คำอธิบาย → Tags → วิธีใช้ → CTA | เรียงต่อจากภาพ |
| Technical details | Disclosure ปิดไว้เริ่มต้น | Disclosure เดิม |
| Community creations | 3 Columns | 1 Column บนจอแคบ; 2 เมื่อการ์ดกว้างพอ |
| Footer | Compact shared footer | Compact footer ไม่ทับ CTA |

Suggested layout values, reuse existing project tokens when available:

- Main max width: 1280px excluding Sidebar; horizontal padding 24–32px
- Hero columns: approximately 44% / 56%, gap 32px
- Portrait image: max-height approximately 560px; intrinsic width constrained to column
- Community section top spacing: 32–40px; grid gap: 16–24px
- Cards radius: 12–16px; section surface radius: 16px
- Under 1024px: collapse Sidebar according to existing shell behavior
- Under 900px: Hero becomes a single column
- Under 600px: Community becomes one column
- No fixed desktop screenshot aspect ratio; page height follows real content
- Text enlargement and long Thai names must not create horizontal page overflow

## 4. Original image panel

Purpose: ให้เห็น Pose และ Composition ทั้งภาพก่อนตัดสินใจใช้ Template

Required:

- Single original image
- Visible badge: Original template / ภาพต้นแบบ
- Expand control with accessible label “View original template image”
- Reserved image dimensions and a dark neutral fallback

Rendering:

- Use intrinsic aspect ratio and object-fit: contain
- Do not force a narrow original into a very wide black box
- Do not crop away feet, hands or framing details to make it look like the mockup
- Center image inside a constrained frame; allow modest letterboxing where unavoidable
- Do not use stretched images or blurred copies as large backgrounds
- Large image opens an accessible lightbox; no automatic slideshow

Lightbox:

- Display full original asset or authorized high-resolution derivative
- Escape closes; focus stays inside while open and returns to expand trigger on close
- Name the dialog; background must be inert while modal is open
- Zoom controls, if present, need keyboard equivalents; no pointer-only navigation

## 5. Template information

Order, top to bottom:

1. Eyebrow “Template”
2. Actual title as H1
3. Owner avatar + “Created by @owner”
4. Short description, normally 2–3 lines
5. Up to three friendly Tags; additional tags via “+N”
6. One brief usage explanation
7. Price summary and primary Use template action
8. Save / Share secondary actions
9. Template details disclosure + View original post link

Owner:

- Avatar/name opens public User Profile
- Preserve stable ownerId even if display name changes
- Owner is not substituted with the creator of the first community image
- Deleted/unavailable account uses an honest fallback label and no broken link

Tags:

| Raw source example | Display label |
| --- | --- |
| content_type.fashion | Fashion / แฟชั่น |
| visual_style.magazine | Editorial / แฟชั่นนิตยสาร |
| visual_style.realistic_photography | Photography / ภาพถ่าย |

Map through the application's taxonomy/i18n configuration. Never show internal raw keys if mapping is missing; omit or use an approved general label. Tags may filter Template Gallery if that route exists.

Usage explanation:

- Heading: “What stays · What changes”
- Thai: “ใช้แนวท่าทาง องค์ประกอบ และสไตล์จากต้นแบบ”
- Thai: “เลือกตัวละครหรืออัปโหลดภาพของคุณ”
- Show the second line only for supported input modes
- Keep this as two short lines; do not build a property dashboard
- Use non-guaranteeing language in real copy: visual consistency depends on model and inputs

## 6. Pricing and primary action

The source screenshot shows “12 credits/use”. It does not establish whether this includes image generation.

**Do not hardcode 12 or assume a total price. Confirm billing semantics with the existing backend/product configuration before release.**

| Backend pricing meaning | User-facing display |
| --- | --- |
| Template fee only | “ค่า Template 12 credits · ค่าสร้างคำนวณขั้นตอนถัดไป” |
| Fixed inclusive total | “รวม 12 credits / ภาพ” with accurate output count |
| Estimate | “ประมาณ 12 credits” and “ยืนยันยอดก่อนสร้าง” |
| Unavailable | “ดูราคาก่อนสร้าง”; no invented number |

- Primary button: Use template / ใช้ Template นี้
- Clicking it starts configuration, never submits a paid generation automatically
- Desktop: price and button in one row if space permits; otherwise stack
- Mobile: full-width button after price
- Optional mobile sticky CTA appears only when original CTA is out of view; hide near footer, modals and keyboard
- Mobile sticky CTA must reserve bottom padding and safe-area inset
- Template details must disclose material usage restrictions before a paid confirmation, not bury them in a closed section

Suggested flow:

1. Click Use template.
2. If login is required, authenticate and restore the exact template intent.
3. Open existing Studio/Template workflow prefilled with templateId and version.
4. Choose allowed Character or upload authorized personal reference.
5. Review inputs, model, output count and authoritative total quote.
6. Explicitly confirm generation.

Unavailable/archived Template: retain public preview if allowed, disable use with a reason. Do not allow client state alone to override backend availability.

## 7. Save, Share and original post

Save:

- Saves Template to the user's saved collection only if supported
- Clearly distinguish Save from Like on a generated work; use bookmark icon in implementation
- Anonymous user follows auth flow and returns to same template
- Handle pending state and rollback on failure
- Hide this control if feature is outside current MVP

Share:

- Native share when available; otherwise copy canonical Template detail URL
- Announce success in a non-blocking status message
- Handle clipboard failure with selectable URL
- Never copy signed asset URLs or access tokens

View original post:

- Show only when sourceWorkId/originalPostUrl exists and is accessible
- Internal link opens original work detail
- External URLs must be validated and identified as external
- Hide when unavailable instead of using a placeholder link

## 8. Template details disclosure

Closed by default. Use native details/summary or an existing accessible disclosure component.

Suggested fields, only when available:

- Provider display name
- AI model display name and version
- Supported input modes
- Output format and default aspect ratio
- Template version / updated date
- Usage terms provided by the product
- Optional public description of settings

Do not expose API credentials, hidden prompts, private reference URLs, internal routing identifiers, or unapproved license claims. The source model identifier is not a verified recommended model; consume real backend display data.

## 9. Created with this template

Heading: Created with this template / ผลงานจาก Template นี้

Supporting copy: Same template. Different people, personal results.  
Thai alternative: “ต้นแบบเดียวกัน สร้างเป็นภาพในแบบของคุณ”

Toolbar:

- Most liked / ถูกใจมากที่สุด — default to match existing page
- Latest / ล่าสุด
- Implement as a labeled single-selection control, not navigation tabs for unrelated pages
- Preserve choice in URL query and when navigating back
- Changing sort resets pagination and announces loading
- Sort server-side, not only within the loaded page
- Most liked ordering: likes DESC, publishedAt DESC, id DESC as deterministic tie-breakers
- Latest ordering: publishedAt DESC, id DESC
- Stable cursors; discard stale responses after sort changes

Creation card:

- Large photograph with aspect ratio consistent across the row
- Short actual title, one line with accessible full title available
- Creator avatar and @name
- Heart button; show positive like count when available
- No IMAGE badge, # placeholder, repeated zero counters, or metadata dashboard
- Clicking photo/title opens Work Detail; avatar opens Creator Profile
- Heart is a separate button, not a nested link/button inside another interactive element
- Essential controls visible on touch and keyboard, not hover-only

Image rules:

- Use actual output asset from backend
- Default portrait stage 4:5; object-fit: contain when pose/composition would otherwise be lost
- Focal crop may be enabled only for previews where the original remains accessible
- Do not invent missing lower-body details from thumbnail assets
- Open full image on Work Detail or existing lightbox

Content rules:

- Filter by exact templateId and approved public visibility
- Version relation is stored per work; MVP may show all versions of this template with version shown in work details
- Private jobs are never automatically published
- Only explicitly published works count as eligible
- Gallery results do not imply guaranteed output quality for future generations
- “Load more” only when server returns a next cursor; initial page size suggested 12, independent of the 3 sample cards in mockup

## 10. App shell and footer

- Reuse current Header and Sidebar components/routes; Templates remains active.
- Primary Use template CTA should dominate local page; global Create can use outline treatment.
- Keep real credits and account controls from existing application.
- Compact footer: brand, Help, Terms, Privacy, Appearance.
- Appearance opens existing theme selector; does not hardcode theme changes.
- Remove API Engine / Job Queue / History Sync debug counters from this content page.
- A real service outage impacting generation still needs an actionable concise message near the Use template CTA.
- Shared shell changes must be scoped/approved before affecting other pages.

## 11. Visual tokens and typography

Suggested aliases; map to existing Momelo tokens:

| Token | Suggested value |
| --- | --- |
| page background | #080B13 |
| surface | #101725 |
| raised surface | #172235 |
| subtle border | #29364B |
| primary text | #F3F6FC |
| secondary text | #AFBDD0 |
| cyan accent | #21D4F5 |
| purple accent | #A852F7 |
| pink accent | #EB36B4 |
| heading size | 30–36px desktop, 26–30px mobile |
| body | 15–16px; line-height 1.5–1.65 |
| metadata | 13–14px |
| icon | 18–20px inside comfortable hit area |

- Use project font with proper Thai support; Thai vowels/tone marks must not clip.
- Gradient reserved for primary CTA; no neon glow around every card.
- On gradient backgrounds verify text contrast at the lowest-contrast point; use darkened gradient if white text fails.
- Image captions use solid surfaces rather than low-contrast overlays.
- Target 44px comfortable control height; this is a project usability target, not a claim that WCAG AA always requires 44px.

## 12. Suggested component composition

TemplateDetailPage contains:

- Existing AppShell (Header, Sidebar, CompactFooter)
- Breadcrumbs
- TemplateHero
  - OriginalTemplatePreview
  - TemplateInformation
  - OwnerByline
  - FriendlyTagList
  - ReuseExplanation
  - TemplateUseAction
  - SaveShareActions
  - TemplateDetailsDisclosure
- TemplateCreationsSection
  - CreationSortControl
  - CreationGrid using shared WorkCard variant
  - Pagination / LoadMore
- OriginalImageDialog
- Conditional MobileUseBar

Keep fetching and authorization in existing data layer. Pure visual cards should receive props and callbacks. Do not duplicate existing like, auth, quote or sharing services.

## 13. Suggested data contract

Adapt names to existing backend. These are proposals, not assertions that APIs exist.

~~~ts
type Media = {
  id: string;
  url: string; // authorized delivery URL, not a credential
  width: number;
  height: number;
  alt: string;
};
type Creator = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  profileUrl?: string;
};
type TemplateDetail = {
  id: string;
  slug: string;
  version: string;
  title: string;
  description?: string;
  originalImage: Media;
  owner: Creator;
  tags: Array<{ id: string; label: string }>;
  inputModes: Array<'character' | 'personal_reference'>;
  availability: 'available' | 'unavailable' | 'archived';
  unavailableReason?: string;
  pricing: {
    kind: 'template_fee' | 'inclusive' | 'estimate' | 'unavailable';
    credits?: number;
    unit?: 'image' | 'run';
    outputCount?: number;
  };
  aiModel?: { providerName: string; displayName: string; version?: string };
  sourceWorkId?: string;
  usageTerms?: string;
  permissions: { canUse: boolean; canSave: boolean };
  viewer?: { saved: boolean };
};
type TemplateCreation = {
  id: string;
  templateId: string;
  templateVersion: string;
  title?: string;
  image: Media;
  creator: Creator;
  publishedAt: string;
  likeCount: number;
  viewerLiked?: boolean;
};
type CreationPage = {
  items: TemplateCreation[];
  nextCursor: string | null;
};
~~~

API responsibilities:

- Detail service returns permitted public data and accurate availability.
- Creation listing applies template relation, visibility and moderation filtering before pagination.
- Authenticated reaction endpoints prevent duplicate reactions and return authoritative counts.
- Billing quote and generation endpoints revalidate template/version, permissions and price server-side.
- Pin template version at use-start; if quote/version changes require user reconfirmation.
- Never rely on a number rendered in the mockup or passed from the browser as billing authority.

## 14. Proposed routes and interactions

Reuse real project route conventions; examples below are not mandatory migrations.

| Action | Proposed destination |
| --- | --- |
| Breadcrumb Templates | /templates |
| Current detail | /templates/:slug |
| Owner/creator | /users/:handle |
| Output/original post | /works/:id |
| Use template | existing Studio workflow with templateId and version |
| Sort | current route ?sort=most-liked or ?sort=latest |

Validate auth return paths against same-origin allowlist. Do not enable arbitrary external redirects. Share public canonical path without private editor query state.

## 15. Loading, empty and failure states

| State | Expected behavior |
| --- | --- |
| Detail loading | Reserved image area and text skeleton; do not show false price |
| No creations | “ยังไม่มีผลงานสาธารณะจาก Template นี้”; CTA to use template if available |
| Gallery error | Inline retry in gallery; hero and CTA remain usable |
| Broken image | Neutral placeholder; preserve frame and identity labels |
| Template not found | Clear not-found view + Back to Templates |
| Template restricted | Explain unavailability without leaking private metadata |
| Like/save failure | Roll back optimistic state and show retryable notification |
| Login cancelled | Return to detail without charging or generating |
| Generation service unavailable | State reason near CTA; preserve preview and gallery |
| Insufficient credits | Explain during authoritative quote review; no automatic purchase |
| Long title/Thai content | Wrap heading; no overlapping price/actions |
| No more results | Remove Load more; do not loop requests |

## 16. Accessibility and performance

Accessibility:

- One H1 for Template title, H2 for community section.
- Normal text contrast minimum 4.5:1; large text minimum 3:1.
- Test actual CSS colors including gradient stops; mockup does not prove compliance.
- All navigation/actions keyboard accessible with visible focus.
- Descriptive alt text distinguishes original template from each generated output.
- Heart button uses aria-pressed and accessible name including work title.
- Sorting uses proper selected state and live loading announcement.
- Lightbox follows W3C modal dialog focus guidance.
- Reduced motion supported; no forced animation.
- Do not embed the whole generated mockup as the actual UI.

Performance:

- Reserve dimensions for all images; prioritize original image if it is LCP.
- Responsive image sizes; do not fetch full original for all cards.
- Lazy-load below-fold creations; full-size asset loads when requested.
- Load more appends without moving current focus unexpectedly.
- Separate public cacheable template data from personalized saved/liked/account data.
- No signed URLs, user face uploads, or complete prompts in analytics.

## 17. Analytics (optional, follow existing consent policy)

- template_detail_viewed: template_id, version
- template_use_clicked: template_id, auth_state
- template_original_expanded: template_id
- template_sort_changed: sort
- template_creation_opened: work_id, position
- template_saved: template_id, new_state
- template_shared: template_id, method
- template_details_expanded: template_id

Do not log personal reference media or unnecessary personal identifiers.

## 18. MVP and later

MVP:

- Single original image; owner and basic description
- Human-readable tags
- Use template with correct auth/configuration flow
- Price treatment bound to real billing semantics
- Technical disclosure
- Public outputs with actual creator attribution and sorting
- Accessible expand view
- Save/Share only if supported by existing services

Later, not additional blocks in this design:

- Creator monetization and payout summaries
- Tutorial/video walkthrough
- Related templates
- Advanced version filters
- Ranking, reviews, usage statistics
- Comparison of original vs generated output in a dedicated viewer

## 19. Acceptance checklist

- [ ] Exactly one original image at top; no confusion with generated outputs.
- [ ] Original remains visible in full, including pose/framing details.
- [ ] Template owner and every output creator are correctly attributed.
- [ ] No raw taxonomy keys, fake metrics, or # placeholders.
- [ ] Primary action starts configuration; no charge on detail-page click.
- [ ] Billing confirms whether displayed credits are fee, total or estimate.
- [ ] Model names and capability labels come from backend data.
- [ ] Gallery filters exact template relation and approved public visibility.
- [ ] Sort applies across dataset; pagination does not mix stale sorts.
- [ ] No nested interactive controls; like/save failures handled.
- [ ] Keyboard, modal focus and Thai typography tested.
- [ ] Mobile works from 320px without horizontal page scrolling.
- [ ] Footer and optional sticky action do not obscure content.
- [ ] Real outages remain visible where relevant without debug dashboards.
- [ ] Production uses real source assets, not generated screenshot crops.
- [ ] Existing App shell and unrelated pages are preserved.

## 20. Implementation sequence and decisions

Sequence:

1. Inspect existing routes, shared components, taxonomy, billing contract and media assets.
2. Build Hero and gallery layout using real project tokens.
3. Connect real data, owner/output attribution and capability-dependent copy.
4. Integrate existing auth, use-template, save/like and share behavior.
5. Implement responsive, empty/error states and accessibility.
6. Validate pricing, public visibility and generation confirmation end-to-end.

Product decisions needed before production:

- Does 12 credits mean template fee or inclusive generation cost?
- Which templates support character selection vs personal photo reference?
- Are Save and Like already supported independently?
- Does the page show all template versions or only current version outputs?
- Which existing workflow and route receives Use template?

Do not block visual implementation on these; use explicit unresolved data states and existing services until confirmed.

## 21. Design prompt summary

Built-in image-generation edit of the supplied screenshot: retain Momelo dark shell and source-image roles; single original portrait left, concise template information right, readable owner/tags, one prominent gradient Use template CTA, closed technical details, three image-led community cards with creator credit, and compact footer. No fake ratings or usage counts. Photograph and sample-copy fidelity are not authoritative implementation requirements.

## 22. References

Design layout is a proposal based on the supplied screenshot and requirements, not an external standard.

- [W3C WCAG 2.2 — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): text contrast thresholds; validate on actual implementation.
- [W3C WAI-ARIA APG — Dialog Modal Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): modal semantics, keyboard behavior and focus management.

Sources reviewed 2026-09-06. No claim of measured accessibility compliance is made for this raster mockup.

