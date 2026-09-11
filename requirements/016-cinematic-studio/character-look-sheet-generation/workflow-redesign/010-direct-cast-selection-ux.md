# Cast Selection UX

Status: implemented; UI/type and responsive browser checks passed 2026-09-10.
Scope: Cast add/replace source selection and sheet dossier only.

1. At the Cast selection entry expose mutually exclusive Character and Generated
   Look Sheet sources. Existing Character picker remains unchanged after choosing
   Character. Generated sheet selection is not hidden under Wardrobe.
2. Reuse Generation's actor-scoped, paginated eligible-image listing and existing
   whole-sheet preview. Show model, expiry, cast name, one review confirmation
   and the primary assign action. Retain error/retry/empty/loading states.
3. Selected sheet's dossier shows full image, name and expiry; retain project
   Direction, role, replacement/removal and continuity tabs. Hide Character-only
   Wardrobe actions for this source, and identify the source honestly.
4. Remove Generated sheet from CharacterLookDialog and Cast Wardrobe commands.
   Preserve ordinary Upload/AI/complete uploaded sheet and legacy approved Looks.
5. Existing Momelo tokens, shared dialogs/buttons/yellow ProcessingSpinner and
   EN/TH translations. No signed URL or Base64 client persistence. Keyboard
   focus/Escape and pending-submit prevention must work. Verify 390/820/1440px.

Evidence: GeneratedCastDialog and shared GeneratedLookSourceField focused tests;
full CharacterLookDialog and Cinematic binding regressions. Browser runner
verified EN/TH at 390, 820 and 1440px with intercepted APIs, real Cast domain
assignment, a local multi-view sheet and no paid Generation. Selection, name,
confirmation, assignment, replacement entry, Escape, loading/empty/error and
full-sheet contain preview passed without horizontal page overflow. Existing
Character selection and ordinary Look actions were retained. Live backend and
provider UAT are not claimed by these intercepted-browser checks.
