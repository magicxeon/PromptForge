# Editorial Pattern And Compatibility

Status: authorized. Supersedes v1's no-text/no-expression/no-wardrobe instructions
for NEW document Look Sheets only. Definitions retain schemaVersion 1.

## L1: Versioned Composition

Add `document-sheet.v2.json` in the existing Character Looks recipe folder.
Keep v1 intact for historical evidence. The active preset version becomes 2.
New snapshots retain recipe fingerprint plus orientation layoutId and generated
text policy, so stale Enhancement artifacts and estimates cannot cross the change.
React accepts preset/snapshot versions 1 and 2 for rolling deployments/history.

Required common sections in order:
1. Header: character name prominently; age (or approved range), role and personality.
2. Identity Views: FRONT, 3/4 VIEW, SIDE, BACK, plus a large PORTRAIT.
3. EXPRESSIONS: NEUTRAL, THINKING, TIRED BUT SMILING, HOPEFUL.
4. HAIR & DETAILS: front/back hair and relevant outfit/prop closeups.
5. WARDROBE & PROPS: individual items actually worn/carried; no invented equipment.
6. COLOR PALETTE: restrained swatches from the same outfit, with captions.
7. CHARACTER NOTES: short readable prose grounded in all supplied character fields.

The LALIN reference sets layout/style, not identity: never copy its name, age,
occupation, clothing or gender into another user's character. Apply an ivory paper
editorial surface, dark serif headings, small readable captions, thin rules and
muted accents from the outfit. No generated Momelo watermark or decorative slogans.
The illustrative reference does not override selected artistic intent or realism.

Portrait: header ~10%; identity/portrait band ~40%, split 65:35; lower half
left expressions then wardrobe, right details then palette then notes.
Square: same hierarchy with compact header, identity band and two-column lower band.
Landscape: header across top; body in three columns (identity 45%, portrait and
expressions 25%, details/wardrobe/palette/notes 30%). Auto uses portrait recipe.
Never ask the model to improvise arbitrary section order. Scale within the chosen
canvas without cropping feet, squashing faces, overlapping captions or missing sections.

Preserve exact name and age; summarize lengthy descriptive prose rather than
printing JSON or cramming a whole prompt into captions. Keep supplied language
for names and descriptions. Notes cannot invent a biography or replace identity.
Enhancement preserves all sections, literal labels and descriptions as authority.

## L2: Download And Migration

For preset v2 the generated sheet already includes header and notes. Download
keeps the full image and adds only the existing logo/footer, avoiding a duplicate
name/age/header. Preserve v1's deterministic export heading behavior.
Dispatch by persisted presetVersion, not whichever recipe is currently active.
Unknown future versions must not silently use the wrong renderer.

No original images, private references or historical JSON rewritten. Current
generation snapshot remains the authorized source. No guessed per-panel crop.
Rollback switches the active recipe to v1 while preserving v2 read/export support.
