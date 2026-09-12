# Series Setup And Chapter Navigation

Status: implemented; isolated UI/browser checks passed. Final evidence: plan 028.
Scope: workspace header strip and Series manager only. Preserve sibling Setup,
Cast, Story Plan, Storyboard, Produce, Finish, recovery and Engine interactions.

1. Saved standalone Setup exposes `Create series`. Unsaved film uses the existing
   save/create flow first; no second new-film wizard. Series members show compact
   Series title, Season and Chapter selectors plus Manage at all stages. Setup
   is the entry point for turning a standalone film into a Series.
2. Manage dialog uses existing Radix Dialog, ThemeSelect, Button, status and
   ProcessingSpinner. Add/rename Season, rename Series, add Chapter with title,
   story brief and explicit Cast/Look snapshot checkbox. Keep forms distinct and
   use icons, labelled inputs, theme tokens, max 8px radius and no nested cards.
3. Changing Season alone does not navigate or mutate Project. Selecting Chapter
   opens its existing project route at its saved stage. Current Chapter remains
   explicit; empty Season presents Add Chapter. Query keys include actor/project.
4. Flush pending Setup edits through the existing serialized mutation chain
   before attaching/creating/switching Chapter. If offline or save fails, stay on
   current Chapter with recoverable draft and actionable error. Do not bypass
   existing dirty-work protection. Unsaved stage-specific dialogs stay unchanged.
5. Disable duplicate submits and in-flight navigation. On success update owning
   Project cache/version, invalidate Series and Project lists. On version conflict
   refetch metadata and keep typed form input for retry. No persistent new browser
   state, polling, private media preview cache or shared AI compiler.
6. Compact hierarchy and keyboard focus; responsive 390/820/1440, EN/TH, default,
   fashion and creative. Long names wrap without hiding selectors/actions. Show
   concise selected position in project cards without replacing existing list.
7. Stage processing uses existing shared spinner. Cancel closes only the manager;
   no source image clearing, generation cancellation or data deletion.

Acceptance: create Series in Setup; add Season/Chapter; independently switch and
reload; show add form for empty Season; retain typed input on API errors; verify
no duplicate requests, actor separation and untouched setup/storyboard controls.
