# Shared Generation Options UX

ID: GEN-UX-021. Updated: 2026-10-03.

## R7: Setup Slide Motion

Scope: shared Playground Generation Setup disclosure for Image, Look Sheet and
Video. Primary: UX/UI Product Designer; bounded motion/accessibility review.

- Expand with a short slide-down and collapse with slide-up, approximately240ms.
  Animate the setup height so the result region follows smoothly. Initial entry
  remains fully expanded without an entrance animation.
- Rapid toggles reverse from the current visible position; cancel obsolete motion
  on unmount. Reduced-motion preference or unavailable animation support uses an
  immediate disclosure. Keep inputs mounted, disable hidden controls immediately,
  and preserve focus, drafts, completion eligibility and all existing R6 behavior.
- Automatic completion reveal waits until the closing animation finishes. Manual
  toggles keep their existing scrolling behavior. No new dependency or persistence.
- GO-T33: implement motion in the existing workspace; GO-T34: focused workspace
  tests/types and browser checks at390/820/1440 including reversal/reduced motion.
  Evidence belongs to the existing003 verification document.

Status: implemented and focused-verified; GO-T33-T34 complete. UX Turing and QA
Peirce approved; automated/browser evidence and remaining UAT gaps are in003.

## R6: Readable Comparison And Ready-To-Use Setup

Scope: Playground Image, Look Sheet and Video setup presentation only. Primary:
UX/UI Product Designer; UX pre-edit review and independent QA use the existing
review-product-ux and verify-release-regressions skills.

1. Comparison slots must use the available container width, not the viewport.
   In the narrow render panel, show one full-width slot per row with readable
   model/provider names, reorder/remove controls, reference limits and prices.
   Preserve two-to-four slots, availability checks, aggregate quote and consent.
   Keep one yellow outer frame; remove redundant inner Comparison framing here.
   With multiple slots, Generate may follow the full list below the first viewport;
   it must remain reachable by natural page scroll beside the aggregate quote.
2. Add a restrained theme-token corner gradient to the model/settings region.
   No animation, decorative blobs or gradient behind writing/output/Queue. Keep
   focus, disabled/error states and contrast readable in all three themes.
3. Every route entry and Image/Video/Look Sheet tab entry starts expanded, even
   with restored completed output arriving asynchronously. This supersedes R5's
   permission to collapse restored results. Existing actor/mode mounts reset UI;
   do not add persistence or reset user drafts to achieve this behavior.
4. Only a newly requested or actually observed active render completing with
   usable media can auto-collapse. Loading historical results, selecting history
   and quote/reference work must not count as a new render. Preserve R5 editing,
   IME, portal-focus, failed/partial/cancelled and superseded-completion safeguards.
5. Verify narrow Comparison with long names and two/four slots at390/820/1440,
   TH/EN and theme variants; verify entry/tab return with restored output and new
   successful completion. No paid provider execution or server lifecycle change.

Tasks GO-T30-T32 are tracked in002; evidence and any remaining gaps in003.
Status: implemented and focused-verified. UX and independent QA approved;
GO-T30-T32 complete. Live-provider and physical-device UAT remain separate.

## R5: Expandable Creation Workspace

Supersedes R2-R4's narrow left composer/right-result arrangement for Playground
Image, Character Look Sheet and Video only. Primary: UX/UI Product Designer;
independent UX design review before edits and QA after implementation. Reuse
review-product-ux and verify-release-regressions. No new Generation lifecycle.

1. Start expanded when no current rendered output exists. Use full-width setup:
   writing/Character details/references on the left, compact Model/options/Generate
   on the right in the existing yellow render frame. Desktop writing is wider;
   mobile/tablet stack writing then render settings/Generate, matching DOM/tab order.
2. Setup has a keyboard-operable expand/collapse header with current Model summary.
   Collapsed setup keeps all inputs mounted, inaccessible while hidden, and
   retains draft values, selected references, quotes and validation. No second
   Generate action and no duplicate render/credit workflow.
