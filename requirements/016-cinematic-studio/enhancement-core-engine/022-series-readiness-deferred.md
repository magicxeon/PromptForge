# Series Readiness (Deferred)

Status: design awareness only. No runtime Season/Chapter feature this phase.

Future conceptual hierarchy: Project/Series -> Season -> Chapter -> Scenes ->
Shots -> attempts/approved media. The current short-film Project remains a valid
standalone production. Do not rename existing IDs or insert fake Season 1/Chapter
1 data. Do not implement navigation, database tables, billing or series drafting.

Future shared authority: versioned Cast identities/Looks, location/environment
definitions, film art/light palette and continuity bible. Chapters reference
approved versions, with explicit local overrides rather than changing all past
episodes. Include optional scope in future contracts; never use a title or array
position as the durable identifier. Keep project/scene/shot ownership explicit.

This phase should avoid global singleton creative state and hard-coded one-story
assumptions in new helpers. Pin configuration/recipe versions in provenance.
Reuse owning Assets, Characters, Cinematic and Generation contracts later;
no new global Cast repository or shared secret reference cache is introduced now.

Future decisions: chapter duration and budgets, membership/rights, cross-chapter
reuse and expiry, timeline export, recap/continuity validation, rollback and
database mapping. These require their own requirements before implementation.
