# 012 Durable Video Poster And Media Reconciliation

**Status:** Implemented; one new-Video manual verification pending  
**Capability owner:** Assets  
**Workflow owner retained:** Generation owns Video tasks; Community owns published posts; Cinematic owns approved attempts; Credits owns financial evidence  
**Primary role:** Backend Platform Architect  
**Reviewers:** QA Release Engineer, Commercial Financial Integrity  
**Skills:** `implement-generation-workflow`, `verify-release-regressions`

## 1. Outcome

Every newly persisted Video output shall have a durable poster derivative before
the output is exposed as completed. Existing local Videos can be reconciled by
one maintenance command that creates missing posters and, when explicitly
requested, removes records whose referenced Video file no longer exists.

The implementation extends the current Asset persistence entry point. It must
not create a second Video task, polling, Credit, History, Community, or playback
pipeline.

## 2. Durable Poster Contract

- `CinematicVideoAssetService.persistVideoOutput` remains the canonical Video
  media persistence entry point.
- `VideoPosterService` owns deterministic local poster extraction. It invokes
  FFmpeg without a shell, extracts a representative frame near 15 percent of
  the clip duration, and uses Sharp to produce a bounded WebP derivative.
- The poster storage key is deterministic:
  `cinematic-video/<ownerUserId>/<videoTaskId>.poster.webp`.
- `FFMPEG_PATH` may override the executable; the default is `ffmpeg` on PATH.
- Poster generation has a bounded timeout and never logs Video bytes, prompts,
  private references, or credentials.
- Asset `thumbnailUrl`, `metadata.posterUrl`, and task
  `outputAsset.posterUrl` identify the same derivative.
- A replay repairs an existing Video Asset that has no durable poster rather
  than creating a duplicate Asset.
- A task is not returned as successfully persisted until both the Video file
  and poster file exist.

## 3. Migration And Cleanup Command

Provide `scripts/reconcile-video-media.js` and a Windows wrapper
`scripts/reconcile-video-media.bat`.

Default execution is dry-run. `--apply` is required to write. The command:

1. reads Video tasks and cinematic Video Assets;
2. resolves only local `/outputs/` URLs inside the configured Outputs root;
3. creates a poster for every existing Video missing a valid poster;
4. updates matching Asset and Video task projections atomically after poster
   creation;
5. reports records whose Video file is missing;
6. removes those missing-file records only with both `--cleanup-missing` and
   `--apply`;
7. marks matching Community Video posts deleted and removes unapproved
   Cinematic attempt projections that refer to the removed task;
8. blocks cleanup when a Cinematic Shot approves the affected attempt;
9. preserves all Credit estimates, reservations, captures, refunds, and ledger
   entries as immutable commercial evidence;
10. writes timestamped backups and a JSON reconciliation report before replacing
    any runtime data file.

No wildcard filesystem deletion is allowed. The command may remove an orphaned
poster belonging to the selected missing Video record, but may not delete any
unrelated generated media.

## 4. Data And Ownership

| Data | Owner | Reconciliation behavior |
|---|---|---|
| Video file and poster | Assets | create derivative or report missing source |
| Video task | Generation | update poster projection or remove missing-file record |
| Asset record | Assets | update poster metadata or remove missing-file record |
| Community Video post | Community | mark deleted when its durable media is gone |
| Cinematic attempt | Cinematic | remove only when not approved by a Shot |
| Credits and ledger | Credits | never delete or rewrite |

Runtime output remains under `client/outputs/cinematic-video/`. Maintenance
backups and reports remain under `_temp/video-media-reconciliation/` and are not
runtime source data.

## 5. Failure And Recovery

- Missing FFmpeg produces stable code `video_poster_ffmpeg_unavailable`.
- Extraction timeout produces `video_poster_timeout`.
- Empty or invalid output produces `video_poster_invalid`.
- Poster failure keeps the Video task out of successful completion and routes it
  to existing reconciliation handling.
- Migration continues past one failed poster, records the failure, and exits
  non-zero after writing the report when apply was requested.
- Data files are replaced only after all intended in-memory mutations validate;
  a failed write leaves timestamped backups available for manual rollback.

## 6. Acceptance And Regression Gate

1. A new Video output returns a durable `posterUrl` and the WebP file exists.
2. Persist replay reuses one Asset and repairs a missing poster.
3. Recent, Video Viewer, Community sharing, Creator Profile, and Character Video
   sections consume the same `posterUrl` without new client-side extraction.
4. Dry-run changes no file.
5. Apply creates posters for existing valid Video files and is idempotent.
6. Missing-file cleanup removes matching task/Asset records, marks matching
   Community posts deleted, and preserves Credit data byte-for-byte.
7. An approved Cinematic attempt blocks cleanup with a clear report reason.
8. Path traversal and non-Outputs media URLs are rejected.
9. Existing Image thumbnails, failed-Video cleanup, Video polling, settlement,
   sharing, and actor isolation tests continue to pass.

## 7. Manual Operation

Run preview first:

```powershell
node scripts/reconcile-video-media.js
```

Create missing posters:

```powershell
node scripts/reconcile-video-media.js --apply
```

Create posters and clean missing-file records:

```powershell
node scripts/reconcile-video-media.js --apply --cleanup-missing
```

Stop the backend before an apply run. Restart it only after reviewing the JSON
report and command summary.

## 8. Implementation Checkpoint (2026-08-25)

- `VideoPosterService` extracts a representative frame with FFmpeg and writes a
  bounded WebP through Sharp.
- `CinematicVideoAssetService` now requires and returns a durable poster, repairs
  an existing deterministic poster without duplicating the Asset, and retains
  partial lineage when poster creation needs reconciliation.
- `reconcile-video-media.js` supports dry-run, poster migration, guarded
  missing-file cleanup, backups, reports, Community retirement, Cinematic
  approval protection, and immutable Credit evidence.
- Existing runtime data was migrated: 6 Video tasks, 6 Video Assets, and 6 WebP
  poster files are synchronized. No missing Video file record was found or
  deleted.
- Idempotency dry-run after migration reports zero poster candidates, zero
  missing records, and zero failures.
- Automated release gate passes 29 relevant tests. A generated poster was
  decoded as WebP at 480x864. JSON parsing and `git diff --check` pass.
- Restart the backend and complete TC-VP01/TC-VP02 in
  `_temp/test-case/video-poster-reconciliation-test-cases-20260825-th.md` before marking
  this Requirement complete.
