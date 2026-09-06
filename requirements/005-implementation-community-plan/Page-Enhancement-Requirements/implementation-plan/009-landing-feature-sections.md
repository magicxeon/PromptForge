# LVI-02 Feature Sections

Depends on LVI-01 structure; do not change query or publication behavior.

1. Add EN/TH section descriptions for start paths, featured, feed and tutorials.
   State existing functionality; no fabricated quality/rating/cost claims.
2. Give start cards individual accent treatments and meaningful icon + copy.
3. Give each Home section a scoped color band, heading accent and spacing.
   Preserve toolbar, carousel, empty/error, pagination and actions inside bands.
4. Add optional description to EditorialTutorialRail. Existing consumers omit
   it and retain their current behavior and style.
5. Keep editorial suppression during search and public post deduplication.
6. Run HomeRoute/StartPaths/shared discovery tests and i18n parity before gate.

No new business capability. All CSS starts at `.community-home` or Home-owned
classes; existing global MediaCard appearance must not be changed.
