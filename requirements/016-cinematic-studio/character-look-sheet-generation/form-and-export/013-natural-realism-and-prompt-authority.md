# Natural Realism And Prompt Authority

ID: ME-PROMPT. Status: implemented guards; paid semantic/visual UAT pending. Parent: [011](011-momelo-enhancement-master.md).
Owners: Character Profiles definition policy and Generation canonical compilation.

## Complete Input

Normalize and snapshot ALL fields: name, explicit or approved age/range, appearance,
role/situation, outfit, personality, including resolved defaults. Include pinned
Character/version, authorized identity metadata, outfit preservation, reference
roles, one-image/five-view recipe/version, aspect ratio and applicable style.
Do not replace a range with a fabricated exact age. Standalone age stays required.
Character rights and references must be authorized before sending descriptive text.
No private image Base64, signed URLs, hidden Template prompt or unrelated profile data
is sent to a text-only provider. Reference identity comes from existing authorized
context, not new image analysis. This operation must not need another image generation.

The AI input is the complete structured brief plus canonical constraints, not just
the appearance textarea. Every non-empty/default field must survive in the accepted
authority snapshot. Form values are data, not instructions to override system rules.

## Realism Recipe

Reuse the Studio Natural Realism recipe/loader and add a Look Sheet application
policy if necessary, not a copied competing recipe inside a React module.
Apply once for this opt-in workflow; leave ordinary Playground and Studio scope unchanged.
Pin recipe ID/version/fingerprint to quote, operation and generation evidence.

- Portrait area: restrained skin tonal variation, eyes/lips and hair detail appropriate
  to the stated age; avoid plastic smoothing and artificial oversharpening.
- Full-body areas: coherent anatomy, fabric/material response and contact shadows;
  do not force magnified pores or mature facial detail into distant views.
- Preserve skin tone, gender, ethnicity, age, distinctive features, approved outfit
  and intended style. Do not inject wrinkles, scars, grey hair, beauty ratings,
  different body shape or a default adult/female identity from guideline examples.
- Preserve stylized/anime intent when explicitly requested; realism must not silently
  turn it into photography or override Character identity.
- Keep front/three-quarter/side/back plus portrait in one sheet. Do not paste the
  Portrait-only "no side view" clauses into this multi-view composition.
- Plain sheet background and no generated typography/logo remain authoritative.
  Role/situation informs the Character; it does not add a first scene or extra person.

## AI Rewrite And Validation

Implementation evidence: structured output requires source fingerprint, six-field
coverage and a bounded rewrite. Explicit age/gender and multi-person/document
contradictions are rejected. These guards are not a semantic proof; the complete
accepted canonical brief/approved identity is retained as the highest-priority
block. The same Natural Realism loader supplies the final photographic directives.
Quality drift expressed through synonyms or implied attributes still needs live
UAT. Do not claim that regex guards or provider coverage alone guarantee identity.

Extend the existing PromptRefinementService/OpenAITextProvider boundary with a
Look Sheet task contract. Use configured model, timeout and availability policy;
never expose API keys or allow the client to select an arbitrary text model.
Do not mutate old best-effort refinement behavior outside this new task.

Prefer a bounded structured response containing the rewritten description and
field-coverage/authority evidence. Validate schema, lengths and forbidden authority
changes. Provider self-reported coverage is not proof that a field was preserved.
The deterministic compiler must retain the full immutable input/identity/layout
block as authoritative and attach only validated compatible AI wording. Reject
contradictory or unparseable output rather than charge for a silent deterministic
fallback. After refinement, reapply identity, layout and realism exactly once.

Do not attempt semantic completeness with substring checks alone. Add fixtures
where the provider omits outfit, changes age/gender, invents another person or
rewrites layout. A conservative rejection is preferable to accepting changed identity.
Visual age/identity consistency is still probabilistic and needs separate paid UAT;
passing a prompt contract is not a guarantee of provider image accuracy.

On failed/invalid/refused rewrite, leave original form unchanged, report failure,
and follow 014 settlement. Do not feed a failed candidate to image generation.
Normal user preview exposes their effective prompt, not hidden provider system
instructions; brand naming does not establish IP protection or confidentiality.

## Acceptance

- All six form fields/defaults are traceable into provider input and accepted snapshot.
- Approved identity/age/outfit precedence is enforced server-side before/after AI.
- ON/OFF and Studio compatibility avoid duplicated or leaked realism directives.
- No conflicting portrait-only instructions or extra output images enter the sheet.
- Malformed, contradictory or oversized AI results fail without replacing source.
- Provider response IDs/usage/fingerprints are recorded without raw prompt logging
  in production. Input/response byte and token bounds are explicitly tested.
