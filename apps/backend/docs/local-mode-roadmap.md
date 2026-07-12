# SPICE Local Mode Roadmap

This note ranks additional features that could move from the hosted cloud lane to the user's PC, plus the expected performance and operations tradeoffs.

## Local-Move Candidates

| Rank | Candidate | Difficulty | Setup and management cost | Why move it locally | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Update checks, install state, and launch control | Low | Low | A local manager can check the manifest, install updates, start the runtime, and open the browser without using Vercel beyond one cached manifest request. | Started with `public/spice-local-manager.ps1`; Electron can wrap the same flow later. |
| 2 | Discord Rich Presence and desktop integrations | Low to medium | Low | These are desktop-only features and do not belong in serverless routes. | Best fit for Electron or another local tray app. |
| 3 | Local-only settings, themes, queue state, and backup import/export | Low to medium | Low | Keeps personal playback UX private and avoids cloud writes for routine UI state. | Keep optional cloud sync as an explicit account action. |
| 4 | Playback history aggregation before sync | Medium | Medium | Batch uploads reduce Neon writes and Vercel invocations. | Requires a durable local queue and conflict rules for multi-device users. |
| 5 | Last.fm and ListenBrainz submission queue | Medium | Medium | Local queueing avoids cloud work during playback and can retry from the PC. | Cloud should still store OAuth/session secrets unless a desktop secret store is added. |
| 6 | Spice Connect device presence polling | Medium | Medium to high | Local discovery can reduce cloud polling when devices are on the same LAN. | Remote cross-network control still needs a cloud rendezvous path. |
| 7 | Shared-playlist edit queue | Medium to high | Medium | Offline-first edits can batch database writes. | Needs conflict handling, permissions validation, and replay failure UX. |
| 8 | Listen Together session transport | High | High | Realtime state can become expensive on serverless/database polling. | A local/LAN path helps only nearby devices; internet sessions still need a relay or managed realtime service. |
| 9 | Account/profile cache with offline mode | High | High | Fewer cloud reads and faster startup. | Needs encryption, invalidation, sign-out cleanup, and stale-account behavior. |
| 10 | Cloud auth replacement | Very high | Very high | Would reduce Vercel auth work but creates security and account-recovery burden. | Not recommended now; keep auth in Vercel. |

## Performance Expectations

| Implementation | Vercel impact | Neon impact | User PC impact | Practical expectation |
| --- | --- | --- | --- | --- |
| Current split: local media runtime, cloud auth/sync/metadata | Low during playback; Vercel still handles account, sync, feedback, update manifest, and hosted pages. | Low to medium depending on sync, shared playlists, Spice Connect, and listens. | Medium; provider search, scraping, stream extraction, proxying, and playback run on the user's machine. | Best near-term balance. Heavy media work is off Vercel, but signed-in collaboration still costs cloud/database operations. |
| Add lightweight local manager | Very low extra load; mostly one manifest request per install/update check. | None unless account features are used. | Tiny; a small GUI script plus occasional download/extract work. | Good first step for non-technical users without Electron bundle overhead. |
| Electron manager/tray app | Very low cloud load if it uses the same manifest. | None by itself. | Higher disk and memory footprint than PowerShell; easier tray/startup UX. | Worth doing after install/update behavior stabilizes. It improves UX more than runtime performance. |
| Local queue plus batched sync | Lower Vercel function count for listens/history/profile updates. | Lower write frequency, possible larger batch writes. | Slight local storage and retry complexity. | Good next cost-control move if sync traffic grows. |
| Offline-first account/profile cache | Lower read traffic. | Lower read traffic but more complex invalidation. | More local disk use and security requirements. | Useful later; risky until auth/sign-out and encryption rules are solid. |
| Move realtime/session features local-first | Potentially much lower cloud load for LAN use. | Lower session churn for local sessions. | Higher complexity; device discovery and networking edge cases. | Good for LAN scenarios, but internet Listen Together still needs a hosted relay or managed realtime provider. |
| Full desktop app with embedded runtime | Very low hosted app usage outside auth/sync. | Similar to current unless sync is also batched. | Highest install size and update complexity; best native UX. | Most polished long-term path, but expensive to maintain before the architecture settles. |

## Current Recommendation

Keep the current local runtime split, add the lightweight manager first, then move sync-related traffic into local queues before attempting a full Electron desktop manager. The expensive work is already off Vercel; the next meaningful savings are fewer cloud polls, fewer per-track writes, and clearer opt-in boundaries for collaboration features.

## Electron Wrapper Fit

The existing `Anti-Depressants-Dev-Team/spice` desktop app can house the local SPICE runtime, but it should do it as a runtime manager instead of copying the backend source directly into the Electron UI. The practical path is:

1. Keep Electron as the shell, tray, updater, and native-integration host.
2. Download or bundle the signed `spice-local-windows.zip` runtime.
3. Verify the manifest hash, expand it under the app user data folder, and start `start-spice-local.ps1` on `127.0.0.1:3939`.
4. Load `http://127.0.0.1:3939` in the Electron window after the runtime health endpoint responds.
5. Expose local actions for install, update, start, stop, open logs, and reset runtime state.

This keeps the app user-friendly while preserving the local/cloud split: Electron owns install and desktop features, the local Next runtime owns playback and media APIs, and Vercel/Neon keep account state. A fully embedded runtime is possible later, but download-on-first-run plus cached updates is the lower-risk bridge because it avoids rebuilding the desktop app for every backend patch.
