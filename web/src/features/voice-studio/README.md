# Voice Studio frontend

Start at `routes/VoiceStudioRoute.tsx`: actor-scoped queries, document editing and
autosave. `components/DialogueRowEditor.tsx` owns the row interaction; generation
requests go through `api/voiceStudioApi.ts`, never directly to a provider.

`components/VoiceManager.tsx` lists successful Takes and edits library metadata.
`TakeCard.tsx` is shared by Creator and Manager. `VoicePlayback.tsx` owns one
audible HTML audio element and private Blob URL cleanup. `CharacterVoices.tsx`
edits reusable voice presets, independent from immutable generation snapshots.

Revision 2 keeps only the selected dialogue row expanded. `VoiceEventToolbar.tsx`
inserts configured events using the textarea's native editing history;
`RowInspector.tsx` holds contextual delivery controls. `WorkspaceDialog.tsx`
provides feature-local document/settings/voice sheets using the existing Radix setup.

`MyVoices.tsx` lists owned custom voices and prebuilt options. `VoiceDesignForm.tsx`
owns the explicit quote/design/sample/save interaction; `VoicePicker.tsx` chooses
saved voices for character presets. All private voice identities and provider calls
remain server-owned. Modal preview controls share the same single audio element
as the workspace player. Row operation pointers live in the workspace while tabs
change; Generation's existing query remains the only operation-status owner.

`schemas/voiceStudioSchemas.ts` validates API boundaries. `model/rowCommands.ts`
contains pure row identity/reordering rules. Styles remain feature-local.

Models, voices, tags and limits come from `/api/voice-studio/catalog`. Add models
through the server-owned catalog; do not add model tables to these components.
Listen, Save, Download and metadata updates must never trigger generation.

Focused checks: `npm run test --workspace web -- src/features/voice-studio/`
and `npm run build:web` from the repository root. Browser checks should mock
paid generation and cover 390px, 820px and 1440px before authorized live listening.
