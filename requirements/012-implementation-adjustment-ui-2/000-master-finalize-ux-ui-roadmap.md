# Final UX/UI And Theme Foundation Roadmap

**Status:** Implemented, pending validation gate  
**Canonical runtime:** React under `web/`

## 1. Business Requirement

Momelo must support coherent visual themes without duplicating page markup or
forking component behavior. A user can keep the current Momelo look, use an
editorial Fashion presentation, use a more expressive Creative presentation,
or let the active workspace recommend a theme.

Theme changes are presentation preferences. They never change permissions,
generation settings, prompts, references, pricing or persisted user work.

## 2. Customer Contract

Available preferences:

```text
auto
default
fashion
creative
```

`auto` resolves:

```text
/create/fashion -> fashion
/playground     -> creative
all other routes -> default
```

An explicit preference overrides route recommendation. The selection is
available from the global Footer and applies immediately.

## 3. Persistence Contract

During Mock User operation, preference is stored actor-scoped through
`web/src/lib/persistence/actorScopedStorage.ts`.

```text
feature: ui-theme-preference
schemaVersion: 1
payload:
  theme: auto | default | fashion | creative
```

Switching actors rehydrates that actor's preference without leaking another
actor's choice. When real User Profile preferences are available, the server
profile becomes source of truth and local storage remains an optimistic cache.

Theme preference must not be stored in Creator Profile public projection.

## 4. Architecture

```text
ThemeProvider
  -> reads active Actor
  -> reads actor-scoped preference
  -> combines preference with route recommendation
  -> writes data-theme to documentElement
  -> exposes typed useTheme API

Semantic tokens
  -> resolve Default, Fashion or Creative values
  -> feed existing --mpf-* compatibility aliases
  -> shared components consume semantic/compatibility tokens
```

Canonical ownership:

```text
web/src/lib/theme/
web/src/styles/tokens.css
web/src/styles/themes.css
web/src/components/layout/AccountMenu.tsx
client/i18n/locales/*/shell.json
```

## 5. Theme Palettes

### Default: Momelo Neon

```text
Canvas       #03050b
Background   #070911
Surface      #0e1320
Text         #f6f7fb
Muted        #9fa7bd
Primary      #11c5ec
Secondary    #f02d91
Accent       #8d5cff
Action       #f7bd38
```

### Fashion: Pearl Editorial

```text
Canvas       #f4f5f7
Background   #e9ebef
Surface      #ffffff
Text         #171922
Muted        #687080
Primary      #176b68
Secondary    #b85675
Accent       #a77a2d
Action       #171922
```

### Creative: Electric Studio

```text
Canvas       #090204
Background   #110407
Surface      #220b12
Text         #fff6f7
Muted        #c0a2aa
Primary      #ff5b70
Secondary    #ff2e63
Accent       #c3264a
Action       #ffb13b
```

## 6. Implementation Sequence

1. Add typed theme preference and route-resolution contracts.
2. Reuse actor-scoped persistence with schema-versioned validation.
3. Mount ThemeProvider inside ActorProvider and apply an early bootstrap theme
   before React paints.
4. Add accessible Theme selection to the global Footer.
5. Add semantic theme tokens and retain `--mpf-*` aliases for incremental
   compatibility.
6. Migrate shared Button, Surface and Shell chrome away from hard-coded brand
   colors where theme variation is expected.
7. Add persistence/resolution/component tests and perform desktop/mobile visual
   review.

## 7. Acceptance Criteria

- Default remains visually compatible with the current Momelo application.
- Fashion is a readable light editorial workspace.
- Creative is visibly distinct from Default through deep Wine, Crimson, Coral
  and warm Amber shades.
- Community Hero and Discovery surfaces respond to every active theme.
- Studio panels, controls and generated-work surfaces remain readable in the
  light Fashion theme.
- Theme applies before or immediately after actor hydration without a prolonged
  incorrect-theme flash.
- Actor switching restores independent preferences.
- Auto follows supported route recommendations.
- Explicit preference remains stable during navigation and refresh.
- Keyboard and screen-reader users can identify and change the active theme.
- Controls, borders, focus, danger, warning and success states remain readable.
- Reduced motion is respected.
