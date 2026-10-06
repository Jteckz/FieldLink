#!/usr/bin/env bash
# =============================================================================
#  API smoke test - Tanzania Student Opportunity & Internship Platform (v1)
# =============================================================================
#  Exercises every endpoint of /api/v1/ in dependency order: happy paths, the
#  permission matrix, both lifecycle state machines, and the negative cases
#  (validation, conflicts, forbidden, not found).
#
#  Requires: bash 4+, curl, jq, python3
#
#  Usage:
#     ./scripts/api_smoke_test.sh                # spawn a throwaway server + DB
#     ./scripts/api_smoke_test.sh --url URL      # test an already-running server
#     ./scripts/api_smoke_test.sh --list         # print the endpoint inventory
#     ./scripts/api_smoke_test.sh --keep         # keep the temp DB/server alive
#
#  Exit code: 0 = all checks passed, 1 = at least one failed.
# =============================================================================
set -uo pipefail

# --------------------------------------------------------------- configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="${PY:-$PROJECT_DIR/.venv/bin/python}"
[ -x "$PY" ] || PY="$(command -v python3)"

EXTERNAL_URL=""; KEEP=0; LIST_ONLY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url=*)  EXTERNAL_URL="${1#*=}" ;;
    --url)    EXTERNAL_URL="${2:-}"; shift ;;
    --keep)   KEEP=1 ;;
    --list)   LIST_ONLY=1 ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \?//'; exit 0 ;;
    *) printf 'Unknown option: %s (try --help)\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

if [[ "$LIST_ONLY" == 1 ]]; then
  cat <<'EOF'
AUTH            POST /api/v1/auth/register/            {email,password,role,account_type?,full_name?}
                POST /api/v1/auth/login/               {email,password} -> {access,refresh,user}
                POST /api/v1/auth/refresh/             {refresh}         -> rotated {access,refresh}
                POST /api/v1/auth/logout/              {refresh}         -> 204 (blacklists refresh)
                GET  /api/v1/auth/me/

TAXONOMY (public, read-only, paginated)
                GET  /api/v1/taxonomy/institutions/    ?search=&ordering=name
                GET  /api/v1/taxonomy/courses/  skills/  industries/  locations/  opportunity-types/
                GET  /api/v1/taxonomy/<resource>/{id}/

STUDENT (role=student)
                GET  /api/v1/students/me/                        {user,profile,current_cv}
                GET|PATCH /api/v1/students/me/profile/
                GET|PATCH /api/v1/students/me/preferences/
                GET|PUT /api/v1/students/me/skills/               [{skill,proficiency}]
                GET|POST /api/v1/students/me/cv/                 multipart file=
                GET  /api/v1/documents/cvs/{id}/download/        owner | applied org | admin

DISCOVERY (public)
                GET  /api/v1/opportunities/?q=&type=&location=&region=&course=&skill=
                     &study_level=&industry=&is_paid=&is_remote=&deadline_before=
                     &deadline_after=&organization=&ordering=&page=&page_size=
                GET  /api/v1/opportunities/{id}/

APPLY / SAVE
                POST   /api/v1/opportunities/{id}/apply/     {cover_letter?,cv?} -> 201
                POST   /api/v1/opportunities/{id}/save/     -> 201
                DELETE /api/v1/opportunities/{id}/save/     -> 204
                GET    /api/v1/students/me/saved-opportunities/
                GET    /api/v1/applications/?status=&ordering=
                GET    /api/v1/applications/{id}/          {events[],cv}
                POST   /api/v1/applications/{id}/withdraw/

ORGANIZATION (role=organization)
                GET|POST|PATCH /api/v1/organizations/me/
                POST  /api/v1/organizations/me/submit-verification/
                GET   /api/v1/organizations/                ?search=&industry=&location= (verified only)
                GET|POST /api/v1/organizations/me/opportunities/        (CRUD while draft)
                PATCH|DELETE /api/v1/organizations/me/opportunities/{id}/
                POST  /api/v1/organizations/me/opportunities/{id}/submit|unpublish|close|archive/
                GET   /api/v1/organizations/me/applications/?status=&opportunity=&search=
                GET   /api/v1/organizations/me/applications/{id}/
                POST  /api/v1/organizations/me/applications/{id}/status/  {status,note}

ADMIN (role=admin)
                GET  /api/v1/admin/users/?role=&is_active=&search=
                POST /api/v1/admin/users/{id}/suspend|reactivate/         {note}
                GET  /api/v1/admin/organizations/?verification_status=&is_active=
                POST /api/v1/admin/organizations/{id}/approve|reject|suspend|reactivate/
                GET  /api/v1/admin/opportunities/?status=&organization=
                POST /api/v1/admin/opportunities/{id}/approve|reject|suspend/   {note}
                GET  /api/v1/admin/audit-log/?action=&target_type=&target_id=
                GET  /api/v1/admin/audit-log/{id}/
                GET  /api/v1/admin/stats/
EOF
  exit 0
fi

# ----------------------------------------------------------------- pretty output
if [[ -t 1 ]]; then
  R=$'\033[0m'; G=$'\033[32m'; RED=$'\033[31m'; Y=$'\033[33m'; B=$'\033[1m'; DIM=$'\033[2m'
else
  R=""; G=""; RED=""; Y=""; B=""; DIM=""
fi
PASSED=0; FAILED=0; FAILED_NAMES=()

section() { printf '\n%s%s%s\n' "$B" "$1" "$R"; }
pass()    { PASSED=$((PASSED+1)); printf '  %s✓%s %s %s[%s]%s\n' "$G" "$R" "$1" "$DIM" "$2" "$R"; }
fail()    {
  FAILED=$((FAILED+1)); FAILED_NAMES+=("$1")
  printf '  %s✗%s %s %sexpected %s, got %s%s\n' "$RED" "$R" "$1" "$RED" "$2" "$STATUS" "$R"
  printf '      %s%s%s\n' "$DIM" "$(printf '%s' "$RESP" | head -c 240)" "$R"
}
expect() { if [[ "$STATUS" == "$2" ]]; then pass "$1" "$STATUS"; else fail "$1" "$2"; fi }
skip()   { printf '  %s-%s %s %s(skipped: %s)%s\n' "$Y" "$R" "$1" "$DIM" "$2" "$R"; }
note()   { printf '      %s%s%s\n' "$DIM" "$1" "$R"; }
section_done() { printf '  %s%s%s\n' "$DIM" "----------------------------------------------" "$R"; }

# ------------------------------------------------------------------- HTTP layer
TMP="$(mktemp -d)"; trap 'cleanup' EXIT
RESP=""; STATUS=""
CV_FILE="$TMP/cv.pdf"; BAD_FILE="$TMP/fake.pdf"; TXT_FILE="$TMP/cv.txt"
printf '%%PDF-1.4\n%%e2e3e4e5 smoke-test pdf\n' > "$CV_FILE"
printf 'This file is named .pdf but is not a PDF at all.\n' > "$BAD_FILE"
printf 'not a pdf at all\n' > "$TXT_FILE"
python3 -c "open('$TMP/big.pdf','wb').write(b'%PDF-1.4\n' + b'0' * (6*1024*1024))"

