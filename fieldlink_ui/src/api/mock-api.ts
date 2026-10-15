import type {
  User, LoginResponse, ApiList, Institution, Course, Skill, Industry, Location,
  OpportunityType, StudentMeResponse, StudentProfile, StudentSkill, StudentPreferences,
  CVDocument, Organization, OrganizationOpportunity, OpportunityDetail, OpportunityListItem,
  StudentApplicationListItem, StudentApplicationDetail, SavedOpportunity,
  OrganizationApplicationListItem, OrganizationApplicationDetail,
  AdminUser, AdminOrganization, AdminOpportunity, AdminActionLog, PlatformStats,
  AccountType, Role, ApplicationStatus,
} from "@/types";
import {
  users, tokens, userByEmail, userByToken, userByRefresh,
  institutions, courses, skills, industries, locations, opportunityTypes,
  studentProfiles, studentSkills, studentPreferences, studentCVs,
  organizations, orgOpportunities, applications, savedOpps, auditLog,
  orgByUserId, getOrgByOpportunity, getOrgIdByOpportunity, getOpportunityById,
  toPublicOpportunity, toPublicOpportunityDetail, toStudentAppListItem, toStudentAppDetail,
  toOrgAppListItem,   toOrgAppDetail, toAdminOrg, toAdminOpp, getStats,
  canTransition, canTransitionApp, addAuditEntry, genId, nowISO, today,
} from "./mock-db";
import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken, setStoredUser, clearSession } from "@/auth/session";

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms));

function paginate<T>(items: T[], page = 1, pageSize = 20): ApiList<T> {
  const start = (page - 1) * pageSize;
  const results = items.slice(start, start + pageSize);
  const hasNext = start + pageSize < items.length;
  const hasPrev = page > 1;
  return {
    count: items.length,
    next: hasNext ? `?page=${page + 1}&page_size=${pageSize}` : null,
    previous: hasPrev ? `?page=${page - 1}&page_size=${pageSize}` : null,
    results,
  };
}

function fail(code: string, message: string, details?: Record<string, unknown>, status = 400) {
  const err = { response: { status, data: { error: { code, message, details } } } };
  return err;
}

function notFound(msg = "Not found.") { return fail("not_found", msg, undefined, 404); }
function forbidden(msg = "You do not have permission.") { return fail("permission_denied", msg, undefined, 403); }
function unauthorized(msg = "Authentication required.") { return fail("not_authenticated", msg, undefined, 401); }

function requireAuth(): User {
  const token = getAccessToken();
  if (!token) throw unauthorized();
  const u = userByToken(token);
  if (!u) { clearSession(); throw unauthorized("Session expired. Please log in."); }
  return { id: u.id, email: u.email, role: u.role, is_active: u.is_active, date_joined: u.date_joined };
}

// ─── Auth ───────────────────────────────────────────────────────────────────
export async function apiRegister(body: { email: string; password: string; role: "student" | "organization"; account_type?: AccountType; full_name?: string }): Promise<User> {
  await delay();
  const email = body.email.toLowerCase().trim();
  if (userByEmail(email)) throw fail("validation_error", "An account with this email already exists.", { email: ["An account with this email already exists."] }, 409);
  if (body.password.length < 8) throw fail("validation_error", "Password must be at least 8 characters.", { password: ["Password must be at least 8 characters."] });
  if (body.role === "student" && !body.full_name) throw fail("validation_error", "Full name is required for students.", { full_name: ["Full name is required."] });
  if (body.role !== "student" && body.role !== "organization") throw fail("validation_error", "Invalid role.");
  const id = genId();
  const newUser = { id, email, role: body.role as Role, is_active: true, date_joined: nowISO(), password: body.password };
  users.push(newUser);
  tokens[id] = { access: `mock-access-${id}`, refresh: `mock-refresh-${id}` };
  if (body.role === "student") {
    studentProfiles[id] = {
      id, email, account_type: body.account_type ?? "student", full_name: body.full_name ?? "",
      phone: "", institution: null, institution_name: null, course: null, course_name: null,
      study_level: "", year_of_study: null, graduation_year: null, bio: "",
      is_complete: false, missing_fields: ["full_name", "phone", "institution", "course", "study_level", "year_of_study"],
      updated_at: nowISO(),
    };
    studentSkills[id] = [];
    studentPreferences[id] = { preferred_locations: [], preferred_opportunity_types: [], preferred_industries: [] };
    studentCVs[id] = [];
    savedOpps[id] = new Set();
  }
  return { id, email, role: body.role as Role, is_active: true, date_joined: newUser.date_joined };
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  await delay();
  const user = userByEmail(email);
  if (!user || user.password !== password) throw fail("validation_error", "Invalid email or password.", { non_field_errors: ["Invalid email or password."] });
  if (!user.is_active) throw fail("permission_denied", "Your account has been suspended. Please contact support.", undefined, 403);
  const tok = tokens[user.id];
  setAccessToken(tok.access);
  setRefreshToken(tok.refresh);
  const pub: User = { id: user.id, email: user.email, role: user.role, is_active: user.is_active, date_joined: user.date_joined };
  setStoredUser(pub);
  return { refresh: tok.refresh, access: tok.access, user: pub };
}

