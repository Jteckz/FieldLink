# FRONTEND BUILD PROMPT — Tanzania Student Opportunity & Internship Platform, Phase 1 MVP

You are an autonomous frontend implementation agent. Build a complete, premium-quality MVP web UI that consumes **only** the already-built Django + Django REST Framework backend in this repository.

Do not modify backend code, database behavior, URLs, serializers, permissions, validation, or business rules. Your job is to make the existing backend fully usable through a refined, trustworthy, accessible, responsive, premium-feeling UI.

Treat premium quality as mandatory, not decorative. Every public page, dashboard, form, table, empty state, loading state, error state, and confirmation must look intentional, polished, consistent, and production-ready.

The authoritative backend source of truth is:

- `config/urls.py`
- `apps/*/urls.py`
- `apps/*/serializers.py`
- `apps/*/views.py`
- `apps/*/services.py`
- `apps/*/constants.py`
- `apps/*/models.py`
- `common/exceptions.py`
- `common/pagination.py`
- `common/permissions.py`
- `common/validators.py`
- `config/settings/base.py`
- `tests/test_mvp_acceptance.py`
- `docs/PHASE1_CHECKLIST.md`
- `README.md`

You may also consult the live backend references, but do not call them from application runtime code:

- OpenAPI schema: `http://localhost:8000/api/schema/`
- Swagger UI: `http://localhost:8000/api/docs/`

---

## 1. Mandatory backend-alignment rules

1. Use **exactly** the endpoint paths and HTTP methods listed in this prompt.
2. Preserve trailing slashes exactly. Django routes use trailing slashes.
3. Do not invent query parameters, request fields, response fields, roles, statuses, or endpoints.
4. Do not create a separate frontend data model that contradicts backend field names.
5. Treat backend validation as authoritative. Client-side validation is for UX only.
6. Use living backend data for everything dynamic. Do not hardcode organizations, opportunities, applications, taxonomy, users, CVs, statistics, or audit entries.
7. Respect role permissions in the UI, but never rely on hiding buttons as security. The backend enforces access.
8. Handle backend state-machine errors gracefully because records can change between page load and submission.
9. The only supported self-registration roles are `student` and `organization`.
10. `university` is reserved for a later phase. Do not build university workflows.
11. Do not build matching scores, AI features, notifications, scraping, USSD, mobile apps, payment flows, email verification, password reset, or taxonomy administration.
12. Taxonomy is read-only in the frontend. Taxonomy administration remains in Django admin.

---

## 2. Required technical implementation

Create a new React + TypeScript application in:

```text
frontend/
```

Suggested stack:

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Axios
- React Hook Form
- Zod
- Tailwind CSS
- Vitest and Testing Library for focused frontend tests

If the surrounding project requires a different stack, preserve all endpoint behavior, TypeScript safety, route guards, API error normalization, pagination behavior, and file-download behavior specified here.

Use this structure:

```text
frontend/
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  public/
  src/
    main.tsx
    config.ts
    app/
      providers.tsx
      router.tsx
      guards.tsx
    api/
      client.ts
      errors.ts
      auth.ts
      taxonomy.ts
      students.ts
      opportunities.ts
      applications.ts
      organizations.ts
      admin.ts
    auth/
      session.ts
      RequireAuth.tsx
      RequireRole.tsx
    components/
      layout/
        AppShell.tsx
        Header.tsx
        Navigation.tsx
        PageHeader.tsx
        EmptyState.tsx
        ErrorState.tsx
        LoadingState.tsx
        PaginationControls.tsx
        StatusPill.tsx
      forms/
        FormField.tsx
        FormError.tsx
        SelectField.tsx
        DateField.tsx
        TextAreaField.tsx
      tables/
        DataTable.tsx
    features/
      auth/
        LoginPage.tsx
        RegisterPage.tsx
      discovery/
        OpportunitySearchPage.tsx
        OpportunityDetailPage.tsx
      student/
        StudentDashboardPage.tsx
        StudentProfilePage.tsx
        StudentSkillsPage.tsx
        StudentPreferencesPage.tsx
        StudentCVPage.tsx
        SavedOpportunitiesPage.tsx
        StudentApplicationsPage.tsx
        StudentApplicationDetailPage.tsx
      organizations/
        OrganizationOnboardingPage.tsx
        OrganizationDashboardPage.tsx
        OrganizationVerificationPage.tsx
        OrganizationOpportunityListPage.tsx
        OrganizationOpportunityFormPage.tsx
        OrganizationOpportunityDetailPage.tsx
        OrganizationApplicationListPage.tsx
        OrganizationApplicationDetailPage.tsx
        PublicOrganizationDirectoryPage.tsx
        PublicOrganizationDetailPage.tsx
      admin/
        AdminDashboardPage.tsx
        AdminUsersPage.tsx
        AdminOrganizationsPage.tsx
        AdminOpportunitiesPage.tsx
        AdminAuditLogPage.tsx
    styles/
      globals.css
```

