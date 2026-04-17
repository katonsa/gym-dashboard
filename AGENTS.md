# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 TypeScript app using the App Router. Route groups live in
`app/(auth)` and `app/(dashboard)`, with API handlers under `app/api`. Reusable
UI belongs in `components/`, including shadcn-style primitives in
`components/ui`. Shared logic belongs in `lib/`; dashboard loaders, mappers,
calculations, and types are under `lib/dashboard`, while auth helpers are under
`lib/auth`. Prisma schema, migrations, and seed data live in `prisma/`. Tests
are TypeScript modules in `tests/`, static assets live in `public/`, and project
notes live in `docs/`.

## Build, Test, and Development Commands

- `npm run dev`: start the local Next.js dev server with Turbopack.
- `npm run build`: create a production build.
- `npm run lint`: run ESLint across the repository.
- `npm run typecheck`: run TypeScript with `--noEmit`.
- `npm test`: run the custom TypeScript test entrypoint at `tests/run-tests.ts`.
- `docker compose up -d`: start local Postgres.
- `npx prisma migrate deploy`: apply database migrations.
- `npm run db:seed`: seed the demo owner and dashboard data.

For local setup, start Postgres, apply migrations, seed, then run `npm run dev`.

## Coding Style & Naming Conventions

Use TypeScript and React Server Components by default; add client components only
for browser APIs, state, or event handlers. Prettier uses 2 spaces, no
semicolons, double quotes, LF endings, trailing commas where valid in ES5, and
80-character lines. Tailwind classes are sorted by
`prettier-plugin-tailwindcss`. Use kebab-case filenames such as
`member-create-form.tsx` and PascalCase for exported React components.

## Testing Guidelines

Tests use a lightweight custom runner based on module imports. Add focused
`*.test.ts` files under `tests/`, and import them from `tests/run-tests.ts` so
`npm test` executes them. Favor tests for pure logic in `lib/`, especially
calculations, mappers, and path/auth helpers. Run `npm test`,
`npm run typecheck`, and `npm run lint` before larger changes.

## Commit & Pull Request Guidelines

Git history uses short, imperative subjects such as `Add owner member creation
flow` and `Wire members page to database data`. Keep commits scoped and use the
same style. Pull requests should include a concise summary, verification
commands, linked issue or task context when available, and screenshots for UI
changes. Call out migrations, seed changes, or required `.env` updates.

## Security & Configuration Tips

Do not commit real secrets. Use `.env.example` as the template and keep local
values in `.env`. Review `docs/03-auth-assumptions.md` before changing account
provisioning or owner/member access rules.
