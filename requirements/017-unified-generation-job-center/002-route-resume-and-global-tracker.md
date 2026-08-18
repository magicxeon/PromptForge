# 002 Route Resume And Global Tracker

## Image Route Pointer

`GenerationExperience` persists one pointer per actor and generation surface:

```ts
{
  jobId: string | null;
  generationGroupId: string | null;
  comparisonSetId: string | null;
  updatedAt: string;
}
```

- Restore after actor and surface are known.
- Persist immediately after accepted submission.
- Keep terminal pointers so completed results appear on return.
- Clear on replacement work, explicit reset, or confirmed missing resource.
- Never persist prompt or reference media in this pointer.
- Video keeps its existing actor-scoped provider-task draft.

## Global Tracker UX

- Lives in `AppShell` as an account-level compact control.
- Shows active count and spinner while work is active.
- Expanded panel shows bounded newest-first items and resume/view actions.
- Completion/failure transition produces one toast per actor/session.
- Icon and text accompany color. Mobile must not overflow.

## Polling Ownership

- One app-shell query owns background polling.
- Poll every 3 seconds only while active work exists.
- Focus and reconnect refresh the projection.
- Feature routes may poll their selected detail resource.
- Actor ID is part of query and notification keys.

