# Derived Sharing UI

Parent: 019. Status: Implemented; component and responsive fixture gates passed.
Owner: ShareGeneratedDialog and Community share API Zod boundary.
Visual reference: user screenshot of Share to Community with reusable checkbox.

- Use server eligibility to omit the entire reusable checkbox/settings panel.
- Submit publishAsTemplate=false when ineligible, even if stale local toggle
  state was true. Do not send hidden replacement settings.
- Hide Prompt visibility entirely for derived images; submit private. Preserve
  ordinary title/description, post visibility, share loading/error and Publish.
- Existing source-image sharing keeps its current controls and defaults.
- Reuse existing Made with Template preview/detail links for public origins and
  sorted creation lists. Missing/private origins must not become public links.
- No new layout redesign, thumbnail rule or reference payload changes.
- EN/TH, mobile/tablet/desktop fixture verification. No live publish/generation.

Tests: derived panel absent, normal panel present, no hidden field submissions,
private source cannot select full prompt, successful image share, safe attribution.

All derived sources, even full-prompt originals, follow the same private rule.
Requirement 022 also disables the common Share trigger for already-shared images.
