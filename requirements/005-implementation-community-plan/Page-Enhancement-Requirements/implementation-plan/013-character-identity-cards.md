# CDI-01 Identity Cards And Effective Availability

Status: Implemented, 9 focused tests passed (cards, projection, portrait and shared CharacterCard). Parent: `../010-character-discovery-identity-master.md`.

1. Add Profiles `components/characterDiscoveryModel.ts` for media selection,
   exact allowed destinations, public image-moment selection and localized-use
   mapping keys. No provider/capability catalog duplication.
2. Add `CharacterPortrait.tsx` to reuse public media/fallback behavior in avatar,
   spotlight and result contexts. Reset failures when URL changes; fixed bounds.
3. Extend discovery-only CharacterDiscoveryCard with a spotlight variant. Share
   name/personality/tags/creator/statistics and effective availability; leave
   shared `components/profiles/CharacterCard.tsx` untouched.
4. Add controlled Create action slot for the later handoff step; hide until that
   contract is supplied and allowed. Detail/creator links preserve route context.
5. Scope horizontal two-column cards and responsive states to character-gallery.css.
6. Add EN/TH keys in existing character-profiles namespace; do not translate
   authored personality text. Known intended-use enum labels are localized.
7. Test available/view-only/unknown destinations, missing portrait/personality,
   media change, counts and private-field non-display before proceeding.

Run: `node scripts/test-character-discovery.mjs --part=cards` (created in this step).
No paid provider or whole-repo tests. Record result in parent before CDI-02.
