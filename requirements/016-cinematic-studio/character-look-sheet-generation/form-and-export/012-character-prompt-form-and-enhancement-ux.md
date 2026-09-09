# Character Prompt Form And Enhancement UX

ID: ME-UX. Status: implemented; EN/TH responsive fixture verification passed. Parent: [011](011-momelo-enhancement-master.md).
Owners: shared CharacterLookSheetForm; Profiles adapter; Generation display slots.

## Layout

Preserve Image/Video and General image/Character Look Sheet navigation at
`/create/playground?imageMode=look-sheet`. Do not add a sidebar item or landing page.

1. Identity: name and age share a desktop row; optional existing Character picker
   and selected preview belong with identity. Approved age remains read-only.
2. **Character Prompt**: rename the appearance label; full-width, visually primary
   textarea, 8-10 rows with 220px desktop/180px mobile minimum height and vertical
   resize. Soft theme surface, clear Cyan accent/focus, restrained Momelo gradient
   only on the section accent; no decorative nested cards or oversized heading.
3. **Momelo Enhancement**: switch with Lucide sparkle icon; price/status and explicit
   Enhance prompt command immediately associated with this main prompt.
4. Role/situation, outfit and personality: compact secondary fields. All still
   visible/reachable; do not silently omit them from the AI payload. Preserve outfit lock.
5. Read-only prompt review: Original / Enhanced segmented views after success.
   Form remains the only editable source. No second independent editable final prompt.

Name/age/situation requirements stay unchanged. Extend appearance to 2,000 Unicode
code points on client and server with counter and localized validation; do not
silently truncate old drafts or confuse UTF-16 maxLength with code-point limits.
Review the total UTF-8 request cap alongside this change (013/015), not only rows.

## User Flow

Fill form -> optionally enable Momelo Enhancement -> review the server-priced
enhancement quote -> explicitly click Enhance prompt -> reserved/processing ->
inspect Enhanced prompt -> review separate image quote -> Generate image.

Toggle ON alone is NOT spending consent or a provider call. Typing only invalidates
the quote/result; never auto-rewrite on change, blur, reload or mode switch.
The Enhance action shows the charge or maximum charge returned by Credits before
submission. Image generation never repeats a completed paid enhancement.

When enabled, Generate is blocked until a matching successful artifact is selected.
Users can turn it OFF to use the original prompt through ordinary generation.
Do not silently switch to original while presenting an enhanced result.
Keep accepted image Job/result/export areas and engine controls in their current
positions; read-only reference state and provider selection remain intact.

## States

| State | UI and permitted action |
|---|---|
| OFF | Original preview; normal image estimate/Generate; no text call |
| Incomplete/identity unresolved | Inline relevant errors; no paid estimate/execute |
| Quote loading | Stable price area; Enhance disabled; source text preserved |
| No active rate/provider disabled | Explicit unavailable state; no free fallback or guessed fee |
| Priced and ready | Enabled explicit Enhance action with configured cost |
| Expired quote | Refresh quote; renewed amount must be reviewed before spending |
| Reserved/processing | Busy state; duplicate action disabled; no automatic retry |
| Success/current | Enhanced review selectable, image estimate can be obtained |
| Success/stale | Previous result labeled stale; source edits retained; re-enhance requires new consent |
| Failure/refund pending | Safe error and settlement status; retry only after operation is resolved |
| Actor/mode changed | Late response cannot replace current draft or display another actor's text |

Changing image engine does not automatically buy another text rewrite. Reuse is
allowed only when provider-specific prompt constraints remain compatible (015).
Cancel before acceptance is free; after acceptance, closing a panel is not a
refund promise. A successfully delivered enhancement is billed even if not used.

## Design And Accessibility

Use existing Button, Toggle/Switch, loading and quote components. If the existing
Generation extension points cannot express placement, add a narrow controlled slot,
not a duplicate engine/Generate workflow. Keep shared form free of API calls.
Use theme tokens, rounded corners <=8px, stable action dimensions, descriptive
labels and keyboard focus. Accent treatment differs from secondary form fields.
Do not display the internal recipe or a marketing explanation of a "secret formula";
Momelo Enhancement is its product name, not a secrecy or image-quality guarantee.
All new labels/states/errors in react-i18next EN/TH with key/interpolation parity.

Verify 390/820/1440, three themes, long Thai input and maximum-length fields.
No overlap with quote, Character picker, result or Generate. Preserve draft,
engine controls, image history and Download on both shared-form entry surfaces.

Acceptance: users identify where to describe the Character; all form data remains
available; no AI spend from a switch/keystroke; source and enhanced views are clearly
different; unavailable/insufficient-credit states never expose a clickable paid action.
