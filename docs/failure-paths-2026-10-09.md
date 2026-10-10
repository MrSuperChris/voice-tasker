# What happens to a capture when things go wrong (2026-10-09)

Research only; no app code changed. Code read at main `d5573b0`; the deployed gh-pages bundle
(built 2026-10-07) carries the same error strings and no beforeunload / IndexedDB /
visibilitychange / wakeLock code. Every row below was reproduced with
`scripts/failure-harness.mjs` (case labels match its output; Chromium, fake mic, mocked Groq and TickTick, fake keys).

| Case | What happens today | Thought survives? |
|---|---|---|
| A1 Network drops during Groq upload | `ENTRY FAILED / FAILED TO FETCH`. One attempt, no retry. The audio blob is a local in `handleStopRecording` (VoiceTasker.tsx:75) and is dropped by the catch at :86. | **No** |
| A2 Groq 5xx with HTML body | groq.ts:16 calls `response.json()` on the error body, so the user sees `UNEXPECTED TOKEN '<' ... IS NOT VALID JSON`. Audio dropped. | **No** |
| A3 Groq never answers | fetch at groq.ts:7 has no timeout; PROCESSING screen has zero buttons. Only escape is reload, which loses the audio (E2). | **No** |
| B1 Groq 429 | Shows Groq's own message (`RATE LIMIT REACHED ... TRY AGAIN IN 7S`) via groq.ts:17. Readable, but nothing to retry with: audio dropped. | **No** |
| B2 Groq 200 without `text` | groq.ts:21 returns undefined, VoiceTasker.tsx:80 throws `CANNOT READ PROPERTIES OF UNDEFINED (READING 'TRIM')`. | **No** |
| C1, C1b, C2 TickTick 4xx/5xx or network drop | `ENTRY FAILED / FAILED TO CREATE TICKTICK TASK` (or `FAILED TO FETCH`). Text stays in `transpiredText` (only cleared on success, VoiceTasker.tsx:152) and reappears behind the keyboard button, but nothing says so. | **Yes, hidden.** Lost if the next action is a new recording (overwritten at :83) or a reload. |
| C3 TickTick 200 with no task in body | `TASK ADDED`, confetti, draft cleared. ticktick.ts:29 checks only `response.ok`; the body is never read, no id checked. | **No, silently** |
| C4 TickTick never answers | No timeout (ticktick.ts:20); stuck on PROCESSING with zero buttons. Reload loses the text, and whether the task was created is unknown. | **No** |
| D1, D2 Tab hidden / page frozen while recording (desktop) | Headless Chromium cannot hide a tab (visibility stayed `visible`); a CDP freeze for 6s recorded the same byte count as the control. Desktop shows no loss. Phone screen-lock and OS tab discard cannot be simulated here; no wake lock or visibility handling exists in src. | Not reproducible on desktop |
| D3 Mic track ends while recording (headset drop, another app takes the mic, iOS backgrounding) | MediaRecorder stops itself (state `inactive`, stop event already fired). STOP then calls audioRecorder.ts:40-55: `onstop` is assigned after the event fired and `stop()` on an inactive recorder is a no-op, so the promise never settles. **PROCESSING forever**, zero buttons. The chunks recorded so far are in `audioChunks` but never used. | **No** |
| E1-E4 Reload mid-recording, mid-transcription, on REVIEW (after edits), mid-submit | Back to start screen every time. No beforeunload prompt; only `voice-tasker-settings` in localStorage, no IndexedDB. Mid-submit reload leaves the TickTick request in flight with no record. | **No** |
| F1/F2 Empty or whitespace transcript | `NOTHING WAS CAPTURED. TRY AGAIN.` (VoiceTasker.tsx:80); no TickTick call. Guard confirmed. | n/a |
| F3 Whisper hallucination (`Thank you.`) | Goes to REVIEW like any text; Chris must press DON'T. | n/a (review is the guard) |
| F4 Text cleared to spaces; double-tap DO | DO disabled when blank (ReviewScreen.tsx:131); double-tap sends one POST (isSubmittingRef, VoiceTasker.tsx:113). Guards confirmed. | n/a |

Proposed fixes are filed as separate build cards on the Claude Queue, not built here.