export async function apiRefresh(): Promise<{ access: string; refresh: string }> {
  await delay(100);
  const rt = getRefreshToken();
  if (!rt) throw unauthorized("No refresh token.");
  const user = userByRefresh(rt);
  if (!user) { clearSession(); throw unauthorized("Invalid refresh token."); }
  const tok = tokens[user.id];
  setAccessToken(tok.access);
  setRefreshToken(tok.refresh);
  return { access: tok.access, refresh: tok.refresh };
}

export async function apiLogout(): Promise<void> {
  await delay(100);
  clearSession();
}

export async function apiMe(): Promise<User> {
  await delay(100);
  return requireAuth();
}

// ─── Taxonomy ───────────────────────────────────────────────────────────────
async function taxonomySearch<T extends { name: string }>(items: T[], search?: string, page?: number, pageSize?: number): Promise<ApiList<T>> {
  await delay(100);
  let filtered = items;
  if (search) filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  return paginate(filtered, page, pageSize);
}

export async function apiInstitutions(params?: { search?: string; page?: number; page_size?: number }): Promise<ApiList<Institution>> {
  let filtered = institutions;
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = institutions.filter(i => i.name.toLowerCase().includes(q) || i.short_name.toLowerCase().includes(q));
  }
  await delay(100);
  return paginate(filtered, params?.page, params?.page_size);
}

export async function apiCourses(params?: { search?: string; page?: number; page_size?: number }): Promise<ApiList<Course>> {
  return taxonomySearch(courses, params?.search, params?.page, params?.page_size);
}

export async function apiSkills(params?: { search?: string; page?: number; page_size?: number }): Promise<ApiList<Skill>> {
  let filtered = skills;
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = skills.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }
  await delay(100);
  return paginate(filtered, params?.page, params?.page_size);
}

export async function apiIndustries(params?: { search?: string; page?: number; page_size?: number }): Promise<ApiList<Industry>> {
  return taxonomySearch(industries, params?.search, params?.page, params?.page_size);
}

export async function apiLocations(params?: { search?: string; page?: number; page_size?: number }): Promise<ApiList<Location>> {
  let filtered = locations;
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = locations.filter(l => l.name.toLowerCase().includes(q) || l.region.toLowerCase().includes(q));
  }
  await delay(100);
  return paginate(filtered, params?.page, params?.page_size);
}

export async function apiOpportunityTypes(params?: { search?: string; page?: number; page_size?: number }): Promise<ApiList<OpportunityType>> {
  return taxonomySearch(opportunityTypes, params?.search, params?.page, params?.page_size);
}

// ─── Student ────────────────────────────────────────────────────────────────
export async function apiStudentMe(): Promise<StudentMeResponse> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden("Student access only.");
  const profile = studentProfiles[u.id];
  if (!profile) throw notFound("Student profile not found.");
  const currentCv = studentCVs[u.id]?.find(c => c.is_current) ?? null;
  return { user: { id: u.id, email: u.email, role: u.role }, profile, current_cv: currentCv };
}

export async function apiStudentProfile(): Promise<StudentProfile> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  const p = studentProfiles[u.id];
  if (!p) throw notFound("Profile not found.");
  return p;
}

export async function apiUpdateStudentProfile(data: Partial<StudentProfile>): Promise<StudentProfile> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  const p = studentProfiles[u.id];
  if (!p) throw notFound();
  const updated = { ...p, ...data, updated_at: nowISO() };
  // recompute completeness
  const missing: string[] = [];
  if (!updated.full_name) missing.push("full_name");
  if (!updated.phone) missing.push("phone");
  if (!updated.institution) missing.push("institution");
  if (!updated.course) missing.push("course");
  if (!updated.study_level) missing.push("study_level");
  if (updated.account_type === "student" && !updated.year_of_study) missing.push("year_of_study");
  if (updated.account_type === "graduate" && !updated.graduation_year) missing.push("graduation_year");
  updated.missing_fields = missing;
  updated.is_complete = missing.length === 0;
  studentProfiles[u.id] = updated;
  return updated;
}

export async function apiStudentSkills(): Promise<StudentSkill[]> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  return studentSkills[u.id] ?? [];
}

export async function apiUpdateStudentSkills(data: { skill: number; proficiency: string }[]): Promise<StudentSkill[]> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  const seen = new Map<number, string>();
  for (const s of data) seen.set(s.skill, s.proficiency);
  const result: StudentSkill[] = [];
  for (const [skillId, prof] of seen) {
    const skill = skills.find(s => s.id === skillId);
    if (!skill) continue;
    result.push({ skill: skillId, skill_name: skill.name, proficiency: prof as StudentSkill["proficiency"] });
  }
  studentSkills[u.id] = result;
  return result;
}

