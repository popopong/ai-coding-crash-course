# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Cadence is a course platform (a mini Udemy): React Router v7 in framework mode with SSR, TypeScript, SQLite through Drizzle ORM, Tailwind v4, and shadcn/ui components in `app/components/ui`.

## Commands

- `npm run dev` — dev server at `http://localhost:5173`
- `npm run typecheck` — generates route types (`react-router typegen`), then runs `tsc`
- `npm test` — all tests; `npx vitest run app/services/courseService.test.ts` for one file, add `-t "<test name>"` for one test

## Architecture

- **Routes** — registered explicitly in `app/routes.ts`; file names in `app/routes/` do not drive routing. Each route imports its types from `./+types/<route-file>`, which `typecheck` regenerates. Loaders and actions validate input with zod via `parseParams` and `parseFormData` from `app/lib/validation.ts`; actions with several forms branch on an `intent` discriminated union.
- **Services** — `app/services/*Service.ts` hold all database access as plain synchronous functions (better-sqlite3 is synchronous). Services take positional parameters — the project convention.
- **Access control** — `app/lib/access.server.ts` answers who the user is and what they may do with a course (`getAccess` plus `require*` wrappers). So far only `courses.$slug.lessons.$lessonId.tsx` and `instructor.questions.tsx` use it.
- **Users** — there is no real authentication. The session cookie (`app/lib/session.ts`) stores a `userId`, and the dev UI switches between seeded users through `api.switch-user`.
- **Database client** — `app/db/index.ts` opens the connection lazily and must stay free of side effects, so Rollup can drop it (and better-sqlite3) from the client bundle.

## Tests

Service tests run against a fresh in-memory database per test, built from the real migrations in `drizzle/`. The pattern, from any `app/services/*.test.ts`:

- `vi.mock("~/db", () => ({ get db() { return testDb; } }))` — redirects the service's `db` import to the test database.
- `beforeEach`: `testDb = createTestDb(); base = seedBaseData(testDb);` — both from `app/test/setup.ts`.

## Pointers

- **Seed script** — [`scripts/seed.ts`](scripts/seed.ts) defines the database's starting data and rebuilds it on every run. Update it in the same change as every edit to `app/db/schema.ts`.
