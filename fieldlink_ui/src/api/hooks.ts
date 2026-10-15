import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/client";

// Auth
export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.apiLogin(email, password),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogout() {
  return useMutation({ mutationFn: () => api.apiLogout() });
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: Parameters<typeof api.apiRegister>[0]) => api.apiRegister(body),
  });
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: api.apiMe, retry: false, staleTime: Infinity });
}

// Taxonomy
export function useInstitutions(params?: { search?: string; page_size?: number }) {
  return useQuery({ queryKey: ["taxonomy", "institutions", params], queryFn: () => api.apiInstitutions({ ...params, page_size: params?.page_size ?? 100 }), staleTime: 5 * 60 * 1000 });
}
export function useCourses(params?: { search?: string; page_size?: number }) {
  return useQuery({ queryKey: ["taxonomy", "courses", params], queryFn: () => api.apiCourses({ ...params, page_size: params?.page_size ?? 100 }), staleTime: 5 * 60 * 1000 });
}
export function useSkills(params?: { search?: string; page_size?: number }) {
  return useQuery({ queryKey: ["taxonomy", "skills", params], queryFn: () => api.apiSkills({ ...params, page_size: params?.page_size ?? 100 }), staleTime: 5 * 60 * 1000 });
}
export function useIndustries(params?: { search?: string; page_size?: number }) {
  return useQuery({ queryKey: ["taxonomy", "industries", params], queryFn: () => api.apiIndustries({ ...params, page_size: params?.page_size ?? 100 }), staleTime: 5 * 60 * 1000 });
}
export function useLocations(params?: { search?: string; page_size?: number }) {
  return useQuery({ queryKey: ["taxonomy", "locations", params], queryFn: () => api.apiLocations({ ...params, page_size: params?.page_size ?? 100 }), staleTime: 5 * 60 * 1000 });
}
export function useOpportunityTypes(params?: { search?: string; page_size?: number }) {
  return useQuery({ queryKey: ["taxonomy", "opportunity-types", params], queryFn: () => api.apiOpportunityTypes({ ...params, page_size: params?.page_size ?? 100 }), staleTime: 5 * 60 * 1000 });
}

// Student
export function useStudentMe() {
  return useQuery({ queryKey: ["student", "me"], queryFn: api.apiStudentMe });
}
export function useStudentProfile() {
  return useQuery({ queryKey: ["student", "profile"], queryFn: api.apiStudentProfile });
}
export function useUpdateStudentProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.apiUpdateStudentProfile>[0]) => api.apiUpdateStudentProfile(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["student"] }); },
  });
}
export function useStudentSkills() {
  return useQuery({ queryKey: ["student", "skills"], queryFn: api.apiStudentSkills });
}
export function useUpdateStudentSkills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.apiUpdateStudentSkills>[0]) => api.apiUpdateStudentSkills(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student", "skills"] }),
  });
}
export function useStudentPreferences() {
  return useQuery({ queryKey: ["student", "preferences"], queryFn: api.apiStudentPreferences });
}
export function useUpdateStudentPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.apiUpdateStudentPreferences>[0]) => api.apiUpdateStudentPreferences(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student", "preferences"] }),
  });
}
export function useStudentCVs() {
  return useQuery({ queryKey: ["student", "cvs"], queryFn: api.apiStudentCVs });
}
export function useUploadCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.apiUploadCV(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student", "cvs"] }),
  });
}
export function useStudentApplications(params?: { status?: string; page?: number; page_size?: number }) {
  return useQuery({ queryKey: ["student", "applications", params], queryFn: () => api.apiStudentApplications(params) });
}
export function useStudentApplicationDetail(id: number) {
  return useQuery({ queryKey: ["student", "applications", id], queryFn: () => api.apiStudentApplicationDetail(id), enabled: !!id });
}
export function useWithdrawApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.apiWithdrawApplication(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student", "applications"] }),
  });
}

// Opportunities
export function usePublicOpportunities(params: Record<string, unknown>) {
  return useQuery({ queryKey: ["opportunities", "public", params], queryFn: () => api.apiPublicOpportunities(params) });
}
export function usePublicOpportunityDetail(id: number) {
  return useQuery({ queryKey: ["opportunities", "public", id], queryFn: () => api.apiPublicOpportunityDetail(id), enabled: !!id });
}
export function useSaveOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.apiSaveOpportunity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunities"] }),
  });
}
export function useUnsaveOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.apiUnsaveOpportunity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunities"] }),
  });
}
export function useSavedOpportunities(params?: { page?: number; page_size?: number }) {
  return useQuery({ queryKey: ["student", "saved", params], queryFn: () => api.apiSavedOpportunities(params) });
}
export function useApplyToOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { cover_letter?: string; cv?: number } }) => api.apiApplyToOpportunity(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunities"] }),
  });
}