3. A new successful current render with a usable media URL automatically collapses
   setup once and reveals the output below it. Restored completed output may start
   collapsed. Pending, failed, cancelled, partial or missing-media results never
   trigger success collapse. Reopening stays open until a different success.
4. Do not interrupt typing or IME composition. Defer collapse while an editable
   field has focus, until editing leaves the field; no arbitrary idle timer.
   Clear deferred completion if it is superseded by another pending/failed task.
   Do not steal focus from unrelated navigation; move hidden setup focus to the
   toggle when necessary. Respect reduced motion when revealing output.
5. Return to settings expands the actual setup before focusing it. Result actions,
   viewer, Queue and Recent remain available below setup. Hide only the empty
   result placeholder before any task; processing/errors/partial results remain
   visible. Existing outputs are never cleared by folding the form.
6. Expansion is local UI state, reset with the existing actor/mode session. No new
   persistence/cache/polling/provider/credit/data ownership. Studio/Cinematic and
   non-composer callers keep existing layouts and workflows.
7. Acceptance: Image/Video/Look Sheet; fresh/restored; success/failed/pending;
   editing deferral, repeat polling, manual reopen, keyboard focus, draft retention;
  390/820/1440, TH/EN and all themes using fixtures only.

Tasks GO-T26-T29 and evidence remain in the existing002/003 packet.
Status: R5 implemented and verified with focused state/caller tests and intercepted
browser fixtures. Live paid-provider and physical-mobile UAT remain separate.

## R4: Composed Authoring Panels

Scope: Playground Image, guided Character Look Sheet and Video left composer only.
Primary: UX/UI Product Designer; independent UX design review completed before
edits, QA reviews implementation. Apply review-product-ux and
verify-release-regressions. References: the user's three current panel screenshots.

- Preserve model -> settings -> references -> prompt -> Generate. Guided Look
  Sheet retains its definition form between settings and references. Results,
  Queue, Recent, application navigation and all existing actions stay in place.
- Use one Momelo yellow frame, neutral interior, consistent gutters and section
  rhythm. No decorative nested cards. Give model names prominence; long names
  wrap. Compare is a secondary in-flow action, never positioned over a label.
- Compact output controls remain capability-driven and at least 44px operable.
  Group ratio/count logically rather than leaving an unused third column. Keep
  audio, locked reasons, unavailable models and testing notices accessible.
- Reference summaries have aligned contained thumbnails, name/role hierarchy,
  count and visible errors. Expand existing editors without losing inputs.
- Increase Image/Video prompt from 140px to at least 180px, 220px on taller desktop
  viewports. Keep a single scrolling desktop tools body and separate action row;
  mobile/tablet use page scrolling. Long guided forms stay editable and mounted.
- Generate remains yellow with one readable Credit badge and subdued static glow.
  Use normal-sized, non-uppercase typography. Preserve maximum estimates,
  enhancement breakdown, quote failures, disabled reasons and paid consent.
- Do not change business contracts, provider capability catalogs, prices, actor
  drafts or persistence. Preserve Studio, Cinematic and dialog presentation.
- Verify keyboard, responsive fit, long text, TH/EN and all three themes. Test
  only affected groups and intercepted browser fixtures; no paid generation.

Implementation/evidence are tracked in the existing 002/003 packet, GO-T23-T25.
Status: R4 implemented and verified with focused tests and intercepted actual-route
browser fixtures; real-provider/customer UAT is not claimed.
R1 shared selectors are implemented and remain the runtime baseline;
R1 layout checks do not verify the revised placement below.
Owner: shared Generation presentation, with each feature retaining its workflow.
Primary role: UX/UI Product Designer. Requirement Expert: Tesla. Implementation
Expert: Gibbs. QA reviewer: Plato. Requirement mapping: coordinating agent using
Product Requirement Architect review. Applied skills: `review-product-ux` and
`verify-release-regressions`; implementation review used separate UX/QA agents.