Required scripts, or equivalents:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run"
  }
}
```

Configure the API base URL through an environment variable:

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Compose endpoint URLs carefully. If the configured base URL already ends in `/api/v1`, do not add another `/api/v1` segment.

CORS is already configured by default for:

```text
http://localhost:3000
http://localhost:5173
```

For production, the deployment—not the frontend code—must configure the backend’s allowed frontend origin.

---

## 3. Authentication and session behavior

Use JWT bearer authentication for every non-public request:

```http
Authorization: Bearer <access-token>
```

Implement these exact auth endpoints.

### `POST /auth/register/`

Request body:

```json
{
  "email": "amina@example.com",
  "password": "Strong-Password-123",
  "role": "student",
  "account_type": "student",
  "full_name": "Amina Juma"
}
```

Rules:

- `role` must be either `student` or `organization`.
- Never offer `admin` or `university` during registration.
- Students must supply `full_name`.
- For students, offer `account_type` as either `student` or `graduate`.
- For organizations, send only `email`, `password`, and `role`.
- Backend lowercases email addresses and rejects duplicates.
- Backend applies Django password validation.
- Success returns HTTP 201 with only the created user.
- Registration does **not** return tokens. Send the user to login afterward.

### `POST /auth/login/`

Request body:

```json
{
  "email": "amina@example.com",
  "password": "Strong-Password-123"
}
```

Response shape:

```json
{
  "refresh": "<refresh-jwt>",
  "access": "<access-jwt>",
  "user": {
    "id": 1,
    "email": "amina@example.com",
    "role": "student",
    "is_active": false,
    "date_joined": "2026-10-06T12:00:00+03:00"
  }
}
```

Session rules:

- Keep the access token in memory.
- Persist only the refresh token in browser storage for the MVP.
- Never store passwords.
- Never place tokens in URLs, logs, analytics events, or error reports.
- Access tokens live for 30 minutes.
- Refresh tokens live for 7 days.
- Refresh rotation is enabled: every successful refresh returns a new access token and a new refresh token.
- Always replace the stored refresh token after `/auth/refresh/`.
- Determine the logged-in role from `/auth/me/` or the login response’s `user.role`.
- On an API 401, attempt exactly one silent refresh and retry the original request once.
- If refresh fails, clear the session and redirect to login.

### `POST /auth/refresh/`

Request body:

```json
{
  "refresh": "<current-refresh-token>"
}
```

Successful response contains a new `access` token and rotated `refresh` token.

### `POST /auth/logout/`

Requirements:

- Requires authentication.
- Request body:

```json
{
  "refresh": "<current-refresh-token>"
}
```

- Success returns HTTP 204 with no body.
- Always clear local access and refresh tokens after logout is attempted.
- Handle this special nonstandard backend response for an invalid refresh token:

```json
{
  "refresh": "Invalid or expired token."
}
```

That logout response does **not** use the normal `error` envelope. Treat it as a logged-out/session-expired state.

### `GET /auth/me/`

Returns the authenticated user:

```json
{
  "id": 1,
  "email": "amina@example.com",
  "role": "student",
  "is_active": true,
  "date_joined": "2026-10-06T12:00:00+03:00"
}
```

Use this endpoint for session restoration and role-based routing.

---

## 4. Global API behavior

### Pagination

Most list responses use this exact envelope:

```json
{
  "count": 25,
  "next": "http://localhost:8000/api/v1/opportunities/?page=2",
  "previous": null,
  "results": []
}
```

Rules:

- Default page size is 20.
- Clients may send `page` and `page_size`.
- Maximum `page_size` is 100.
- Render `count`, current page, next/previous controls, and page size.
- A page beyond the final page can return HTTP 404 with `Invalid page.`
- Do not assume one page contains all records.
- For taxonomy dropdowns, request `page_size=100` and follow `next` when present.

These responses are **not** paginated:

- `GET /students/me/`
- `GET /students/me/skills/`
- `GET /students/me/cv/`
- `GET /auth/me/`
- `GET /admin/stats/`
- `POST /opportunities/{id}/save/`
- `POST /organizations/me/submit-verification/`
- Action responses that return an updated object

### Search, filtering, and ordering

Use only the query parameters documented for each endpoint.

Important distinction:

- Public opportunity discovery uses `q`.
- Public organizations, taxonomy, organization opportunities, and organization applications use `search`.
- Do not send `search` to public opportunity discovery.
- Do not send `q` to taxonomy or organization-directory endpoints.

Descending ordering uses a leading hyphen, for example:

```text
?ordering=-published_at
```

Only use ordering fields explicitly listed for each endpoint.

### Error envelope

Handled backend errors use:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed.",
    "details": {
      "email": ["An account with this email already exists."]
    }
  }
}
```

Implement an error normalizer with this behavior:

1. If `response.data.error.code`, `error.message`, and `error.details` exist, use them.
2. If `response.data.details` is an object whose values are arrays, map those arrays to the corresponding form fields.
3. If `error.details` contains `missing_fields`, display every missing field and link to the screen that can complete it.
4. If `error.details` contains `reasons`, display every reason as a list.
5. If the response is HTML, empty, a network failure, a CORS failure, or a timeout, show a generic connectivity error.
6. Handle the special logout shape described above.
7. Never show raw JWTs, stack traces, or unhelpful JSON dumps.

### Known backend error codes

Support at least these codes:

```text
validation_error
bad_request
not_authenticated
permission_denied
not_found
method_not_allowed
throttled
conflict
domain_error
organization_required
organization_exists
profile_incomplete
not_eligible
cv_required
cv_not_found
already_applied
opportunity_not_found
opportunity_not_open
deadline_passed
location_required
not_editable
not_deletable
has_applications
invalid_transition
note_required
invalid_verification_state
cannot_suspend_admin
```

HTTP status codes matter:

- `200`: successful read, update, or state action
- `201`: successful create, application, save, registration, or CV upload
- `204`: successful logout or unsave, with no response body
- `400`: validation or business-rule failure
- `401`: missing, expired, revoked, malformed, or otherwise invalid authentication
- `403`: authenticated but lacking the required role or object permission
- `404`: missing object, inaccessible tenant object, unavailable resource, or page beyond available results
- `405`: unsupported HTTP method
- `409`: duplicate organization profile or duplicate application
- `429`: throttled request

Default backend throttle behavior includes:

```text
200/hour for anonymous requests
2000/hour for authenticated requests
10/minute for auth-scoped endpoints
30/hour for applications
20/hour for CV uploads
```

When throttled, disable repeated automatic retries and tell the user to wait before trying again.

---

## 5. Exact TypeScript contracts

Use these field names exactly. Optional backend values may be `null`; the UI must tolerate `null` and `undefined`.

