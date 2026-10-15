import http from "@/api/http";
import { setAccessToken, setRefreshToken, setStoredUser, clearSession, getRefreshToken } from "@/auth/session";
import type {
  User, LoginResponse, ApiList, Institution, Course, Skill, Industry, Location,
  OpportunityType, StudentMeResponse, StudentProfile, StudentSkill, StudentPreferences,
  CVDocument, Organization, OrganizationOpportunity, OpportunityDetail, OpportunityListItem,
  StudentApplicationListItem, StudentApplicationDetail, SavedOpportunity, PublicOrganization,
  OrganizationApplicationListItem, OrganizationApplicationDetail,
  AdminUser, AdminOrganization, AdminOpportunity, AdminActionLog, PlatformStats,
  ApplicationStatus, AccountType,
} from "@/types";

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function apiRegister(body: {
  email: string; password: string; role: "student" | "organization";
  account_type?: AccountType; full_name?: string;
}): Promise<User> {
  const payload: Record<string, unknown> = {
    email: body.email, password: body.password, role: body.role,
  };
  if (body.role === "student") {
    if (body.full_name) payload.full_name = body.full_name;
    if (body.account_type) payload.account_type = body.account_type;
  }
  const res = await http.post<User>("/auth/register/", payload);
  return res.data;
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await http.post<LoginResponse>("/auth/login/", { email, password });
  setAccessToken(res.data.access);
  setRefreshToken(res.data.refresh);
  setStoredUser(res.data.user);
  return res.data;
}

export async function apiRefresh(): Promise<{ access: string; refresh: string }> {
  const refresh = getRefreshToken();
  const res = await http.post<{ access: string; refresh: string }>("/auth/refresh/", { refresh });
  setAccessToken(res.data.access);
  if (res.data.refresh) setRefreshToken(res.data.refresh);
  return res.data;
}

export async function apiLogout(): Promise<void> {
  const refresh = getRefreshToken();
  try {
    if (refresh) await http.post("/auth/logout/", { refresh });
  } catch {
    // Special nonstandard shape { refresh: "Invalid or expired token." } and
    // any failure both mean logged-out/session-expired. Swallow and clear.
  } finally {
    clearSession();
  }
}

export async function apiMe(): Promise<User> {
  const res = await http.get<User>("/auth/me/");
  setStoredUser(res.data);
  return res.data;
}

// ─── Taxonomy ────────────────────────────────────────────────────────────────
interface TaxParams { search?: string; ordering?: string; page?: number; page_size?: number }

export async function apiInstitutions(params?: TaxParams): Promise<ApiList<Institution>> {
  const res = await http.get<ApiList<Institution>>("/taxonomy/institutions/", { params });
  return res.data;
}
export async function apiInstitutionDetail(id: number): Promise<Institution> {
  const res = await http.get<Institution>(`/taxonomy/institutions/${id}/`);
  return res.data;
}
export async function apiCourses(params?: TaxParams): Promise<ApiList<Course>> {
  const res = await http.get<ApiList<Course>>("/taxonomy/courses/", { params });
  return res.data;
}
export async function apiCourseDetail(id: number): Promise<Course> {
  const res = await http.get<Course>(`/taxonomy/courses/${id}/`);
  return res.data;
}
export async function apiSkills(params?: TaxParams): Promise<ApiList<Skill>> {
  const res = await http.get<ApiList<Skill>>("/taxonomy/skills/", { params });
  return res.data;
}
export async function apiSkillDetail(id: number): Promise<Skill> {
  const res = await http.get<Skill>(`/taxonomy/skills/${id}/`);
  return res.data;
}
export async function apiIndustries(params?: TaxParams): Promise<ApiList<Industry>> {
  const res = await http.get<ApiList<Industry>>("/taxonomy/industries/", { params });
  return res.data;
}
export async function apiIndustryDetail(id: number): Promise<Industry> {
  const res = await http.get<Industry>(`/taxonomy/industries/${id}/`);
  return res.data;
}
export async function apiLocations(params?: TaxParams): Promise<ApiList<Location>> {
  const res = await http.get<ApiList<Location>>("/taxonomy/locations/", { params });
  return res.data;
}
export async function apiLocationDetail(id: number): Promise<Location> {
  const res = await http.get<Location>(`/taxonomy/locations/${id}/`);
  return res.data;
}
export async function apiOpportunityTypes(params?: TaxParams): Promise<ApiList<OpportunityType>> {
  const res = await http.get<ApiList<OpportunityType>>("/taxonomy/opportunity-types/", { params });
  return res.data;
}
export async function apiOpportunityTypeDetail(id: number): Promise<OpportunityType> {
  const res = await http.get<OpportunityType>(`/taxonomy/opportunity-types/${id}/`);
  return res.data;
}