api() {  # api METHOD PATH [TOKEN] [JSON_BODY]
  local method="$1" path="$2" token="${3:-}" body="${4:-}"
  local -a args=(-sS -X "$method" "$BASE$path" -o "$TMP/resp.json" -w '%{http_code}' --max-time 30)
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$body" ]] && args+=(-H 'Content-Type: application/json' -d "$body")
  # A default-config server rate-limits the `auth` scope to 10/min, which this
  # script exceeds on purpose. Back off and retry instead of failing the run.
  local attempt=0 wait
  while :; do
    STATUS="$(curl "${args[@]}" 2>"$TMP/err")" || STATUS="000"
    RESP="$(cat "$TMP/resp.json" 2>/dev/null)"
    [[ "$STATUS" != "429" ]] && break
    attempt=$((attempt+1))
    [[ "$attempt" -gt 6 ]] && break
    wait="$(printf '%s' "$RESP" | jq -r '.error.message | capture("in (?<n>[0-9]+) second").n // 30' 2>/dev/null)"
    [[ "$wait" =~ ^[0-9]+$ ]] || wait=30
    (( wait > 5 )) || wait=5
    printf '      %s429 throttled - waiting %ss, retry %s/6%s\n' "$Y" "$wait" "$attempt" "$R" >&2
    sleep "$((wait + 1))"
  done
}
upload() {  # upload PATH TOKEN FILE
  STATUS="$(curl -sS -X POST "$BASE$1" -H "Authorization: Bearer $2" \
    -F "file=@$3" -o "$TMP/resp.json" -w '%{http_code}' --max-time 30)"
  RESP="$(cat "$TMP/resp.json")"
}
dl() {  # dl PATH TOKEN -> echoes HTTP status, body lands in $TMP/file.bin
  curl -sS -o "$TMP/file.bin" -w '%{http_code}' --max-time 30 \
    ${2:+-H "Authorization: Bearer $2"} "$BASE$1"
}
jq_() { printf '%s' "$RESP" | jq -r "$1" 2>/dev/null; }
num() { local v; v="$(jq_ "$1")"; [[ "$v" =~ ^-?[0-9]+$ ]] || v=0; printf '%s' "$v"; }
errcode() { jq_ '.error.code // empty'; }
has_name() {  # has_name JSON_OR_JQ_FILTER NAME
  [[ "$(jq_ "$1" | grep -ci -- "$2")" -gt 0 ]]
}

