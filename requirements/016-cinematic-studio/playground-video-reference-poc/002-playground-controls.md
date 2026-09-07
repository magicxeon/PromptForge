# 002 Playground Controls

- Replace Cinematic legacy picker import with profiles/CharacterLibraryPicker,
  same search/Mine/Community/Recent selection and Community display image policy
  as Template. Do not change its shared presentation contract.
- First-frame mode: upload/replace/remove and full contain preview.
- Character/reference mode: optional Character, optional scene image, required
  Look Sheet. Choose default approved sheet for selected Character if available;
  allow another approved Look or uploaded replacement. Never use the display
  thumbnail/profile crop as a hidden provider reference.
- No approved Look: visible empty state and upload action, not auto-generation.
  Character changes clear previous Look and resolve the new default; pending
  uploads/selections cannot attach to another actor or superseded selection.
- Show actual selected media, numbered provider roles/input mode/reference count,
  quote cost and disabled reasons. No raw Base64 or signed URLs in UI/drafts.
- Upload validation PNG/JPEG/WebP <=12MB with visible pending/error/retry.
  Only durable asset URLs and IDs persist in actor-scoped Video draft; retain
  existing prompt/model/settings/task history on upgrade.
- Disable Generate while upload, quote refresh/error, insufficient Credits,
  unsupported inputs, duplicate submission or nonterminal active task. An expired
  quote is refreshed on click without submitting; the user confirms again.
  Retain quote/error
  feedback, show terminal provider code/request ID and latest task progress.
- Controls remain compact, theme-token based, EN/TH localized, responsive at
  390/820/1440. Sibling Image/Recent/Engine/Result layout must not move.

Tasks: pure selection builder; new focused source panel; wire existing workspace;
UI tests for source switching, shared picker, uploads, preview and failure states.

Delivered in PlaygroundVideoSources, videoReferenceSelection and the existing
PlaygroundVideoWorkspace. Shared picker/DisplayMediaImage remain Profiles/media
owned, without changed behavior for Template or other callers. Scoped styles:
web/src/styles/playground-video-references.css. All new strings live in the
existing EN/TH playground catalogs. Explicit scope excludes Image mode redesign.
