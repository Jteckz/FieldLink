# Tanzania Student Opportunity & Internship Platform - Phase 1 (MVP)

Django + Django REST Framework modular monolith. API-first: the React client (and later
mobile/USSD) consume `/api/v1/`. Full spec: see the developer specification document.

## Quick start (local, SQLite)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements/dev.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo          # taxonomy + demo admin/student/org (DEBUG only)
python manage.py runserver
```

- API docs (Swagger): http://localhost:8000/api/docs/
- Django admin (moderation, taxonomy): http://localhost:8000/django-admin/
- Demo logins (password `Demo-Pass-12345`): `admin@demo.tz`, `student@demo.tz`, `hr@demo.tz`
- Real admin: `python manage.py createsuperuser` then `python manage.py seed_taxonomy`

## Docker (PostgreSQL)

```bash
cp .env.example .env
docker compose up --build
docker compose exec web python manage.py createsuperuser
docker compose exec web python manage.py seed_taxonomy
```

## Tests

```bash
python -m pytest
```

## Layout

```
config/            settings (base/development/production/test), urls
apps/
  accounts/        custom email User, roles, JWT auth, suspend/reactivate
  taxonomy/        institutions, courses, skills, industries, locations, opportunity types
  profiles/        StudentProfile, skills, preferences, CV upload + protected download
  organizations/   Organization, membership, verification workflow
  opportunities/   Opportunity + requirements, lifecycle, search/filter
  applications/    Application, status workflow, events, saved opportunities
  moderation/      admin API + AdminActionLog audit trail
  analytics/       platform statistics
  matching/ notifications/ verification/ integrations/   scaffolds for later phases
common/            exceptions, permissions, pagination, storage, validators, constants
tests/             pytest suite (per-app + end-to-end MVP acceptance)
docs/PHASE1_CHECKLIST.md   acceptance criteria mapping + design decisions
```

Each app: `models` -> `services` (writes / business rules) -> `selectors` (reads)
-> `serializers` / `views` / `urls` / `permissions`. Keep logic out of views.

## Endpoints (all under `/api/v1/`)

| Area | Endpoints |
|---|---|
| Auth | `POST auth/register/`, `auth/login/`, `auth/refresh/`, `auth/logout/`, `GET auth/me/` |
| Taxonomy (public) | `taxonomy/{institutions,courses,skills,industries,locations,opportunity-types}/` |
| Student | `students/me/`, `students/me/profile/`, `students/me/skills/` (PUT), `students/me/preferences/`, `students/me/cv/` (multipart), `students/me/saved-opportunities/` |
| CV download | `documents/cvs/{id}/download/` (owner, applied-to org, admin) |
| Discover | `opportunities/` (`q, type, location, region, course, skill, study_level, industry, is_paid, is_remote, deadline_before/after, ordering, page, page_size`), `opportunities/{id}/` |
| Apply / save | `POST opportunities/{id}/apply/`, `POST|DELETE opportunities/{id}/save/`, `applications/`, `applications/{id}/`, `POST applications/{id}/withdraw/` |
| Organization | `organizations/me/` (POST create, PATCH), `POST organizations/me/submit-verification/`, `organizations/` (verified directory) |
| Org opportunities | `organizations/me/opportunities/` CRUD + `POST {id}/submit|unpublish|close|archive/` |
| Org applications | `organizations/me/applications/`, `{id}/`, `POST {id}/status/` `{status, note}` |
| Admin | `admin/users|organizations|opportunities/` (+ `approve|reject|suspend|reactivate`), `admin/audit-log/`, `admin/stats/` |

Errors always look like `{"error": {"code", "message", "details"}}`.

## Lifecycles

Opportunity: `draft -> pending_review -> published -> closed/expired -> archived` (+ `suspended`).
Application: `submitted -> reviewing -> shortlisted -> interview -> accepted`, `rejected` from any active
stage, `withdrawn` by the student from `submitted/reviewing`. Every change is stored as an `ApplicationEvent`.

## Scheduled job

`python manage.py expire_opportunities` (daily) marks past-deadline opportunities `expired`.
Expired ones are already hidden and un-applyable even before the job runs.
