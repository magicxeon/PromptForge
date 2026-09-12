# Playground Preferences And Attachments

Owner: existing Playground UI preferences, video draft and shared source component.
Remember Image/Video per actor. Explicit media/deep-link intent overrides preference;
disabled Video falls back to Image without overwriting remembered choice. Switching
actors never inherits another actor's preference. Preserve compare/Look Sheet links.
Default audio to generated when model supports it, preserve explicit user choice.
Unsupported audio never appears in quote/submit; changing model must not silently
overwrite stored intent. Apply same default rule to Cinematic video preferences.
Attachments keep existing pick/upload/replace/remove/name behavior. Place remove
icon in header, stable contained preview, responsive buttons, no raw role code.
Do not affect unrelated generation or Character Look Sheet layout without need.
Focused preference/source tests and one responsive fixture group, no paid calls.
Status: implemented; preferences and six responsive attachment fixtures passed.

## Tasks And Scope

1. Done: extend existing actor-scoped UI preference with mediaMode. Tab clicks
   persist the choice; explicit URLs still take priority. Actor changes select
   the incoming actor's preference rather than inheriting the current tab.
2. Done: generated audio is the default where supported in Playground and Produce.
   New explicit audioPreference preserves a subsequent silent choice across models.
   Legacy Playground audioMode without a preference marker was an effective value,
   not distinguishable from the former default; it adopts the new generated default.
   Models lacking audio remain silent. Produce derives audio before quote, avoiding
   a transient unsupported-audio estimate.
3. Done: existing source component owns named-image input, stable contain preview,
   header remove icon and responsive picker/upload commands. Shared spinner on upload;
   upload failures preserve the previous image. Attachment type labels are localized.
4. Passed: actor preference tests; EN/TH attachments at 390/820/1440, no overflow,
   clipped controls or failed images. Full-workspace existing source picker fixture
   exercises replacing an image. Final responsive rerun recorded in the master.
