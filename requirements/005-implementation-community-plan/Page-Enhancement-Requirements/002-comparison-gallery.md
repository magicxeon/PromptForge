# 002 Public Comparison Gallery Enhancement

Status: Proposed

Route: `/explore/comparisons`

Owner: Community owns the public snapshot and discovery view; Comparisons owns private sets/runs at `/comparisons`

Visual source: `../Page-Enhancement-resources/002-momelo-comparison-gallery-ux-ui-spec.md` and `../Page-Enhancement-resources/002-momelo-comparison-gallery-ux-ui-spec-concept.png`

## 1. User Outcome

ผู้ใช้ต้องเปรียบเทียบผลลัพธ์ที่เผยแพร่แล้วได้เร็ว เห็น prompt context ที่อนุญาต รุ่นโมเดล metadata ที่จำเป็น และผลโหวตที่มีหลักฐาน โดยไม่สับสนกับ My Comparisons หรือคิดว่า sample คือ benchmark จริง

## 2. Public And Private Boundary

- `/explore/comparisons` reads only Community posts of type `comparison`
- `/comparisons` remains actor-owned history/workspace and keeps its current API
- Public cards link to `/posts/:postId`; they do not deep-link into another actor's private comparison set
- Public data comes from `comparisonSnapshot` after ownership, visibility and sanitization policy
- Private source prompts, references, raw provider payloads and internal actor IDs must never be added to the public projection for this redesign

## 3. Page Structure

1. Comparison-specific hero with a concise explanation and existing comparison creation destination
2. Featured public comparison when a real eligible post exists
3. Shared toolbar restricted to comparison-relevant search, period and sort choices
4. Public comparison card grid
5. Compact `How comparison works` or tutorial mock block
6. Model leaderboard, release news, use-case recommendations and model reviews are excluded from the live-data first delivery

## 4. Comparison Card Contract

A `PublicComparisonCard` may show:

- Shared prompt preview only when the public snapshot authorizes it
- Two or more sanitized result thumbnails in stable slots
- Provider/model display names for each slot
- Generation duration, aspect ratio, resolution and output format only when present
- Public vote/winner state only from the existing engagement/snapshot contract
- Creator identity and published timestamp
- `Open comparison` action to the public post

If slots have different prompt/configuration and the existing snapshot cannot prove parity, do not label the comparison `Same prompt`, `Fair` or `Controlled`.

## 5. Inspection Behavior

- The first delivery uses existing media viewer behavior where available
- Zoom/fullscreen controls use familiar Lucide icons with tooltips and accessible names
- Synchronized zoom, blind mode, side-by-side drag alignment and score overlays are not implied by static mockups
- Missing media remains a visible slot-level error rather than collapsing slot order
- Winner labels are absent when no authoritative result exists

## 6. States

| State | Required presentation |
|---|---|
| Loading | Preserve slot/card geometry |
| No public comparisons | Link to existing comparison creation flow; do not show private sets |
| Partial slot failure | Keep model label and error state in the affected slot |
| No winner | Neutral `No result yet` state, not a default winner |
| Redacted prompt | Hide prompt content and preserve the rest of the card |
| API failure | Focused retry without losing route controls |

## 7. Detailed Tasks

- `CMP-01` Freeze public/private route and schema boundaries with tests
- `CMP-02` Add Comparison Gallery route mode and page-specific hero
- `CMP-03` Implement `PublicComparisonCard` using only public snapshot fields
- `CMP-04` Reuse current media viewer/thumbnail behavior where contracts match
- `CMP-05` Map optional generation metadata without placeholders that resemble real values
- `CMP-06` Preserve vote/winner semantics from the server response
- `CMP-07` Add empty, redacted and partial-slot states
- `CMP-08` Add tutorial/sample configuration with explicit `Sample` labelling
- `CMP-09` Add English/Thai copy and accessibility names
- `CMP-10` Run public detail and private Comparison regression tests separately

## 8. Acceptance Criteria

1. Public and private Comparison routes cannot be confused by labels, links or data source
2. Every public slot preserves provider/model association and media order
3. The UI never claims fairness, winner or score without authoritative data
4. Missing one image does not remove or reorder other slots
5. Existing `/comparisons` and `/comparisons/:setId` workflows remain unchanged
6. Long provider/model names and three-or-more-slot comparisons do not overlap controls

## 9. Focused Validation

- Community comparison snapshot schema test
- Public comparison card tests for two slots, many slots, missing media and no winner
- Route test proving `/explore/comparisons` uses Community API and `/comparisons` uses private Comparison API
- Existing `ComparisonThumbnailGrid` and `ComparisonWorkspace` tests
- One route-specific Playwright spec at 390px, 820px and 1440px

## 10. Pending

- Model leaderboard and benchmark methodology
- Blind voting and synchronized zoom
- Weighted scoring, confidence intervals and reviewer reputation
- Model releases and use-case recommendation data
- Public model review persistence
- Any aggregate price/performance claim
