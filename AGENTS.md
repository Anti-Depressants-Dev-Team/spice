# Repository Agent Guide

This file applies to the whole repository. More specific `AGENTS.md` files in child directories override or extend these rules for their subtree.

## Basics

- Use `pnpm` for the Node workspace. The root package expects Node `>=24` and `pnpm@11.0.9`.
- Main backend commands:
  - `pnpm backend:dev`
  - `pnpm backend:build`
  - `pnpm backend:lint`
  - `pnpm backend:typecheck`
  - `pnpm --filter @spice/backend test`
- Prefer `rg` / `rg --files` for repo search.
- Keep changes scoped to the request and the current service lane. Avoid opportunistic refactors.
- Do not commit secrets or local runtime artifacts. Treat `.env`, `.next`, `build`, `.dart_tool`, `node_modules`, logs, and generated caches as local-only unless a maintainer explicitly asks otherwise.
- When working in `apps/backend`, remember that this repo uses a newer Next.js version. Read the relevant docs in `node_modules/next/dist/docs/` before relying on old Next.js assumptions.

## Walkthrough And Versioning

- Always update `walkthrough.md` for any change that affects source, behavior, tests, docs, repo guidance, public assets, or user-visible behavior.
- Add the newest release entry at the top of `walkthrough.md`. Keep older entries in place unless the task is explicitly to correct history.
- For backend app changes, follow `apps/backend/AGENTS.md`: bump the visible `Spice Media Core v1.0.x` version in `apps/backend/app/spice-app.tsx` and document the same version in `walkthrough.md`.
- If another visible app version string is changed by the same release, keep it aligned with the walkthrough entry.
- Walkthrough bullets should name the affected service or lane when the change is scoped, especially for Home, Music, Admin, Anime, and future services.
- If there are 5 fixes in one version, push it to the next version (increment/bump version).
- If there is a new feature implementation, push it to the next version (increment/bump version).

## Worktrees And Branch Scope

- Treat each service lane and each named subsection as isolated work. Use separate git worktrees/branches when two efforts target different lanes or different subsections.
- Branches should use the `codex/` prefix unless the user asks for another naming scheme.
- A safe pattern is:
  - `Spice.Home main` -> `codex/spice-home-main`
  - `Spice.Music sec1` -> `codex/spice-music-sec1`
  - `Spice.Music Algorithm` -> `codex/spice-music-algorithm`
  - `Spice.Admin main` -> `codex/spice-admin-main`
  - `Spice.Anime main` -> `codex/spice-anime-main`
  - `Spice.Movie main` -> `codex/spice-movie-main`
- Before editing, check the current branch, worktree, and dirty state. Do not mix unrelated service lanes in one dirty worktree.
- If a task requires multiple lanes, either ask for confirmation or use a dedicated shared/integration lane and record the cross-lane impact in `walkthrough.md`.

## Deriving Scope From Chat Or Branch Names

- Prefer the active chat/thread name when it identifies a lane. Normalize spaces, periods, dashes, and slashes.
- `Spice.<Service> main` means the main surface for that service only.
- `Spice.<Service> sec1`, `Spice.<Service> sec2`, and later numbered sections mean only that service subsection.
- Named minor branches such as `Spice Music Algorithm` mean only the named feature area inside the owning service.
- If the chat name is ambiguous, infer scope from the explicit user request, current branch name, and touched files. If it is still unclear, ask before editing cross-lane files.

## Service Lanes

### Spice.Home main

- Owns the public home page at `spice-app.xyz` and `www.spice-app.xyz`.
- Primary files are the host routing/metadata for the apex home and the marketing home UI, currently `apps/backend/app/page.tsx`, `apps/backend/app/marketing-home.tsx`, and `apps/backend/app/marketing-home.module.css`.
- Do not change the Music player, Anime surface, Admin dashboard, playback algorithms, account operations, or service internals from this lane unless the request explicitly includes cross-lane coordination.

### Spice.Music main

- Owns SPICE Music at `music.spice-app.xyz` and the local music app experience.
- Primary areas include the music player UI, music storage, search, playback, provider integrations, recommendations visible to listeners, and music-source packages.
- Avoid touching Home landing copy, Anime pages, Admin dashboard, and admin-only operations unless the request explicitly requires a shared change.

### Spice.Music Algorithm

- A minor Music lane for recommendation, ranking, search-quality, taste-profile, and playback-selection logic.
- Keep UI edits minimal and only when needed to expose or test algorithm behavior.
- Do not bundle broad player redesigns, Home changes, Anime changes, or Admin operations into this lane.

### Spice.Admin main

- Owns administration, account governance, admin-only changelog behavior, service operations, database/admin migrations, and in-app DevOps.
- Primary areas include `apps/backend/app/admin-dashboard`, account role/auth helpers, admin-only APIs, operational docs, and release/admin visibility controls.
- Do not change public Home, Music, or Anime UX except for access guards, admin links, or explicit coordination points.

### Spice.Anime main

- Owns Spice Anime at `anime.spice-app.xyz` and the local `/anime` preview.
- Primary files are currently `apps/backend/app/spice-anime.tsx`, `apps/backend/app/spice-anime.module.css`, `apps/backend/app/anime`, Anime host routing/metadata, and Anime assets under `apps/backend/public/anime`.
- Do not change Music playback, Home landing, or Admin surfaces unless the request explicitly calls for a shared integration.

### Spice.Movie main

- Owns Spice Movie at `movie.spice-app.xyz` and the local `/movie` preview.
- Primary files are currently `apps/backend/app/spice-movie.tsx`, `apps/backend/app/spice-movie.module.css`, `apps/backend/app/movie`, Movie host routing/metadata, and Movie assets under `apps/backend/public/movie`.
- Do not change Music playback, Anime pages, Home landing, or Admin surfaces unless the request explicitly calls for a shared integration.

## Future Services And Sections

- New services should follow the same pattern: `Spice.<Service> main` for the main service surface, then `Spice.<Service> sec1`, `Spice.<Service> sec2`, or named minor branches for isolated feature areas.
- Add a service lane section here when a new service becomes real enough to have its own host, route, or persistent workstream.
- Register cross-service launch links through the Home lane only when the task is explicitly about discovery, routing, or the service hub.

## Shared Code

- Shared files such as routing, changelog parsing, auth/session helpers, database schema, provider clients, and root package config can affect multiple lanes. Edit them carefully and document the affected lanes in `walkthrough.md`.
- Keep shared changes as small as possible. If shared behavior is only needed by one service, keep the public API narrow and avoid pulling unrelated services into the change.
- When tests exist for the touched shared area, run the focused tests plus any lane-specific checks that cover the changed behavior.

## Rule For Asynchronous Agents Working In The Same Repo
- Avoid overlapping file modifications by strictly adhering to branch scoping.
- If multiple agents are working, only edit files strictly within your assigned lane's directory unless there is an explicit instruction otherwise.
- Coordinate shared file edits (e.g., `package.json`, root `walkthrough.md`, `AGENTS.md`) using strict string replacements or smaller patches rather than complete file overwrites to reduce merge conflicts.
- Prefer updating specific blocks or appending instead of relying on exact line numbers.
- Ensure that you read the latest `main` state before submitting PRs when asynchronous agents are modifying `walkthrough.md` to avoid truncating concurrent changes.
