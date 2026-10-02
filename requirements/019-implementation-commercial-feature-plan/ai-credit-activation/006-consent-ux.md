# 006 Consent And Free Notices

Scope: only billing-related UI in existing Cinematic screens. Dependencies: 003/005.
UX Expert reviews the interaction before edits; native textareas stay unchanged.

1. Fetch server quote for the exact input before dispatch; never hard-code prices.
2. Show per-step Credits and total selected steps; text and image remain independent.
3. Bulk/destructive actions always confirm; individual profile preference may skip
   modal, never quote validation. Cancellation must cause no paid dispatch.
4. Display localized green Free notices for Full Story and legacy prompt refinement.
5. Preserve result/error/loading states and refresh account after settlement.
6. Recover accepted receipts instead of accidental double-generation on retries.

Checks: stubbed API tests, English/Thai localization parity, mobile/tablet/desktop.
No live paid generation; report viewports or flows not visually verified.

Evidence: combined scoped frontend141 and TypeScript passed. UX Expert reviewed
the consent/recovery workflow and shared green Free label before edits. TH/EN
at390/820/1440 and three themes passed consent/free/recovery layout checks;
Admin pricing passed the same viewport sizes. Independent QA verified actor-
scoped settlement refresh and recovery handling; visual evidence is implementer-
reported, not an independent live paid UAT.