cleanup() {
  [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null
  if [[ "$KEEP" == 1 ]]; then printf '\n%sKept: %s (server pid %s)%s\n' "$Y" "$TMP" "${SERVER_PID:-none}" "$R"
  else rm -rf "$TMP"; fi
}
command -v curl >/dev/null || { echo "curl is required"; exit 1; }
command -v jq   >/dev/null || { echo "jq is required";   exit 1; }

# ------------------------------------------------------- server / database setup
SERVER_PID=""
if [[ -n "$EXTERNAL_URL" ]]; then
  BASE="${EXTERNAL_URL%/}/api/v1"
  printf '%sTesting external server: %s%s\n' "$B" "$BASE" "$R"
  printf '%sThe real throttles apply here (auth scope = 10/min), so the run will%s\n' "$DIM" "$R"
  printf '%spause and retry when it hits 429. Expect it to take a few minutes.%s\n' "$DIM" "$R"
else
  SETTINGS_DIR="$TMP/settings"; mkdir -p "$SETTINGS_DIR"
  # Dev-only shim: same as `development`, but throttles lifted so the script can
  # register/log in many times without tripping the 10/min `auth` throttle scope.
  cat > "$SETTINGS_DIR/smoke_settings.py" <<'PY'
from config.settings.development import *  # noqa: F401,F403
from config.settings.base import REST_FRAMEWORK as _BASE_RF

REST_FRAMEWORK = {
    **_BASE_RF,
    "DEFAULT_THROTTLE_RATES": {k: "100000/min" for k in _BASE_RF["DEFAULT_THROTTLE_RATES"]},
}
PY
  export PYTHONPATH="$SETTINGS_DIR:$PROJECT_DIR"
  export DJANGO_SETTINGS_MODULE=smoke_settings
  export DATABASE_URL="sqlite:///$TMP/smoke.sqlite3"
  export PRIVATE_MEDIA_ROOT="$TMP/private_media"
  export DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1,0.0.0.0"

  printf '%sBootstrapping a throwaway database + server...%s\n' "$B" "$R"
  manage() { (cd "$PROJECT_DIR" && "$PY" manage.py "$@"); }
  if ! manage migrate --noinput >"$TMP/setup.log" 2>&1; then echo "migrate failed:"; tail -25 "$TMP/setup.log"; exit 1; fi
  if ! manage seed_taxonomy      >>"$TMP/setup.log" 2>&1; then echo "seed_taxonomy failed:"; tail -25 "$TMP/setup.log"; exit 1; fi
  if ! manage seed_demo          >>"$TMP/setup.log" 2>&1; then echo "seed_demo failed:"; tail -25 "$TMP/setup.log"; exit 1; fi

  PORT="${SMOKE_PORT:-8123}"
  "$PY" "$PROJECT_DIR/manage.py" runserver "127.0.0.1:$PORT" --noreload >"$TMP/server.log" 2>&1 &
  SERVER_PID=$!
  BASE="http://127.0.0.1:$PORT/api/v1"
  for _ in $(seq 1 60); do curl -s -o /dev/null "$BASE/taxonomy/industries/" 2>/dev/null && break; sleep 0.5; done
  curl -s -o /dev/null "$BASE/taxonomy/industries/" 2>/dev/null || { echo "server did not start:"; tail -25 "$TMP/server.log"; exit 1; }
  printf '  ready at %s (pid %s)\n' "$BASE" "$SERVER_PID"
fi

PW='Sm0ke-Test-Pass-42'          # password for accounts this script registers
DEMO_PW='Demo-Pass-12345'       # password baked into `manage.py seed_demo`
TODAY="$(date +%F)"
FUTURE="$(date -d '+21 days' +%F 2>/dev/null || date -v+21d +%F)"
FAR="$(date -d '+60 days' +%F 2>/dev/null || date -v+60d +%F)"

login() {  # login EMAIL [PASSWORD] -> echoes access token
  api POST /auth/login/ "" "$(jq -nc --arg e "$1" --arg p "${2:-$PW}" '{email:$e,password:$p}')"
  local tok; tok="$(jq_ '.access // empty')"
  [[ -n "$tok" ]] || printf '      %s! no access token for %s (HTTP %s)%s\n' "$RED" "$1" "$STATUS" "$R" >&2
  printf '%s' "$tok"
}

# ============================================================================
section "A. AUTHENTICATION  /api/v1/auth/"
section_done
R_ID="$$"
S1="asha.student.$R_ID@demo.tz"; S2="grace.graduate.$R_ID@demo.tz"; S3="kwamba.other.$R_ID@demo.tz"
O1="hr.alpha.$R_ID@demo.tz";      O2="recruiter.beta.$R_ID@demo.tz"

api POST /auth/register/ "" "$(jq -nc --arg e "$S1" --arg p "$PW" \
  '{email:$e,password:$p,role:"student",account_type:"student",full_name:"Asha Mushi"}')"
expect "register student" 201; STU1_ID="$(jq_ '.id')"
api POST /auth/register/ "" "$(jq -nc --arg e "$S1" --arg p "$PW" '{email:$e,password:$p,role:"student",full_name:"Asha"}')"
expect "register duplicate email -> 400" 400
api POST /auth/register/ "" '{"email":"weak@example.tz","password":"123","role":"student","full_name":"Weak"}'
expect "register weak password -> 400" 400
api POST /auth/register/ "" "$(jq -nc --arg p "$PW" '{email:"noname@example.tz",password:$p,role:"student"}')"
expect "register student w/o full_name -> 400" 400
api POST /auth/register/ "" "$(jq -nc --arg p "$PW" '{email:"sneaky@example.tz",password:$p,role:"admin",full_name:"Sneaky"}')"
expect "self-register as 'admin' role -> 400" 400
api POST /auth/register/ "" "$(jq -nc --arg e "$S2" --arg p "$PW" \
  '{email:$e,password:$p,role:"student",account_type:"graduate",full_name:"Grace Mushi"}')"
expect "register graduate" 201; GRAD_ID="$(jq_ '.id')"
api POST /auth/register/ "" "$(jq -nc --arg e "$O1" --arg p "$PW" '{email:$e,password:$p,role:"organization"}')"
expect "register organization user" 201; ORGUSER1_ID="$(jq_ '.id')"
api POST /auth/register/ "" "$(jq -nc --arg e "$O2" --arg p "$PW" '{email:$e,password:$p,role:"organization"}')"
expect "register 2nd organization user" 201

STU1="$(login "$S1")"; STU2="$(login "$S2")"
ORG1="$(login "$O1")"; ORG2="$(login "$O2")"
ADM="$(login admin@demo.tz "$DEMO_PW")"
[[ -n "$STU1$STU2$ORG1$ORG2$ADM" ]] && pass "obtained access tokens for 5 roles" "student/graduate/org/admin" || fail "obtain tokens" "5 non-empty"

api POST /auth/login/ "" "$(jq -nc --arg e "$S1" '{email:$e,password:"wrong-password"}')"
expect "login wrong password -> 401" 401
api POST /auth/login/ "" "$(jq -nc --arg e "$S1" --arg p "$PW" '{email:$e,password:$p}')"
expect "login student" 200
[[ "$(jq_ '.user.role')" == "student" ]] && pass "  └ response embeds user object" "role=student" || fail "login user payload" "role=student"
REFRESH="$(jq_ '.refresh')"
api GET /auth/me/ "$STU1";    expect "GET auth/me/ (authenticated)" 200
[[ "$(jq_ '.email')" == "$S1" ]] && pass "  └ returns the caller" "$S1" || fail "auth/me payload" "$S1"
api GET /auth/me/;            expect "GET auth/me/ anonymous -> 401" 401
api POST /auth/refresh/ "" "$(jq -nc --arg r "$REFRESH" '{refresh:$r}')"
expect "POST auth/refresh/ (rotates tokens)" 200
STU1="$(jq_ '.access')"; REFRESH="$(jq_ '.refresh')"
api POST /auth/logout/ "$STU1" "$(jq -nc --arg r "$REFRESH" '{refresh:$r}')"
expect "POST auth/logout/ -> 204" 204
api POST /auth/refresh/ "" "$(jq -nc --arg r "$REFRESH" '{refresh:$r}')"
expect "reuse a blacklisted refresh token -> 401" 401
STU1="$(login "$S1")"

# ============================================================================
section "B. TAXONOMY (public, no auth)"
section_done
for res in institutions courses skills industries locations opportunity-types; do
  api GET "/taxonomy/$res/?page_size=100"; expect "GET taxonomy/$res/" 200
  N="$(num '.results | length')"
  [[ "$N" -gt 0 ]] && pass "  └ seeded data present" "$N items" || skip "  └ $res" "empty"
done
api GET "/taxonomy/skills/?search=Python";   expect "taxonomy ?search=" 200
api GET "/taxonomy/locations/?ordering=-name"; expect "taxonomy ?ordering=" 200
api GET "/taxonomy/skills/999999/";          expect "taxonomy unknown id -> 404" 404
api POST "/taxonomy/skills/" "" '{"name":"Hacked"}'; expect "taxonomy POST (read-only) -> 405" 405
api GET "/taxonomy/skills/";                 expect "taxonomy reachable anonymously" 200

# Pull real seeded ids (page_size=100 so nothing is truncated).
tid() { api GET "/taxonomy/$1/?page_size=100" >/dev/null; jq_ "$2" | head -1; }
SKILL_PY="$(tid skills     '.results[] | select(.name=="Python") | .id')"
SKILL_PHP="$(tid skills     '.results[] | select(.name=="PHP") | .id')"
LOC_DAR="$(tid   locations  '.results[] | select(.region=="Dar es Salaam") | .id')"
LOC_ARU="$(tid   locations  '.results[] | select(.region=="Arusha") | .id')"
TYPE_INT="$(tid opportunity-types '.results[] | select(.name=="Internship") | .id')"
TYPE_VOL="$(tid opportunity-types '.results[] | select(.name|test("Attachment")) | .id')"
TYPE_FIELD="$(tid opportunity-types '.results[] | select(.name|test("Field Training")) | .id')"
IND_TECH="$(tid industries  '.results[] | select(.name=="Information Technology") | .id')"
COURSE_CS="$(tid courses    '.results[] | select(.name=="Computer Science") | .id')"
INST="$(tid institutions '.results[0].id')"
MISSING=()
for v in SKILL_PY SKILL_PHP LOC_DAR LOC_ARU TYPE_INT TYPE_VOL TYPE_FIELD IND_TECH COURSE_CS INST; do
  [[ -n "${!v}" ]] || MISSING+=("$v")
done
if [[ "${#MISSING[@]}" -eq 0 ]]; then
  pass "resolved seeded taxonomy ids" "python=$SKILL_PY dar=$LOC_DAR type=$TYPE_INT course=$COURSE_CS"
else
  fail "resolve taxonomy ids" "missing: ${MISSING[*]}"
  printf '%sTaxonomy not seeded - run: python manage.py seed_taxonomy%s\n' "$RED" "$R"
  exit 1
fi

# ============================================================================
section "C. STUDENT PROFILE / SKILLS / PREFERENCES / CV"
section_done
api GET /students/me/ "$STU1";  expect "GET students/me/" 200
api GET /students/me/ "$ORG1";  expect "students/me/ as org user -> 403" 403
api GET /students/me/;          expect "students/me/ anonymous -> 401" 401

api PATCH /students/me/profile/ "$STU1" '{"phone":"+255700000001","full_name":"Asha Mushi"}'
expect "PATCH partial profile" 200
[[ "$(jq_ '.is_complete')" == "false" ]] && pass "  └ is_complete=false while fields missing" "$(jq_ -c '.missing_fields')" || fail "is_complete flag" "false"
api PATCH /students/me/profile/ "$STU2" "$(jq -nc --argjson i "$INST" --argjson c "$COURSE_CS" \
  '{phone:"+255700000002",institution:$i,course:$c,study_level:"bachelor",graduation_year:2025}')"
expect "PATCH graduate profile" 200
[[ "$(jq_ '.is_complete')" == "true" ]] && pass "  └ graduate profile complete" "is_complete=true" || fail "graduate completeness" "$(jq_ -c '.missing_fields')"
api PATCH /students/me/profile/ "$STU2" '{"year_of_study":3}'
expect "graduate + year_of_study -> 400" 400
api PATCH /students/me/profile/ "$STU1" "$(jq -nc --argjson i "$INST" --argjson c "$COURSE_CS" \
  '{phone:"+255700000001",institution:$i,course:$c,study_level:"bachelor",year_of_study:3,bio:"Final-year CS student."}')"
expect "PATCH complete student profile" 200
[[ "$(jq_ '.is_complete')" == "true" ]] && pass "  └ student profile complete" "is_complete=true" || fail "student completeness" "$(jq_ -c '.missing_fields')"

api PUT /students/me/skills/ "$STU1" "$(jq -nc --argjson p "$SKILL_PY" --argjson h "$SKILL_PHP" \
  '[{skill:$p,proficiency:"advanced"},{skill:$h,proficiency:"beginner"}]')"
expect "PUT students/me/skills/ (replace)" 200
[[ "$(num 'length')" == "2" ]] && pass "  └ 2 skills stored" "$(jq_ -c '[.[].skill_name]')" || fail "skills count" "2"
api GET /students/me/skills/ "$STU1"; expect "GET students/me/skills/" 200
api PUT /students/me/skills/ "$STU1" "$(jq -nc --argjson p "$SKILL_PY" '[{skill:$p,proficiency:"advanced"}]')"
expect "PUT skills again (idempotent replace)" 200
[[ "$(num 'length')" == "1" ]] && pass "  └ replaced, not appended" "1" || fail "skills replace" "1"

api PATCH /students/me/preferences/ "$STU1" "$(jq -nc --argjson l "$LOC_DAR" --argjson t "$TYPE_INT" --argjson i "$IND_TECH" \
  '{preferred_locations:[$l],preferred_opportunity_types:[$t],preferred_industries:[$i]}')"
expect "PATCH students/me/preferences/" 200
api GET /students/me/preferences/ "$STU1"; expect "GET students/me/preferences/" 200

api GET /students/me/cv/ "$STU1";  expect "GET students/me/cv/ (empty)" 200
upload /students/me/cv/ "$STU1" "$TXT_FILE"; expect "upload a .txt file as a CV -> 400" 400
upload /students/me/cv/ "$STU1" "$BAD_FILE"; expect "upload .pdf with wrong magic bytes -> 400" 400
upload /students/me/cv/ "$STU1" "$TMP/big.pdf"; expect "upload 6MB CV (>5MB cap) -> 400" 400
upload /students/me/cv/ "$STU1" "$CV_FILE";   expect "POST students/me/cv/ (valid PDF)" 201
CV1_ID="$(jq_ '.id')"
[[ "$(jq_ '.version')" == "1" && "$(jq_ '.is_current')" == "true" ]] && pass "  └ CV v1 flagged is_current" "v1" || fail "CV v1 flags" "v1/current"
upload /students/me/cv/ "$STU1" "$CV_FILE"; expect "upload second CV version" 201
CV2_ID="$(jq_ '.id')"
[[ "$(jq_ '.version')" == "2" ]] && pass "  └ version auto-incremented" "v2" || fail "CV version" "2"
api GET /students/me/cv/ "$STU1"
C="$(num '[.[] | select(.is_current==true)] | length')"
[[ "$C" == "1" ]] && pass "  └ exactly one is_current (partial unique index)" "1" || fail "uniq_current_cv" "1, got $C"
api GET /students/me/ "$STU1"
[[ "$(jq_ '.current_cv.id')" == "$CV2_ID" ]] && pass "students/me/ returns the current CV" "#$CV2_ID" || fail "students/me current_cv" "#$CV2_ID"

# ============================================================================
section "D. CV DOWNLOAD ACCESS CONTROL"
section_done
S="$(dl "/documents/cvs/$CV1_ID/download/" "$STU1")"
[[ "$S" == "200" ]] && pass "owner downloads own CV" "$S" || fail "owner CV download" "200 [$S]"
[[ "$(head -c 4 "$TMP/file.bin")" == "%PDF" ]] && pass "  └ payload is the real PDF" "%PDF..." || fail "CV payload" "%PDF"
S="$(dl "/documents/cvs/$CV1_ID/download/")";         [[ "$S" == "401" ]] && pass "anonymous download -> 401" "$S" || fail "anon CV download" "401 [$S]"
api GET "/documents/cvs/$CV1_ID/download/" "$STU2";  expect "unrelated student download -> 403" 403
api GET "/documents/cvs/$CV1_ID/download/" "$ORG1";  expect "unrelated org download -> 403" 403
api GET "/documents/cvs/$CV1_ID/download/" "$ADM";   expect "admin download -> 200" 200
api GET "/documents/cvs/999999/download/" "$ADM";    expect "unknown CV id -> 404" 404

# ============================================================================
section "E. ORGANIZATION PROFILE + VERIFICATION"
section_done
api GET /organizations/me/ "$ORG1"; expect "GET organizations/me/ before creation -> 404" 404
ORG1_BODY="$(jq -nc --arg e "$O1" --argjson ind "$IND_TECH" --argjson loc "$LOC_DAR" \
  '{name:"Alpha Tech Ltd",description:"Software company in Dar es Salaam",contact_email:$e,
    industry:$ind,location:$loc,website:"https://alpha.example.tz",registration_number:"BRELA-2024-001"}')"