R2 implementation primary: UX/UI Product Designer; UX reviewer: Confucius;
QA reviewer: Meitner. Heisenberg implements the bounded Video consumer slice.
Applied skills: `review-product-ux` and `verify-release-regressions`.
Only the approved Playground presentation changes; provider, user data and Credit
contracts remain unchanged.

## 1. Outcome And Scope

### R3 Look Sheet Alignment And Momelo Render Signature

Status: implemented; UX/source/visual and focused QA signed off on2026-10-03.
Real-provider and remaining parent-flow UAT are not claimed. Primary: UX/UI Product Designer;
reviewers: UX Expert Einstein and QA Harvey. Applied skills: `review-product-ux`
and `verify-release-regressions`. This is presentation only, not a billing,
provider, persistence or reference-authority change.

The user's three screenshots supersede R2's guided Playground Look Sheet
exclusion. All Playground modes use the same compact title/media switch row.
The General Image/Character Look Sheet selector remains a separate choice.
Playground Look Sheet adopts the existing composer: Model/options first, the
existing Character definition form in a labelled expandable section, authorized
references and read-only compiled prompt, then the single pinned Generate/price
group. The form starts expanded and stays mounted when collapsed.
Read-only reference disclosures use the existing localized Reference images label,
not Edit references; editable callers retain their existing wording and behavior.
On desktop, result/actions/Queue/Recent are on the right; mobile/tablet stack tools first.
Studio's guided form order and other feature placements remain unchanged.
Do not replace the definition form with an editable compiled prompt or lose its
adult validation, outfit locks, enhancement charge, pending field locks, actor
draft, trusted identity handoff, review candidate or existing output actions.

Use one shared yellow render-frame border and restrained static glow, based on
the dedicated theme-aware `--theme-render-accent` token, for all render settings areas: Playground composer and
legacy engine region, Studio/Look Sheet engine shell, and standalone shared
image/video/Cinematic/Comparison/batch/Fashion settings panels. Nested engine
panels inside a render frame stay unframed. Do not make result, Queue, navigation,
character forms or individual reference slots yellow. Selection, error and focus
indicators retain their own semantics. No glowing animation is introduced.

Acceptance: identical media-switch position across Playground modes; model visible
on entry; all definition fields reachable; Generate and price/error states intact;
single yellow outer frame with no nested yellow border; no overflow at390/820/1440;
TH/EN and all three themes verified with fixture-only checks. Real provider and
physical mobile keyboard UAT remain separate. Tasks/evidence belong to the linked
implementation and verification documents.

Make selecting an engine and output understandable in one glance. Creators should
write or review their direction, inspect references, choose valid output options,
see Credits and generate without working through a large technical form.

The user requested consistent treatment of every selection screen. This packet
covers image/video **generation-option selectors** across Playground, Cinematic,
Studio, Scene Builder, Look Sheets, Fashion and Comparison. It does not redesign
unrelated navigation, story/genre forms, library filters or Admin settings.

Source reference: `_temp/simple-UI.mp4`, 1712x738, approximately25 seconds. Observed:
one model chooser, compact current-value toolbar, ratio/resolution menus, duration
choices, reference-mode controls and price beside Generate. The clip demonstrates
an empty desktop composer; it does not prove mobile behavior, upload/recovery
behavior, provider support or prices. Its branded imagery, large headline and
low-contrast text are not layout requirements for Momelo.

Read with the canonical [visual language](../Knowledge/ui-design-system-and-visual-language.md),
[ownership contract](016-capability-ownership-and-single-workflow-entry-points.md),
[screen inventory](generation-options-ux/001-screen-inventory.md),
[task plan](generation-options-ux/002-implementation-plan.md) and
[verification contract](generation-options-ux/003-verification-and-ux-review.md).

This requirement supersedes earlier Cinematic instructions to preserve the exact
Engine presentation **only for the explicitly mapped controls and relocations**.
The existing render/result, Take approval, Queue, provider, reference, price,
consent, persistence and Fashion workflow contracts retain authority. The user
authorized the R1 selectors and subsequently authorized R2 layout implementation.
Provider activation remains outside this scope.