export async function apiStudentPreferences(): Promise<StudentPreferences> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  return studentPreferences[u.id] ?? { preferred_locations: [], preferred_opportunity_types: [], preferred_industries: [] };
}

export async function apiUpdateStudentPreferences(data: Partial<StudentPreferences>): Promise<StudentPreferences> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  const current = studentPreferences[u.id] ?? { preferred_locations: [], preferred_opportunity_types: [], preferred_industries: [] };
  const updated = { ...current, ...data };
  studentPreferences[u.id] = updated;
  return updated;
}

export async function apiStudentCVs(): Promise<CVDocument[]> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  return studentCVs[u.id] ?? [];
}

export async function apiUploadCV(file: File): Promise<CVDocument> {
  await delay(500);
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  const ext = file.name.toLowerCase().split(".").pop();
  if (!ext || !["pdf", "doc", "docx"].includes(ext)) throw fail("validation_error", "Only PDF, DOC, and DOCX files are allowed.", { file: ["Only PDF, DOC, and DOCX files are allowed."] });
  if (file.size > 5 * 1024 * 1024) throw fail("validation_error", "File must be 5MB or smaller.", { file: ["File must be 5MB or smaller."] });
  if (file.size === 0) throw fail("validation_error", "File is empty.", { file: ["File is empty."] });
  const existing = studentCVs[u.id] ?? [];
  const newCv: CVDocument = {
    id: genId(), original_name: file.name, size: file.size, version: existing.length + 1,
    is_current: true, parsed_status: "pending", uploaded_at: nowISO(),
    download_url: `/documents/cvs/${genId()}/download/`,
  };
  for (const c of existing) c.is_current = false;
  existing.push(newCv);
  studentCVs[u.id] = existing;
  return newCv;
}

export async function apiDownloadCV(cvId: number): Promise<Blob> {
  await delay();
  const u = requireAuth();
  for (const cvs of Object.values(studentCVs)) {
    const cv = cvs.find(c => c.id === cvId);
    if (cv) {
      const isOwner = studentCVs[u.id]?.some(c => c.id === cvId);
      const isOrgApp = applications.some(a => a.orgId === orgByUserId(u.id)?.id && a.cv?.id === cvId);
      if (!isOwner && !isOrgApp) throw forbidden("You do not have permission to download this file.");
      return new Blob([`Mock CV content for ${cv.original_name}`], { type: "application/pdf" });
    }
  }
  throw notFound("CV not found.");
}