// ─── Student ─────────────────────────────────────────────────────────────────
export async function apiStudentMe(): Promise<StudentMeResponse> {
  const res = await http.get<StudentMeResponse>("/students/me/");
  return res.data;
}
export async function apiStudentProfile(): Promise<StudentProfile> {
  const res = await http.get<StudentProfile>("/students/me/profile/");
  return res.data;
}
export async function apiUpdateStudentProfile(data: Partial<StudentProfile>): Promise<StudentProfile> {
  // Prefer PATCH for normal edits per spec
  const res = await http.patch<StudentProfile>("/students/me/profile/", data);
  return res.data;
}
export async function apiStudentSkills(): Promise<StudentSkill[]> {
  const res = await http.get<StudentSkill[]>("/students/me/skills/");
  return res.data;
}
export async function apiUpdateStudentSkills(data: { skill: number; proficiency: string }[]): Promise<StudentSkill[]> {
  // Only supported skills write method: full replacement via PUT
  const seen = new Map<number, string>();
  for (const s of data) seen.set(s.skill, s.proficiency); // dedupe, last-wins
  const payload = [...seen.entries()].map(([skill, proficiency]) => ({ skill, proficiency }));
  const res = await http.put<StudentSkill[]>("/students/me/skills/", payload);
  return res.data;
}
export async function apiStudentPreferences(): Promise<StudentPreferences> {
  const res = await http.get<StudentPreferences>("/students/me/preferences/");
  return res.data;
}
export async function apiUpdateStudentPreferences(data: Partial<StudentPreferences>): Promise<StudentPreferences> {
  const res = await http.patch<StudentPreferences>("/students/me/preferences/", data);
  return res.data;
}
export async function apiStudentCVs(): Promise<CVDocument[]> {
  const res = await http.get<CVDocument[]>("/students/me/cv/");
  return res.data;
}
export async function apiUploadCV(file: File): Promise<CVDocument> {
  const form = new FormData();
  form.append("file", file); // exact field name; multipart only here
  const res = await http.post<CVDocument>("/students/me/cv/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
/** Authenticated binary download: blob → object URL handled by caller. Never JSON. */
export async function apiDownloadCV(cvId: number): Promise<Blob> {
  const res = await http.get(`/documents/cvs/${cvId}/download/`, { responseType: "blob" });
  return res.data as Blob;
}

// ─── Public opportunities ────────────────────────────────────────────────────
export async function apiPublicOpportunities(params?: Record<string, unknown>): Promise<ApiList<OpportunityListItem>> {
  const res = await http.get<ApiList<OpportunityListItem>>("/opportunities/", { params });
  return res.data;
}
export async function apiPublicOpportunityDetail(id: number): Promise<OpportunityDetail> {
  const res = await http.get<OpportunityDetail>(`/opportunities/${id}/`);
  return res.data;
}

// ─── Student save / apply ────────────────────────────────────────────────────
export async function apiSaveOpportunity(oppId: number): Promise<{ saved: boolean }> {
  const res = await http.post<{ saved: boolean }>(`/opportunities/${oppId}/save/`);
  return res.data;
}
export async function apiUnsaveOpportunity(oppId: number): Promise<void> {
  await http.delete(`/opportunities/${oppId}/save/`);
}
export async function apiSavedOpportunities(params?: { page?: number; page_size?: number }): Promise<ApiList<SavedOpportunity>> {
  const res = await http.get<ApiList<SavedOpportunity>>("/students/me/saved-opportunities/", { params });
  return res.data;
}
export async function apiApplyToOpportunity(
  oppId: number, body: { cover_letter?: string; cv?: number }
): Promise<StudentApplicationDetail> {
  const res = await http.post<StudentApplicationDetail>(`/opportunities/${oppId}/apply/`, body);
  return res.data;
}
export async function apiStudentApplications(params?: {
  status?: string; ordering?: string; page?: number; page_size?: number;
}): Promise<ApiList<StudentApplicationListItem>> {
  const res = await http.get<ApiList<StudentApplicationListItem>>("/applications/", { params });
  return res.data;
}
export async function apiStudentApplicationDetail(id: number): Promise<StudentApplicationDetail> {
  const res = await http.get<StudentApplicationDetail>(`/applications/${id}/`);
  return res.data;
}
export async function apiWithdrawApplication(id: number): Promise<StudentApplicationDetail> {
  const res = await http.post<StudentApplicationDetail>(`/applications/${id}/withdraw/`);
  return res.data;
}

// ─── Public organizations ────────────────────────────────────────────────────
export async function apiPublicOrganizations(params?: {
  search?: string; industry?: number; location?: number; page?: number; page_size?: number;
}): Promise<ApiList<PublicOrganization>> {
  const res = await http.get<ApiList<PublicOrganization>>("/organizations/", { params });
  return res.data;
}
export async function apiPublicOrganizationDetail(id: number): Promise<PublicOrganization> {
  const res = await http.get<PublicOrganization>(`/organizations/${id}/`);
  return res.data;
}

// ─── Organization profile ────────────────────────────────────────────────────
export async function apiOrgMe(): Promise<Organization> {
  const res = await http.get<Organization>("/organizations/me/");
  return res.data;
}
export async function apiCreateOrg(data: Partial<Organization>): Promise<Organization> {
  const res = await http.post<Organization>("/organizations/me/", data);
  return res.data;
}
export async function apiUpdateOrg(data: Partial<Organization>): Promise<Organization> {
  const res = await http.patch<Organization>("/organizations/me/", data);
  return res.data;
}
export async function apiSubmitVerification(): Promise<Organization> {
  const res = await http.post<Organization>("/organizations/me/submit-verification/");
  return res.data;
}

// ─── Organization opportunities ──────────────────────────────────────────────
export async function apiOrgOpportunities(params?: {
  status?: string; opportunity_type?: number; search?: string; ordering?: string;
  page?: number; page_size?: number;
}): Promise<ApiList<OrganizationOpportunity>> {
  const res = await http.get<ApiList<OrganizationOpportunity>>("/organizations/me/opportunities/", { params });
  return res.data;
}
export async function apiOrgOpportunityDetail(id: number): Promise<OrganizationOpportunity> {
  const res = await http.get<OrganizationOpportunity>(`/organizations/me/opportunities/${id}/`);
  return res.data;
}
export async function apiCreateOrgOpportunity(data: Partial<OrganizationOpportunity>): Promise<OrganizationOpportunity> {
  const res = await http.post<OrganizationOpportunity>("/organizations/me/opportunities/", data);
  return res.data;
}
export async function apiUpdateOrgOpportunity(id: number, data: Partial<OrganizationOpportunity>): Promise<OrganizationOpportunity> {
  const res = await http.patch<OrganizationOpportunity>(`/organizations/me/opportunities/${id}/`, data);
  return res.data;
}
export async function apiDeleteOrgOpportunity(id: number): Promise<void> {
  await http.delete(`/organizations/me/opportunities/${id}/`);
}
export async function apiOrgOppAction(
  id: number, action: "submit" | "unpublish" | "close" | "archive"
): Promise<OrganizationOpportunity> {
  const res = await http.post<OrganizationOpportunity>(`/organizations/me/opportunities/${id}/${action}/`);
  return res.data;
}

// ─── Organization applications ───────────────────────────────────────────────
export async function apiOrgApplications(params?: {
  status?: string; opportunity?: number; search?: string; ordering?: string;
  page?: number; page_size?: number;
}): Promise<ApiList<OrganizationApplicationListItem>> {
  const res = await http.get<ApiList<OrganizationApplicationListItem>>("/organizations/me/applications/", { params });
  return res.data;
}
export async function apiOrgApplicationDetail(id: number): Promise<OrganizationApplicationDetail> {
  const res = await http.get<OrganizationApplicationDetail>(`/organizations/me/applications/${id}/`);
  return res.data;
}
export async function apiOrgAppChangeStatus(
  id: number, status: ApplicationStatus, note: string
): Promise<OrganizationApplicationDetail> {
  const res = await http.post<OrganizationApplicationDetail>(
    `/organizations/me/applications/${id}/status/`, { status, note }
  );
  return res.data;
}

// ─── Admin ───────────────────────────────────────────────────────────────────
export async function apiAdminUsers(params?: {
  role?: string; is_active?: string; search?: string; page?: number; page_size?: number;
}): Promise<ApiList<AdminUser>> {
  const res = await http.get<ApiList<AdminUser>>("/admin/users/", { params });
  return res.data;
}
export async function apiAdminUserDetail(id: number): Promise<AdminUser> {
  const res = await http.get<AdminUser>(`/admin/users/${id}/`);
  return res.data;
}
export async function apiAdminUserSuspend(id: number, note: string): Promise<AdminUser> {
  const res = await http.post<AdminUser>(`/admin/users/${id}/suspend/`, { note: note ?? "" });
  return res.data;
}
export async function apiAdminUserReactivate(id: number, note: string): Promise<AdminUser> {
  const res = await http.post<AdminUser>(`/admin/users/${id}/reactivate/`, { note: note ?? "" });
  return res.data;
}
export async function apiAdminOrganizations(params?: {
  verification_status?: string; is_active?: string; search?: string; page?: number; page_size?: number;
}): Promise<ApiList<AdminOrganization>> {
  const res = await http.get<ApiList<AdminOrganization>>("/admin/organizations/", { params });
  return res.data;
}
export async function apiAdminOrgDetail(id: number): Promise<AdminOrganization> {
  const res = await http.get<AdminOrganization>(`/admin/organizations/${id}/`);
  return res.data;
}
export async function apiAdminOrgAction(
  id: number, action: "approve" | "reject" | "suspend" | "reactivate", note: string
): Promise<AdminOrganization> {
  const res = await http.post<AdminOrganization>(`/admin/organizations/${id}/${action}/`, { note: note ?? "" });
  return res.data;
}
export async function apiAdminOpportunities(params?: {
  status?: string; organization?: number; search?: string; page?: number; page_size?: number;
}): Promise<ApiList<AdminOpportunity>> {
  const res = await http.get<ApiList<AdminOpportunity>>("/admin/opportunities/", { params });
  return res.data;
}
export async function apiAdminOppDetail(id: number): Promise<AdminOpportunity> {
  const res = await http.get<AdminOpportunity>(`/admin/opportunities/${id}/`);
  return res.data;
}
export async function apiAdminOppAction(
  id: number, action: "approve" | "reject" | "suspend", note: string
): Promise<AdminOpportunity> {
  const res = await http.post<AdminOpportunity>(`/admin/opportunities/${id}/${action}/`, { note: note ?? "" });
  return res.data;
}
export async function apiAdminAuditLog(params?: {
  action?: string; target_type?: string; target_id?: number; page?: number; page_size?: number;
}): Promise<ApiList<AdminActionLog>> {
  const res = await http.get<ApiList<AdminActionLog>>("/admin/audit-log/", { params });
  return res.data;
}
export async function apiAdminAuditDetail(id: number): Promise<AdminActionLog> {
  const res = await http.get<AdminActionLog>(`/admin/audit-log/${id}/`);
  return res.data;
}
export async function apiAdminStats(): Promise<PlatformStats> {
  const res = await http.get<PlatformStats>("/admin/stats/");
  return res.data;
}
