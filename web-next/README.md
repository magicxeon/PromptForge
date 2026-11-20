# Momelo — separate Image Playground

From the repository root, run one command:

```powershell
npm.cmd run dev:web-next
```

Open **http://localhost:6502** (or http://127.0.0.1:6502). On Windows you can also
double-click `scripts/start-web-next.bat` (the old `web-next/start-dev.bat` forwards to it).
The launcher clears port6502 only when its listener is this workspace's explicitly marked
Vite process. It reuses the existing API6500, or starts `server/server.js` with the existing
`.env` and canonical development environment when6500 is free. It waits for both
`/api/health` and `/api/auth/config` before starting Vite, failing visibly instead of
opening a frontend with a refused proxy connection. API startup logs are written to the
temporary log path printed by the launcher.

The shared API stays running across frontend restarts and `stop:web-next`; no automatic
backend restart or auth bypass is introduced. It never stops the old frontend or an
unidentified application. The previous npm launcher is also recognized only when its
Vite path belongs to this repository and its process ancestry explicitly names `web-next`.
Other untracked listeners must be closed from their own terminal.

To clear a stuck frontend without starting it again:

```powershell
npm.cmd run stop:web-next
```

Port6502 remains fixed to match the existing Identity origin configuration. There is no
automatic fallback to an unapproved port. The workspace's raw `vite` dev command bypasses
cleanup; use the root command or the script in `scripts/`.

```powershell
npm.cmd run build:web-next
npm.cmd run typecheck --workspace web-next
node web-next/test/browser-check.mjs
```

The browser check requires the6502 dev server and uses intercepted fixture APIs/media.
It never dispatches paid generation. Captures go to `_temp/fe24/`.

## Ownership

- `src/app`: shell, canonical identity bootstrap, TH/EN initialization.
- `src/features/playground`: Image form, references, estimates and status orchestration.
- `src/components/media`: authenticated previews and Fit/100%/zoom/download.
- `src/lib/canonical.ts`: explicit temporary bridge to existing API/schema/identity owners.
- `src/locales/{th,en}` and `src/styles`: isolated presentation, one fixed palette.
- API keys and provider dispatch remain server-side. `/api`, `/outputs`, `/assets`, `/i18n`
  proxy to127.0.0.1:6500. Origin is preserved; no wildcard authentication allowance.

Current delivery is Image preview. Video/Comparison links open the existing workspace.
No production route has been replaced. An already-running backend must use updated source
to recognize local6502 and the new read-only request recovery endpoint; the launcher
does not forcibly replace it.

For session authentication, use the same hostname as the existing Login, sign in there,
then return to preview. Configured session origins remain Identity-owned; this change
adds6502 only to the already-qualified local development-bypass policy. Cross-origin
logout is detected on focus/API validation, not through an origin-crossing broadcast.

Drafts and request identities use new actor/auth-mode-scoped namespaces. References
persist stable output storage keys (not signed URLs or image bytes); server authorizes
every actual read/use. Unknown submissions expose Check status and never replay a POST.
An orphan request remains a support/reconciliation case rather than generating again.
