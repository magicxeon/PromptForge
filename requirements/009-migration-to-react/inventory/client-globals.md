# Legacy Client Global Inventory

## State Roots

| Global | Current purpose | Target |
|---|---|---|
| `window.state` | Studio state/catalog/selections/references | Studio reducer/store |
| `window.ModelPromptForgePlaygroundState` | Playground persisted draft | Playground feature store |
| `window.ModelPromptForgeSceneBuilderState` | Scene authoring state | Scene reducer/store |
| `window.activeRemixContext` | Scene remix compatibility | versioned handoff |

## Platform Globals

```text
ModelPromptForgeActorContext
ModelPromptForgeApiClient
ModelPromptForgeI18n
ModelPromptForgeNavigationConfig
ModelPromptForgeNavigationRegistry
ModelPromptForgeNavigationContext
ModelPromptForgeRouter
AppDialog
```

Target replacements:

```text
ActorProvider
apiClient
react-i18next
typed route registry
React Router
Radix-backed dialogs
```

## Feature Globals

Namespaces exist for:

```text
Community*
CharacterProfile*
Comparisons*
Comparison
GenerationControls
Credits*
Playground*
PromptComposer*
SceneBuilder*
VisualOptionControls
Clothing*
Admin*
```

All browser routes are migrated. These namespaces are now legacy-source
inventory only; no React module imports or invokes them. They may be deleted
after the final validation/observation gate without replacement globals.

## Loose Helpers

Legacy loose helpers include prompt generation, Studio form validation,
reference assignment, UI synchronization, scrolling and Lightbox entry points.
Before Studio migration classify each as:

```text
pure domain transformation
React presentation behavior
server-owned rule
obsolete compatibility helper
```

No loose helper becomes a new React global.

## Script-Order Risk

`client/index.html` retains its historical script graph only as decommission
evidence. Express no longer serves it for browser routes. React uses ESM imports
and has no dependency on this graph.