```ts
export interface ApiList<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiErrorDetails {
  [field: string]: string[] | unknown;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetails | unknown | null;
}

export type Role = "student" | "organization" | "admin" | "university";
export type AccountType = "student" | "graduate";
export type Proficiency = "beginner" | "intermediate" | "advanced";
export type StudyLevel =
  | "certificate"
  | "diploma"
  | "bachelor"
  | "masters"
  | "phd";

export interface User {
  id: number;
  email: string;
  role: Role;
  is_active: boolean;
  date_joined: string;
}

export interface Institution {
  id: number;
  name: string;
  slug: string;
  short_name: string;
}

export interface Course {
  id: number;
  name: string;
  slug: string;
}

export interface Skill {
  id: number;
  name: string;
  slug: string;
  category: string;
}

export interface Industry {
  id: number;
  name: string;
  slug: string;
}

export interface Location {
  id: number;
  name: string;
  region: string;
  slug: string;
}

export interface OpportunityType {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface StudentProfile {
  id: number;
  email: string;
  account_type: AccountType;
  full_name: string;
  phone: string;
  institution: number | null;
  institution_name: string | null;
  course: number | null;
  course_name: string | null;
  study_level: StudyLevel | "";
  year_of_study: number | null;
  graduation_year: number | null;
  bio: string;
  is_complete: boolean;
  missing_fields: string[];
  updated_at: string;
}

export interface StudentSkill {
  skill: number;
  skill_name: string;
  proficiency: Proficiency;
}

export interface StudentPreferences {
  preferred_locations: number[];
  preferred_opportunity_types: number[];
  preferred_industries: number[];
}

export type CVParsedStatus =
  | "not_requested"
  | "pending"
  | "done"
  | "failed";

export interface CVDocument {
  id: number;
  original_name: string;
  size: number;
  version: number;
  is_current: boolean;
  parsed_status: CVParsedStatus;
  uploaded_at: string;
  download_url: string;
}

export interface StudentMeResponse {
  user: {
    id: number;
    email: string;
    role: Role;
  };
  profile: StudentProfile;
  current_cv: CVDocument | null;
}

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export interface Organization {
  id: number;
  name: string;
  description: string;
  industry: number | null;
  industry_name: string | null;
  location: number | null;
  location_name: string | null;
  address: string;
  website: string;
  contact_email: string;
  contact_phone: string;
  registration_number: string;
  verification_status: VerificationStatus;
  verification_notes: string;
  verified_at: string | null;
  created_at: string;
}

export interface PublicOrganization {
  id: number;
  name: string;
  description: string;
  industry_name: string | null;
  location_name: string | null;
  website: string;
  is_verified: boolean;
}

export interface OrganizationBrief {
  id: number;
  name: string;
  is_verified: boolean;
}

export type OpportunityStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "closed"
  | "expired"
  | "archived"
  | "suspended";

export interface OpportunityRequirement {
  courses: Course[];
  skills: Skill[];
  min_study_level: StudyLevel | "";
  min_year_of_study: number | null;
  students_eligible: boolean;
  graduates_eligible: boolean;
  eligibility_notes: string;
}

export interface OpportunityListItem {
  id: number;
  title: string;
  opportunity_type: OpportunityType;
  organization: OrganizationBrief;
  location: Location | null;
  is_remote: boolean;
  duration_months: number | null;
  deadline: string;
  positions: number;
  is_paid: boolean;
  published_at: string | null;
  is_saved: boolean;
  has_applied: boolean;
}

export interface OpportunityDetail extends OpportunityListItem {
  description: string;
  start_date: string | null;
  requirements: OpportunityRequirement;
}

export interface OrganizationOpportunity {
  id: number;
  opportunity_type: number;
  title: string;
  description: string;
  location: number | null;
  is_remote: boolean;
  duration_months: number | null;
  start_date: string | null;
  deadline: string;
  positions: number;
  is_paid: boolean;
  requirements?: {
    courses?: number[];
    skills?: number[];
    min_study_level?: StudyLevel | "";
    min_year_of_study?: number | null;
    students_eligible?: boolean;
    graduates_eligible?: boolean;
    eligibility_notes?: string;
  };
  status: OpportunityStatus;
  published_at: string | null;
  moderation_note: string;
  application_count: number;
  created_at: string;
  updated_at: string;
}

export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface ApplicationEvent {
  old_status: ApplicationStatus | "";
  new_status: ApplicationStatus;
  note: string;
  created_at: string;
}

export interface StudentApplicationListItem {
  id: number;
  status: ApplicationStatus;
  opportunity: OpportunityListItem;
  submitted_at: string;
  status_updated_at: string;
}

export interface StudentApplicationDetail extends StudentApplicationListItem {
  cover_letter: string;
  cv: CVDocument | null;
  events: ApplicationEvent[];
}

export interface SavedOpportunity {
  id: number;
  opportunity: OpportunityListItem;
  created_at: string;
}

export interface Applicant {
  full_name: string;
  email: string;
  phone: string;
  account_type: AccountType;
  institution: string | null;
  course: string | null;
  study_level: StudyLevel | "";
  year_of_study: number | null;
  graduation_year: number | null;
  bio: string;
  skills: Array<{
    name: string;
    proficiency: Proficiency;
  }>;
}

export interface OrganizationApplicationListItem {
  id: number;
  status: ApplicationStatus;
  applicant_name: string;
  opportunity: number;
  opportunity_title: string;
  submitted_at: string;
  status_updated_at: string;
}

export interface OrganizationApplicationDetail
  extends OrganizationApplicationListItem {
  cover_letter: string;
  applicant: Applicant;
  cv: CVDocument | null;
  events: ApplicationEvent[];
}

export interface AdminUser {
  id: number;
  email: string;
  role: Role;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface AdminOrganization {
  id: number;
  name: string;
  description: string;
  registration_number: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  verification_status: VerificationStatus;
  verification_notes: string;
  verified_at: string | null;
  is_active: boolean;
  owner_email: string | null;
  created_at: string;
}

export interface AdminOpportunity {
  id: number;
  title: string;
  description: string;
  organization: number;
  organization_name: string;
  type_name: string;
  status: OpportunityStatus;
  deadline: string;
  positions: number;
  moderation_note: string;
  published_at: string | null;
  created_at: string;
}

export interface AdminActionLog {
  id: number;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: number;
  note: string;
  created_at: string;
}

export interface PlatformStats {
  users: {
    total: number;
    by_role: Record<string, number>;
    suspended: number;
  };
  organizations: {
    total: number;
    by_verification_status: Record<string, number>;
  };
  opportunities: {
    total: number;
    by_status: Record<string, number>;
  };
  applications: {
    total: number;
    by_status: Record<string, number>;
  };
}
```

---

## 6. Required routes and role access

### Public routes

- `/`
- `/opportunities`
- `/opportunities/:id`
- `/organizations`
- `/organizations/:id`
- `/login`
- `/register`

Public users can browse taxonomy-backed filters, public opportunities, and verified organizations. Anonymous users must be able to discover content without logging in.

### Student routes

Require role `student`:

- `/student`
- `/student/profile`
- `/student/skills`
- `/student/preferences`
- `/student/cv`
- `/saved`
- `/applications`
- `/applications/:id`

Students can:

- View their combined user/profile/current-CV dashboard
- Complete their profile
- Replace skills
- Update preferences
- Upload and list CV versions
- Download their own CVs
- Search public opportunities
- Save and unsave published opportunities
- Apply once per opportunity
- Track applications and status history
- Withdraw eligible applications

### Organization routes

Require role `organization`:

- `/org`
- `/org/verification`
- `/org/opportunities`
- `/org/opportunities/new`
- `/org/opportunities/:id`
- `/org/opportunities/:id/edit`
- `/org/applications`
- `/org/applications/:id`

Organizations can:

- Create and maintain one organization profile
- Submit that profile for verification
- Create and manage only their own opportunities
- Submit, unpublish, close, and archive opportunities according to backend rules
- View only applications submitted to their own opportunities
- Update application statuses according to backend rules
- Download only the exact CV attached to one of their received applications