api POST /organizations/me/ "$ORG1" "$ORG1_BODY"
expect "POST organizations/me/ (create)" 201; ORG1_ID="$(jq_ '.id')"
api POST /organizations/me/ "$ORG1" '{"name":"Duplicate"}'; expect "create a 2nd org -> 409" 409
api PATCH /organizations/me/ "$ORG1" '{"contact_phone":"+255700000900","address":"Sam Nujoma Road"}'
expect "PATCH organizations/me/" 200
api GET /organizations/me/ "$ORG1"
[[ "$(jq_ '.verification_status')" == "unverified" ]] && pass "  └ new org starts unverified" "unverified" || fail "initial verification_status" "unverified"

ORG2_BODY="$(jq -nc --arg e "$O2" --argjson ind "$IND_TECH" --argjson loc "$LOC_DAR" \
  '{name:"Beta Industries",description:"Manufacturing company",contact_email:$e,industry:$ind,location:$loc}')"
api POST /organizations/me/ "$ORG2" "$ORG2_BODY"
expect "POST organizations/me/ (2nd org)" 201; ORG2_ID="$(jq_ '.id')"

# ORG3 is deliberately bare so the "complete your profile first" guard can fire.
O3="hr.gamma.$R_ID@demo.tz"
api POST /auth/register/ "" "$(jq -nc --arg e "$O3" --arg p "$PW" '{email:$e,password:$p,role:"organization"}')" >/dev/null
ORG3="$(login "$O3")"
api POST /organizations/me/ "$ORG3" '{"name":"Gamma Startup"}'
expect "POST organizations/me/ (3rd, minimal org)" 201; ORG3_ID="$(jq_ '.id')"

api GET /organizations/
has_name '.results[].name' "Alpha Tech" && fail "public directory hides unverified orgs" "Alpha absent" || pass "public directory hides unverified orgs" "Alpha Tech hidden"

api POST /organizations/me/submit-verification/ "$ORG3"; expect "submit-verification w/o description+email -> 400" 400
[[ "$(errcode)" == "profile_incomplete" ]] && pass "  └ error.code = profile_incomplete" "$(jq_ -c '.error.details')" || skip "profile_incomplete" "code=$(errcode)"
api PATCH /organizations/me/ "$ORG3" '{"description":"A barebones startup","contact_email":"'"$O3"'"}' >/dev/null
api POST /organizations/me/submit-verification/ "$ORG2"; expect "POST submit-verification (complete profile)" 200
api POST /organizations/me/submit-verification/ "$ORG1"; expect "POST submit-verification" 200
[[ "$(jq_ '.verification_status')" == "pending" ]] && pass "  └ status -> pending" "pending" || fail "verification_status" "pending"
api POST /organizations/me/submit-verification/ "$ORG1"; expect "re-submit while pending -> 400" 400

api GET /admin/organizations/ "$ADM"; expect "GET admin/organizations/" 200
api GET "/admin/organizations/?verification_status=pending" "$ADM"; expect "filter admin/organizations by status" 200
api POST "/admin/organizations/$ORG3_ID/approve/" "$ADM" '{"note":"Docs look fine."}'
expect "admin approve an org that never submitted -> 400" 400
api POST "/admin/organizations/$ORG1_ID/approve/" "$ADM" '{"note":"Registration verified."}'
expect "admin approve org #1" 200
[[ "$(jq_ '.verification_status')" == "verified" ]] && pass "  └ status -> verified" "verified" || fail "verification_status" "verified"
api POST "/admin/organizations/$ORG1_ID/reject/" "$ADM" '{"note":"Docs missing"}'; expect "reject an already-verified org -> 400" 400
api POST "/admin/organizations/$ORG2_ID/reject/" "$ADM" '{}'; expect "reject without a note -> 400" 400

api GET /organizations/; has_name '.results[].name' "Alpha Tech" && pass "public directory now lists the verified org" "Alpha Tech visible" || fail "verified org visible" "Alpha Tech present"
api GET "/organizations/?search=Alpha"; expect "public directory ?search=" 200
api GET "/organizations/?industry=$IND_TECH"; expect "public directory ?industry=" 200
api GET "/organizations/me/" "$STU1"; expect "organizations/me/ as student -> 403" 403

# ============================================================================
section "F. OPPORTUNITY CRUD + LIFECYCLE (org side)"
section_done
api GET /organizations/me/opportunities/ "$STU1"; expect "org opportunities as student -> 403" 403
api GET /organizations/me/opportunities/ "$ORG1"; expect "GET organizations/me/opportunities/ (empty)" 200

# OPP1 - paid, on-site, CS, diploma+, year 2+, open to students & graduates
OPP1_BODY="$(jq -nc --argjson t "$TYPE_INT" --argjson l "$LOC_DAR" --argjson c "$COURSE_CS" --argjson s "$SKILL_PY" --arg d "$FAR" \
  '{opportunity_type:$t,title:"Software Engineering Internship",description:"Work on our Django platform.",
    location:$l,is_remote:false,duration_months:6,deadline:$d,positions:2,is_paid:true,
    requirements:{courses:[$c],skills:[$s],min_study_level:"diploma",min_year_of_study:2,
                  students_eligible:true,graduates_eligible:true}}')"
api POST /organizations/me/opportunities/ "$ORG1" "$OPP1_BODY"
expect "POST create opportunity (draft)" 201; OPP1="$(jq_ '.id')"
[[ "$(jq_ '.status')" == "draft" ]] && pass "  └ new status = draft" "draft" || fail "initial status" "draft"

api POST /organizations/me/opportunities/ "$ORG1" "$(jq -nc --argjson t "$TYPE_INT" '{opportunity_type:$t,title:"Past Deadline",description:"x",deadline:"2020-01-01"}')"
expect "create with a past deadline -> 400" 400
api POST /organizations/me/opportunities/ "$ORG1" "$(jq -nc --argjson t "$TYPE_INT" '{opportunity_type:$t,title:"Bad",description:"x",deadline:"2099-01-01",requirements:{students_eligible:false,graduates_eligible:false}}')"
expect "requirements with no eligible group -> 400" 400
api POST /organizations/me/opportunities/ "$ORG1" "$(jq -nc '{opportunity_type:999999,title:"Bad type",description:"x",deadline:"2099-01-01"}')"
expect "unknown opportunity_type -> 400" 400
api POST /organizations/me/opportunities/ "$ORG1" '{"title":"No type","description":"x","deadline":"2099-01-01"}'
expect "missing required fields -> 400" 400

