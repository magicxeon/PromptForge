# 005 - Meta Muse Fashion Studio Qualification And Routing

Status: Proposed  
Depends on: Requirements 001-004

## 1. Purpose

Evaluate Meta Muse for Fashion Studio without treating general text-to-image
availability as proof that it can preserve Character, Outfit, Template pose,
and scene authority.

## 2. Hard Eligibility Gate

Fashion Studio may list or route to `meta-muse/muse-image-1.0` only when:

1. Meta supports the reference operation required by Fashion composition;
2. verified reference limits can carry the locked reference plan;
3. the adapter preserves reference role/order and does not flatten authority;
4. the model has a published pricing record;
5. `server/config/fashion-model-qualifications.json` contains an enabled,
   versioned `fashion_final_composition` qualification;
6. Fashion quote and submitted request resolve the same provider/model,
   resolution, ratio, reference count, and operation.

If Meta Muse remains text-to-image only, it is not eligible for current Fashion
final composition and must remain absent from Fashion Studio.

## 3. Qualification Scenario

Use one Fashion-ready Template, the same approved three-view Character with
canonical face, one Outfit set, and locked settings. Generate one image per
attempt initially.

Record:

```text
Job ID:
Provider / Model:
Operation:
Resolution / aspect ratio:
Reference count and ordered roles:
Face identity: /5
Skin and body: /5
Outfit fidelity: /5
Template pose: /5
Template scene/lighting: /5
Commercial polish: /5
Template identity leakage: yes/no
Unexpected accessories: yes/no
Proxy/wireframe visible: yes/no
One image: pass/fail
Latency / provider cost / Credits:
Error and retry evidence:
Result: pass / conditional pass / fail
```

Immediate rejection:

- Identity or Outfit below 4/5;
- Template identity leakage;
- proxy/wireframe visible;
- multiple subjects/views;
- unsupported or silently omitted reference;
- more than one provider error across two controlled retries;
- request cannot use Fashion references without violating Meta's contract.

## 4. Routing And Prompt Policy

- Continue using the canonical Fashion prompt compiler and reference plan.
- Add provider-specific translation only inside the adapter or provider-aware
  request builder where the API requires it.
- Do not fork Fashion business logic or maintain a Meta-specific prompt in UI.
- Provider-specific qualification notes may constrain supported quality tiers,
  resolutions, operations, and max reference count.
- Simple routing must never choose an unqualified Meta model.
- Advanced routing shows Meta Muse only for qualified operations.

## 5. Quote And Credit Parity

Fashion quote must include the qualified model price, reference adjustments,
template usage, and output count using existing Credits services. A qualification
change or price publication invalidates stale quotes. No fallback to another
provider may occur after a Meta-specific quote without explicit re-quote.

## 6. Tests

- general Meta catalog exposure does not imply Fashion exposure;
- missing qualification returns `fashion_model_operation_not_supported`;
- disabled/expired qualification is excluded;
- qualified operation appears with only supported settings;
- excessive reference plans fail before quote or dispatch;
- locked Fashion quote and submitted operation match;
- qualification failure does not affect existing Fashion providers;
- historical jobs remain viewable after qualification is disabled.

## 7. Acceptance Criteria

- Fashion Studio has an independent, evidence-based gate.
- Meta Muse is not shown when the API cannot accept the required references.
- Qualification evidence is versioned and reproducible.
- Existing Fashion routing and qualified providers remain unchanged.