// ─── Public Opportunities ───────────────────────────────────────────────────
export async function apiPublicOpportunities(params?: Record<string, unknown>): Promise<ApiList<OpportunityListItem>> {
  await delay();
  const user = (() => { try { return requireAuth(); } catch { return null; } })();
  const studentUserId = user?.role === "student" ? user.id : undefined;
  let items = orgOpportunities.filter(o => o.status === "published");
  const p = params ?? {};
  if (p.q) {
    const q = String(p.q).toLowerCase();
    items = items.filter(o => {
      const org = getOrgByOpportunity(o.id);
      const loc = o.location ? locations.find(l => l.id === o.location) : null;
      const skillNames = (o.requirements?.skills ?? []).map(sid => skills.find(s => s.id === sid)?.name ?? "").join(" ");
      return o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q) ||
        (org?.name.toLowerCase().includes(q) ?? false) || (loc?.name.toLowerCase().includes(q) ?? false) ||
        skillNames.toLowerCase().includes(q);
    });
  }
  if (p.type) items = items.filter(o => { const t = opportunityTypes.find(t => t.slug === p.type); return t && o.opportunity_type === t.id; });
  if (p.location) items = items.filter(o => o.location === Number(p.location));
  if (p.region) items = items.filter(o => { const l = o.location ? locations.find(l => l.id === o.location) : null; return l?.region.toLowerCase() === String(p.region).toLowerCase(); });
  if (p.organization) items = items.filter(o => getOrgIdByOpportunity(o.id) === Number(p.organization));
  if (p.industry) items = items.filter(o => { const org = getOrgByOpportunity(o.id); return org?.industry === Number(p.industry); });
  if (p.course) items = items.filter(o => { const reqCourses = o.requirements?.courses ?? []; return reqCourses.length === 0 || reqCourses.includes(Number(p.course)); });
  if (p.skill) items = items.filter(o => (o.requirements?.skills ?? []).includes(Number(p.skill)));
  if (p.study_level) {
    const order = ["certificate", "diploma", "bachelor", "masters", "phd"];
    const lvlIdx = order.indexOf(String(p.study_level));
    items = items.filter(o => {
      const min = o.requirements?.min_study_level;
      if (!min) return true;
      return order.indexOf(min) <= lvlIdx;
    });
  }
  if (p.is_paid === "true" || p.is_paid === true) items = items.filter(o => o.is_paid);
  if (p.is_paid === "false" || p.is_paid === false) items = items.filter(o => !o.is_paid);
  if (p.is_remote === "true" || p.is_remote === true) items = items.filter(o => o.is_remote);
  if (p.is_remote === "false" || p.is_remote === false) items = items.filter(o => !o.is_remote);
  if (p.deadline_before) items = items.filter(o => o.deadline <= String(p.deadline_before));
  if (p.deadline_after) items = items.filter(o => o.deadline >= String(p.deadline_after));
  const ordering = String(p.ordering || "-published_at");
  const desc = ordering.startsWith("-");
  const field = desc ? ordering.slice(1) : ordering;
  items = [...items].sort((a, b) => {
    let av: string | number = "", bv: string | number = "";
    if (field === "deadline") { av = a.deadline; bv = b.deadline; }
    else if (field === "title") { av = a.title.toLowerCase(); bv = b.title.toLowerCase(); }
    else if (field === "published_at") { av = a.published_at ?? ""; bv = b.published_at ?? ""; }
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
  return paginate(items.map(o => toPublicOpportunity(o, studentUserId)), Number(p.page) || 1, Number(p.page_size) || 20);
}

export async function apiPublicOpportunityDetail(id: number): Promise<OpportunityDetail> {
  await delay();
  const user = (() => { try { return requireAuth(); } catch { return null; } })();
  const studentUserId = user?.role === "student" ? user.id : undefined;
  const opp = getOpportunityById(id);
  if (!opp || opp.status !== "published") throw notFound("Opportunity not found.");
  return toPublicOpportunityDetail(opp, studentUserId);
}

// ─── Student Save/Apply ─────────────────────────────────────────────────────
export async function apiSaveOpportunity(oppId: number): Promise<{ saved: boolean }> {
  await delay(150);
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  if (!savedOpps[u.id]) savedOpps[u.id] = new Set();
  savedOpps[u.id].add(oppId);
  return { saved: true };
}

export async function apiUnsaveOpportunity(oppId: number): Promise<void> {
  await delay(150);
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  savedOpps[u.id]?.delete(oppId);
}

export async function apiSavedOpportunities(params?: { page?: number; page_size?: number }): Promise<ApiList<SavedOpportunity>> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  const ids = Array.from(savedOpps[u.id] ?? []);
  const items: SavedOpportunity[] = ids.map(id => {
    const opp = getOpportunityById(id);
    if (!opp || opp.status !== "published") return null;
    return { id: genId(), opportunity: toPublicOpportunity(opp, u.id), created_at: nowISO() };
  }).filter(Boolean) as SavedOpportunity[];
  return paginate(items, params?.page, params?.page_size);
}

export async function apiApplyToOpportunity(oppId: number, body: { cover_letter?: string; cv?: number }): Promise<StudentApplicationDetail> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  const opp = getOpportunityById(oppId);
  if (!opp || opp.status !== "published") throw fail("opportunity_not_open", "This opportunity is no longer available.", undefined, 400);
  if (opp.deadline < today()) throw fail("deadline_passed", "The deadline for this opportunity has passed.", undefined, 400);
  const profile = studentProfiles[u.id];
  if (!profile || !profile.is_complete) throw fail("profile_incomplete", "Please complete your profile before applying.", { missing_fields: profile?.missing_fields ?? [] }, 400);
  if (applications.some(a => a.studentUserId === u.id && a.opportunityId === oppId)) throw fail("already_applied", "You have already applied to this opportunity.", undefined, 409);
  // eligibility check
  if (profile.account_type === "student" && !opp.requirements?.students_eligible) throw fail("not_eligible", "You are not eligible for this opportunity.", { reasons: ["This opportunity is not open to students."] }, 400);
  if (profile.account_type === "graduate" && !opp.requirements?.graduates_eligible) throw fail("not_eligible", "You are not eligible for this opportunity.", { reasons: ["This opportunity is not open to graduates."] }, 400);
  if (opp.requirements?.min_year_of_study && profile.year_of_study && profile.year_of_study < opp.requirements.min_year_of_study) throw fail("not_eligible", "You do not meet the minimum year of study.", { reasons: [`Requires year ${opp.requirements.min_year_of_study} or above.`] }, 400);
  const cv = body.cv ? studentCVs[u.id]?.find(c => c.id === body.cv) ?? null : studentCVs[u.id]?.find(c => c.is_current) ?? null;
  const newApp = {
    id: genId(), studentUserId: u.id, opportunityId: oppId,
    orgId: getOrgIdByOpportunity(oppId)!, status: "submitted" as ApplicationStatus,
    cover_letter: body.cover_letter ?? "", cv,
    submitted_at: nowISO(), status_updated_at: nowISO(),
    events: [{ old_status: "" as const, new_status: "submitted" as const, note: "", created_at: nowISO() }],
  };
  applications.push(newApp);
  return toStudentAppDetail(newApp);
}