### Admin routes

Require role `admin` or a superuser:

- `/admin`
- `/admin/users`
- `/admin/organizations`
- `/admin/opportunities`
- `/admin/audit-log`

Admins can:

- Inspect users, organizations, opportunities, audit entries, and statistics
- Suspend and reactivate non-admin users
- Approve, reject, suspend, reactivate, verify, and moderate records only through the listed actions
- Download a CV through a known authorized download URL when backend permission allows it

Do not expose student-only or organization-only workflows to admins, and do not expose organization or admin workflows to students.

After login, route users by role:

```text
student -> /student
organization -> /org
admin -> /admin
```

---

## 7. Endpoint catalog

Every network request in the UI must correspond to one of these backend operations.

### 7.1 Authentication

| Method and path | Access | Purpose and UI behavior |
|---|---|---|
| `POST /auth/register/` | Public | Create a student or organization login. On 201, redirect to login. |
| `POST /auth/login/` | Public | Obtain access/refresh tokens and user. Start session and route by `user.role`. |
| `POST /auth/refresh/` | Authenticated | Replace an expiring access token and rotate the refresh token. |
| `POST /auth/logout/` | Authenticated | Blacklist the supplied refresh token and clear local session. Handle the special invalid-token shape. |
| `GET /auth/me/` | Authenticated | Restore session and verify role. |

### 7.2 Public taxonomy

These endpoints are public, read-only, paginated, and return only active taxonomy rows.

| Method and path | Response | Supported query parameters | UI use |
|---|---|---|---|
| `GET /taxonomy/institutions/` | `ApiList<Institution>` | `search`, `ordering=name`, `page`, `page_size` | Institution selector |
| `GET /taxonomy/institutions/{id}/` | `Institution` | None | Resolve/display selected institution |
| `GET /taxonomy/courses/` | `ApiList<Course>` | `search`, `ordering=name`, `page`, `page_size` | Course selector |
| `GET /taxonomy/courses/{id}/` | `Course` | None | Resolve/display selected course |
| `GET /taxonomy/skills/` | `ApiList<Skill>` | `search`, `ordering=name`, `page`, `page_size` | Skill selector |
| `GET /taxonomy/skills/{id}/` | `Skill` | None | Resolve/display selected skill |
| `GET /taxonomy/industries/` | `ApiList<Industry>` | `search`, `ordering=name`, `page`, `page_size` | Industry selector |
| `GET /taxonomy/industries/{id}/` | `Industry` | None | Resolve/display selected industry |
| `GET /taxonomy/locations/` | `ApiList<Location>` | `search`, `ordering=name`, `page`, `page_size` | Location selector |
| `GET /taxonomy/locations/{id}/` | `Location` | None | Resolve/display selected location |
| `GET /taxonomy/opportunity-types/` | `ApiList<OpportunityType>` | `search`, `ordering=name`, `page`, `page_size` | Opportunity-type selector |
| `GET /taxonomy/opportunity-types/{id}/` | `OpportunityType` | None | Resolve/display selected opportunity type |

Taxonomy search behavior:

- Institutions also search `short_name`.
- Skills also search `category`.
- Locations also search `region`.
- Preserve numeric taxonomy IDs in forms.
- Display both names and useful secondary labels, such as `Dar es Salaam, Dar es Salaam`.

### 7.3 Student profile, skills, preferences, and CVs

All endpoints below require role `student`.

| Method and path | Purpose |
|---|---|
| `GET /students/me/` | Load user, profile, and current CV for the student dashboard. |
| `GET /students/me/profile/` | Load editable profile. |
| `PUT /students/me/profile/` | Replace the complete profile. |
| `PATCH /students/me/profile/` | Partially update the profile. Prefer this for normal edits. |
| `GET /students/me/skills/` | Load the current skill list. Returns an array, not a paginated envelope. |
| `PUT /students/me/skills/` | Replace the entire skill list. This is the only supported skills write method. |
| `GET /students/me/preferences/` | Load saved location, opportunity-type, and industry preferences. |
| `PUT /students/me/preferences/` | Replace preferences. |
| `PATCH /students/me/preferences/` | Partially update preferences. |
| `GET /students/me/cv/` | List all CV versions. Returns an array, not a paginated envelope. |
| `POST /students/me/cv/` | Upload a new CV version as multipart form data. |
| `GET /documents/cvs/{id}/download/` | Download an authorized CV file attachment. |

Profile request fields:

```json
{
  "account_type": "student",
  "full_name": "Amina Juma",
  "phone": "+255711111111",
  "institution": 1,
  "course": 2,
  "study_level": "bachelor",
  "year_of_study": 3,
  "graduation_year": null,
  "bio": "Final-year Computer Science student."
}
```

Profile rules:

- `account_type` is either `student` or `graduate`.
- Students must complete `full_name`, `phone`, `institution`, `course`, `study_level`, and `year_of_study`.
- Graduates must complete `full_name`, `phone`, `institution`, `course`, `study_level`, and `graduation_year`.
- Graduates must not have `year_of_study`.
- Year of study must be from 1 through 8 when present.
- Graduation year must be from 1990 through 2100 when present.
- Backend returns `is_complete` and `missing_fields`.
- Display a persistent profile-completion checklist.
- Block the apply action in the UI until `is_complete` is true.
- Preserve `account_type` unless the user is intentionally correcting it.

Skills request format:

```json
[
  { "skill": 1, "proficiency": "advanced" },
  { "skill": 6, "proficiency": "beginner" }
]
```

Skills rules:

- Send active taxonomy skill IDs and `beginner`, `intermediate`, or `advanced`.
- Deduplicate skill IDs before sending because the backend uses last-wins replacement semantics.
- There is no skill POST, PATCH, or DELETE endpoint.
- Refresh the list after every PUT.

Preferences request format:

```json
{
  "preferred_locations": [1],
  "preferred_opportunity_types": [2],
  "preferred_industries": [3]
}
```

CV upload rules:

- Use `multipart/form-data`.
- Use exactly the field name `file`.
- Do not send JSON to the upload endpoint.
- Allowed extensions: `.pdf`, `.doc`, `.docx`.
- Default maximum size is 5 MB.
- Files must be nonempty.
- Validate the real file signature, not only the filename:
  - PDF begins with `%PDF`
  - DOCX begins with `PK\x03\x04`
  - DOC begins with `\xD0\xCF\x11\xE0`
