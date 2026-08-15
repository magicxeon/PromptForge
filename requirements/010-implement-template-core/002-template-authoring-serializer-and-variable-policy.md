# 002 Template Authoring Serializer and Variable Policy

## Business Requirement

A creator must turn a completed Scene into a Template without understanding the
underlying JSON. Creator chooses what buyers may change; everything else remains
locked.

## UX Flow

```text
Open generated Scene
-> Share / Create Template
-> choose final preview
-> review suggested replaceable inputs
-> toggle Character, Outfit, Environment, Color or other supported inputs
-> mark required inputs
-> choose Prompt visibility
-> set usage credits
-> publish
```

Use progressive disclosure. The default recommendation is:

- Character/Face reference: required user replacement
- Outfit references: optional or required creator choice
- Environment: replaceable
- Pose: locked unless creator enables it
- Camera/composition: locked
- Style: locked by default
- identity-bearing owner references: never reusable by default

## Software Design

Create a pure React/TypeScript serializer that ports and supersedes the legacy
`client/scene-builder/sceneTemplateSerializer.js`.

The serializer receives canonical Scene state and produces:

```text
execution snapshot
input definitions
reference slot policies
provider/model recommendation
generation settings
validation summary
```

It must:

- strip Base64 and blob URLs;
- use stable attribute IDs, not localized labels;
- preserve locked selections in the execution snapshot;
- expose only declared public inputs;
- keep prompt compilation in the canonical compiler;
- support round-trip fixtures from existing version 1 snapshots.

## Shared Components

```text
TemplateInputPolicyEditor
TemplateInputSummary
TemplatePromptVisibilityControl
TemplatePricingControl
```

These are controlled components usable from Scene Builder, History viewer and
future Fashion Studio.

## Testing

- Guided Scene serializes deterministically
- Manual Template cannot select hidden execution
- private reference defaults
- required/locked policy
- no translated label used as data key
- existing fixtures migrate without data loss

