# Step 3 - Admin UI and Focused Verification

**Status:** Complete

## Goal

Expose a compact, safe Admin Provider workspace and verify it without running
the complete repository suite.

## Tasks

1. Add unified sanitized Provider/Model/Workflow inventory endpoint.
2. Add one-command mutation endpoint with Admin permission, reason,
   expected-version and command-ID validation.
3. Add Audit event after successful atomic mutation.
4. Add `/admin/providers`, navigation entry, typed Zod schemas and API calls.
5. Use Provider rows, expandable Model rows and progressively disclosed
   workflow controls.
6. Add loading, empty, read-only, conflict, success and error states.
7. Add EN/TH catalog parity.
8. Add focused backend and React tests plus optional aggregate script.
9. Verify desktop, tablet and mobile layout without changing sibling Admin
   screens.

## Exit Evidence

- Admin can disable and restore Provider, Model and Workflow targets.
- Support can inspect but cannot mutate.
- UI refreshes to the returned version after each command.
- Master-disabled descendants communicate inherited impact.
- Focused tests, typecheck and i18n validation pass.

Responsive inspection also passed at 390px, 820px and 1440px without page
overflow or overlapping controls.
