# Browser Route Inventory

**Captured from:** `client/shell/navigationRegistry.js`,
`client/shell/navigation.config.json`, `server/app/createApp.js`  
**Rule:** Code and server route registration are authoritative.

| Route | Route ID | Current module | Canonical parent | React phase | Notes |
|---|---|---|---|---|---|
| `/`, `/home` | redirect aliases | shell | `/community` | 005 | Normalize to Community |
| `/community` | `home` | community | `/community` | 005 | Product home |
| `/community/:postId` | `community-post` | community | `/community` | 005 | Excludes `characters` |
| `/community/characters` | `character-directory` | community | `/community` | 006 | `scope=own` activates My Characters |
| `/community/characters/:characterId` | `character-profile` | community | `/community/characters` | 006 | Public/owner projection |
| `/creators/:handle` | `creator-profile` | community | `/community` | 006 | Overview |
| `/creators/:handle/:profileTab` | `creator-profile` | community | `/community` | 006 | Allowed tabs only |
| `/create/simple` | `easy-create` | studio | `/community` | 010 | Headshot workflow |
| `/create/fashion` | `fashion-studio` | React Fashion Blueprint | `/community` | 007 | Active; aggregate quote/run |
| `/create/characters` | `character-builder` | studio | `/community` | 010 | Character Sheet |
| `/create/scenes` | `scene-builder` | studio | `/community` | 011 | Scene authoring |
| `/studio` | `studio-compat` | studio | `/community` | 010 | Compatibility entry |
| `/playground`, `/create/playground` | `playground` | playground | `/community` | 009 | Freeform generation |
| `/history`, `/library/images` | `history` | history | `/community` | 008 | Actor-owned |
| `/history/:jobId` | `history-detail` | history | `/history` or captured Collection parent | 008 | Actor-owned detail |
| `/collections` | `collections` | collections | `/community` | 008 | Actor-owned list |
| `/collections/:collectionId` | `collection-detail` | collections | `/collections` | 008 | Actor-owned detail |
| `/comparisons`, `/compare` | `comparisons` | comparisons | `/community` | 008 | Dashboard |
| `/comparisons/:setId` | `comparisons` | comparisons | `/community` | 008 | Private set detail |
| `/credits` | `credits` | credits | `/community` | 008 | Actor-owned account/ledger |
| `/admin` | `admin` | admin | `/community` | 008 | `admin` or `support` |

## Cutover State

- Express serves `web/dist/index.html` for every registered browser route.
- A missing React build fails visibly; it does not open the legacy UI.
- Detail back behavior is carried in `history.state.navigationContext`.
- Navigation context is invalidated when the actor changes.
- React Router is the only browser router.
- `/create/fashion` owns independent React state and server quote/run contracts.
- Unknown browser routes must return 404 or a deliberate not-found route rather
  than silently opening Community.

## Cutover Record

Historical cutover records used:

```text
runtimeOwner: legacy | react
enabled: boolean
parityApprovedAt
observationEndsAt
rollbackAllowed
```

All current rows now resolve to `runtimeOwner: react`. The fields remain
inventory evidence rather than a live dual-runtime control.
