# Reusable UI Migration Map

| Capability | Legacy owner | React target |
|---|---|---|
| App shell/navigation/breadcrumb | `client/shell/` | `components/layout/AppShell`, `Breadcrumbs`, `ContextBackLink` |
| Dialog/confirm/prompt | `client/app-dialog.js` | `components/ui` Radix primitives |
| Media cards/grid/stage | Community/Profile/History | `components/media` |
| Public media detail | `communityPhotoViewer.js` | `features/community/CommunityPostRoute` + `components/media` |
| Engagement/comments/share/report | `client/community/` | `components/community` |
| Creator/Profile sections | creator profile modules | `components/profile` |
| Character cards/picker | Character/Profile/Community | `components/profile` |
| Comparison summary/workspace | `client/comparisons/` | `components/comparisons/ComparisonWorkspace` |
| Prompt Editor | `generation-controls/promptEditor.js` | `components/generation` |
| Reference slots | `referenceSlotManager.js` | `components/generation` |
| Engine/Target/Comparison | `engineTargetComparisonPanel.js` | `components/generation` |
| Credit estimate/action/results | generation controls | `components/generation/GenerationExperience` |
| Visual option cards/carousel | `visualOptionControls.js` | `components/visual-options` |
| Loading/empty/error | scattered | `components/ui` |
| Collection assignment | legacy dialogs | `components/collections/CollectionPickerDialog` |
| Character cards/profile creation | legacy profile modules | `components/profiles` |
| Actor-scoped draft storage | route-local browser keys | `lib/persistence/actorScopedStorage` |
| Cross-workflow handoff | route-local session keys | `lib/persistence/handoffStorage` |
| Feature exposure | legacy global feature service | `lib/permissions/FeaturePolicyProvider` |

`ContextBackLink` and card-produced return state are shared by Community,
Creator, Character, History, Collection and Comparison routes. Detail features
must not reintroduce raw `navigate(-1)` behavior.

## Reuse Rule

Shared components receive typed data, capabilities and callbacks. Feature
containers own API/query/workflow state. No shared presentation component calls
AI providers, mutates credits or infers authorization.
