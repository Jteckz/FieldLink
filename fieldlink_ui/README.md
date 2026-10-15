# Fieldlink — Tanzania Student Opportunity Platform (frontend)

React + TypeScript + Vite UI for the Django + DRF backend in this repository.
It lives in `fieldlink_ui/` (the spec's `frontend/` directory under a different name).

## Setup

```bash
cd fieldlink_ui
npm install
cp .env.example .env   # adjust VITE_API_BASE_URL if needed
npm run dev              # http://localhost:5173
```

Backend (from the repository root):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements/dev.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver   # http://localhost:8000
```

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Django API base. A trailing `/api/v1` is auto-handled — never doubled. |
| `VITE_USE_MOCK` | `false` | Set to `true` ONLY for offline UI development. Uses an in-memory mock instead of the living backend. Never use in production. |

CORS is pre-configured on the backend for `http://localhost:3000` and `http://localhost:5173`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (focused unit tests) |

## Demo accounts (local development only)

Password for all seeded accounts: `Demo-Pass-12345`

| Email | Role | Lands on |
|---|---|---|
| `student@demo.tz` | student | `/student` |
| `hr@demo.tz` | organization | `/org` |
| `admin@demo.tz` | admin | `/admin` |

The login screen offers one-click demo fill buttons. Demo credentials are never shipped as production behavior.

## Role journeys

- **Anonymous**: `/` landing → `/opportunities` (keyword/type/location/industry/study-level/paid/remote/deadline/ordering filters in URL) → `/opportunities/:id` → `/organizations` → `/organizations/:id`. Saving/applying redirects to login.
- **Student** (`/student …`): dashboard with profile-completion checklist → profile → skills (full-replacement list) → preferences (3 independent groups) → CV (signature-validated upload, version history, binary download) → `/saved` → `/applications` → `/applications/:id` (snapshot CV + event timeline + withdraw with consequence warning).
- **Organization** (`/org …`): dashboard (404 profile → onboarding) → verification (description + contact email required before submit) → opportunities (status-separated table, draft-only edit, lifecycle buttons per current status, delete only drafts without applications) → applications (name/opportunity filters, valid-next-status only, attached-CV-only download).
- **Admin** (`/admin …`): stats dashboard with zero-normalized breakdowns → users (suspend/reactivate, admins protected) → organizations (approve/reject/suspend/reactivate, note required for rejection) → opportunities (approve/reject/suspend, notes required) → audit log (action/target filters, `system/unknown` for null actors).

## API alignment notes

- Exact endpoint paths/methods and trailing slashes per `frontend.md` §7. No invented query params (`q` only for public discovery; `search` elsewhere; taxonomy `search` + `ordering=name` + pagination).
- JWT bearer auth; access token in `sessionStorage`, refresh token in `localStorage` (rotation-aware: always replaced after refresh). One silent refresh + one retry on 401, then session clear + login redirect.
- Centralized error normalizer (`src/api/errors.ts`): backend `{error:{code,message,details}}` envelope, `missing_fields`/`reasons` surfacing, special logout shape `{refresh: "Invalid or expired token."}`, HTML/empty/network failures → connectivity message. No tokens or stack traces shown.
- Pagination envelope `count/next/previous/results` everywhere except the documented non-paginated endpoints. Page beyond range → backend 404 shown as an error state with recovery.
- CV upload is `multipart/form-data` with exact field `file`; allowed `.pdf/.doc/.docx`, ≤5MB, nonempty, real-signature checked client-side (PDF `%PDF`, DOCX `PK\x03\x04`, DOC `\xD0\xCF\x11\xE0`). Downloads use the backend `download_url` ID via authenticated blob fetch → object URL → `original_name` → revoke.
- TanStack Query keys namespaced by endpoint/role/filters/pagination/ID; invalidation after every mutation; no optimistic state-machine transitions.

## Known MVP limitations

- **Backend blocker (pre-existing, not a frontend issue): `apps/accounts/serializers.py` line 21 contains a syntax error (`al    low_blank=True`) that prevents the Django server and its test suite from starting at all.** The frontend is complete and builds, but no live-backend verification is possible until that one-character backend fix lands. All endpoint paths were instead verified statically against `apps/*/urls.py`, `views.py`, `filters.py`, and `serializers.py`.
- `university` role has no workflows (reserved for a later phase).
- No matching scores, AI, notifications, scraping, USSD, mobile, payments, email verification, password reset, or taxonomy administration (admin-only via Django admin).
- `VITE_USE_MOCK=true` mock exists only as an offline UI fallback; taxonomy detail resolvers and a few admin niceties (e.g. `is_active` org filter UI) are intentionally minimal.
- Frontend tests cover error normalization, session storage, and status presentation; they do not yet cover full page-level journeys.
