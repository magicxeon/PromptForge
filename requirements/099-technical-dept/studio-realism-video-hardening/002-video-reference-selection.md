# 002 Video Generated Images And Reference Alternatives

Owner: Playground -> VideoGenerationApplicationService -> internal
PlaygroundVideoReferenceService. Status: implemented; contract/UI/layout checks passed.
Amends requirements/016-cinematic-studio/playground-video-reference-poc/001-002.

## Contract And Tasks

1. Nonrestricted Start from image: add Choose generated image, using actor-scoped
   paginated History. All image providers are allowed; no Seedream filter or
   trusted expiry rule. Only owned available image outputs can be submitted.
2. Resolve original image server-side, match authoritative History URL, reject
   deleted/hidden-template output, missing bytes, invalid dimensions or MIME.
   Never trust arbitrary client URL, path or ownership. Recheck at quote/submit.
   Newly selected History/Character originals use bounded verified image bytes
   encoded for the existing adapter, not an invented Storyboard approval or an
   Asset Library registration. Existing uploaded/pinned Look transport remains.
3. Character/reference mode: optional scene first; exactly one identity source:
   selected approved Character OR Look Sheet. Selecting a Character clears Look;
   choosing a Look clears Character. No auto-selection of an approved Look when
   choosing Character. Resolve Character through its canonical usage authority,
   never its decorative community preview. Preserve public reuse authorization.
4. Preserve old pinned Look payloads as Look selection with Character attribution,
   not a second Character reference. Reject explicit Character+Look references.
5. Keep provider limits/input modes/ordering and quote fingerprint authoritative.
   Text-only and first-frame requests must not send hidden identity inputs.
6. Seedance trusted-only picker and validation unchanged. Other providers retain
   uploads; generated-image picker adds an alternative, not a new generation path.
7. Verify server ownership/alternatives, UI replacement/removal, actor isolation,
   pagination/errors, existing Seedance tests, and 390/820/1440px layout.

No provider capability expansion. No paid generation or changes to Credit rates.
