# Persistence and Event Inventory

## Actor-Scoped Persistence

Known user-work keys include:

```text
model_prompt_forge_state_<actor>_<mode>
model_prompt_forge_playground_<actor>_v2
comparison draft/recovery keys with actor prefix
Scene Builder mode/draft keys through its state module
```

Global preferences:

```text
mpf_active_mock_user_id
model_prompt_forge_language
model_prompt_forge_active_mode (legacy compatibility)
```

React implementation:

- feature-specific actor-prefixed draft keys;
- bounded prompt/selection payloads;
- no Base64, credit balance, permission or signed URL persistence;
- reset/cancel on actor change.

## Cross-Module Events

| Event | Purpose | React target |
|---|---|---|
| `modelpromptforge:ready` | Legacy bootstrap ready | provider initialization |
| `modelpromptforge:route` | Legacy route change | React Router |
| `modelpromptforge:languagechange` | Locale update | i18next subscription |
| `modelpromptforge:actorchange` | Mock actor update | ActorProvider |
| `modelpromptforge:generation-status` | Job lifecycle | Query/job state |
| `modelpromptforge:communityfeatureschange` | Feature policy | Query/provider |

No React feature depends on these legacy DOM events. React features communicate
through props, context, feature state, session handoff envelopes, and Query
invalidation.

React drafts use:

```text
mpf.react.draft:<feature>:<actorId>
```

`web/src/lib/persistence/actorScopedStorage.ts` owns the versioned envelope.
`web/src/lib/persistence/handoffStorage.ts` owns cross-workflow transfers; they
are actor-bound, expire after 30 minutes by default and are consumed once by
the destination. Neither adapter stores raw Base64 references.

## Navigation Context

Legacy detail navigation stores a sanitized context in `history.state`:

```text
source route
source label/module/view
source scroll position
small primitive source state
actor ID
```

React route state may preserve this semantic contract, but URL routes remain
canonical. `ContextBackLink` now consumes only a small internal return path and
active actor ID; actor-mismatched, external-looking or absent context is
discarded in favor of a feature-owned fallback route.
