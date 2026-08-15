# Server Domain Modules

`server/domain/` contains business behavior grouped by capability. Domain modules own rules, validation, orchestration and prompt/generation behavior, but they should not own storage layout.

## Capability Folders

| Folder | Responsibility |
| --- | --- |
| `collections/` | Collection membership, default collection rules and ownership checks |
| `community/` | Local Scene Template share/remix business flow |
| `comparisons/` | Comparison orchestration and validation |
| `credits/` | Credit balance, deduction, refund and ledger behavior |
| `generation/` | Queue processing, prompt compilation, reference resolution, image utilities and thumbnails |
| `reference-processing/` | Config-driven reference role authority, deterministic preprocessing, provider ordering and safe lineage |
| `assets/` | Shared reference-asset behavior and allowlisted image-presentation profiles |
| `identity/` | Actor context helpers |
| `scene-templates/` | Scene Template snapshot, variable, slot and privacy rules |

## Storage Boundary

Domain modules should depend on repository contracts or shared repository helpers. They should not read or write runtime JSON directly unless the file is a documented local MVP bridge.

Approved local bridge examples:

- `generation/QueueManager.js` writes image binaries to `client/outputs/` because provider output files are static assets.
- `generation/thumbnailService.js` writes the single derived `preview-v1`
  profile under `client/outputs/thumbnails/`. The legacy directory and
  `thumbnailUrl` field names remain compatibility contracts; detail,
  fullscreen and download surfaces continue to use the uncropped original.
- `assets/ImagePresentationService.js` renders bounded, in-memory-cached
  presentation variants from authorized local media. Profile dimensions and
  Sharp operations are server allowlists; browser callers cannot supply raw
  resize/crop options. Current versioned Template card, profile-square and
  detail profiles use deterministic top-biased Sharp cropping so a portrait
  subject's face is not displaced by high-contrast clothing or scenery. Legacy
  unversioned profiles remain readable for compatibility and `preview-v1`
  remains unchanged.

JSON state must go through repositories or `server/repositories/json/jsonFileStore.js`.

## Adding New Domain Code

When adding a new domain module:

1. Keep API route concerns out of the domain file.
2. Keep JSON file paths out of the domain file unless injected through a repository.
3. Preserve method contracts so a future database adapter can replace the JSON implementation.
4. Put cross-module policies in the domain area that owns the rule, not in `server/server.js`.