export async function apiStudentApplications(params?: { status?: string; ordering?: string; page?: number; page_size?: number }): Promise<ApiList<StudentApplicationListItem>> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  let items = applications.filter(a => a.studentUserId === u.id).map(toStudentAppListItem);
  if (params?.status) items = items.filter(a => a.status === params.status);
  return paginate(items, params?.page, params?.page_size);
}

export async function apiStudentApplicationDetail(id: number): Promise<StudentApplicationDetail> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  const app = applications.find(a => a.id === id && a.studentUserId === u.id);
  if (!app) throw notFound("Application not found.");
  return toStudentAppDetail(app);
}

export async function apiWithdrawApplication(id: number): Promise<StudentApplicationDetail> {
  await delay();
  const u = requireAuth();
  if (u.role !== "student") throw forbidden();
  const app = applications.find(a => a.id === id && a.studentUserId === u.id);
  if (!app) throw notFound("Application not found.");
  if (!canTransitionApp(app.status, "withdrawn", false)) throw fail("invalid_transition", "This application cannot be withdrawn in its current state.", undefined, 400);
  app.status = "withdrawn";
  app.status_updated_at = nowISO();
  app.events.push({ old_status: app.events[app.events.length - 1]?.new_status ?? "", new_status: "withdrawn", note: "Withdrawn by applicant.", created_at: nowISO() });
  return toStudentAppDetail(app);
}

// ─── Organizations ──────────────────────────────────────────────────────────
export async function apiPublicOrganizations(params?: { search?: string; industry?: number; location?: number; page?: number; page_size?: number }): Promise<ApiList<import("@/types").PublicOrganization>> {
  await delay();
  let items = organizations.filter(o => o.verification_status === "verified");
  if (params?.search) {
    const q = params.search.toLowerCase();
    items = items.filter(o => o.name.toLowerCase().includes(q) || o.description.toLowerCase().includes(q));
  }
  if (params?.industry) items = items.filter(o => o.industry === params.industry);
  if (params?.location) items = items.filter(o => o.location === params.location);
  const results = items.map(o => ({
    id: o.id, name: o.name, description: o.description,
    industry_name: o.industry_name, location_name: o.location_name,
    website: o.website, is_verified: o.verification_status === "verified",
  }));
  return paginate(results, params?.page, params?.page_size);
}

export async function apiPublicOrganizationDetail(id: number): Promise<import("@/types").PublicOrganization> {
  await delay();
  const o = organizations.find(o => o.id === id);
  if (!o || o.verification_status !== "verified") throw notFound("Organization not found.");
  return { id: o.id, name: o.name, description: o.description, industry_name: o.industry_name, location_name: o.location_name, website: o.website, is_verified: true };
}

export async function apiOrgMe(): Promise<Organization> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  const org = orgByUserId(u.id);
  if (!org) throw notFound("No organization profile found.");
  return org;
}

export async function apiCreateOrg(data: Partial<Organization>): Promise<Organization> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  if (orgByUserId(u.id)) throw fail("organization_exists", "You already have an organization profile.", undefined, 409);
  if (!data.name) throw fail("validation_error", "Organization name is required.", { name: ["Organization name is required."] });
  const newOrg: Organization = {
    id: genId(), name: data.name, description: data.description ?? "",
    industry: data.industry ?? null, industry_name: data.industry ? industries.find(i => i.id === data.industry)?.name ?? null : null,
    location: data.location ?? null, location_name: data.location ? locations.find(l => l.id === data.location)?.name ?? null : null,
    address: data.address ?? "", website: data.website ?? "",
    contact_email: data.contact_email ?? "", contact_phone: data.contact_phone ?? "",
    registration_number: data.registration_number ?? "",
    verification_status: "unverified", verification_notes: "", verified_at: null, created_at: nowISO(),
  };
  organizations.push(newOrg);
  // link to user
  if (u.id === 6) organizations.find(o => o.id === newOrg.id)!.id = newOrg.id;
  return newOrg;
}

export async function apiUpdateOrg(data: Partial<Organization>): Promise<Organization> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  const org = orgByUserId(u.id);
  if (!org) throw notFound();
  Object.assign(org, data);
  if (data.industry !== undefined) org.industry_name = data.industry ? industries.find(i => i.id === data.industry)?.name ?? null : null;
  if (data.location !== undefined) org.location_name = data.location ? locations.find(l => l.id === data.location)?.name ?? null : null;
  return org;
}

export async function apiSubmitVerification(): Promise<Organization> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  const org = orgByUserId(u.id);
  if (!org) throw notFound();
  if (org.verification_status === "pending") throw fail("invalid_verification_state", "Your organization is already pending verification.", undefined, 400);
  if (org.verification_status === "verified") throw fail("invalid_verification_state", "Your organization is already verified.", undefined, 400);
  const missing: string[] = [];
  if (!org.description) missing.push("description");
  if (!org.contact_email) missing.push("contact_email");
  if (missing.length > 0) throw fail("profile_incomplete", "Please complete your organization profile before submitting.", { missing_fields: missing }, 400);
  org.verification_status = "pending";
  return org;
}

