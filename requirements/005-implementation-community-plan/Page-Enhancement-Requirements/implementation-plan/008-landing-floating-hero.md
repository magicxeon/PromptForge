# LVI-01 Floating Hero

Depends on: 009-landing-visual-identity-master.md approved scope.

1. Extend CommunityHero only; preserve DiscoveryPageHero's existing consumers.
2. Keep post prop and canonical public eligibility check. Render one public
   preview, never fetch extra originals solely for decoration.
3. Use existing local shot-recipe bitmap assets as clearly editorial samples;
   place their paths in Community editorial configuration. No new remote images.
4. Full-bleed photo canvas with bounded floating artwork and unframed Momelo
   copy. Retain Playground/Templates actions; add anchor to existing feed.
5. At mobile, put the artwork above the copy within the same hero; retain a hint
   of the next section. At desktop reserve text space, not overlapping cards.
6. Update Hero tests for branding, fallback, links and private media rejection.

Files: community/components/CommunityHero.tsx, community/config/
discoveryEditorialConfig.ts, styles/community-home.css, EN/TH community catalogs.
Gate: focused Hero tests then screenshot review in LVI-04. No shared hero CSS edit.