- Uploading creates a new version.
- Older versions remain available.
- Exactly one CV has `is_current: true`.
- Applications store a snapshot of the CV used at submission time; uploading a newer CV does not rewrite prior applications.
- Never construct a download URL manually. Use only the `download_url` returned by the backend.

Successful upload returns HTTP 201 and `CVDocument`.

### 7.4 Public opportunity discovery

| Method and path | Access | Purpose |
|---|---|---|
| `GET /opportunities/` | Public | Search published, non-expired opportunities from active organizations. |
| `GET /opportunities/{id}/` | Public | Show detailed requirements and eligibility information. |

Supported discovery parameters:

```text
q
type
location
region
organization
industry
course
skill
study_level
is_paid
is_remote
deadline_before
deadline_after
ordering
page
page_size
```

Exact meanings:

- `q`: free text across title, description, organization name, location name, and requirement skill names.
- `type`: opportunity-type slug, not its numeric ID.
- `location`: numeric location ID.
- `region`: exact region, case-insensitive.
- `organization`: numeric organization ID.
- `industry`: numeric industry ID belonging to the organization.
- `course`: numeric taxonomy course ID. Opportunities with no course restriction are also included.
- `skill`: numeric taxonomy skill ID and requires an exact linked skill.
- `study_level`: one of `certificate`, `diploma`, `bachelor`, `masters`, or `phd`. It includes opportunities with no minimum and those whose minimum is at or below the selected level.
- `is_paid`: `true` or `false`.
- `is_remote`: `true` or `false`.
- `deadline_before` and `deadline_after`: `YYYY-MM-DD`.
- `ordering`: `deadline`, `published_at`, or `title`, with `-` for descending.
- Default ordering is `-published_at`.

The public feed never includes drafts, pending-review records, closed records, expired records, archived records, suspended records, or opportunities from inactive organizations.

For an authenticated student, list and detail responses include:

- `is_saved`
- `has_applied`

Anonymous users and non-student roles receive false for those fields. Do not use them as authorization checks.

### 7.5 Student save and application endpoints

All endpoints below require role `student`.

| Method and path | Request | Success | UI behavior |
|---|---|---|---|
| `POST /opportunities/{id}/save/` | No body | HTTP 201 `{ "saved": true }` | Mark a published opportunity as saved. Saving is idempotent. |
| `DELETE /opportunities/{id}/save/` | No body | HTTP 204, no body | Remove a saved opportunity. |
| `GET /students/me/saved-opportunities/` | `page`, `page_size` | `ApiList<SavedOpportunity>` | Show saved opportunities. |
| `POST /opportunities/{id}/apply/` | Optional `cover_letter` and `cv` | HTTP 201 `StudentApplicationDetail` | Submit one application. |
| `GET /applications/` | `status`, `ordering=submitted_at,status_updated_at`, `page`, `page_size` | `ApiList<StudentApplicationListItem>` | Show the student’s own applications. |
| `GET /applications/{id}/` | None | `StudentApplicationDetail` | Show application, CV snapshot, nested opportunity, and event history. |
| `POST /applications/{id}/withdraw/` | No body | `StudentApplicationDetail` | Withdraw an eligible application. |

Apply request format:

```json
{
  "cover_letter": "I am a final-year Computer Science student...",
  "cv": 2
}
```

Apply rules:

- `cover_letter` is optional and may be blank, up to 5000 characters.
- `cv` is an optional integer CV ID belonging to the authenticated student.
- If `cv` is omitted, the backend uses the current CV.
- CV upload is optional by default, but the backend may require a CV if `APPLICATION_REQUIRES_CV` is enabled.
- The student profile must be complete.
- The opportunity must be published, belong to an active organization, and not be past its deadline.
- Eligibility is explicitly enforced for account type, minimum study level, and minimum year of study.
- Courses and required skills are informational for the MVP and must not be presented as an automatic matching score.
- One student may apply only once per opportunity.
- A withdrawn application still counts as applied and cannot be resubmitted.
- Duplicate applications return HTTP 409 with code `already_applied`.
- An unknown or inaccessible opportunity ID can return `opportunity_not_found`.
- A non-published or suspended opportunity returns `opportunity_not_open`.
- A past deadline returns `deadline_passed`.
- Incomplete profiles return `profile_incomplete` with `missing_fields`.
- Eligibility failures return `not_eligible` with `reasons`.
- A foreign or unknown CV ID returns `cv_not_found`.
- Disable apply buttons for `has_applied === true`, incomplete profiles, ineligible records, unpublished records, and expired deadlines.
- Always refetch application data after applying, saving, unsaving, or withdrawing.

### 7.6 Public organization directory

| Method and path | Access | Purpose |
|---|---|---|
| `GET /organizations/` | Public | List active, verified organizations. |
| `GET /organizations/{id}/` | Public | Show a verified organization. Organization IDs must be numeric. |

Supported directory parameters:

```text
search
industry
location
page
page_size
```

Behavior:

- `search` covers organization name and description.
- `industry` and `location` are numeric taxonomy IDs.
- Only verified and active organizations appear.
- The directory response intentionally contains a limited public object.
- Unverified, rejected, pending, inactive, or suspended organizations must not appear.

### 7.7 Organization profile and verification

These endpoints require role `organization`.

| Method and path | Purpose |
|---|---|
| `GET /organizations/me/` | Load the caller’s organization. HTTP 404 means no organization profile exists yet. |
| `POST /organizations/me/` | Create the caller’s one organization profile. |
| `PATCH /organizations/me/` | Partially update the organization. |
| `PUT /organizations/me/` | Behaves as PATCH for this endpoint. |
| `POST /organizations/me/submit-verification/` | Submit the organization for verification. |

Organization create/update fields:

```json
{
  "name": "Alpha Tech Ltd",
  "description": "Software company in Dar es Salaam.",
  "industry": 1,
  "location": 1,
  "address": "Sam Nujoma Road",
  "website": "https://alpha.example.tz",
  "contact_email": "hr@alpha.example.tz",
  "contact_phone": "+255700000900",
  "registration_number": "BRELA-2024-001"
}
```

Rules:

- Only `name` is strictly required by the backend model.
- Verification additionally requires `description` and `contact_email`.
- To avoid a failed verification submission, collect name, description, and contact email during onboarding.
- A user can create only one organization profile. A second attempt returns HTTP 409 with code `organization_exists`.
- `verification_status`, `verification_notes`, `verified_at`, and `created_at` are read-only.
- Display `industry_name` and `location_name` alongside their numeric selectors.
- If `GET /organizations/me/` returns 404, show onboarding rather than an organization dashboard.
- `POST /organizations/me/submit-verification/` takes no body.
- Missing verification fields return `profile_incomplete` with `missing_fields`.
- Resubmitting while pending or verified returns `invalid_verification_state`.