// ─── Org Opportunities ──────────────────────────────────────────────────────
export async function apiOrgOpportunities(params?: { status?: string; opportunity_type?: number; search?: string; ordering?: string; page?: number; page_size?: number }): Promise<ApiList<OrganizationOpportunity>> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  const org = orgByUserId(u.id);
  if (!org) throw notFound();
  let items = orgOpportunities.filter(o => getOrgIdByOpportunity(o.id) === org.id);
  if (params?.status) items = items.filter(o => o.status === params.status);
  if (params?.opportunity_type) items = items.filter(o => o.opportunity_type === params.opportunity_type);
  if (params?.search) { const q = params.search.toLowerCase(); items = items.filter(o => o.title.toLowerCase().includes(q)); }
  return paginate(items, params?.page, params?.page_size);
}

export async function apiOrgOpportunityDetail(id: number): Promise<OrganizationOpportunity> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  const org = orgByUserId(u.id);
  if (!org) throw notFound();
  const opp = getOpportunityById(id);
  if (!opp || getOrgIdByOpportunity(id) !== org.id) throw notFound("Opportunity not found.");
  return opp;
}

export async function apiCreateOrgOpportunity(data: Partial<OrganizationOpportunity>): Promise<OrganizationOpportunity> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  const org = orgByUserId(u.id);
  if (!org) throw notFound();
  if (!data.title) throw fail("validation_error", "Title is required.", { title: ["Title is required."] });
  if (!data.deadline) throw fail("validation_error", "Deadline is required.", { deadline: ["Deadline is required."] });
  if (data.deadline < today()) throw fail("deadline_passed", "Deadline cannot be in the past.", undefined, 400);
  if (data.start_date && data.deadline && data.start_date < data.deadline) throw fail("validation_error", "Start date must be after the deadline.", { start_date: ["Start date must be after the deadline."] });
  if (data.positions !== undefined && data.positions < 1) throw fail("validation_error", "Positions must be at least 1.", { positions: ["Positions must be at least 1."] });
  if (!data.is_remote && !data.location) throw fail("location_required", "Location is required for non-remote opportunities.", undefined, 400);
  if (data.requirements && !data.requirements.students_eligible && !data.requirements.graduates_eligible) throw fail("validation_error", "At least one eligibility group must be selected.", { requirements: ["At least one eligibility group must be selected."] });
  const newOpp: OrganizationOpportunity = {
    id: genId(), opportunity_type: data.opportunity_type ?? 1, title: data.title,
    description: data.description ?? "", location: data.location ?? null, is_remote: data.is_remote ?? false,
    duration_months: data.duration_months ?? null, start_date: data.start_date ?? null,
    deadline: data.deadline, positions: data.positions ?? 1, is_paid: data.is_paid ?? false,
    requirements: data.requirements, status: "draft", published_at: null, moderation_note: "",
    application_count: 0, created_at: nowISO(), updated_at: nowISO(),
  };
  orgOpportunities.push(newOpp);
  return newOpp;
}

export async function apiUpdateOrgOpportunity(id: number, data: Partial<OrganizationOpportunity>): Promise<OrganizationOpportunity> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  const org = orgByUserId(u.id);
  if (!org) throw notFound();
  const opp = getOpportunityById(id);
  if (!opp || getOrgIdByOpportunity(id) !== org.id) throw notFound();
  if (opp.status !== "draft") throw fail("not_editable", "Only draft opportunities can be edited.", undefined, 400);
  if (data.start_date && data.deadline && data.start_date < data.deadline) throw fail("validation_error", "Start date must be after the deadline.", { start_date: ["Start date must be after the deadline."] });
  Object.assign(opp, data, { updated_at: nowISO() });
  return opp;
}

export async function apiDeleteOrgOpportunity(id: number): Promise<void> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  const org = orgByUserId(u.id);
  if (!org) throw notFound();
  const opp = getOpportunityById(id);
  if (!opp || getOrgIdByOpportunity(id) !== org.id) throw notFound();
  if (opp.status !== "draft") throw fail("not_deletable", "Only draft opportunities can be deleted.", undefined, 400);
  if (opp.application_count > 0) throw fail("has_applications", "Cannot delete an opportunity with applications.", undefined, 400);
  const idx = orgOpportunities.indexOf(opp);
  if (idx >= 0) orgOpportunities.splice(idx, 1);
}

