# Character Profile Concept Showcase

**Status:** Implemented pending manual visual validation  
**Reference:** [`../../../_temp/chrarater-profile-comcept.png`](../../../_temp/chrarater-profile-comcept.png)  
**Owner:** Character Profiles

## 1. Objective

Adapt the supplied Character Profile concept into the canonical React detail
page without inventing ratings, likes, follows, license prices or other data the
server does not own. The page must make the Character, creator, reuse status and
strongest public creations understandable before exposing owner management.

## 2. Page Structure

1. Keep the canonical breadcrumb and owner/public route context.
2. Render a media-first Character Hero with one complete display image, name,
   personality, intended-use tags, availability, real usage aggregates and the
   supported Fashion/Scene handoff actions.
3. Render a Creator strip linking to the canonical Creator Profile.
4. Render a compact usage-rights strip from Character type, reuse policy,
   visibility and update metadata. Do not present commercial licensing terms
   until a server contract owns them.
5. Use accessible `Overview`, `Creations` and `Details` tabs:
   - Overview shows a bounded selection of public Character creations.
   - Creations shows every item returned by the bounded works query.
   - Details explains Character type, permitted destinations and usage totals.
   - Owner edit, approval, sharing and featured-image controls live in Details.

## 3. Component And Data Rules

- `CharacterProfileHero` is a reusable presentation component. It receives
  Character data and callbacks and never calls APIs directly.
- `CharacterProfileRoute` remains the query, mutation and handoff orchestrator.
- Continue using `MediaCard` for public creation cards.
- Display only privacy-safe aggregates returned by Character Profile APIs.
- The selected display image remains presentation-only and never replaces the
  immutable approved Character reference used by generation handoffs.
- Share copies or invokes the current canonical page URL; it does not publish a
  Community post or change Character visibility.
- Unsupported actions are omitted rather than rendered as disabled decoration.

## 4. Responsive And Accessibility

- Desktop uses a balanced media/summary hero and a four-cell statistics row.
- Mobile stacks media first, preserves complete-image `contain` presentation,
  makes the primary action full width and keeps tabs horizontally scrollable.
- Tabs use native buttons, `role=tab`, `aria-selected` and associated tabpanel.
- Availability and reuse state use both icon/color and text.
- The page has one `h1`; section headings remain sequential.

## 5. Acceptance Criteria

- Character identity, creator, availability and primary create action are
  visible in the first desktop viewport.
- No mock rating, like, save, follow, credit price or license is shown.
- Public work is reachable from both Overview and Creations without duplicating
  card behavior.
- Owner controls remain functional and are discoverable in Details.
- Public and owner routes reuse the same page and Hero component.
- The layout has no horizontal page overflow at desktop or mobile widths.

## 6. Manual Verify

- [ ] Public reusable Character shows supported create actions.
- [ ] View-only Character hides create actions and explains its state.
- [ ] Owner Details exposes approval/edit/sharing and featured image controls.
- [ ] Overview and Creations open the same canonical Community post details.
- [ ] Creator link returns to the correct public Creator Profile.
- [ ] Desktop and mobile preserve the full Character image without cropping.