### R2 User Feedback And Scope

The implemented Playground puts the render area before the prompt, references and
engine. Users must scroll to discover available models. The user accepts the new
option controls but rejects their placement. R2 supersedes the R1 composer order
and result placement for **GV01 Playground Video and GI01 Playground Image**.

The first useful interaction must be model discovery and selection. Keep the
model, references, prompt and Generate together in a left tool panel; show the
selected output and its actions in a larger right region. Existing settings/slot
controls in Cinematic, Studio, guided Look Sheets, Scene Builder and Fashion retain
their placement. Sharing a component does not expand this relocation to all17
contexts. Comparison inside Playground follows the new host layout while its
slot selection and price contracts remain unchanged.

## 2. Layout Contract

Three presentation variants share selector behavior, not a new Generation engine:

| Variant | Use | Arrangement |
| --- | --- | --- |
| `composer` | Editable Playground image/video prompt | R2: left tools in order Model/Render Options, compact Reference Options, native Prompt, quote/readiness/Generate; selected output and post-render tools on the right |
| `settings` | Guided forms, Produce/Shot sidebars, image dialogs, Look Sheets, Fashion | Compact selectors in the current settings region; caller retains prompt, references and action placement |
| `slot` | Repeated Comparison/model settings | Combined model chooser and relevant output controls in each existing slot; preserve slot controls and totals |

Batch dialogs with one shared engine use `settings`, not duplicated per-item
selectors. `slot` applies only when the existing workflow really has per-slot state.
Variants are chosen by the owner and available container width, not a user-facing
Simple/Advanced toggle. A narrow desktop sidebar behaves like a narrow container.

R2 desktop composer sketch (values are illustrative, not provider defaults):

```text
LEFT: creation tools                  RIGHT: selected output
[ Model + provider                 ]  [ Image / Video / Comparison          ]
[ Aspect ][ Duration ][ Resolution ]  [ Full media, contained in viewport    ]
[ Audio / Count ][ More            ]  [ Existing loading/status or result   ]
[ Reference options / thumbnails v ]  [                                      ]
[ Prompt                           ]  [ Existing primary output actions     ]
[ Native textarea                  ]  [ Additional output details/tools v   ]
[                                  ]  [ Queue / Recent outputs               ]
[ Readiness | Credits | Generate    ]
```

Settings sketch:

```text
Generation settings
[ Model and secondary provider label                  v ]
[ Aspect v ] [ Duration v ] [ Resolution v ] [ Audio ]
[ Additional options                                   v ]
Caller-owned references, quote and Generate action
```

No new hero, extra textarea, nested decorative cards or duplicated Generate
button. A generated/read-only prompt stays read-only. R2 explicitly relocates
Playground result, existing output actions, Queue and Recent to the right output
region; no third column precedes or competes with the tools. Other contexts retain
their established regions.

### R2 Layout And Interaction Rules

R2 UX implementation review explicitly extends the Playground entry-header scope:
keep breadcrumbs, title/icon, Image/Video switching and the separate Image/Look
Sheet choice. Place title and media switching in one compact wrapping row; remove
the duplicate eyebrow and generic instruction description for the editable Image/
Video workspace only. Guided Look Sheet headers remain unchanged. This intentional
relocation recovers authoring height in the actual application shell instead of
clipping Video option values or hiding Prompt behind a large page introduction.
Valid Video quotes appear once inside Generate's Credit badge, including the
usage-based maximum label. Pending/error/expired/insufficient status stays outside
the button. Playground Video hides unavailable Comparison commands through the
existing capability flag; enabled Comparison and other callers remain unchanged.

1. On desktop, use an approximately360-460px left tool panel and a flexible larger
   right result region. Validate actual container width before fixing a breakpoint;
   collapse to one column when two usable regions no longer fit. The820px portrait
   acceptance viewport uses the stacked layout. Theme spacing and typography remain
   shared and readable; do not shrink text to make a sidebar fit.
