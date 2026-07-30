# Reference Processing Pipeline Master Roadmap

**Requirement ID:** RPP-000  
**Status:** MVP implemented; semantic adapters deferred  
**Scope:** Cross-product generation foundation  
**Applies to:** Studio, Scene Builder, Playground, Templates, Comparisons,
Fashion Blueprint and future visual creation products

## 1. Product Intent

Reference images are not ordinary prompt attachments. Each image has a bounded
role and must influence only the parts of the result owned by that role.

Users cannot be expected to upload perfectly cropped product photography,
identity sheets or pose references. The platform must therefore normalize,
classify and constrain references before provider dispatch.

The pipeline becomes the single authority for:

- what each reference is allowed to preserve or replace;
- which structured attributes remain effective;
- which incidental content must be suppressed;
- how references are ordered and described to each provider;
- what preprocessing and fallback behavior is used;
- what lineage and policy version are stored with a result.

The capability is broader than Fashion. It is a platform foundation for every
workflow that combines images, Templates and structured attributes.

## 2. Business Outcomes

1. A user can provide a practical real-world image without understanding prompt
   engineering.
2. Face, Character, Outfit, Style, Pose and Template references do not silently
   take authority over unrelated content.
3. A Template remains visually recognizable while declared replacements are
   applied.
4. Studio, Playground, Comparison and Fashion use the same behavior.
5. Prompt/reference behavior can be tuned through versioned JSON configuration
   without editing every workflow.
6. Every generated result records which policy and processors were applied.
7. Future semantic segmentation, provider-specific optimization and premium
   multi-stage rendering can be added without replacing the public contract.

## 3. Non-Goals For The First Delivery

- Training or fine-tuning a foundation image model.
- Guaranteeing pixel-identical garment transfer for every provider.
- Building a separate upload or asset storage system.
- Moving provider capability metadata out of the Provider Registry.
- Charging a second hidden fee for deterministic preprocessing.
- Running multi-stage generation by default.

`Fine tuning` in the MVP means tuning role policies, processor selection and
prompt directives through versioned configuration. Actual model training is a
future implementation behind the same processor contract.

## 4. Canonical Role Outcomes

| Role | Must Preserve/Transfer | Must Ignore/Suppress |
|---|---|---|
| `face_reference` | facial identity and facial proportions | body, clothing, pose, background and style |
| `character_reference` | identity, hair, skin and body proportions | destination pose/environment; outfit depends on character policy |
| `outfit_front` | visible front garment silhouette, construction, colors, pattern and material | wearer identity, body identity, pose, background and lighting style |
| `outfit_back` | matching back construction and details | wearer identity, pose, background and style |
| `style_reference` | palette, lighting, contrast, texture, camera/render treatment and mood | identity, body, pose, garment design and scene content |
| `pose_reference` | body arrangement, gesture and approximate framing | identity, clothing, environment and rendering style |
| `template_baseline` | locked composition, camera, scene, lighting, pose intent and unchanged content | original identity or fields explicitly replaced by the user |
| `product_reference` | future product shape, branding-safe details and material | model identity, background and incidental props |
| `environment_reference` | future spatial/environment intent | people, clothing and unrelated foreground objects |

## 5. Attribute Authority

The pipeline also governs structured attributes.

Examples:

- Face Reference owns facial identity fields but leaves Expression editable.
- Character Reference owns identity and body proportions. Clothing remains
  editable only for a Reusable Character.
- Outfit Reference owns garment structure, material and pattern. Color controls
  follow its configured override policy.
- Pose Reference owns pose fields but not identity or clothing.
- Style Reference owns visual treatment fields but not semantic content.
- Template baseline owns locked Template fields; declared replacement fields
  override it.

The same authority plan drives both UI visibility and server prompt
compilation. The client must not maintain a separate hard-coded matrix.

## 6. Delivery Sequence

### RPP-001 Contract And Configuration

- Freeze normalized reference, authority and processing contracts.
- Add JSON policy schema and startup validation.
- Add role and provider override registries.
- Preserve current behavior behind a compatibility policy.

### RPP-002 Authority Planning

- Resolve conflicts between references, Template fields and attributes.
- Produce effective selections and a public UI authority projection.
- Make Single and Comparison generation consume the same plan.

### RPP-003 Deterministic Image Normalization

- Probe orientation, dimensions and MIME type.
- Apply safe resize, rotation and attention crop.
- Generate actor-owned derivatives through the existing Asset domain.
- Deduplicate derived references before estimating provider capacity.

### RPP-004 Semantic Extraction Adapters

- Add optional person/garment/face/pose processors behind interfaces.
- Suppress incidental identity and background content.
- Keep deterministic fallback when semantic processing is unavailable.

### RPP-005 Shared Review UX

- Show normalized preview and inferred scope.
- Ask for confirmation only when confidence is insufficient.
- Reuse one component across Studio, Playground, Templates and Fashion.

### RPP-006 Provider Adaptation And Release

- Compile provider-specific ordered references and directives.
- Record diagnostics and policy lineage.
- Roll out by role and provider feature flags.
- Gate release with cross-surface E2E parity.

## 7. Review Decisions

Recommended defaults requiring product review:

1. A person-worn Outfit image is inferred as `full_look` when upper and lower
   garments are both confidently visible.
2. When confidence is low, the UI asks the user to choose `full_look`,
   `top_only`, `bottom_only` or `single_item`.
3. An explicit Outfit replacement removes the corresponding original Template
   garment. It must not blend old and new garments unless a layering option is
   deliberately selected.
4. Template pose is approximate when the replacement garment makes the original
   hand interaction impossible.
5. Semantic preprocessing failure falls back with a warning only when role
   isolation remains safe; otherwise generation is blocked before credits are
   reserved.
6. Premium multi-stage garment/identity rendering is deferred but supported by
   the execution-plan contract.

## 8. Requirement Index

- [RPP-001 Config-Driven Reference Authority And Preprocessing](./001-config-driven-reference-authority-and-preprocessing.md)

## 9. MVP Delivery Record

The first delivery implements the shared contracts, versioned JSON policy,
authority planner, deterministic Sharp normalization, actor-owned derivative
reuse, provider ordering, exact reference-count/fingerprint credit parity,
public UI projection, shared scope/warning components and safe generation
lineage.

Semantic person, garment, face and pose extraction remains behind the processor
interface. It is not reported as active detection in the UI. Until a semantic
adapter is enabled, Outfit scope is explicitly selected by the user and the
server prompt policy suppresses incidental wearer, pose and environment
authority.