// Organizations
export function usePublicOrganizations(params?: { search?: string; industry?: number; location?: number; page?: number; page_size?: number }) {
  return useQuery({ queryKey: ["organizations", "public", params], queryFn: () => api.apiPublicOrganizations(params) });
}
export function usePublicOrganizationDetail(id: number) {
  return useQuery({ queryKey: ["organizations", "public", id], queryFn: () => api.apiPublicOrganizationDetail(id), enabled: !!id });
}
export function useOrgMe() {
  return useQuery({ queryKey: ["org", "me"], queryFn: api.apiOrgMe, retry: false });
}
export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.apiCreateOrg>[0]) => api.apiCreateOrg(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org"] }),
  });
}
export function useUpdateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.apiUpdateOrg>[0]) => api.apiUpdateOrg(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org"] }),
  });
}
export function useSubmitVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.apiSubmitVerification(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org"] }),
  });
}
export function useOrgOpportunities(params?: { status?: string; search?: string; page?: number; page_size?: number }) {
  return useQuery({ queryKey: ["org", "opportunities", params], queryFn: () => api.apiOrgOpportunities(params) });
}
export function useOrgOpportunityDetail(id: number) {
  return useQuery({ queryKey: ["org", "opportunities", id], queryFn: () => api.apiOrgOpportunityDetail(id), enabled: !!id });
}
export function useCreateOrgOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.apiCreateOrgOpportunity>[0]) => api.apiCreateOrgOpportunity(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "opportunities"] }),
  });
}
export function useUpdateOrgOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.apiUpdateOrgOpportunity>[1] }) => api.apiUpdateOrgOpportunity(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "opportunities"] }),
  });
}
export function useDeleteOrgOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.apiDeleteOrgOpportunity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "opportunities"] }),
  });
}
export function useOrgOppAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: "submit" | "unpublish" | "close" | "archive" }) => api.apiOrgOppAction(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "opportunities"] }),
  });
}
export function useOrgApplications(params?: { status?: string; opportunity?: number; search?: string; page?: number; page_size?: number }) {
  return useQuery({ queryKey: ["org", "applications", params], queryFn: () => api.apiOrgApplications(params) });
}
export function useOrgApplicationDetail(id: number) {
  return useQuery({ queryKey: ["org", "applications", id], queryFn: () => api.apiOrgApplicationDetail(id), enabled: !!id });
}
export function useOrgAppChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: Parameters<typeof api.apiOrgAppChangeStatus>[1]; note: string }) => api.apiOrgAppChangeStatus(id, status, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "applications"] }),
  });
}

// Admin
export function useAdminStats() {
  return useQuery({ queryKey: ["admin", "stats"], queryFn: api.apiAdminStats });
}
export function useAdminUsers(params?: { role?: string; is_active?: string; search?: string; page?: number; page_size?: number }) {
  return useQuery({ queryKey: ["admin", "users", params], queryFn: () => api.apiAdminUsers(params) });
}
export function useAdminUserDetail(id: number) {
  return useQuery({ queryKey: ["admin", "users", id], queryFn: () => api.apiAdminUserDetail(id), enabled: !!id });
}
export function useAdminUserAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: "suspend" | "reactivate"; note: string }) =>
      action === "suspend" ? api.apiAdminUserSuspend(id, note) : api.apiAdminUserReactivate(id, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); qc.invalidateQueries({ queryKey: ["admin", "audit"] }); },
  });
}
export function useAdminOrganizations(params?: { verification_status?: string; search?: string; page?: number; page_size?: number }) {
  return useQuery({ queryKey: ["admin", "organizations", params], queryFn: () => api.apiAdminOrganizations(params) });
}
export function useAdminOrgDetail(id: number) {
  return useQuery({ queryKey: ["admin", "organizations", id], queryFn: () => api.apiAdminOrgDetail(id), enabled: !!id });
}
export function useAdminOrgAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: "approve" | "reject" | "suspend" | "reactivate"; note: string }) => api.apiAdminOrgAction(id, action, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "organizations"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); qc.invalidateQueries({ queryKey: ["admin", "audit"] }); },
  });
}
export function useAdminOpportunities(params?: { status?: string; search?: string; page?: number; page_size?: number }) {
  return useQuery({ queryKey: ["admin", "opportunities", params], queryFn: () => api.apiAdminOpportunities(params) });
}
export function useAdminOppDetail(id: number) {
  return useQuery({ queryKey: ["admin", "opportunities", id], queryFn: () => api.apiAdminOppDetail(id), enabled: !!id });
}
export function useAdminOppAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: "approve" | "reject" | "suspend"; note: string }) => api.apiAdminOppAction(id, action, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "opportunities"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); qc.invalidateQueries({ queryKey: ["admin", "audit"] }); },
  });
}
export function useAdminAuditLog(params?: { action?: string; target_type?: string; page?: number; page_size?: number }) {
  return useQuery({ queryKey: ["admin", "audit", params], queryFn: () => api.apiAdminAuditLog(params) });
}

// CV Download
export async function downloadCV(cvId: number, filename: string) {
  const blob = await api.apiDownloadCV(cvId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