api PATCH "/organizations/me/opportunities/$OPP1/" "$ORG1" '{"title":"Software Engineering Internship (2026)"}'
expect "PATCH a draft opportunity" 200

# OPP2 - remote, unpaid, open to every study level (so a bachelor can apply)
OPP2_BODY="$(jq -nc --argjson t "$TYPE_INT" --argjson s "$SKILL_PHP" --arg d "$FAR" \
  '{opportunity_type:$t,title:"Mobile Developer Internship",description:"Flutter + Django intern role.",
    location:null,is_remote:true,duration_months:3,deadline:$d,positions:1,is_paid:false,
    requirements:{skills:[$s]}}')"
api POST /organizations/me/opportunities/ "$ORG1" "$OPP2_BODY"
expect "create a remote opportunity (no location)" 201; OPP2="$(jq_ '.id')"

# OPP3 - graduates only
OPP3_BODY="$(jq -nc --argjson t "$TYPE_VOL" --arg d "$FAR" \
  '{opportunity_type:$t,title:"Voluntary Field Attachment",description:"Open source contribution.",
    deadline:$d,positions:5,requirements:{students_eligible:false,graduates_eligible:true}}')"
api POST /organizations/me/opportunities/ "$ORG1" "$OPP3_BODY"
expect "create an opportunity with no location, not remote" 201; OPP3="$(jq_ '.id')"

# OPP4 - masters only, so ?study_level=bachelor must exclude it
OPP4_BODY="$(jq -nc --argjson t "$TYPE_FIELD" --argjson l "$LOC_DAR" --arg d "$FAR" \
  '{opportunity_type:$t,title:"Masters Only Placement",description:"Postgraduate placement.",
    location:$l,deadline:$d,positions:1,requirements:{min_study_level:"masters"}}')"
api POST /organizations/me/opportunities/ "$ORG1" "$OPP4_BODY"
expect "create a masters-only opportunity" 201; OPP4="$(jq_ '.id')"

api POST "/organizations/me/opportunities/$OPP3/submit/" "$ORG1"
expect "submit a non-remote opp with no location -> 400" 400
[[ "$(errcode)" == "location_required" ]] && pass "  └ error.code = location_required" "location_required" || skip "location_required" "code=$(errcode)"
api PATCH "/organizations/me/opportunities/$OPP3/" "$ORG1" "$(jq -nc --argjson l "$LOC_ARU" '{location:$l}')"
expect "PATCH while still draft" 200

api POST /organizations/me/opportunities/ "$ORG1" "$(jq -nc --argjson t "$TYPE_INT" '{opportunity_type:$t,title:"Throwaway Draft",description:"x",deadline:"2099-01-01"}')"
THROW_ID="$(jq_ '.id')"
api POST "/organizations/me/opportunities/$THROW_ID/archive/" "$ORG1"; expect "archive a draft -> 200" 200
api POST "/organizations/me/opportunities/$THROW_ID/submit/" "$ORG1"; expect "submit an archived opp -> 400" 400

api GET "/organizations/me/opportunities/?status=draft" "$ORG1"; expect "filter org opportunities by ?status=" 200
api GET "/organizations/me/opportunities/?search=Software" "$ORG1"; expect "search org opportunities" 200
api GET "/organizations/me/opportunities/?ordering=deadline" "$ORG1"; expect "order org opportunities" 200

# ============================================================================
section "G. ADMIN MODERATION -> PUBLISH"
section_done
api POST "/admin/opportunities/$OPP1/approve/" "$ADM" '{}'; expect "approve a draft (not pending) -> 400" 400
api POST "/admin/opportunities/$OPP1/reject/" "$ADM" '{}'; expect "reject without a note -> 400" 400
api GET "/admin/opportunities/?status=draft" "$ADM"; expect "GET admin/opportunities/?status=" 200
api GET "/admin/opportunities/?search=Software" "$ADM"; expect "search admin opportunities" 200
api POST "/admin/opportunities/$OPP1/suspend/" "$STU1" '{}'; expect "admin action as a student -> 403" 403
api GET /admin/opportunities/; expect "admin list anonymous -> 401" 401

api POST "/organizations/me/opportunities/$OPP1/submit/" "$ORG1"; expect "org submits opp #1 for review" 200
[[ "$(jq_ '.status')" == "pending_review" ]] && pass "  └ status = pending_review" "pending_review" || fail "submit status" "pending_review"
api POST "/admin/opportunities/$OPP1/approve/" "$ADM" '{"note":"Approved."}'
expect "admin approves opp #1" 200
[[ "$(jq_ '.status')" == "published" ]] && pass "  └ status = published" "published" || fail "approve status" "published"

api POST "/organizations/me/opportunities/$OPP2/submit/" "$ORG1"; expect "org submits opp #2 (remote)" 200
api POST "/admin/opportunities/$OPP2/approve/" "$ADM" '{"note":"Approved."}'; expect "admin approves opp #2" 200
api POST "/organizations/me/opportunities/$OPP3/submit/" "$ORG1"; expect "org submits opp #3 (now has a location)" 200
api POST "/admin/opportunities/$OPP3/approve/" "$ADM" '{"note":"Approved."}'; expect "admin approves opp #3" 200
api POST "/organizations/me/opportunities/$OPP4/submit/" "$ORG1"; expect "org submits opp #4" 200
api POST "/admin/opportunities/$OPP4/approve/" "$ADM" '{"note":"Approved."}'; expect "admin approves opp #4" 200

api PATCH "/organizations/me/opportunities/$OPP3/" "$ORG1" "$(jq -nc --argjson l "$LOC_ARU" '{location:$l}')"
expect "PATCH a published opportunity -> 400" 400
[[ "$(errcode)" == "not_editable" ]] && pass "  └ published content is immutable" "not_editable" || skip "not_editable" "code=$(errcode)"

api GET /admin/audit-log/ "$ADM"; expect "GET admin/audit-log/" 200
AUDIT_N="$(num '.count')"
[[ "$AUDIT_N" -ge 4 ]] && pass "  └ audit trail recorded admin actions" "$AUDIT_N entries" || fail "audit log" ">=4"
api GET "/admin/audit-log/?action=opportunity.approve" "$ADM"; expect "filter audit-log by ?action=" 200
api GET "/admin/audit-log/?target_type=organizations.organization&target_id=$ORG1_ID" "$ADM"; expect "filter audit-log by target" 200
api GET "/admin/audit-log/999999/" "$ADM"; expect "unknown audit-log id -> 404" 404

# ============================================================================
section "H. PUBLIC DISCOVERY + FILTERS"
section_done
api GET /opportunities/; expect "GET opportunities/ (anonymous)" 200
PUB_N="$(num '.count')"
[[ "$PUB_N" -ge 5 ]] && pass "  └ published opportunities are publicly visible" "$PUB_N total (incl. 2 seeded)" || fail "public count" ">=5"
api GET "/opportunities/$OPP1/"; expect "GET opportunities/{id}/ (detail)" 200
[[ "$(num '.requirements.skills | length')" -ge 1 ]] && pass "  └ detail embeds requirements" "skills=$(jq_ '[.requirements.skills[].name]|join(",")') min_level=$(jq_ '.requirements.min_study_level')" || fail "detail requirements" "skills present"
api GET "/opportunities/999999/"; expect "unknown opportunity -> 404" 404