Verification statuses:

```text
unverified
pending
verified
rejected
```

### 7.8 Organization opportunity management

These endpoints require role `organization` and operate only on the caller’s organization.

| Method and path | Purpose |
|---|---|
| `GET /organizations/me/opportunities/` | List the organization’s opportunities in every status. |
| `POST /organizations/me/opportunities/` | Create a draft opportunity. |
| `GET /organizations/me/opportunities/{id}/` | Load the organization’s opportunity. |
| `PUT /organizations/me/opportunities/{id}/` | Replace a draft opportunity. |
| `PATCH /organizations/me/opportunities/{id}/` | Partially update a draft opportunity. |
| `DELETE /organizations/me/opportunities/{id}/` | Delete a draft opportunity with no applications. |
| `POST /organizations/me/opportunities/{id}/submit/` | Move draft to pending review. |
| `POST /organizations/me/opportunities/{id}/unpublish/` | Return pending or published to draft. |
| `POST /organizations/me/opportunities/{id}/close/` | Move published to closed. |
| `POST /organizations/me/opportunities/{id}/archive/` | Archive a draft, closed, or expired opportunity. |

Supported organization-opportunity query parameters:

```text
status
opportunity_type
search
ordering=created_at,deadline
page
page_size
```

Here `search` covers opportunity title, unlike public discovery.

Create/update request format:

```json
{
  "opportunity_type": 1,
  "title": "Software Engineering Internship",
  "description": "Work on our Django platform.",
  "location": 1,
  "is_remote": false,
  "duration_months": 6,
  "start_date": "2026-12-01",
  "deadline": "2026-11-29",
  "positions": 2,
  "is_paid": true,
  "requirements": {
    "courses": [1],
    "skills": [1],
    "min_study_level": "diploma",
    "min_year_of_study": 2,
    "students_eligible": true,
    "graduates_eligible": true,
    "eligibility_notes": "Open to second-year students and above."
  }
}
```

Opportunity form rules:

- New opportunities always start as `draft`.
- Do not send `organization`, `status`, `published_at`, `moderation_note`, `application_count`, `created_at`, or `updated_at`; they are read-only or server-controlled.
- `opportunity_type` must be an active taxonomy ID.
- `location` may be a numeric active location ID or `null`.
- If the opportunity is not remote, a location is required before submission.
- `deadline` is required, uses `YYYY-MM-DD`, and cannot be in the past.
- Backend start-date validation is exactly: if both `start_date` and `deadline` are supplied and `start_date < deadline`, reject the request. Preserve that backend behavior in messaging.
- `positions` defaults to 1 and must be at least 1.
- `duration_months`, when supplied, must be from 1 through 60.
- `min_year_of_study`, when supplied, must be from 1 through 8.
- `min_study_level` may be blank to impose no minimum.
- `requirements` may be omitted.
- Requirements must allow students, graduates, or both; setting both eligibility flags to false is invalid.
- Display `application_count`, current status, deadline, `moderation_note`, and timestamps as read-only fields.
- Editable and deletable states must reflect the backend lifecycle.

Opportunity lifecycle for organizations:

```text
draft -> pending_review through submit
pending_review -> draft through unpublish
published -> draft through unpublish
published -> closed through close
draft -> archived through archive
closed -> archived through archive
expired -> archived through archive
```

Additional rules:

- Only drafts can be edited.
- Only drafts without applications can be deleted.
- A non-remote opportunity without a location cannot be submitted.
- An opportunity with a past deadline cannot be submitted.
- `AUTO_PUBLISH_VERIFIED_ORGS` is false for the MVP, so submitting a verified organization’s opportunity still produces `pending_review`, not `published`.
- Invalid lifecycle requests return `invalid_transition`.
- Past-deadline submission returns `deadline_passed`.
- Missing location returns `location_required`.
- Only expose lifecycle buttons allowed by the record’s current status.
- After every lifecycle action, replace local state with the returned updated opportunity.

### 7.9 Organization application management

These endpoints require role `organization`.

| Method and path | Purpose |
|---|---|
| `GET /organizations/me/applications/` | List applications sent to the caller’s organization. |
| `GET /organizations/me/applications/{id}/` | Load an applicant, attached CV snapshot, and event history. |
| `POST /organizations/me/applications/{id}/status/` | Change an application status. |

Supported query parameters:

```text
status
opportunity
search
ordering=submitted_at,status_updated_at
page
page_size
```

Here `search` covers applicant full name, and `opportunity` is the numeric opportunity ID.

Status-change request format:

```json
{
  "status": "reviewing",
  "note": "Strong academic background."
}
```

Application lifecycle:

```text
submitted -> reviewing
submitted -> rejected
submitted -> withdrawn
reviewing -> shortlisted
reviewing -> rejected
reviewing -> withdrawn
shortlisted -> interview
shortlisted -> accepted
shortlisted -> rejected
interview -> accepted
interview -> rejected
accepted -> no further transitions
rejected -> no further transitions
withdrawn -> no further transitions
```

Actor rules:

- Only the owning student can move an application to `withdrawn`.
- Only members of the receiving organization can use `reviewing`, `shortlisted`, `interview`, `accepted`, or `rejected`.
- Organizations cannot withdraw applications.
- Students cannot accept, reject, shortlist, or interview applicants.
- Applications belonging to another organization return HTTP 404.
- Invalid transitions return `invalid_transition`.
- Display the chronological `events` array with old status, new status, note, and creation time.
- The event response does not include actor identity.
- Show applicant education, skills, cover letter, and only the CV attached to that application.
- Do not expose applicant records outside the organization that received them.

### 7.10 Platform administration

All endpoints below require role `admin` or superuser status.

