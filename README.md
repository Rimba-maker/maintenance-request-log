# Maintenance Request Log

An internal web app for a factory: **operators** raise maintenance requests when a machine has a problem, **supervisors** approve or reject them, and **admins** manage users and records.

Built for the PT. Hirose Electric Indonesia take-home test (Full Stack Engineer).

## Quick start

Requires Docker with Compose v2.

```bash
cp .env.example .env
docker compose up --build
```

Open <http://localhost:8080>. Database migrations and seed data run automatically on start; there are no other manual steps.

Stop with `Ctrl+C`. Add `-v` to `docker compose down` to also delete the database volume.

### Development without Docker

To work on the code, or just look at the app, without Docker or a Postgres install, run the API on an in-memory PostgreSQL (data is lost on restart) and the web dev server in two terminals:

```bash
cd apps/api && npm ci && npm run dev:mem   # API on http://localhost:3000
cd apps/web && npm ci && npm run dev       # UI on http://localhost:5173, proxies /api to the API
```

## Seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `Admin123!` |
| Supervisor | `supervisor@example.com` | `Supervisor123!` |
| Operator | `operator@example.com` | `Operator123!` |

A few sample requests (submitted, approved, rejected) are seeded too. These are demo credentials only; change or remove them before any real use.

## Try the API directly

The API is served under `/api` on the same port as the UI. Sessions use a cookie, so keep a cookie jar:

```bash
BASE=http://localhost:8080/api

# Log in as the operator
curl -c op.jar -H 'content-type: application/json' \
  -d '{"email":"operator@example.com","password":"Operator123!"}' $BASE/auth/login

curl -b op.jar $BASE/requests                       # only the operator's own requests
curl -b op.jar -X POST $BASE/requests/<id>/review \
  -H 'content-type: application/json' -d '{"decision":"approved"}'   # 403: operators cannot review
curl -b op.jar $BASE/users                          # 403: admin only
```

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/login`, `/api/auth/logout` | anyone |
| GET | `/api/auth/me` | signed in |
| GET | `/api/requests?status=&priority=` | signed in (operators see only their own) |
| POST | `/api/requests` | signed in |
| GET | `/api/requests/:id` (includes status history) | if visible to you |
| PATCH | `/api/requests/:id` | own request while `submitted`, or admin |
| POST | `/api/requests/:id/review` `{decision}` | supervisor, admin |
| DELETE | `/api/requests/:id` | admin |
| GET, POST | `/api/users` | admin |
| PATCH | `/api/users/:id` (edit, deactivate) | admin |
| GET | `/api/health` | anyone |

Errors look like `{ "error": { "message": "...", "details": [...] } }` with `400` validation, `401` not signed in, `403` forbidden, `404` not found (or not visible to you), `409` conflict.

## Architecture

```
Browser ──▶ nginx (web) ──▶ Hono API ──▶ PostgreSQL
            static Vue SPA     /api
```

| Layer | Choice |
|---|---|
| Frontend | Vue 3 + Vite + vue-router (single-page app, served by nginx) |
| Backend | Hono (TypeScript) on Node |
| Database | PostgreSQL, Drizzle ORM, SQL migrations applied at API start |
| Validation | Zod, on the server |
| Auth | JWT in an httpOnly, SameSite=Lax cookie; passwords hashed with bcrypt |

The API is layered so each file has one job, and dependencies only point inward:

```
routes  →  service  →  repo  →  database
              ↓
        domain (types + permissions)