export async function apiOrgOppAction(id: number, action: "submit" | "unpublish" | "close" | "archive"): Promise<OrganizationOpportunity> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  const org = orgByUserId(u.id);
  if (!org) throw notFound();
  const opp = getOpportunityById(id);
  if (!opp || getOrgIdByOpportunity(id) !== org.id) throw notFound();
  if (!canTransition(opp.status, action)) throw fail("invalid_transition", `Cannot ${action} a ${opp.status} opportunity.`, undefined, 400);
  if (action === "submit") {
    if (!opp.is_remote && !opp.location) throw fail("location_required", "Location is required before submission.", undefined, 400);
    if (opp.deadline < today()) throw fail("deadline_passed", "Cannot submit an opportunity with a past deadline.", undefined, 400);
    opp.status = "pending_review";
  } else if (action === "unpublish") opp.status = "draft";
  else if (action === "close") opp.status = "closed";
  else if (action === "archive") opp.status = "archived";
  opp.updated_at = nowISO();
  return opp;
}

// ─── Org Applications ───────────────────────────────────────────────────────
export async function apiOrgApplications(params?: { status?: string; opportunity?: number; search?: string; ordering?: string; page?: number; page_size?: number }): Promise<ApiList<OrganizationApplicationListItem>> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  const org = orgByUserId(u.id);
  if (!org) throw notFound();
  let items = applications.filter(a => a.orgId === org.id).map(toOrgAppListItem);
  if (params?.status) items = items.filter(a => a.status === params.status);
  if (params?.opportunity) items = items.filter(a => a.opportunity === params.opportunity);
  if (params?.search) { const q = params.search.toLowerCase(); items = items.filter(a => a.applicant_name.toLowerCase().includes(q)); }
  return paginate(items, params?.page, params?.page_size);
}

export async function apiOrgApplicationDetail(id: number): Promise<OrganizationApplicationDetail> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  const org = orgByUserId(u.id);
  if (!org) throw notFound();
  const app = applications.find(a => a.id === id && a.orgId === org.id);
  if (!app) throw notFound("Application not found.");
  return toOrgAppDetail(app);
}

export async function apiOrgAppChangeStatus(id: number, status: ApplicationStatus, note: string): Promise<OrganizationApplicationDetail> {
  await delay();
  const u = requireAuth();
  if (u.role !== "organization") throw forbidden();
  const org = orgByUserId(u.id);
  if (!org) throw notFound();
  const app = applications.find(a => a.id === id && a.orgId === org.id);
  if (!app) throw notFound("Application not found.");
  if (!canTransitionApp(app.status, status, true)) throw fail("invalid_transition", `Cannot change from ${app.status} to ${status}.`, undefined, 400);
  app.status = status;
  app.status_updated_at = nowISO();
  app.events.push({ old_status: app.events[app.events.length - 1]?.new_status ?? "", new_status: status, note, created_at: nowISO() });
  return toOrgAppDetail(app);
}

// ─── Admin ──────────────────────────────────────────────────────────────────
export async function apiAdminUsers(params?: { role?: string; is_active?: string; search?: string; page?: number; page_size?: number }): Promise<ApiList<AdminUser>> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  let items: AdminUser[] = users.map(u => ({ id: u.id, email: u.email, role: u.role, is_active: u.is_active, date_joined: u.date_joined, last_login: null }));
  if (params?.role) items = items.filter(u => u.role === params.role);
  if (params?.is_active !== undefined) items = items.filter(u => String(u.is_active) === params.is_active);
  if (params?.search) { const q = params.search.toLowerCase(); items = items.filter(u => u.email.includes(q)); }
  return paginate(items, params?.page, params?.page_size);
}

export async function apiAdminUserDetail(id: number): Promise<AdminUser> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  const target = users.find(u => u.id === id);
  if (!target) throw notFound();
  return { id: target.id, email: target.email, role: target.role, is_active: target.is_active, date_joined: target.date_joined, last_login: null };
}

export async function apiAdminUserSuspend(id: number, note: string): Promise<AdminUser> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  const target = users.find(u => u.id === id);
  if (!target) throw notFound();
  if (target.role === "admin") throw fail("cannot_suspend_admin", "Admin users cannot be suspended.", undefined, 400);
  target.is_active = false;
  addAuditEntry("user.suspend", "accounts.user", id, note, u.id);
  return { id: target.id, email: target.email, role: target.role, is_active: false, date_joined: target.date_joined, last_login: null };
}

export async function apiAdminUserReactivate(id: number, note: string): Promise<AdminUser> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  const target = users.find(u => u.id === id);
  if (!target) throw notFound();
  target.is_active = true;
  addAuditEntry("user.reactivate", "accounts.user", id, note, u.id);
  return { id: target.id, email: target.email, role: target.role, is_active: true, date_joined: target.date_joined, last_login: null };
}

export async function apiAdminOrganizations(params?: { verification_status?: string; is_active?: string; search?: string; page?: number; page_size?: number }): Promise<ApiList<AdminOrganization>> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  let items = organizations.map(toAdminOrg);
  if (params?.verification_status) items = items.filter(o => o.verification_status === params.verification_status);
  if (params?.search) { const q = params.search.toLowerCase(); items = items.filter(o => o.name.toLowerCase().includes(q) || o.registration_number.toLowerCase().includes(q)); }
  return paginate(items, params?.page, params?.page_size);
}