| Method and path | Purpose |
|---|---|
| `GET /admin/users/` | List users. |
| `GET /admin/users/{id}/` | Inspect a user. |
| `POST /admin/users/{id}/suspend/` | Suspend a non-admin user. |
| `POST /admin/users/{id}/reactivate/` | Reactivate a user. |
| `GET /admin/organizations/` | List organizations. |
| `GET /admin/organizations/{id}/` | Inspect an organization and owner email. |
| `POST /admin/organizations/{id}/approve/` | Mark a pending organization verified. |
| `POST /admin/organizations/{id}/reject/` | Mark a pending organization rejected; a note is required. |
| `POST /admin/organizations/{id}/suspend/` | Deactivate an organization. |
| `POST /admin/organizations/{id}/reactivate/` | Reactivate an organization. |
| `GET /admin/opportunities/` | List opportunities across organizations. |
| `GET /admin/opportunities/{id}/` | Inspect an opportunity. |
| `POST /admin/opportunities/{id}/approve/` | Publish an eligible opportunity. |
| `POST /admin/opportunities/{id}/reject/` | Return an opportunity to draft; a note is required. |
| `POST /admin/opportunities/{id}/suspend/` | Suspend an opportunity; a note is required. |
| `GET /admin/audit-log/` | List administrative actions. |
| `GET /admin/audit-log/{id}/` | Inspect an audit entry. |
| `GET /admin/stats/` | Show platform totals and breakdowns. |

Supported admin query parameters:

- Users: `role`, `is_active`, `search=email`, `page`, `page_size`
- Organizations: `verification_status`, `is_active`, `search=name,registration_number`, `page`, `page_size`
- Opportunities: `status`, `organization`, `search=title,organization name`, `page`, `page_size`
- Audit log: `action`, `target_type`, `target_id`, `page`, `page_size`

Admin request format for actions:

```json
{
  "note": "Registration documents verified."
}
```

Admin rules:

- Always collect a note for organization rejection and opportunity rejection/suspension.
- Collect notes for the other admin actions as well because they are written to the audit log.
- Admin approval publishes opportunities from `pending_review` or `suspended` to `published`.
- Admin rejection returns `pending_review` to `draft`.
- Admin suspension applies to `pending_review` or `published`.
- Admin users cannot suspend admin or superuser accounts.
- Organization approval applies only while verification is `pending`.
- Organization suspension changes `is_active`, not `verification_status`.
- Suspended organizations and their opportunities disappear from public discovery.
- Audit actions use values such as:
  - `user.suspend`
  - `user.reactivate`
  - `organization.verify`
  - `organization.reject`
  - `organization.suspend`
  - `organization.reactivate`
  - `opportunity.approve`
  - `opportunity.reject`
  - `opportunity.suspend`
- Audit `target_type` uses values such as:
  - `accounts.user`
  - `organizations.organization`
  - `opportunities.opportunity`
- `actor_email` may be null; display that as “system/unknown” rather than crashing.
- Statistics use this shape:

```json
{
  "users": {
    "total": 10,
    "by_role": {
      "student": 7,
      "organization": 2,
      "admin": 1
    },
    "suspended": 1
  },
  "organizations": {
    "total": 3,
    "by_verification_status": {
      "verified": 2,
      "pending": 1
    }
  },
  "opportunities": {
    "total": 8,
    "by_status": {
      "published": 5,
      "draft": 3
    }
  },
  "applications": {
    "total": 12,
    "by_status": {
      "submitted": 9,
      "accepted": 3
    }
  }
}
```

Absent breakdown keys mean zero for that bucket. Normalize missing keys to zero in charts and totals.

---

## 8. Required UX behavior by journey

### Anonymous discovery

- Show searchable public opportunities by default.
- Provide filters for keyword, type, location, region, organization, industry, course, skill, study level, paid status, remote status, deadlines, ordering, and pagination.
- Preserve filter state in the URL where practical.
- Display organization verification status, deadline, location/remote status, paid status, positions, and published date.
- Show requirement and eligibility details without implying an automatic match score.
- Require login before saving or applying.
- Provide a verified-organization directory with industry, location, search, and pagination.

### Student onboarding and applications

- After registration, guide the student through profile completion.
- Show `missing_fields` explicitly.
- Make taxonomy IDs human-readable using taxonomy responses.
- Allow saving skills as a complete replacement list.
- Show preferences as three independent multi-select groups.
- Show CV metadata, current-version badge, version history, size, upload date, and `parsed_status`.
- Show the exact CV attached to each submitted application.
- Show `has_applied` and disable duplicate applications.
- Show application status and full event history.
- Allow withdrawal only when the backend permits the transition.
- Clearly explain that withdrawn applications cannot be submitted again.

### Organization onboarding and recruitment

- If the user has no organization, show a creation workflow.
- If organization creation returns `organization_exists`, load the existing organization instead of creating another.
- Show verification status prominently.
- Prevent verification submission until description and contact email are present.
- Show backend verification notes and timestamps when available.
- Separate draft, pending, published, closed, expired, archived, and suspended opportunities visually.
- Show `application_count` on organization opportunities.
- Show `moderation_note` to the owning organization.
- Never show unpublished organization opportunities publicly.
- For applicants, show name, contact information, education, skills, cover letter, attached CV, status, and event history.
- Offer only valid next statuses for the selected application.
- Require admin-style explanatory notes where backend rules require them and encourage notes for rejections.

### Administration

- Provide separate review queues for users, organizations, opportunities, and audit activity.
- Show current verification and publication states before offering actions.
- Require a note for organization rejection and opportunity rejection/suspension.
- Refresh the affected detail and audit log after every action.
- Show platform statistics with zero-normalized breakdowns.
- Handle `invalid_transition`, `note_required`, `deadline_passed`, and `invalid_verification_state` with contextual messaging and refreshed data.

---

## 9. Premium visual, UX, accessibility, and localization requirements

The required quality bar is a **premium SaaS product**, not a basic CRUD interface. The UI must feel calm, credible, fast, and carefully designed for Tanzanian students, employers, and platform administrators.

### 9.1 Premium design system

- Implement a cohesive visual identity with restrained color, clear hierarchy, generous whitespace, consistent spacing, refined typography, and consistent corner radii, borders, shadows, and iconography.
- Build reusable premium layout, card, table, filter, pagination, form, modal, toast, badge, timeline, empty-state, loading-state, and confirmation components.
- Do not leave default unstyled browser controls, inconsistent buttons, mismatched form fields, or ad hoc page layouts in the final UI.
- Use purposeful micro-interactions for hover, focus, active, disabled, selection, expansion, and navigation states.
- Use tasteful transitions and skeleton loading rather than abrupt content flashes.
- Avoid excessive animation, decorative clutter, distracting gradients, or anything that reduces readability and trust.
- Make dashboards feel informative at a glance with well-organized summary cards, progress indicators, next actions, and contextual links.
- Make dense admin and recruitment tables scannable through sticky headers where appropriate, clear row hierarchy, aligned numeric/date columns, readable wrapping, and consistent action placement.
- Design mobile layouts deliberately; do not merely shrink desktop layouts. Cards, filters, tables, wizards, uploads, and detail pages must remain premium on small screens.

