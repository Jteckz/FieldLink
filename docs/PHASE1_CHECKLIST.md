# Phase 1 - MVP status

Spec section 28 acceptance criteria -> where it is implemented / tested.

| Criterion | Implementation | Test |
|---|---|---|
| Student registers, completes profile, uploads CV | `accounts`, `profiles` | `tests/test_mvp_acceptance.py`, `tests/profiles/` |
| Organization registers and creates an opportunity | `organizations`, `opportunities` | `tests/organizations/`, `tests/opportunities/` |
| Admin moderates and publishes | `opportunities.services.admin_action`, `moderation` API + Django admin | `tests/moderation/`, lifecycle tests |
| Student finds it by search/filter | `opportunities.filters.OpportunityFilter` | `TestDiscovery` |
| One application per opportunity | `UniqueConstraint` + service check (409) | `test_only_one_application...`, `test_db_constraint...` |
| Org sees application and changes status | `applications` org viewset + `TRANSITIONS` | `TestStatusWorkflow` |
| Student sees updated status (+ history) | `ApplicationEvent` | `test_happy_path_and_student_sees_it` |
| Private CVs / org data protected | private storage, `can_download_cv`, scoped querysets | `TestCV`, `test_other_org_and_other_student...` |
| Expired/closed cannot receive applications | `apply_to_opportunity` checks status + deadline | `test_cannot_apply_after_deadline`, `...non_published` |
| Automated tests cover critical workflows | `pytest` (68 tests) | `python -m pytest` |

## Deliberate MVP decisions
- Org "publish" = submit for moderation. Auto-publish for verified orgs exists behind `AUTO_PUBLISH_VERIFIED_ORGS` (default off).
- Opportunities are editable only while DRAFT, so published content cannot change without re-moderation.
- Eligibility is explicit (student/graduate flags, minimum study level, minimum year) and enforced on apply. Course/skills are informational until Phase 2 matching.
- A withdrawn application still counts as "applied" (no re-apply), keeping the audit trail simple.
- CV upload is optional to apply by default (`APPLICATION_REQUIRES_CV=true` to require it).
- Education history / StudentPreference from the data-model table are folded into `StudentProfile` fields for the MVP.
- Deadlines are dates in Africa/Dar_es_Salaam; applications are accepted through the end of the deadline day.

## Not in Phase 1 (per spec section 27)
Matching, AI, notifications, scraping/aggregation, USSD, mobile app, university role, React client.

## Before production
- Point `common.storage.get_private_storage` at a private S3-compatible bucket with signed URLs.
- Run `python manage.py expire_opportunities` daily (cron) until Celery beat exists.
- Set `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DATABASE_URL`, HTTPS; schedule PostgreSQL backups and test a restore.
- Test against PostgreSQL (the suite runs on SQLite for speed).
