<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Version Management Rule
Always bump `SPICE_MEDIA_CORE_VERSION` in `apps/backend/lib/release-notifications.ts`, which is rendered by `apps/backend/app/spice-app.tsx`, and document the new version in `apps/backend/public/WALKTHROUGH.md` whenever you modify the codebase or implement new features.
<!-- END:nextjs-agent-rules -->
