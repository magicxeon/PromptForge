# Shared Processing Loading

Status: implemented and verified; evidence in 029. Owner: shared UI; consumer: ComparisonWorkspace.

- Use one reusable yellow LoaderCircle icon for all current processing spinners.
  Keep the existing Generation loading glow/size treatment for media placeholders;
  buttons and compact indicators use the same icon at their existing size.
- Comparison queued/processing slots show the standard Generation loading state,
  localized label, role=status and aria-busy. Completed images remain visible;
  failed/cancelled states never spin. Do not alter queue, polling or cancellation.
- Migrate current direct LoaderCircle consumers mechanically, preserving every
  loading condition, label, event, action, layout and error state.
- Respect reduced-motion and existing theme warning/action tokens. Do not add
  a second loading animation or fake percentage. Skeleton content may remain.
- Document the rule in AGENTS.md and the canonical visual-language guide.
- Checks: per-slot transitions, existing viewer controls, all direct spinner
  imports owned by the shared component, compact rendering and reduced motion.