export async function apiAdminOrgDetail(id: number): Promise<AdminOrganization> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  const org = organizations.find(o => o.id === id);
  if (!org) throw notFound();
  return toAdminOrg(org);
}

export async function apiAdminOrgAction(id: number, action: "approve" | "reject" | "suspend" | "reactivate", note: string): Promise<AdminOrganization> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  const org = organizations.find(o => o.id === id);
  if (!org) throw notFound();
  if (action === "approve") {
    if (org.verification_status !== "pending") throw fail("invalid_verification_state", "Only pending organizations can be approved.", undefined, 400);
    org.verification_status = "verified"; org.verified_at = nowISO(); org.verification_notes = note;
    addAuditEntry("organization.verify", "organizations.organization", id, note, u.id);
  } else if (action === "reject") {
    if (!note) throw fail("note_required", "A note is required for rejection.", undefined, 400);
    if (org.verification_status !== "pending") throw fail("invalid_verification_state", "Only pending organizations can be rejected.", undefined, 400);
    org.verification_status = "rejected"; org.verification_notes = note;
    addAuditEntry("organization.reject", "organizations.organization", id, note, u.id);
  } else if (action === "suspend") {
    // mark inactive — we track via a separate field; for mock, set is_active=false
    (org as Organization & { is_active?: boolean }).is_active = false;
    addAuditEntry("organization.suspend", "organizations.organization", id, note, u.id);
  } else if (action === "reactivate") {
    (org as Organization & { is_active?: boolean }).is_active = true;
    addAuditEntry("organization.reactivate", "organizations.organization", id, note, u.id);
  }
  return toAdminOrg(org);
}

export async function apiAdminOpportunities(params?: { status?: string; organization?: number; search?: string; page?: number; page_size?: number }): Promise<ApiList<AdminOpportunity>> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  let items = orgOpportunities.map(toAdminOpp);
  if (params?.status) items = items.filter(o => o.status === params.status);
  if (params?.organization) items = items.filter(o => o.organization === params.organization);
  if (params?.search) { const q = params.search.toLowerCase(); items = items.filter(o => o.title.toLowerCase().includes(q) || o.organization_name.toLowerCase().includes(q)); }
  return paginate(items, params?.page, params?.page_size);
}

export async function apiAdminOppDetail(id: number): Promise<AdminOpportunity> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  const opp = getOpportunityById(id);
  if (!opp) throw notFound();
  return toAdminOpp(opp);
}

export async function apiAdminOppAction(id: number, action: "approve" | "reject" | "suspend", note: string): Promise<AdminOpportunity> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  const opp = getOpportunityById(id);
  if (!opp) throw notFound();
  if (action === "approve") {
    if (opp.status !== "pending_review" && opp.status !== "suspended") throw fail("invalid_transition", "Only pending or suspended opportunities can be approved.", undefined, 400);
    opp.status = "published"; opp.published_at = nowISO(); opp.moderation_note = note;
    addAuditEntry("opportunity.approve", "opportunities.opportunity", id, note, u.id);
  } else if (action === "reject") {
    if (!note) throw fail("note_required", "A note is required for rejection.", undefined, 400);
    if (opp.status !== "pending_review") throw fail("invalid_transition", "Only pending opportunities can be rejected.", undefined, 400);
    opp.status = "draft"; opp.moderation_note = note;
    addAuditEntry("opportunity.reject", "opportunities.opportunity", id, note, u.id);
  } else if (action === "suspend") {
    if (!note) throw fail("note_required", "A note is required for suspension.", undefined, 400);
    if (opp.status !== "pending_review" && opp.status !== "published") throw fail("invalid_transition", "Only pending or published opportunities can be suspended.", undefined, 400);
    opp.status = "suspended"; opp.moderation_note = note;
    addAuditEntry("opportunity.suspend", "opportunities.opportunity", id, note, u.id);
  }
  return toAdminOpp(opp);
}

export async function apiAdminAuditLog(params?: { action?: string; target_type?: string; target_id?: number; page?: number; page_size?: number }): Promise<ApiList<AdminActionLog>> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  let items = [...auditLog];
  if (params?.action) items = items.filter(a => a.action === params.action);
  if (params?.target_type) items = items.filter(a => a.target_type === params.target_type);
  if (params?.target_id) items = items.filter(a => a.target_id === params.target_id);
  return paginate(items, params?.page, params?.page_size);
}

export async function apiAdminAuditDetail(id: number): Promise<AdminActionLog> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  const entry = auditLog.find(a => a.id === id);
  if (!entry) throw notFound();
  return entry;
}

export async function apiAdminStats(): Promise<PlatformStats> {
  await delay();
  const u = requireAuth();
  if (u.role !== "admin") throw forbidden();
  return getStats();
}
