/**
 * API surface used by the whole UI (hooks + pages).
 *
 * Per frontend.md §1.6 / §7 the UI must consume living backend data.
 * The mock implementation is kept ONLY as an opt-in local-development
 * fallback (VITE_USE_MOCK=true). By default all calls go to the real
 * Django backend through src/api/real.ts.
 */
import { USE_MOCK } from "@/config";
import * as mock from "@/api/mock-api";
import * as real from "@/api/real";

const impl: typeof real = (USE_MOCK ? (mock as unknown as typeof real) : real);

export const {
  apiRegister,
  apiLogin,
  apiRefresh,
  apiLogout,
  apiMe,
  apiInstitutions,
  apiCourses,
  apiSkills,
  apiIndustries,
  apiLocations,
  apiOpportunityTypes,
  apiStudentMe,
  apiStudentProfile,
  apiUpdateStudentProfile,
  apiStudentSkills,
  apiUpdateStudentSkills,
  apiStudentPreferences,
  apiUpdateStudentPreferences,
  apiStudentCVs,
  apiUploadCV,
  apiDownloadCV,
  apiPublicOpportunities,
  apiPublicOpportunityDetail,
  apiSaveOpportunity,
  apiUnsaveOpportunity,
  apiSavedOpportunities,
  apiApplyToOpportunity,
  apiStudentApplications,
  apiStudentApplicationDetail,
  apiWithdrawApplication,
  apiPublicOrganizations,
  apiPublicOrganizationDetail,
  apiOrgMe,
  apiCreateOrg,
  apiUpdateOrg,
  apiSubmitVerification,
  apiOrgOpportunities,
  apiOrgOpportunityDetail,
  apiCreateOrgOpportunity,
  apiUpdateOrgOpportunity,
  apiDeleteOrgOpportunity,
  apiOrgOppAction,
  apiOrgApplications,
  apiOrgApplicationDetail,
  apiOrgAppChangeStatus,
  apiAdminUsers,
  apiAdminUserDetail,
  apiAdminUserSuspend,
  apiAdminUserReactivate,
  apiAdminOrganizations,
  apiAdminOrgDetail,
  apiAdminOrgAction,
  apiAdminOpportunities,
  apiAdminOppDetail,
  apiAdminOppAction,
  apiAdminAuditLog,
  apiAdminAuditDetail,
  apiAdminStats,
} = impl;

// Detail helpers exist only on the real client; expose them when available.
export const apiInstitutionDetail =
  (real as Record<string, unknown>).apiInstitutionDetail as typeof real.apiInstitutionDetail;
export const apiCourseDetail =
  (real as Record<string, unknown>).apiCourseDetail as typeof real.apiCourseDetail;
export const apiSkillDetail =
  (real as Record<string, unknown>).apiSkillDetail as typeof real.apiSkillDetail;
export const apiIndustryDetail =
  (real as Record<string, unknown>).apiIndustryDetail as typeof real.apiIndustryDetail;
export const apiLocationDetail =
  (real as Record<string, unknown>).apiLocationDetail as typeof real.apiLocationDetail;
export const apiOpportunityTypeDetail =
  (real as Record<string, unknown>).apiOpportunityTypeDetail as typeof real.apiOpportunityTypeDetail;

export type {
  User,
  LoginResponse,
  ApiList,
  Institution,
  Course,
  Skill,
  Industry,
  Location,
  OpportunityType,
  StudentMeResponse,
  StudentProfile,
  StudentSkill,
  StudentPreferences,
  CVDocument,
  Organization,
  OrganizationOpportunity,
  OpportunityDetail,
  StudentApplicationListItem,
  StudentApplicationDetail,
  SavedOpportunity,
  OrganizationApplicationListItem,
  OrganizationApplicationDetail,
  AdminUser,
  AdminOrganization,
  AdminOpportunity,
  AdminActionLog,
  PlatformStats,
  ApplicationStatus,
} from "@/types";