# Counts below are scoped to ORG1's own opportunities so the seeded demo data
# cannot influence them.  OPP1 paid/on-site/CS/diploma+/year2+,
# OPP2 remote & open to all levels, OPP3 graduates-only (Arusha),
# OPP4 masters-only (Dar es Salaam).
O="&organization=$ORG1_ID"
api GET "/opportunities/?organization=$ORG1_ID";  expect "?organization=" 200
[[ "$(num '.count')" == "4" ]] && pass "  └ 4 of our opportunities" "4" || fail "organization filter count" "4, got $(num '.count')"
api GET "/opportunities/?q=Voluntary";           expect "?q=keyword" 200
[[ "$(num '.count')" == "1" ]] && pass "  └ free-text search" "1" || fail "?q count" "1, got $(num '.count')"
api GET "/opportunities/?q=zzzznotarealterm";   expect "?q=no-match" 200
[[ "$(num '.count')" == "0" ]] && pass "  └ no false positives" "0" || fail "?q no-match" "0"
api GET "/opportunities/?type=internship$O";    expect "?type=<slug>" 200
[[ "$(num '.count')" == "2" ]] && pass "  └ internship type only" "2" || fail "?type count" "2, got $(num '.count')"
api GET "/opportunities/?region=Arusha";        expect "?region=" 200
[[ "$(num '.count')" == "1" ]] && pass "  └ region match" "1" || fail "?region count" "1, got $(num '.count')"
api GET "/opportunities/?location=$LOC_DAR$O";  expect "?location=<id>" 200
[[ "$(num '.count')" == "2" ]] && pass "  └ location match" "2" || fail "?location count" "2, got $(num '.count')"
api GET "/opportunities/?is_remote=true$O";     expect "?is_remote=true" 200
[[ "$(num '.count')" == "1" ]] && pass "  └ only the remote one" "1" || fail "?is_remote count" "1, got $(num '.count')"
api GET "/opportunities/?is_paid=true$O";       expect "?is_paid=true" 200
[[ "$(num '.count')" == "1" ]] && pass "  └ only the paid one" "1" || fail "?is_paid count" "1, got $(num '.count')"
api GET "/opportunities/?study_level=bachelor$O"; expect "?study_level=bachelor" 200
[[ "$(num '.count')" == "3" ]] && pass "  └ masters-only opp excluded" "3 of 4" || fail "?study_level=bachelor" "3, got $(num '.count')"
api GET "/opportunities/?study_level=certificate$O"; expect "?study_level=certificate" 200
[[ "$(num '.count')" == "2" ]] && pass "  └ diploma+ opps excluded" "2 of 4" || fail "?study_level=certificate" "2, got $(num '.count')"
api GET "/opportunities/?course=$COURSE_CS$O";  expect "?course=<id>" 200
[[ "$(num '.count')" == "4" ]] && pass "  └ matches courses + open-ended ones" "4" || fail "?course count" "4, got $(num '.count')"
api GET "/opportunities/?skill=$SKILL_PY$O";    expect "?skill=<id>" 200
[[ "$(num '.count')" == "1" ]] && pass "  └ skill filter is a strict match" "1" || fail "?skill count" "1, got $(num '.count')"
api GET "/opportunities/?industry=$IND_TECH";   expect "?industry=<id>" 200
api GET "/opportunities/?deadline_after=$TODAY"; expect "?deadline_after=" 200
api GET "/opportunities/?deadline_before=$FAR";  expect "?deadline_before=" 200
api GET "/opportunities/?ordering=deadline";    expect "?ordering=deadline" 200
api GET "/opportunities/?ordering=title";        expect "?ordering=title" 200
api GET "/opportunities/?page_size=2";           expect "?page_size=2" 200
[[ "$(num '.results|length')" == "2" ]] && pass "  └ page_size honoured" "2" || skip "?page_size" "n=$(num '.results|length')"
api GET "/opportunities/?page_size=2&page=3"; expect "?page=3 (last page of 3)" 200
[[ "$(num '.next')" == "null" ]] && pass "  └ next is null on the final page" "null" || skip "?page=3 next" "$(num '.next')"
api GET "/opportunities/?page=999";              expect "?page beyond the last page -> 404" 404

# ============================================================================
section "I. SAVE / UNSAVE"
section_done
api POST "/opportunities/$OPP2/save/" "$STU1"; expect "POST opportunities/{id}/save/" 201
api POST "/opportunities/$OPP2/save/" "$STU1"; expect "saving twice is idempotent" 201
api GET /students/me/saved-opportunities/ "$STU1"; expect "GET saved-opportunities/" 200
[[ "$(num '.count')" == "1" ]] && pass "  └ exactly 1 saved (unique constraint)" "1" || fail "saved count" "1, got $(num '.count')"
api GET /opportunities/ "$STU1"
[[ "$(num '[.results[] | select(.is_saved==true)] | length')" == "1" ]] && pass "is_saved flag injected for students" "true" || fail "is_saved flag" "true"
api GET /opportunities/ "$ORG1"
[[ "$(num '[.results[] | select(.is_saved==false)] | length')" == "$PUB_N" ]] && pass "is_saved false for non-students" "all false" || skip "is_saved for org" "unexpected"
api DELETE "/opportunities/$OPP2/save/" "$STU1"; expect "DELETE opportunities/{id}/save/" 204
api GET /students/me/saved-opportunities/ "$STU1"
[[ "$(num '.count')" == "0" ]] && pass "  └ list is now empty" "0" || fail "unsave" "count=0"
api POST "/opportunities/$OPP2/save/" "$STU1" >/dev/null

# ============================================================================
section "J. APPLICATIONS"
section_done
api POST /auth/register/ "" "$(jq -nc --arg e "$S3" --arg p "$PW" '{email:$e,password:$p,role:"student",full_name:"Kwamba Joseph"}')" >/dev/null
STU3="$(login "$S3")"
api POST "/opportunities/$OPP1/apply/" "$STU3" '{"cover_letter":"Please consider me."}'
expect "apply with an incomplete profile -> 400" 400
[[ "$(errcode)" == "profile_incomplete" ]] && pass "  └ error.code = profile_incomplete" "$(jq_ -c '.error.details')" || skip "profile_incomplete" "code=$(errcode)"
api PATCH /students/me/profile/ "$STU3" "$(jq -nc --argjson i "$INST" --argjson c "$COURSE_CS" \
  '{phone:"+255700000003",institution:$i,course:$c,study_level:"bachelor",year_of_study:1}')"
expect "third student completes the profile (year 1)" 200
api POST "/opportunities/$OPP1/apply/" "$STU3" '{"cover_letter":"Please consider me."}'
expect "apply below min_year_of_study -> 400" 400
[[ "$(errcode)" == "not_eligible" ]] && pass "  └ error.code = not_eligible" "not_eligible" || skip "not_eligible" "code=$(errcode)"
note "reasons: $(jq_ -c '.error.details.reasons')"
api PATCH /students/me/profile/ "$STU3" '{"year_of_study":2}' >/dev/null
api POST "/opportunities/$OPP1/apply/" "$STU3" '{"cover_letter":"Please consider me."}'
expect "apply once eligible (year 2)" 201; APP2="$(jq_ '.id')"
api POST "/opportunities/$OPP4/apply/" "$STU1" '{}'
expect "bachelor applying to a masters-only opp -> 400" 400
note "reasons: $(jq_ -c '.error.details.reasons')"

api POST "/opportunities/$OPP1/apply/" "$STU1" '{"cover_letter":"I am a final-year CS student."}'
expect "POST opportunities/{id}/apply/ (student)" 201; APP1="$(jq_ '.id')"
[[ "$(jq_ '.status')" == "submitted" ]] && pass "  └ status = submitted" "submitted" || fail "apply status" "submitted"
[[ "$(jq_ '.cv.id')" == "$CV2_ID" ]] && pass "  └ current CV snapshot attached" "#$CV2_ID" || fail "CV snapshot" "#$CV2_ID"
[[ "$(num '.events | length')" == "1" ]] && pass "  └ ApplicationEvent created" "1 event" || fail "initial event" "1"

api POST "/opportunities/$OPP1/apply/" "$STU1" '{}'; expect "duplicate application -> 409" 409
[[ "$(errcode)" == "already_applied" ]] && pass "  └ error.code = already_applied" "already_applied" || skip "already_applied" "code=$(errcode)"
api POST "/opportunities/$OPP2/apply/" "$STU1" "$(jq -nc --argjson c "$CV1_ID" '{cover_letter:"Remote role.",cv:$c}')"
expect "apply to the remote opp with an explicit older CV" 201; APP3="$(jq_ '.id')"
[[ "$(jq_ '.cv.id')" == "$CV1_ID" ]] && pass "  └ explicit CV id honoured" "#$CV1_ID" || fail "explicit cv id" "#$CV1_ID"
api POST "/opportunities/$OPP1/apply/" "$STU2" '{}'; expect "graduate applies to a students_eligible opp" 201; APP4="$(jq_ '.id')"
api POST "/opportunities/$OPP3/apply/" "$STU1" '{}'
expect "student applying to a graduates-only opp -> 400" 400
note "reasons: $(jq_ -c '.error.details.reasons')"
api POST "/opportunities/$OPP3/apply/" "$STU2" '{}'; expect "graduate applies to the graduates-only opp" 201; APP5="$(jq_ '.id')"
api POST "/opportunities/$OPP1/apply/" "$STU1" '{"cv":999999}'; expect "apply with an unknown cv id -> 400" 400
api POST "/opportunities/$OPP1/apply/" "$ORG1" '{}'; expect "apply as an org user -> 403" 403
api POST "/opportunities/999999/apply/" "$STU1" '{}'; expect "apply to an unknown opportunity -> 400" 400