2. Model/Render Options are the first content in the left panel. Show the selected
   model/provider and the existing searchable chooser without scrolling or opening
   another section. Options keep their current capability-aware interactions.
3. Reference Options follow the engine. Keep the source mode, used/available count,
   Add/Change entry and compact selected thumbnails discoverable. Detailed upload,
   source selection and reference editing can expand through one labelled control.
   The default summary shows at most two thumbnail rows; additional references are
   represented by a count and remain reachable by expansion. Do not render the full
   source editors and a duplicate large summary above Prompt by default.
   Detailed editors start collapsed on initial entry, including a restored draft;
   selected references and their visible errors remain in the summary. While an
   editor is expanded, its collapse control remains reachable by mouse/keyboard.
4. The native Prompt is directly below that compact reference region, in the same
   panel as the engine and Generate. Preserve its content, character limit, negative
   prompt where applicable, copy functions and keyboard behavior. Model discovery
   must not require scrolling past the prompt or a result placeholder.
5. Keep one quote/readiness/Generate action group at the bottom of the tool panel.
   It can stick while the tool content scrolls, with enough scroll padding to reach
   the last field. No duplicate Generate, obstructed input, competing sticky footer
   or additional nested scroll region inside the reference editor. The option
   picker keeps its own bounded menu scrolling.
6. The right region holds the selected output at its top. Inspect the full image or
   video with `contain`, a stable media viewport and the existing expand/viewer
   command. Its empty state remains compact enough to leave the tool panel primary.
   Keep available output visible during subsequent work when the owner supports it.
7. Put existing frequent actions directly below the output, such as download,
   copy or use-next where available. Place infrequent metadata/technical details in
   expandable sections. Preserve all existing actions and role checks; do not add
   new export or approval behavior as part of layout work. Readiness/error/recovery
   messages and approval actions must remain discoverable without opening metadata.
8. Queue status and Recent follow the output/action region. Keep active job status
   visible without scrolling through history. Selecting a Recent result changes
   the inspected result through the existing owner; it does not silently overwrite
   the current prompt/options or start generation. Comparison results remain in
   the output region and cannot move above or displace Model on entry.
9. On mobile/stacked tablet, order the page as engine, compact references, prompt,
   action, result/actions, then Queue/Recent. Model remains visible in the initial
   viewport. The action respects safe areas and the on-screen keyboard. Use natural
   page scrolling; avoid a fixed-height tool panel inside the mobile page.
10. After a user-started generation, preserve existing progress navigation. On
    stacked layouts, bring the matching completed result into view once only if
    that user is still waiting in the same context and is not editing or navigating
    elsewhere. Otherwise announce completion and expose View result. Reconciliation,
    polling and background completions must not repeatedly scroll or steal focus.
    Provide a return-to-settings action with preserved input and focus context.
    Explicit View result targets a stable result region, not a media control that
    starts playback; return-to-settings targets the tool region or prior control
    only on user request. Background completion never focuses a textarea or opens
    the mobile keyboard. Scrolling respects reduced motion.

At1440x900, normal first entry with collapsed reference details must show the
selected model, primary options, Prompt entry and Generate without page scrolling.
At390x844 and820x1180, the model chooser and its current value must be visible at
scrollTop0 below normal app navigation. These measurements exclude an open picker,
on-screen keyboard and user-expanded detailed references; those states still need
reachable controls and no overlap. Long reference lists and existing results do
not change this initial content priority.
These entry checks cover ordinary route entry; an explicit link to a particular
output or active task retains its requested destination and return context.
On390x844, with default collapsed references, the Prompt label must be reachable
from page entry by scrolling no more than one viewport height, even at the model's
maximum supported reference count. Check both fresh and restored drafts, TH/EN
labels and a long model name. User-expanded editors may require more scrolling,
but retain their collapse control and the action group's unobstructed access.

## 3. Requirements

### GO01 Combined Model Selection

- Replace sequential Provider and Model inputs with one chooser. Each item emits
  the provider/model pair atomically through existing owner callbacks.
