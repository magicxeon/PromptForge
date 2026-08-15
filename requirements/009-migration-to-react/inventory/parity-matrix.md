# Migration Parity Matrix

Status values: `baseline`, `building`, `react-ready`, `cutover`, `observing`,
`retired`.

| Workflow ID | Current evidence | React phase | Critical parity | Status |
|---|---|---:|---|---|
| `COMMUNITY_DISCOVER` | React feed + Community tests | 005 | filters, types, cursor, actor | cutover |
| `COMMUNITY_POST_DETAIL` | React route + public schemas | 005 | media, prompt policy, back context | cutover |
| `COMMUNITY_ENGAGE` | Shared React controls + service tests | 005 | like/save/comment/report/vote | cutover |
| `CREATOR_PROFILE_VIEW` | React profile routes + profile tests | 006 | owner/public/tabs/follow | cutover |
| `CHARACTER_CREATE` | React dialog/Studio + lifecycle tests | 006/010 | type, version, casting | cutover |
| `CHARACTER_SHARE` | React owner controls + sharing tests | 006 | privacy/reuse/public media | cutover |
| `CHARACTER_HANDOFF` | Actor-bound React envelopes | 006 | version/permission/destination | cutover |
| `FASHION_BLUEPRINT` | React route + quote/run/credit tests | 007 | template/model/outfit/quote/run | cutover |
| `HISTORY_MANAGE` | React list/detail + repository tests | 008 | actor/list/detail/delete | cutover |
| `COLLECTION_MANAGE` | React routes/picker + collection tests | 008 | CRUD/membership/default | cutover |
| `COMPARISON_GENERATE` | Shared React workspace + credit tests | 008/009 | slots/estimate/results/winner | cutover |
| `FREEFORM_GENERATE` | Shared GenerationExperience + API tests | 009 | prompt/refs/credit/job/result | cutover |
| `PROMPT_COMPOSER` | React proposal control + mapper tests | 009 | proposal accept/cancel/manual fallback | cutover |
| `GUIDED_HEADSHOT` | React Studio + attribute/payload tests | 010 | options/prompt/reference/result | cutover |
| `CHARACTER_SHEET` | React Studio + casting tests | 010 | body/clothing/type/casting | cutover |
| `SCENE_AUTHOR_GUIDED` | React Scene + Scene fixtures | 011 | structured prompt/refs | cutover |
| `SCENE_AUTHOR_MANUAL` | React Scene + actor draft | 011 | mode switch/manual text | cutover |
| `SCENE_TEMPLATE_REMIX` | React template handoff + privacy tests | 011 | variables/privacy/handoff | cutover |
| `ADMIN_SUPPORT` | React role gate + admin tests | 008 | role/audit/adjust/moderate | cutover |

All rows are runtime-cutover. They remain pending final desktop/mobile visual
approval and the single migration validation batch before entering `observing`.
