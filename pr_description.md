🧹 [Code Health] Remove hardcoded console.error for expected lrclib failures

🎯 **What:** Removed `console.error` logs in the catch blocks of `getDirectLyrics` and `searchLyrics` in `apps/backend/lib/lrclib.ts`.
💡 **Why:** Logging expected third-party API failures using `console.error` pollutes logs without adding actionable value. Returning `null` natively handles these failures gracefully without littering console output.
✅ **Verification:** Ran backend tests (`pnpm --filter @spice/backend test`) and linters (`pnpm backend:lint`) successfully. Additionally, fixed an existing duplicated code block and parsing error in `apps/backend/lib/shared-playlists.ts` to unblock linting.
✨ **Result:** Cleaner standard error output, improved observability focus, and a bump to `Spice Media Core v1.0.66`.