### 9.2 Premium interaction and flow quality

- Guide users through multi-step journeys with progress, completion checklists, contextual help, and clear next actions.
- Explain consequences before destructive or important actions, including withdrawal, lifecycle transitions, suspension, rejection, deletion, and verification submission.
- Confirm successful mutations with concise premium success messaging and updated data.
- Disable submit buttons while requests are pending and prevent duplicate submissions.
- Preserve user input when validation fails.
- Never leave users on a dead end: every empty, error, unauthorized, forbidden, missing-profile, incomplete-profile, ineligible, expired, unpublished, or missing-record state must explain what happened and offer the best next action.
- Avoid layout shifts during filtering, pagination, authentication refresh, uploads, downloads, tab changes, and dialog interactions.
- Make search and filter behavior feel immediate with debounced input, loading indicators, stale-response cancellation, preserved filter state, and clear active-filter controls.
- Make pagination, sorting, selection, and detail navigation predictable across public, student, organization, and admin surfaces.

### 9.3 Accessibility and inclusive UX

- Target WCAG 2.2 AA.
- Support anonymous browsing, student workflows, organization workflows, and admin workflows from shared accessible layout components.
- Use accessible labels, visible focus states, logical focus order, keyboard navigation, table semantics, dialog semantics, form errors, file-upload controls, and pagination controls.
- Ensure dialogs trap and restore focus, support Escape to close, and announce important changes to assistive technology.
- Do not rely on color alone for statuses. Pair every status pill with text and, where useful, an icon.
- Maintain strong contrast for body text, muted text, links, placeholders, errors, disabled controls, badges, and table metadata.
- Make file uploads usable by keyboard and screen readers, including file requirements, selected-file information, upload progress/success/failure, and download controls.
- Use clear loading, empty, error, offline, unauthorized, forbidden, and not-found states.

### 9.4 Localization and content presentation

- Display dates in the Africa/Dar es Salaam context.
- Preserve date-only deadlines as `YYYY-MM-DD`; do not convert them into datetimes or shift them across timezones.
- Use clear Tanzanian English for the MVP.
- Display file sizes in human-readable units.
- Truncate long descriptions thoughtfully while preserving access to complete detail pages.
- Format organization names, locations, deadlines, counts, statistics, timestamps, and audit metadata consistently.

Recommended premium status presentation:

- Draft: neutral
- Pending review: amber
- Published: green
- Closed: slate
- Expired: muted brown/gray
- Archived: dark gray
- Suspended: red
- Unverified: neutral
- Verified: green
- Rejected: red
- Submitted: neutral/blue
- Reviewing: amber
- Shortlisted: blue
- Interview: purple
- Accepted: green
- Rejected: red
- Withdrawn: gray

---

## 10. API client implementation requirements

Implement a centralized Axios client with:

- Configurable base URL.
- JSON requests by default.
- `multipart/form-data` only for CV upload.
- Automatic bearer-token attachment.
- One silent token refresh and one retry after a 401.
- Centralized error normalization.
- No token logging.
- Cancellation or ignored stale responses for rapid filter changes.
- TanStack Query keys namespaced by endpoint, role, filters, pagination, and object ID.
- Cache invalidation after every mutation.
- No optimistic state-machine transitions. Wait for backend confirmation, then update from the response and refetch.

Implement CV download as an authenticated binary download:

1. Call `GET /documents/cvs/{id}/download/` with `Authorization: Bearer <access-token>`.
2. Do not request or expect JSON.
3. Convert the response to a Blob.
4. Create an object URL.
5. Trigger download using the CV’s `original_name`.
6. Revoke the object URL.
7. Show an authorization error if backend permission is denied.
8. Never expose CV bytes through a public URL.

Test session helpers, error normalization, route guards, pagination handling, and binary download mocking with frontend unit tests.

---

## 11. Backend setup the UI agent must use for development

From the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements/dev.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Backend development URLs:

```text
API base URL: http://localhost:8000/api/v1
Swagger UI: http://localhost:8000/api/docs/
OpenAPI schema: http://localhost:8000/api/schema/
Django admin: http://localhost:8000/django-admin/
```

Seeded demo accounts use password:

```text
Demo-Pass-12345
```

Seeded demo users:

```text
admin@demo.tz
student@demo.tz
hr@demo.tz
```

Only use demo credentials for local development. Do not ship them as production behavior. A demo-login helper may exist only behind an explicitly disabled-by-default development flag.

Run the backend test suite when backend behavior is unclear:

```bash
python -m pytest
```

---

## 12. Frontend validation and definition of done

The UI implementation is complete only when all of the following are true:

1. `frontend/` builds successfully.
2. TypeScript typechecking passes.
3. Linting passes if configured.
4. Frontend tests pass if configured.
5. No browser console errors occur during the main role journeys.
6. Every endpoint in section 7 is reachable through the UI or is explicitly documented as intentionally unused with a backend-aligned reason.
7. No request uses an undocumented path, method, field, status, or query parameter.
8. Anonymous discovery, filtering, sorting, pagination, and detail navigation work.
9. Student registration, profile completion, skills replacement, preferences, CV upload/download, save/unsave, apply-once, application tracking, and withdrawal work.
10. Organization creation, verification submission, opportunity CRUD within draft rules, lifecycle actions, applicant review, status changes, and authorized CV downloads work.
11. Admin user, organization, opportunity, audit-log, and statistics workflows work.
12. Role guards prevent students from reaching organization/admin routes, organizations from reaching student/admin routes, admins from reaching student/organization action workflows, and anonymous users from reaching authenticated workflows.
13. All backend lifecycle errors are handled with refreshed data and understandable messages.
14. File downloads work with authorization and preserve filenames.
15. The UI is responsive, keyboard-accessible, and readable on mobile and desktop viewports.
16. The visual design passes a premium review: consistent layout, typography, spacing, controls, tables, dashboards, forms, dialogs, toasts, loading states, empty states, error states, and mobile layouts feel intentional and production-ready.
17. No screen looks unfinished, inconsistent, cluttered, or like default framework output.
18. Interactive feedback is immediate and polished, including hover/focus/disabled states, pending controls, confirmations, success messaging, and graceful error recovery.
19. A `frontend/README.md` documents setup, environment variables, demo accounts, role journeys, API alignment notes, and known MVP limitations.

Provide the finished implementation with a concise summary of:

- What was built
- Routes implemented
- Backend endpoints integrated
- Authentication and file-download approach
- Premium UX/design decisions implemented
- Validation performed
- Remaining MVP limitations