- Show the model's display name, secondary provider name, selected checkmark and
  only evidence-backed capability information. Provide searchable model names
  and providers when the list needs it; constrain menu height and scroll the list.
- Populate from the current authorized catalog. Hidden/unavailable providers are
  not promoted by the redesign. Explain incompatibility for an existing selection
  instead of presenting a blank or silently choosing another model.
- Preserve automatic routing where the owning workflow already supports it;
  do not introduce fictional Auto, Lite, Fast or Quality tiers.

### GO02 Compact Current Values

- Video order: model, aspect, duration, resolution, audio, additional options.
  Image order: model, aspect, supported resolution, output count, additional options.
- Use Lucide icons with readable selected values. Numeric/model values stay visible;
  tooltips supplement labels rather than carrying their only meaning.
- Aspect choices show orientation and ratio. Duration uses discrete choices when
  the catalog provides a set; use numeric/stepper control only for a real supported
  range. Audio uses a switch for a binary native-audio contract and a menu for
  genuinely multiple modes. Localize raw values such as `none` and `generated`.
- Show controls only when supported. Preserve a locked value as a readable summary
  with its reason, such as Project aspect or template output count.
- Image dimensions that are currently read-only move to output details. They
  must not look editable or promise exact pixels for aspect-only providers.

### GO03 Safe Selection Changes

- Retain valid values when changing a model. Resolve invalid optional values
  through existing capability/default owners and show a concise changed-value
  summary. Invalidate the previous quote immediately.
- Never silently discard references, reorder identity roles, unlock a Project
  constraint or truncate the user's prompt. Keep incompatible attachments visible
  and identify the item requiring attention.
- When no valid compatible choice exists, retain the draft and show the existing
  actionable readiness reason. A control change never submits Generation.
- Preserve current single/batch quote fingerprints and expiry checks. An in-flight
  estimate for previous values must not replace the estimate for current values.

### GO04 References Near Their Context

- Where references are editable, show an ordered thumbnail strip with role and
  character/name, add/change/remove commands and the supported slot count.
- Use clear role labels such as opening frame, closing frame, Character Look and
  environment. Do not expose raw array indices or payload modes as the primary UI.
- First/last-frame and reference modes appear only when supported and authorized.
  No attachment means prompt-only only where that owner already supports it.
- Keep shared/locked Scene/Shot references recognizable. Editing shared assets
  remains with the existing asset/character/environment action.
- Provider image errors highlight the exact affected thumbnail with a readable
  reason. Full-image inspection uses the existing authenticated viewer.
- In the R2 Playground collapsed summary, required/missing/rejected-reference
  status stays visible with a direct action to the affected editor. Expanding it
  retains reference order and focuses the chosen item; it does not change the
  reference plan, dismiss an issue by itself or submit Generation.

### GO05 Additional Options

- Use one compact More/Additional options entry for infrequent controls; no new
  authoring mode. Preserve all existing applicable caller-specific controls.
- Comparison entry may move into More, but active Comparison remains visible as
  a persistent selected state with its slots and aggregate quote accessible.
- Free legacy prompt refinement retains its green Free notice. Paid Look Sheet
  text enhancement retains its distinct charge and total; do not relabel it free.
- Staff-only technical prompts/diagnostics keep existing role checks. Required
  readiness errors and financial state are never hidden under More.

### GO06 Price And Action

- Keep one generation action and one primary quote summary per active form.
  Fixed quotes show total Credits; usage-based video shows the confirmed maximum
  as 'Up to N Credits'. The exact calculation and mode come from Credits.
- During quote refresh, show the shared yellow processing indicator, mark the
  quote pending and prevent submission with stale amounts. Error, expiry and
  insufficient balance stay readable beside the action with the existing remedy.
- Batch and Comparison retain reviewed item/slot count, exclusions and full total.
  Never substitute a single-item price for the aggregate.
- Keep existing Credit confirmation, mandatory bulk confirmation and profile
  preference for individual confirmations. No new consent screen or opt-out.
- Existing progress, completed outputs, failure/refund/reconciliation and recovery
  behavior survive layout changes. An uncertain task is not an automatic retry.

