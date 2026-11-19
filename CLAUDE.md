# Babel (repo voice-tasker) — notes for Claude

Babel, formerly VoiceTasker: an HHGTTG-style voice dictation PWA that turns speech into tagged
TickTick Inbox tasks, plus an Obsidian-idea mode that uploads a note to Dropbox. It is the capture
front end of Chris's Claude Queue system. React + TypeScript + Vite + vite-plugin-pwa. The README
is still the Vite template. Checked against the code on 2026-11-18.

## Tier and deploy

- **tier1** in `automation/tiers.json`: branch only, and Chris merges. If Babel breaks silently,
  captured thoughts are lost and nobody notices.
- **Merging `main` does not deploy.** Live is https://mrsuperchris.github.io/voice-tasker/, served
  from the `gh-pages` branch by `npm run deploy` (`gh-pages -d dist`, after `npm run build`).
- One exception: the weekly BABEL TAG SYNC routine may merge and deploy a diff that touches only
  the `TAGS` array in `src/components/ReviewScreen.tsx` (`scopedExceptions` in `tiers.json`).

## The empty-task bug is fixed: don't reopen it without evidence

`createTickTickTask` in `src/lib/ticktick.ts` trims the title and throws before `fetch`, and
`scripts/verify-empty-title-guard.mjs` checks it (fix shipped and deployed 2026-07-20). Before
blaming Babel for a stray empty Inbox task, look at its `createdTime`:

- Babel-made tasks have a **millisecond** `createdTime` (e.g. `.984`), with `dueDate` ≈
  `createdTime`.
- TickTick-app quick-adds have **whole seconds** (`.000`). Every empty task checked since the fix
  (2026-08-22, 08-24, 09-19, 09-24) was `.000`, carrying the sticky quick-add tag of a titled
  task entered seconds before, so it came from the TickTick app, not Babel.

## Other things to know

- `scripts/failure-harness.mjs` is a mocked-browser harness for the capture failure paths
  (recording and draft persist across failures and reloads since October 2026).
- Obsidian mode writes to `/Obsidian/Ideas/<slug>-<date>.md`, a path from the Dropbox **root**, so
  its token can't be app-folder scoped. Narrowing it to a write-only scoped token is an open
  idea, not yet discussed with Chris.
- localStorage on `mrsuperchris.github.io` is shared with Chris's other Pages apps (it's
  per-origin, not per-path). Bridge stores the same TickTick token there.
- `npm run dev` uses Vite's default port 5173, which is often Chris's local Habitica server.
  Pass `--strictPort` or another port when verifying.
