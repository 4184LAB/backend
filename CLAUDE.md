# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The same file is committed to both the `backend` and `frontend` repositories. Paths below are relative to the shared parent folder (`4184LAB/`) that holds both clones side by side. When you change this file, update the copy in the other repository too.

## Repository layout

Two independent npm projects with no root package.json and no shared code. Run commands from inside each directory.

- `backend/`: NestJS 11 REST API backed by PostgreSQL through Prisma 6.
- `frontend/`: Next.js 16 personal homepage (App Router, Cache Components, React 19, Tailwind 4). **All data and auth come from the backend REST API** (server-side calls, `BACKEND_API_URL`, default `http://localhost:3001/api/v1`). Run the backend before the frontend. A backend API change can break frontend pages, so check `frontend/src/lib/api.ts` and `lib/queries.ts` when you change one.

`frontend/` and `backend/` are meant to be separate git repositories (as of 2026-11-24 neither has been initialized with `git init`). Run git commands (status, commit, branch) inside the matching directory, and keep each commit to changes from one project.

Neither project has `node_modules` installed yet. Run `npm install` in each one first.

## API spec

The API spec lives in `backend/docs/api-spec.md` (backend repository only). Its source is a Notion page: https://app.notion.com/p/4184LAB-4085e0b9df8e8052b347c1f6f635a5a6

**Only read the Notion page. Never edit it**: no content edits, comments, property changes, moves, or deletions. If the spec needs a change, edit `backend/docs/api-spec.md` or tell the user.

## Intentional vulnerabilities (lab project)

The backend is a security lab. Some flaws are deliberate and marked with Korean comments, for example:
- `auth.service.ts` `reissue`: issues a new token from just a `userId`, with no authentication ("의도적인 인증 누락").
- `login`: returns different errors depending on whether the account exists, which lets anyone check if a username is registered.
- `logout`: does nothing on the server, so JWTs are never revoked.
- `file-download.guard.ts`: lets anyone download notice attachments without a token, and passes `filename` straight from the query string into the file lookup.

Do not "fix" these unless asked. When a request is about security, ask or check first whether a flaw is meant to stay.

## Backend (`backend/`)

```bash
docker compose up -d          # Postgres 16; reads POSTGRES_* from .env
npx prisma migrate dev        # apply migrations / create new one after editing schema.prisma
npx prisma generate           # regenerate client
npm run start:dev             # watch mode, default PORT 3001
npm run build                 # nest build -> dist/
npm run lint                  # eslint --fix
npm test                      # jest, *.spec.ts under src/ (none exist yet)
npx jest src/path/to/file.spec.ts   # single test
```

`.env` is required (gitignored). `src/config/env.schema.ts` validates it with zod at startup. Required keys: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, `DATABASE_URL`, `JWT_SECRET`. Optional keys: `PORT`, `POSTGRES_PORT` (15432), `JWT_EXPIRES_IN_SECONDS` (900). The compose healthcheck uses `${POSTGRES_DB}`, which is not the same variable as `POSTGRES_DATABASE`.

Architecture:
- `main.ts` sets the global prefix `api` and URI versioning. Each controller declares `version: '1'`, so routes look like `/api/v1/posts`.
- `src/api/api.module.ts` aggregates the feature modules: `auth`, `user`, `board`, `file`. `PrismaModule` (`src/database`) provides `PrismaService`.
- Validation uses zod, not class-validator. Request bodies use `@Body(new ZodValidationPipe(schema))`, with each schema in the feature's `schema/*.schema.ts`, which also exports the inferred type.
- Auth uses passport-jwt with a Bearer header and HS256. `JwtStrategy.validate` loads the user from the DB and attaches `{id, username, name, role}`. Read it with the `@User()` decorator (`src/common/decorators/user.decorator.ts`) and protect routes with `JwtAuthGuard`.
- The board has a single `Post` model split by `BoardType` (`NOTICE` | `GENERAL`). `notice.controller.ts` and `post.controller.ts` share `BoardService`, passing the type in. Only `ADMIN` can write notices. General posts can be changed only by their author. Deletes are soft deletes (`deletedAt`), and queries filter on `deletedAt: null`.
- Uploads use multer in memory with a 10MB limit, written to `uploads/` (gitignored) under a UUID name. Attachment rows track `storedName`, and downloads go through `/api/v1/files/download?filename=<storedName>`.
- Error messages are in Korean.

## Frontend (`frontend/`)

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

There is no test setup. The first user to sign up becomes admin automatically (the backend `UserService.create` enforces this).

Read `frontend/AGENTS.md`. This Next.js version has breaking changes compared with your training data. Read the docs in `node_modules/next/dist/docs/` before writing Next.js code. `next dev` regenerates that AGENTS.md block, so leave it in place.

Architecture:
- Backend client: `src/lib/api.ts` (`apiFetch`, `server-only`) is the only place that talks to the backend. It attaches the JWT from the `session` cookie and turns backend errors into `ApiError` with the backend's Korean message. Roles are mapped `USER/ADMIN` to `user/admin`.
- Auth (`src/lib/auth.ts`): login stores the backend `accessToken` in an httpOnly `session` cookie (7 days). `getCurrentUser` calls `GET /users/me` and is wrapped in React `cache`. The JWT expires after 15 minutes, so `src/proxy.ts` calls `POST /auth/reissue` when it is within 60s of expiry, and clears the cookie if reissue is rejected.
- Users log in with a username (아이디), not an email. The general board needs login (backend rule). Notices are public, and only admins can write them.
- Mutations are Server Actions in `src/actions/*` that call the backend. Each action checks login itself, and the backend enforces permissions again. Actions take the form `(prevState: FormState, formData) => FormState` (`lib/form-state.ts`) for use with `ActionForm`.
- Reads live in `lib/queries.ts` (backend calls; the board paginates the backend's latest 100 rows on the page). Calls to external APIs (Open-Meteo, exchange rates, GitHub) live in `lib/external.ts`, with a timeout and caching.
- Site name and nav menu: `src/data/site.ts`.
- Route handlers: `/api/health`, `/api/search` and `/api/admin/backup` (both forward to the backend), and `/api/files/download?filename=` (streams the backend download with the cookie's token; `filename` is passed through unchanged so the backend's path-traversal lab still works from the UI).
- Uploads: `serverActions.bodySizeLimit` and `proxyClientMaxBodySize` are 11mb in `next.config.ts` to fit the backend's 10MB limit.
