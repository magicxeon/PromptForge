# Step 5: Photo Template Public Output Grid

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](034-presentation-delivery-evidence.md).
Requirement: [028](../028-photo-template-community-creations.md), PTC-01..06.

## Owner Files

Community TemplateDetailRoute/useTemplateDetail, template components,
`template-detail.css`, locales/tests. Optional compatible EngagementBar variant
in shared Community components; existing useCommunityEngagement remains owner.
Proposed visual component: `components/templates/TemplateCreationCard.tsx`.

## Tasks

- [ ] C-01 Add original owner A/output creator B-C fixtures, three outputs, long
  Thai titles, missing media and several pages with changing likes.
- [x] C-02 Build image-led cards with title/byline/heart only; no generic IMAGE
  badge, rank placeholder or repeated zero-counter dashboard.
- [x] C-03 Link photo/title to the output Post and avatar to its creator. Keep
  Heart as separate focus/click target with no nested buttons/links.
- [x] C-04 Reuse engagement through composition/like-only variant; test actor,
  pending duplicate click, failure/retry. Measure per-card viewer-state reads
  and avoid mounting unloaded records just to fetch their reaction state.
- [x] C-05 Preserve server Most liked/Latest and URL choice; reset pages on sort
  change, exclude late prior responses, deduplicate IDs. Handle refreshed rank
  without claiming snapshot-stable pagination when likes change.
- [x] C-06 Invalidate current actor's Detail/preview queries after reactions;
  keep old EngagementBar variants and actor isolation intact.
- [x] C-07 Compose three/two/one columns with contained image stages. Implement
  empty/broken-media/load-more error/retry/end states without hiding the original.
- [x] C-08 Wire/run `--part=photo-creations`, current Detail hook and shared
  engagement tests. Re-run server lineage tests only if their owner changed.
- [x] C-09 Inspect target viewport/theme screenshots, keyboard/touch actions and
  generic Post/Character engagement smoke checks.
- [ ] C-10 If local app is supplied, read-only verify the reported three outputs
  and real creators. Do not like/save/publish live work to obtain evidence.

## Exit / Rollback

PTC criteria pass without visibility expansion. Missing reported output triggers
lineage investigation, not a fabricated card. Rollback the Detail card/optional
reaction variant while keeping existing services, source posts and likes.
