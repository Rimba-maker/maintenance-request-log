# Maintenance Request Log

Vue 3 SPA (`apps/web`) + Hono API (`apps/api`) + PostgreSQL. Full context: `README.md`, decisions in `docs/decisions.md`.

## Commands

```bash
cd apps/api && npm test            # permission matrix + behaviour (in-memory Postgres, no Docker)
cd apps/api && npm run dev:mem     # dev API on in-memory Postgres (no Docker); pair with `cd apps/web && npm run dev`
cd apps/api && npm run typecheck
cd apps/api && npm run db:generate # after editing src/db/schema.ts, commit the new drizzle/ migration
cd apps/web && npm run build       # vue-tsc typecheck + vite build
docker compose up --build          # whole app, needs `cp .env.example .env` first
```

## Architecture rules (please keep)

- API layering is `routes → service → repo`, with `domain/` at the centre. Dependencies point inward only.
  - `routes.ts`: HTTP only. No business rules, no database access.
  - `service.ts`: business rules. **Every permission check lives here**, using `domain/permissions.ts`.
  - `repo.ts`: Drizzle queries only. No rules.
- `domain/permissions.ts` is the single source of truth for who may do what. Do not re-implement a rule in a route, repo or the frontend.
- The frontend never decides permissions. It shows what the API reports (`can.*` on request detail); the server enforces.
- Wiring happens only in `app.ts`. Services receive their repos as arguments.
- Not-visible resources return 404, visible-but-not-allowed return 403 (see `docs/decisions.md`, Q-5).
- Request edit is strict: `status` and reviewer fields are only changed through `POST /requests/:id/review`.

## Frontend conventions (`apps/web`)

- Styling: colours, radii and shadows come from `src/styles/tokens.css` (light + dark). Never hard-code a colour in a component. Any new colour pair must meet WCAG AA (4.5:1 text, 3:1 controls).
- Shared building blocks live in `src/components/`: `FormField` (label + error wiring), `Badge` (status/priority/role), `ConfirmDialog`, `SegmentedControl`, `AlertBox`, `EmptyState`. Use them instead of re-creating markup.
- Status must be conveyed by text or an icon, never by colour alone.
- Success feedback goes through `notify()` from `src/toast.ts`; failures are shown inline (`AlertBox`, `FormField`).
- Icons come from `@lucide/vue` (not the deprecated `lucide-vue-next`). No emoji as icons.

## Conventions

- Validation is Zod, at the route (`shared/validate.ts` gives the standard 400 shape). Expected failures are thrown as `AppError` from `shared/errors.ts`.
- Relative imports in `apps/api` end in `.js` (NodeNext). `apps/web` uses extensionless imports.
- Any change to a permission rule needs a matching test in `apps/api/tests/permissions.test.ts`.
- Keep it small: no new dependency or abstraction without a concrete need.
- `apps/web` pins TypeScript 5 because `vue-tsc` does not support TypeScript 7 yet. Do not "upgrade" it.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
