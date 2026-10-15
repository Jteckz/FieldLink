# Local Runbook — full stack with Docker backend

> Backend runs in Docker (PostgreSQL + Django). Frontend runs with Vite on the host
> and talks to the backend over HTTP.

## Ports (this machine)

| Service | URL | Note |
|---|---|---|
| Backend API | `http://localhost:8001/api/v1` | Container port 8000 → host **8001** (see below) |
| Swagger docs | `http://localhost:8001/api/docs/` | Live API reference |
| Django admin | `http://localhost:8001/django-admin/` | Taxonomy moderation |
| Frontend | `http://localhost:5173` | Vite dev server |

Host port **8000 is taken by another app** on this machine, so
`docker-compose.override.yml` republishes the backend on **8001**
(Compose loads the override file automatically). If port 8000 is free on
another machine, delete the override file and use port 8000 everywhere
(`VITE_API_BASE_URL=http://localhost:8000/api/v1`).

## First-time setup (already done here, for reference)

```bash
cp .env.example .env                                  # repo root, backend env
docker compose build                                  # ~10 min first time (309 MB context)
docker compose up -d
docker compose exec web python manage.py seed_demo    # taxonomy + demo accounts
```

Demo logins (password `Demo-Pass-12345`): `admin@demo.tz`, `student@demo.tz`, `hr@demo.tz`

## Everyday commands (backend)

```bash
docker compose up -d          # start (db + backend)
docker compose ps             # check status
docker compose logs -f web    # watch backend logs (Ctrl+C to detach)
docker compose down           # stop everything (data persists in volumes)
docker compose down -v        # stop AND wipe database (fresh start; re-run seed_demo after)
docker compose exec web python manage.py seed_demo   # reload demo data anytime
docker compose exec web python manage.py createsuperuser  # extra admin
```

Backend code changes apply live (`.` is volume-mounted); the dev server auto-reloads.

## Frontend

```bash
cd fieldlink_ui
npm install                   # first time only
npm run dev                   # http://localhost:5173
```

`fieldlink_ui/.env` already points at the Docker backend:

```bash
VITE_API_BASE_URL=http://localhost:8001/api/v1
VITE_USE_MOCK=false           # living backend; set true only for offline UI work
```

Other useful commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test`.

## Manual test tour (seeded data)

1. Open `http://localhost:5173`, browse `/opportunities` and `/organizations` anonymously.
2. Log in via the demo-fill buttons on `/login`.
3. Student (`student@demo.tz`): dashboard checklist → complete profile → skills → CV upload → save + apply → track in `/applications`.
4. Organization (`hr@demo.tz`): `/org` dashboard → verification → new opportunity → submit → review applications → change status.
5. Admin (`admin@demo.tz`): `/admin` stats → approve orgs/opportunities → audit log.

## Troubleshooting

- `address already in use` on start → another service grabbed the port; check `ss -tlnp | grep 8001`.
- Backend 500s → `docker compose logs web` (migrations run automatically via entrypoint).
- Frontend shows empty/error states → confirm backend is up: `curl http://localhost:8001/api/v1/taxonomy/skills/?page_size=1`.
- Login fails for a freshly registered user → check the user is active (Django admin or shell).
