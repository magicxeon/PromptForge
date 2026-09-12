# Series, Seasons And Chapter Production Units

Status: implemented; isolated contract checks passed 2026-09-12. Supersedes deferral in
022, foundation 017 and produce-video-pipeline/021 for this explicit follow-up.
Owner: Cinematic. Primary Product; Backend/security and UX/QA reviews apply
sequentially. No billing, provider dispatch or public-rights changes.

## Scope And Compatibility

1. User hierarchy: Series > Season > Chapter > existing Scene/Shot workflow.
   A Chapter is an existing Cinematic Project production unit, not a new nested
   copy of the media pipeline. Keep project IDs, routes, format, drafts, attempts,
   approved Takes, pricing, timelines and exports unchanged.
2. Existing standalone films remain standalone unless their owner explicitly
   creates a Series from Setup. That operation puts the current film in Season 1,
   Chapter 1 without resetting its story, scenes, approvals or active tasks.
3. Add/rename Seasons; add Chapters with their own title and story brief; rename
   the Series. Chapter titles continue to use existing Setup title editing.
   Stable season IDs and project IDs own identity; numbers are ordered labels.
   No cross-series moving, deletion, collaborative sharing, automatic episode
   writing or combined-season export in this scope.
4. A new Chapter starts at Setup with empty scenes, plans, attempts and timelines.
   Its owner may copy current Chapter Cast/Looks and creative settings. This is
   an immutable deep snapshot with source project/version provenance, not a live
   shared Cast library. Existing Character/Asset permission and generated-sheet
   expiry checks still run through the canonical generation/reference owners.
   Never copy Jobs, signed provider URLs, approvals, costs or completed media.
5. Platform, duration, story intent and creative direction are initial settings
   copied from the source Chapter; the supplied new story brief always replaces
   the old brief. No unrequested AI call follows any structure operation.
6. Opening intent is per Chapter. No automatic recap, narrative continuity or
   visual consistency guarantee; a shared editable Series Bible/AI story arc is
   a later feature, not implied by this organizational implementation.

## Persistence And API

- Use the existing cinematicProjects JSON envelope with additive `series: []`.
  Existing documents lacking it remain valid. Project adds optional
  `seriesMembership: { seriesId, seasonId, chapterNumber }` and optional
  `chapterOrigin: { projectId, projectVersion, copiedCast }` for new Chapters.
- Series record: id, ownerUserId, title, version, createdAt, updatedAt and
  seasons[{id, number, title}]. No duplicate Chapter authority: membership lives
  on Project; workspace responses derive bounded active Chapter summaries.
- One atomic owning repository transaction covers Series plus Project creation
  or membership. No partial/orphan writes, raw paths in domain or second JSON store.
- Limits: 50 Series/owner, 24 Seasons/Series, 120 Chapters/Series; titles 120 chars.
  Archived Chapter numbers remain reserved; never recycle an old identity/label.
- Existing CinematicApplicationService is the public facade; focused internal
  CinematicSeriesService handles structure through CinematicProjectRepository.
- GET /api/cinematic/projects/:projectId/series returns {series, chapters};
  series may be null for a standalone film. Chapters are normal project summaries
  plus membership. Do not return sibling prompts, Cast or private media.
- POST /api/cinematic/projects/:projectId/series creates the container;
  body {title, expectedProjectVersion}; returns {project, workspace}.
- PATCH /api/cinematic/series/:seriesId renames Series or Season;
  body {title, seasonId?, expectedVersion}; returns {series, chapters}.
- POST /api/cinematic/series/:seriesId/seasons adds Season;
  body {title, expectedVersion}; returns {series, chapters}.
- POST /api/cinematic/series/:seriesId/chapters creates Chapter;
  body {seasonId, title, storyBrief, sourceProjectId, expectedProjectVersion,
  expectedVersion, copyCast}; returns {project, workspace}.
- All reads/writes use req.actorContext and private/no-store. Cross-owner/missing
  resources return 404, stale version 409, invalid/limit input 400. Concurrent
  repeated commands with one version cannot create duplicate Seasons/Chapters.

## Acceptance

Legacy standalone load/create/save unchanged. Explicit attach preserves all
existing data and URLs. Add S1/C2 and S2/C1; switch, reload and edit each Chapter
independently. Copied Cast/settings never change the source. Deny foreign owner,
archived source, unknown season, stale Series/source versions and invalid input.
No fake migration records, credit mutations, paid generation or live data writes
in tests. Only new Series operations write the additive envelope.