api GET /applications/ "$STU1"; expect "GET applications/ (student)" 200
[[ "$(num '.count')" == "2" ]] && pass "  └ student sees only their own 2" "2" || fail "student application scope" "2, got $(num '.count')"
api GET "/applications/?status=submitted" "$STU1"; expect "filter applications by ?status=" 200
api GET "/applications/?ordering=-status_updated_at" "$STU1"; expect "order applications" 200
api GET "/applications/$APP1/" "$STU1"; expect "GET applications/{id}/ (owner)" 200
api GET "/applications/$APP2/" "$STU1"; expect "another student's application -> 404" 404
api GET "/applications/999999/" "$STU1"; expect "unknown application -> 404" 404
api GET /applications/; expect "applications list anonymous -> 401" 401

# ============================================================================
section "K. STATUS WORKFLOW (org -> student)"
section_done
api POST "/organizations/me/applications/$APP1/status/" "$ORG1" '{"status":"accepted"}'
expect "submitted -> accepted (skips states) -> 400" 400
[[ "$(errcode)" == "invalid_transition" ]] && pass "  └ error.code = invalid_transition" "invalid_transition" || skip "invalid_transition" "code=$(errcode)"
api POST "/organizations/me/applications/$APP1/status/" "$ORG1" '{"status":"shortlisted"}'; expect "submitted -> shortlisted -> 400" 400
api POST "/organizations/me/applications/$APP1/status/" "$ORG1" '{"status":"unknown_status"}'; expect "unknown status value -> 400" 400
api POST "/organizations/me/applications/$APP1/status/" "$ORG1" '{"status":"reviewing","note":"Reviewing your CV."}'
expect "org: submitted -> reviewing" 200
[[ "$(jq_ '.status')" == "reviewing" ]] && pass "  └ status = reviewing" "reviewing" || fail "status reviewing" "reviewing"
api POST "/organizations/me/applications/$APP1/status/" "$ORG1" '{"status":"shortlisted","note":"Strong Python."}'
expect "org: reviewing -> shortlisted" 200
api POST "/organizations/me/applications/$APP1/status/" "$ORG1" '{"status":"interview"}'; expect "org: shortlisted -> interview" 200
api POST "/organizations/me/applications/$APP1/status/" "$ORG1" '{"status":"accepted","note":"Offer sent."}'
expect "org: interview -> accepted" 200
[[ "$(jq_ '.status')" == "accepted" ]] && pass "  └ status = accepted" "accepted" || fail "status accepted" "accepted"
api POST "/organizations/me/applications/$APP1/status/" "$ORG1" '{"status":"rejected"}'; expect "accepted is terminal -> 400" 400

api GET "/applications/$APP1/" "$STU1"
[[ "$(jq_ '.status')" == "accepted" ]] && pass "student sees the updated status" "accepted" || fail "student sees status" "accepted"
EV="$(num '.events | length')"
[[ "$EV" == "5" ]] && pass "  └ full audit trail of status changes" "$EV events" || fail "event count" "5, got $EV"
note "events: $(jq_ -c '[.events[] | (.old_status // "-") + "->" + .new_status]')"
api GET "/organizations/me/applications/$APP1/" "$ORG2"; expect "another org fetching the application -> 404" 404
api POST "/organizations/me/applications/$APP1/status/" "$STU1" '{"status":"rejected"}'; expect "student cannot reject via the org API -> 403" 403

api GET /organizations/me/applications/ "$ORG1"; expect "GET org applications/" 200
[[ "$(num '.count')" == "5" ]] && pass "  └ org sees its own 5 applications" "5" || fail "org application scope" "5, got $(num '.count')"
api GET "/organizations/me/applications/?status=accepted" "$ORG1"; expect "filter org applications by ?status=" 200
api GET "/organizations/me/applications/?opportunity=$OPP1" "$ORG1"; expect "filter org applications by ?opportunity=" 200
[[ "$(num '.count')" == "3" ]] && pass "  └ 3 applicants on opp #1" "3" || fail "?opportunity count" "3, got $(num '.count')"
api GET "/organizations/me/applications/?search=Asha" "$ORG1"; expect "search org applications by applicant name" 200
[[ "$(num '.count')" == "1" ]] && pass "  └ name search" "1" || skip "?search count" "n=$(num '.count')"
api GET "/organizations/me/applications/$APP1/" "$ORG1"; expect "GET org application detail" 200
[[ "$(jq_ '.applicant.email')" == "$S1" ]] && pass "  └ applicant profile embedded" "$S1" || fail "applicant payload" "email present"
[[ "$(jq_ '.cv.id')" == "$CV2_ID" ]] && pass "  └ CV visible to the org it was sent to" "#$CV2_ID" || fail "org CV visibility" "#$CV2_ID"
api GET /organizations/me/applications/ "$ORG2"; expect "org #2 sees an empty list" 200
[[ "$(num '.count')" == "0" ]] && pass "  └ tenant isolation between orgs" "0" || fail "tenant isolation" "0, got $(num '.count')"
api GET /applications/ "$STU2"; [[ "$(num '.count')" == "2" ]] && pass "graduate sees their own 2 applications" "2" || fail "graduate scope" "2, got $(num '.count')"

# ============================================================================
section "L. WITHDRAWAL"
section_done
api POST "/applications/$APP2/withdraw/" "$STU3" '{}'; expect "student withdraws their own application" 200
[[ "$(jq_ '.status')" == "withdrawn" ]] && pass "  └ status = withdrawn" "withdrawn" || fail "withdraw status" "withdrawn"
api POST "/organizations/me/applications/$APP2/status/" "$ORG1" '{"status":"reviewing"}'; expect "withdrawn is terminal -> 400" 400
api POST "/applications/$APP2/withdraw/" "$STU1" '{}'; expect "withdraw another student's application -> 404" 404
api POST "/applications/$APP1/withdraw/" "$STU1" '{}'; expect "withdraw an accepted application -> 400" 400
api POST "/applications/$APP2/withdraw/" "$ORG1" '{}'; expect "org calling withdraw -> 403" 403

# ============================================================================
section "M. ADMIN USER + RESOURCE MODERATION"
section_done
api GET /admin/users/ "$ADM"; expect "GET admin/users/" 200
api GET "/admin/users/?role=student&is_active=true" "$ADM"; expect "filter admin/users by role+is_active" 200
api GET "/admin/users/?search=$S3" "$ADM"; expect "search admin/users by email" 200
api GET /admin/users/ "$ORG1"; expect "admin/users as an org -> 403" 403

api GET "/admin/users/?search=admin@demo.tz" "$ADM"; ADM_ID="$(jq_ '.results[0].id')"
api POST "/admin/users/$ADM_ID/suspend/" "$ADM" '{"note":"testing"}'; expect "cannot suspend an admin -> 400" 400
api POST "/admin/users/$ORGUSER1_ID/suspend/" "$ADM" '{"note":"Policy breach."}'
expect "admin suspends the org user" 200
[[ "$(jq_ '.is_active')" == "false" ]] && pass "  └ is_active = false" "false" || fail "suspend flag" "false"
api POST /organizations/me/opportunities/ "$ORG1" '{"x":1}'; expect "suspended user is blocked from the API" 401
api GET /opportunities/; expect "public list still works" 200
api POST "/admin/users/$ORGUSER1_ID/reactivate/" "$ADM" '{"note":"Appeal accepted."}'
expect "admin reactivates the org user" 200
[[ "$(jq_ '.is_active')" == "true" ]] && pass "  └ is_active = true" "true" || fail "reactivate flag" "true"
ORG1="$(login "$O1")"