### GO07 Defaults And Persistence

- Preserve each canonical owner's existing selection precedence, explicit handoffs,
  saved context and locked constraints. Document that precedence in T01.
- This presentation rollout introduces no persistence, remembered-field or
  precedence changes. Any such change requires a separately scoped requirement
  with versioned contracts and actor-switch checks; do not add a localStorage key
  or provider/quote cache as part of this redesign.
- Presentation defaults belong to shared UI configuration/tokens. Provider limits,
  supported combinations, pricing and creative defaults remain server-owned.

### GO08 Responsive And Accessible Interaction

- At1440px and820px, wrap toolbar groups without shrinking labels into unreadable
  text. At390px, allow a compact two-row arrangement and a single-column picker or
  bottom sheet. Mobile presentation uses the same controlled selection state.
- Determine density from the container as well as the viewport. One narrow modal
  cannot inherit a six-control desktop row simply because the screen is wide.
- Popovers stay within viewport/dialog boundaries and do not get clipped by an
  overflow container. Closing the picker restores focus to its trigger; Escape
  closes the topmost layer first. Provide arrow-key selection and selected state.
- Use the appropriate combobox/listbox or radio semantics, accessible names and
  announced selection. Desktop non-modal pickers allow normal Tab exit; modal
  mobile sheets contain focus until closed and restore it to their trigger.
- Touch targets should be at least44px; interactive desktop controls at least36px,
  with the existing primary action minimum40px. Preserve stable control dimensions.
- Sticky action areas account for the app footer, safe area and mobile keyboard.
  No input/reference may be covered or become unreachable.
- Use Momelo theme tokens, neutral borders, radius no more than8px, readable
  contrast and restrained selected states. Yellow emphasizes Generate/pricing;
  green identifies free services. Do not rely on color alone.
- Normal text contrast must reach 4.5:1; essential control boundaries, selected
  indicators and focus indicators must reach 3:1 against adjacent colors.
- Use current fonts, zero letter spacing and fixed readable type sizes. New labels
  use react-i18next; enabled TH/EN keys and interpolation variables remain aligned.
- Respect reduced motion and use ProcessingSpinner for processing states.

## 4. Screen States

| State | Required presentation and behavior |
| --- | --- |
| Catalog loading | Stable control footprint with localized processing; keep existing work visible |
| Empty/unauthorized/incompatible catalog | Specific available action/reason; no fake model or Generate |
| Valid draft, quote pending | Current values visible; pending price; Generate waits |
| Quote error/expired/insufficient balance | Inline reason and existing retry/refresh/top-up action |
| Model invalidates output/reference | Changed-value notice or affected reference error; retain authoring work |
| Generating | Existing job status and duplicate prevention; accepted request remains immutable |
| Completed | Preserve result, selection, download, approval and further-attempt actions |
| Failed/refunded/reconciliation | Existing localized task and Credit status; no automatic resubmission |
| Read-only/locked/pending approval | Display effective values and the owning reason/action |
| Actor switch/navigation return | Existing actor isolation, draft recovery and parent focus behavior |

## 5. Ownership And Readiness

Extend `VideoEngineTargetPanel`, `EngineTargetPanel`, `ComparisonConfigurator`,
`EngineTargetPanelFrame` and their existing workspace composition contracts.
A focused shared model chooser is implemented as `GenerationModelPicker`, with
`GenerationOptionSelect` for capability fields. Reuse these controls. Do not build a universal component
that owns prompts, references, Credits, Jobs and every workflow flag.

The [inventory](generation-options-ux/001-screen-inventory.md) maps17 live contexts
and explicitly identifies two prototype/unconsumed surfaces. Each live row needs
its own acceptance evidence. Shared component tests alone do not close the rollout.

R1 implementation/evidence stays recorded as history. R2 proceeds through GO-T14
to GO-T18 in the linked plan only after the next implementation instruction.
The new layout has no runtime verification yet; evidence and remaining gaps belong
in the verification document.
