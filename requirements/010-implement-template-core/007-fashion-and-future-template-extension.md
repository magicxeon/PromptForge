# 007 Fashion and Future Template Extension

## Business Requirement

Fashion Studio uses Template Core as a guided commercial workflow. Sellers can
choose a proven final look, select a Character, upload one Outfit or a bulk set,
review cost and generate without prompt engineering.

## Fashion Binding

Template inputs may declare:

```text
fashion.character
fashion.outfit_front
fashion.outfit_back
fashion.environment
fashion.pose
fashion.brand_text (future, opt-in)
```

Single upload binds one product item. Bulk upload creates multiple product items
that all pin the same Template version and immutable direction.

The Fashion quote is:

```text
sum(operation generation credits)
+ template usage credits according to pricing cadence
```

MVP cadence is `per_output`. Future values may include `per_run` and
`licensed_access`; clients must display the cadence supplied by the server.

## Future Kinds

Keep discriminated contracts for:

```text
scene_image
fashion
product_image
video
```

Do not implement Video generation now. A future Video version may add duration,
motion, audio and keyframe inputs while retaining Definition, Version, Use
Session, pricing, entitlement and lineage contracts.

## Non-Duplication

- Fashion uses Template Core discovery and use APIs.
- Fashion uses existing asset upload and Character handoff.
- Bulk processing uses Fashion plan/quote/run.
- Template fee is added through the shared credit estimate contract.

