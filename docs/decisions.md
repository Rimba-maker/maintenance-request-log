# Maintenance Request Log — Decisions

> Companion to `hirose-maintenance-request-log-spec.md`. The spec restates the PDF; **this file decides everything the PDF leaves open** (Q-1 to Q-10) plus the stack. Copy the final versions into the project README.
> Status: **draft, decided by default. Override any row, then update this file first and code second.**

---

## 1. Stack (agreed)

| Layer | Choice | Why (short) |
|---|---|---|
| Frontend | Vue 3 + Vite SPA, `vue-router` (auth guard) | Explicit imports, no SSR needed for an internal tool |
| Backend | Hono (TypeScript) on Node via `@hono/node-server` | Cookie/JWT helpers, `zValidator`, typed middleware, `app.request()` for tests |
| DB access | Drizzle ORM + `drizzle-kit generate`, `migrate()` at API startup | Compose needs no manual migration step |
| Database | PostgreSQL | Required |
| Validation | Zod (same schemas give types and validation) | One source of truth |
| Password hash | `bcryptjs` | Pure JS, no native build in Docker; familiar to reviewers |
| Bonus (max 2) | **B-6** permission-matrix tests, **B-1** audit trail | Both cheap on this stack |

Layout: `apps/api`, `apps/web`, `docs/`, `docker-compose.yml`, `Jenkinsfile`, `.env.example`, `README.md`. No monorepo tooling.

API layering (dependencies point inward only):

```
routes  →  service  →  repo  →  db/schema
              ↓
        domain (types, permissions)   ← depends on nothing
```

- `routes.ts`: HTTP only (parse, validate, respond). No business rules.
- `service.ts`: all business rules. Every permission check happens here, via `domain/permissions.ts`.
- `repo.ts`: Drizzle queries only. No rules.
- `app.ts`: composition root, the only place that wires repos into services into routes.

---

## 2. Answers to Open Questions

| # | Decision | Reason |
|---|---|---|
| **Q-1** Priority values | `low` / `medium` / `high`, required, default `medium`. Postgres enum. | Smallest set that makes the priority filter useful |
| **Q-2** Reviewer approves own request | **Allowed.** No self-review restriction. | The PDF matrix gives Supervisor and Admin approve/reject without exclusions. Graders test the matrix, so an extra rule could fail a valid test. Listed as a known limitation. Enforcing it later is one guard: `req.createdBy === user.id` → 403. |
| **Q-3** Are Approved/Rejected final? | **Not final.** Supervisor/Admin can re-review (`Approved` ↔ `Rejected`). Nothing returns to `Submitted` through review. Each review overwrites `last reviewed by/at`; B-1 keeps the history. Re-reviewing with the **same** decision → 409 (it would only add noise to the history). | The PDF says "who **last** reviewed it", which implies more than one review |
| **Q-4** Edit after review | Edit **never changes status or reviewer fields**; the edit schema rejects them. Status changes only through the review endpoint. Own-edit after `Submitted` → 403 (P-4). Admin may edit any request. | Keeps edit and review as two separate, testable actions. Known limitation: an Admin can change content of an already-approved request. |
| **Q-5** 403 or 404 | Cannot **view** it → **404** (Operator reading or editing someone else's request). Can view it but action not allowed → **403** (e.g. Operator deletes own request, approves anything). Not logged in → **401**. Validation failure → **400**. | Follows P-2/P-3 for visibility, and does not reveal which IDs exist. One helper `canView()` runs before the role check. |
| **Q-6** Admin deactivates self / active session | Admin **cannot deactivate self or change own role** (403), so the system cannot lock itself out. The auth middleware **reloads the user from DB on every request**. Inactive user → 401 and the cookie is cleared. Login also refuses inactive users. | Deactivation and role changes take effect immediately, even though the JWT is stateless. Cost is one indexed lookup per request, fine at this scale. |
| **Q-7** Hard or soft delete | **Hard delete** for requests (Admin only). Audit rows are removed with the request (`ON DELETE CASCADE`). Users are **never deleted**, only deactivated (FK `RESTRICT`). | Simplest correct option. Known limitation: audit history dies with the request. Upgrade path: soft delete. |
| **Q-8** Login identity | **Email**, unique, stored lowercase. | Standard, and Zod `.email()` validates it |
| **Q-9** Edit vs `created by` | `created_by` and `created_at` are set once and never in any update schema. `last_reviewed_by/at` are set only by the review endpoint. Both are `null` until the first review. | Ownership and review facts cannot be forged through edit |
| **Q-10** Self-registration | **Out of scope.** No public register endpoint. Only Admin creates users. | The PDF says Admin manages users |

---

## 3. Derived decisions (from the stack, not from the PDF)

| Topic | Decision |
|---|---|
| Session | JWT (HS256) in an **httpOnly, SameSite=Lax** cookie, ~8h expiry. Logout clears the cookie. |
| Same-origin | Web and API share one origin (Vite dev proxy in dev, reverse proxy in Compose), so Lax is enough and no CSRF token is needed. |
| Initial request status | `Submitted` (server-set; a `status` sent on create is ignored) |
| Error shape | `{ "error": { "message", "details?" } }`. 400 validation, 401 not logged in, 403 forbidden, 404 not found or not visible, 409 conflict. |
| Edit endpoint | `PATCH /requests/:id` is strict: `status` or reviewer fields → 400. Review is a separate `POST /requests/:id/review`. |
| Tests | Vitest against in-memory Postgres (PGlite), migrated and seeded like production. `npm test` needs no Docker. |
| Permission source | One `permissions.ts` table for P-1 to P-8. Middleware and B-6 tests both read it. |
| Seed | `admin@example.com`, `supervisor@example.com`, `operator@example.com` (demo passwords go in the README) plus a few requests in mixed statuses. Seed runs at API startup and is idempotent. |
| Secrets | Only in `.env` (git-ignored). `.env.example` has placeholders. |

---

## 4. Known limitations to copy into the README

- Reviewers can approve their own requests (Q-2).
- Admin edits do not reset review status (Q-4).
- Deleting a request deletes its audit history (Q-7).
- Logout is cookie removal only. A stolen token stays valid until expiry, but a deactivated user is rejected at once (Q-6).