```

- `routes.ts`: HTTP only (parse, validate, respond). No business rules.
- `service.ts`: all business rules; every permission check happens here.
- `repo.ts`: database queries only.
- `domain/permissions.ts`: the permission matrix as pure functions. **The single place that decides who may do what.**
- `app.ts`: the composition root, where repos, services and routes are wired together.

```
apps/api/src   domain/  db/  modules/{auth,users,requests}/  shared/  config/  app.ts  seed.ts  index.ts
apps/api/tests permission matrix + behaviour tests
apps/web/src   api/  views/  components/  router.ts  session.ts
docs/decisions.md   every decision the brief left open
```

### Key decisions

The brief left some behaviour open. Each choice, with reasoning, is in [`docs/decisions.md`](docs/decisions.md). The main ones:

- **Session:** the JWT is stateless, but the user is reloaded from the database on every request. Deactivating a user or changing their role takes effect immediately, even for a session that is already open.
- **403 vs 404:** if you may not *view* a request, it is a `404` (its existence is not revealed). If you may view it but not perform the action, it is a `403`.
- **Reviews:** a reviewed request can be re-reviewed (`Approved` ↔ `Rejected`); each review is recorded. Editing a request never changes its status; status only changes through the review endpoint.
- **Deleting:** hard delete, admin only. Users are never deleted, only deactivated. An admin cannot deactivate themselves or change their own role.
- **Permissions in the UI:** the API tells the UI what the current user may do with a request (`can.edit`, `can.review`, `can.delete`), so the rules are not duplicated in the frontend. The UI only hides buttons; the server enforces everything.

### User interface

Swiss-style minimalism for a dense internal tool: green for operational, red for incidents, amber for pending. Choices worth knowing about:

- **Status is never colour alone.** Status and priority badges carry an icon and a text label.
- **Accessible by default.** Skip link, visible focus rings, labelled fields with inline errors, focus moved to the first invalid field, page titles and focus reset on navigation, native `<dialog>` for confirmations (focus trap, Esc), and reduced-motion support.
- **Light and dark themes** follow the OS setting. All colours are tokens in `apps/web/src/styles/tokens.css`; every text and control pair was checked against WCAG AA contrast.
- **Responsive.** Tables become stacked cards on phones; there is no horizontal page scroll from 375px up.
- **Fonts are self-hosted** (Fira Sans and Fira Code, via `@fontsource`), so the app makes no external requests and works on an isolated factory network.

Verified in a real browser (Playwright): the full role flows, light/dark, phone/tablet/desktop, and an axe-core scan with zero violations. That browser suite is not part of the repository.

## Tests

```bash
cd apps/api
npm ci
npm test
```

No Docker needed: the tests run the real app against an in-memory PostgreSQL (PGlite), migrated and seeded exactly like production. They call the API directly and cover every row of the permission matrix (P-1 to P-8), plus authentication, validation, deactivation, list filters and the audit trail.

## Jenkinsfile

The pipeline is declarative and is read, not run, by reviewers. Stages:

| Stage | What it does |
|---|---|
| **Verify** (API and Web in parallel) | Independent checks, run at the same time inside a `node:24-slim` container. |
| API: install | `npm ci`, an exact, reproducible install from the lockfile. |
| API: typecheck | `tsc --noEmit`, catches type errors without producing output. |
| API: test | Runs the Vitest suite, including the permission-matrix tests. A permission regression fails the build here. |
| API: build | Compiles TypeScript to `dist/`, proving the production build works. |
| Web: install | `npm ci` for the frontend. |
| Web: build | `vue-tsc` type check followed by the production Vite build. |
| **Compose smoke test** | Copies `.env.example` to `.env`, runs `docker compose up -d --build --wait` and calls `/api/health`. This checks the actual deliverable: a clean start with no manual steps. `docker compose down -v` always runs afterwards. It uses port 18080 so it does not clash with other jobs on the agent. |

## Optional tasks attempted

- **Automated tests (permission matrix):** see [Tests](#tests).
- **Audit trail:** every status change (including the initial `submitted`) is stored with who and when, and shown as a history on the request detail page.

## Known limitations

- A supervisor or admin can approve a request they created themselves (the brief's matrix does not exclude it). Blocking it would be one check in `requests/service.ts`.
- An admin editing an already-approved request does not reset its status.
- Deleting a request also deletes its status history.
- Logout removes the cookie only; a stolen token stays valid until it expires (8 hours), although a deactivated user is rejected immediately.
- The request list is not paginated.
- Seeded demo accounts have well-known passwords.
- Login has no rate limiting.

## What I would do next

Server-side pagination and search on the list, login rate limiting, soft delete so audit history survives deletion, and an audit entry for content edits (not only status changes).

## AI Disclosure

**Tools yang saya pakai, dan di bagian mana kepake.** Saya pakai Claude Code (CLI assistant dari Anthropic) dari awal sampai akhir project ini — mulai dari baca brief PDF, bandingin opsi stack (Vue+Hono vs alternatif lain, lengkap dengan cek dokumentasi library terkini), sampai generate boilerplate: modul API (`domain/permissions.ts`, layer service/repo), test suite, UI Vue, Dockerfile, Jenkinsfile, dan draft awal README ini. Jadi hampir semua "tulang" project ini lahir lewat sesi kerja bareng AI, tapi keputusan arsitektur dan review tiap baris tetap di tangan saya.

**Kenapa AI buat bagian-bagian itu, dan kenapa sisanya saya pegang sendiri.** Yang saya delegasikan ke AI itu kerjaan yang boilerplate-heavy tapi butuh konsistensi tinggi — nulis 21 commit atomic dengan pesan yang jelas, bikin skema Drizzle + migration, nulis Zod validator buat tiap endpoint, styling token light/dark. Itu kerjaan yang gampang meleset kalau dikerjain manual pas capek, tapi gampang saya review begitu jadi. Yang saya pegang sendiri: desain permission matrix (siapa boleh ngapain), keputusan 403 vs 404, dan yang paling penting — saya baca ulang tiap modul sebelum diterima, karena ini yang bakal saya jelasin langsung pas interview.

**Kasus saya reject/rewrite hasil AI (di kode).** Draft awal form edit request di frontend ngirim seluruh object request (termasuk field `status`, `id`, sampai history) balik ke API pas nge-save. Padahal API-nya sengaja strict — field itu cuma boleh diubah lewat endpoint `/review`, bukan `PATCH` biasa. Hasilnya tiap save gagal `400`. Ketauannya pas saya coba pakai app-nya beneran di browser (bukan cuma baca kode), lalu formnya saya minta diperbaiki supaya cuma kirim 3 field yang memang boleh diedit (`machineId`, `description`, `priority`).

**Kasus lain, di luar kode (H-0 sebelum deadline).** Waktu verifikasi `docker compose up --build` di GitHub Codespaces, semua container "sehat" satu-satu tapi API-nya nggak bisa connect ke database — timeout total, padahal db-nya jelas jalan. AI-nya sempat mau langsung "fix" dengan buka semua firewall rule (`iptables -P FORWARD ACCEPT`), yang saya tolak karena itu pelemahan keamanan yang nggak perlu buat masalah yang sebenarnya cuma butuh 2 baris rule spesifik. Setelah didebug bareng sampai ke level iptables, ternyata itu bug bawaan environment Codespaces-nya sendiri (dua ruleset firewall yang bentrok: iptables-legacy vs nftables), bukan bug di `docker-compose.yml` saya — jadi fix-nya di-scope cuma buat network compose ini, dan hilang begitu Codespace-nya dimatikan.
