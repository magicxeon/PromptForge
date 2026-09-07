# Photo Template Original And Information

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](implementation-plan/034-presentation-delivery-evidence.md).
Owner: Community. Execution: [plan 028](implementation-plan/028-photo-template-original.md).
Visual authority: resources `005-photo-templages.md` and `005-photo-templages.png`.
Route stays `/explore/templates/:postId`; do not add `/templates/:slug` aliases.

## Two-Part Page

Part 1 is a single original image and its Template information. Part 2 is the
public creations grid owned by 028. No second hero image, portrait strip,
related-templates block, creator rankings or tutorial section in this Detail.
The word hero here describes a product inspection region, not a landing banner.

## Original Image

- Exactly one original at the top, with an Original template badge and expand
  control. Use the actual public source asset, not a screenshot crop/AI replacement.
- Constrained intrinsic portrait stage, centered and `contain`: preserve feet,
  hands and framing. Do not put a narrow portrait in an unnecessarily wide black
  panel, stretch it or use a blurred duplicate as background.
- Desktop target approximately 44/56 image/info columns, gap 24-32px, original
  height about 560px with responsive constraints. Below ~900px usable content
  width stack image before information; no fixed screenshot aspect ratio.
- Reuse MediaStage and an existing accessible image dialog/lightbox. Escape,
  focus trap/return, labelled expand and full-image inspection are required.

## Information Order

1. Template eyebrow; actual title as the page's single H1.
2. Template owner via CreatorIdentity, not an output creator; valid profile link.
3. Existing description and up to three translated taxonomy labels (+N disclosure
   for the remaining public tags). Preserve user titles/copy and Thai marks.
4. Compact input-policy summary only from safe public metadata. State required
   outfit and optional Character where enabled; independent Face/Pose/Scene
   editing stays unavailable. Do not promise pixel-identical results.
5. Existing access fee and primary Use Template action. `accessCredits` means
   Template access fee; the generation quote is confirmed in the existing next
   workflow. No hard-coded 12 credits, total-price inference or price mutation.
6. Save and Share secondary controls when supported, using rules below.
7. Technical details disclosure, initially closed; View original post link.

Input-policy metadata must be provided through a reviewed read-only public
projection from Templates through Community, not private owner settings or a
new use session created just for preview. If unavailable, omit the capability
summary rather than guessing. The existing Studio form remains authoritative.
Any high-impact public projection extension is Pending in 032, not a blocker
for the original/info layout.

## Controls And Disclosure

- Use Template keeps `useCommunityTemplateHandoff` / `TemplateUseButton` with
  original Post ID and existing version/auth return behavior. Detail clicks do
  not generate or reserve/capture generation Credits.
- Unavailable Template keeps allowed preview with a real reason; pending
  handoff prevents duplicates and reports errors next to the action.
- Save means existing Community Post save; reuse engagement hook with a
  Bookmark icon, real pending/rollback/actor behavior. Do not claim it creates
  a collection or saves a new Template definition.
- Share means share/copy canonical public Detail link, NOT republish image or
  disclose prompt/reference. Handle native-share cancellation, clipboard failure
  and selectable-URL fallback. Strip editor/query secrets from the URL.
- Disclosure uses actual provider/model display, ratio/format/dimensions and
  available version/date. Hide absent fields, raw taxonomy keys, hidden prompts,
  use-session IDs, internal reference URLs and unapproved usage-rights claims.

## Scope And States

- Keep AppShell/footer/sidebar. Resource 005's compact footer/status removal
  conflicts with shared shell ownership and is Pending, not a global CSS hide.
- Keep original Post comments, creator recommendations and owner edit unchanged.
- Stable loading skeleton, sanitized unavailable/not-found state, broken-image
  fallback and retry. Creation-list failures must not disable loaded original.
- Native page flow first; optional mobile sticky CTA is deferred until needed.
  No footer, keyboard or dialog obstruction.
- Existing tokens/<=8px radii override mockup's proposed larger card radii.
  Do not style this whole section as a nested floating card.

## Acceptance

- `PTI-01`: One complete original, correct real title and Template owner.
- `PTI-02`: Fee labelled accurately; Use enters configuration without paid generation.
- `PTI-03`: Friendly tags/disclosure contain only authorized, available metadata.
- `PTI-04`: Save delegates to existing post action; Share yields only canonical link.
- `PTI-05`: Direct URL, refresh, back and View original post work unchanged.
- `PTI-06`: Resource 005 hierarchy passes mobile/tablet/desktop + keyboard lightbox checks.

Reuse TemplateDetailRoute, useTemplateDetail, CreatorIdentity, MediaStage,
TemplatePricingBadge, TemplateUseButton and `template-detail.css`. New cohesive
visual fragments stay under Community, not a second Template Detail feature.