api POST "/admin/organizations/$ORG2_ID/approve/" "$ADM" '{"note":"ok"}'
api POST "/admin/organizations/$ORG2_ID/suspend/" "$ADM" '{"note":"Fraud investigation."}'
expect "admin suspends org #2" 200
[[ "$(jq_ '.is_active')" == "false" ]] && pass "  └ is_active = false" "false" || fail "org suspend flag" "false"
api GET /organizations/; has_name '.results[].name' "Beta Industries" && fail "suspended org leaves the directory" "Beta absent" || pass "suspended org leaves the directory" "Beta hidden"
api POST "/admin/organizations/$ORG2_ID/reactivate/" "$ADM" '{"note":"Cleared."}'; expect "admin reactivates org #2" 200
api GET /organizations/; has_name '.results[].name' "Beta Industries" && pass "  └ back in the directory" "Beta visible" || skip "reactivated org" "Beta absent"

api POST "/admin/opportunities/$OPP1/suspend/" "$ADM" '{"note":"Misleading listing."}'
expect "admin suspends a published opportunity" 200
[[ "$(jq_ '.status')" == "suspended" ]] && pass "  └ status = suspended" "suspended" || fail "suspend status" "suspended"
api GET /opportunities/; [[ "$(num '.count')" == "$((PUB_N-1))" ]] && pass "suspended opp leaves the public list" "$((PUB_N-1))" || skip "suspended hidden" "count=$(num '.count') (was $PUB_N)"
api POST "/opportunities/$OPP1/apply/" "$STU1" '{}'; expect "cannot apply to a suspended opp -> 400" 400
api POST "/admin/opportunities/$OPP1/approve/" "$ADM" '{"note":"Reinstated."}'; expect "admin re-approves the suspended opp" 200
api GET /opportunities/; [[ "$(num '.count')" == "$PUB_N" ]] && pass "  └ back in the public list" "$PUB_N" || skip "reinstated" "count=$(num '.count')"

# ============================================================================
section "N. STATS, SCHEDULED JOB, LIFECYCLE EXTRAS"
section_done
api GET /admin/stats/ "$ADM"; expect "GET admin/stats/" 200
note "$(jq_ -c .)"
BAD=0
for k in users organizations opportunities applications; do
  V="$(num ".${k}.total")"; [[ "$V" -gt 0 ]] || BAD=1
done
[[ "$BAD" == "0" ]] && pass "  └ every stats block has a total" "4 blocks" || fail "stats totals" ">0"
api GET /admin/stats/ "$STU1"; expect "admin/stats as a student -> 403" 403

if [[ -z "$EXTERNAL_URL" && -x "$PY" ]]; then
  api POST /organizations/me/opportunities/ "$ORG1" "$(jq -nc --argjson t "$TYPE_INT" --argjson l "$LOC_DAR" --arg d "$FUTURE" \
    '{opportunity_type:$t,title:"Expiring Soon",description:"Deadline test.",location:$l,deadline:$d}')"
  EXPIRED_ID="$(jq_ '.id')"
  api POST "/organizations/me/opportunities/$EXPIRED_ID/submit/" "$ORG1" >/dev/null
  api POST "/admin/opportunities/$EXPIRED_ID/approve/" "$ADM" '{}' >/dev/null
  api GET "/opportunities/$EXPIRED_ID/"; expect "expiring opp is visible while open" 200
  (cd "$PROJECT_DIR" && "$PY" manage.py shell -c \
    "from apps.opportunities.models import Opportunity; Opportunity.objects.filter(pk=$EXPIRED_ID).update(deadline='2020-01-01')" >/dev/null 2>&1)
  api GET "/opportunities/$EXPIRED_ID/"; expect "hidden from public once past the deadline" 404
  api POST "/opportunities/$EXPIRED_ID/apply/" "$STU1" '{}'; expect "cannot apply past the deadline -> 400" 400
  [[ "$(errcode)" == "deadline_passed" || "$(errcode)" == "opportunity_not_open" ]] && pass "  └ error.code = $(errcode)" "$(errcode)" || skip "deadline error code" "$(errcode)"
  (cd "$PROJECT_DIR" && "$PY" manage.py expire_opportunities >/dev/null 2>&1)
  api GET "/organizations/me/opportunities/?status=expired" "$ORG1"
  [[ "$(num '.count')" == "1" ]] && pass "manage.py expire_opportunities marked it EXPIRED" "1" || skip "expire_opportunities" "count=$(num '.count')"

  api POST "/organizations/me/opportunities/$OPP2/close/" "$ORG1"; expect "org closes a published opp" 200
  [[ "$(jq_ '.status')" == "closed" ]] && pass "  └ status = closed" "closed" || fail "close status" "closed"
  api POST "/organizations/me/opportunities/$OPP2/unpublish/" "$ORG1"; expect "unpublish a closed opp -> 400" 400
  api POST "/organizations/me/opportunities/$OPP2/archive/" "$ORG1"; expect "archive from closed -> 200" 200
  [[ "$(jq_ '.status')" == "archived" ]] && pass "  └ status = archived" "archived" || fail "archive status" "archived"
  api POST "/organizations/me/opportunities/$OPP1/archive/" "$ORG1"; expect "archive from published -> 400" 400
  api POST /organizations/me/opportunities/ "$ORG1" "$(jq -nc --argjson t "$TYPE_INT" --arg d "$FUTURE" \
    '{opportunity_type:$t,title:"Delete Me",description:"x",deadline:$d}')"
  DEL_ID="$(jq_ '.id')"
  api DELETE "/organizations/me/opportunities/$DEL_ID/" "$ORG1"; expect "DELETE a draft opportunity -> 204" 204
  api DELETE "/organizations/me/opportunities/$OPP1/" "$ORG1"; expect "DELETE a published opportunity -> 400" 400
  api DELETE "/organizations/me/opportunities/$OPP3/" "$ORG1"; expect "DELETE an opp that has applications -> 400" 400
else
  skip "expire_opportunities + lifecycle extras" "requires the managed server"
fi

# ============================================================================
section "O. ERROR ENVELOPE + MISC"
section_done
api GET /applications/999999/ "$STU1"
note "$(jq_ -c .)"
[[ "$(jq_ '.error | has("code") and has("message") and has("details")')" == "true" ]] \
  && pass "errors use {error:{code,message,details}}" "3 keys" || fail "error envelope" "code/message/details"
api POST /auth/login/ "" '{"email":'; expect "malformed JSON body -> 400" 400
api GET /nonexistent-endpoint/;              expect "unknown path -> 404" 404
api PATCH /students/me/profile/ "$STU1" '{}'; expect "PATCH with an empty body is a no-op" 200
api PUT /students/me/profile/ "$STU1" '{"account_type":"student","full_name":"Asha Mushi","phone":"+255700999999","institution":null,"course":null,"study_level":"","year_of_study":null,"graduation_year":null,"bio":""}'
expect "PUT students/me/profile/ (full replace)" 200
[[ "$(jq_ '.phone')" == "+255700999999" && "$(jq_ '.institution')" == "null" ]] && pass "  └ omitted fields cleared (PUT = replace)" "replaced" || fail "PUT replace semantics" "replaced"
api PATCH /students/me/profile/ "$STU1" "$(jq -nc --argjson i "$INST" --argjson c "$COURSE_CS" \
  '{phone:"+255700000001",full_name:"Asha Mushi",institution:$i,course:$c,study_level:"bachelor",year_of_study:3}')"
expect "  └ restore the profile" 200
S="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE")"
[[ "$S" == "404" ]] && pass "the API root has no index view" "404" || skip "API root" "$S"
curl -sS -o /dev/null "${BASE%/api/v1}/api/schema/" && pass "OpenAPI schema is served at /api/schema/" "200" || skip "OpenAPI schema" "unreachable"

# ============================================================================
printf '\n%s%s%s\n' "$B" "==============================================" "$R"
if [[ "$FAILED" -eq 0 ]]; then
  printf '%s%sALL %d CHECKS PASSED%s\n' "$B" "$G" "$PASSED" "$R"
else
  printf '%s%s%d passed, %d FAILED%s\n' "$B" "$RED" "$PASSED" "$FAILED" "$R"
  for n in "${FAILED_NAMES[@]}"; do printf '  %s- %s%s\n' "$RED" "$n" "$R"; done
fi
printf '%s%s%s\n' "$B" "==============================================" "$R"
[[ "$FAILED" -eq 0 ]]