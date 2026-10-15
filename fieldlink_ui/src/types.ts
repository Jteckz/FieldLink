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
export type StudyLevel = "certificate" | "diploma" | "bachelor" | "masters" | "phd";

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

export type CVParsedStatus = "not_requested" | "pending" | "done" | "failed";

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
  user: { id: number; email: string; role: Role };
  profile: StudentProfile;
  current_cv: CVDocument | null;
}

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

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
  | "draft" | "pending_review" | "published" | "closed" | "expired" | "archived" | "suspended";

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
  | "submitted" | "reviewing" | "shortlisted" | "interview" | "accepted" | "rejected" | "withdrawn";

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
  skills: Array<{ name: string; proficiency: Proficiency }>;
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

export interface OrganizationApplicationDetail extends OrganizationApplicationListItem {
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
  users: { total: number; by_role: Record<string, number>; suspended: number };
  organizations: { total: number; by_verification_status: Record<string, number> };
  opportunities: { total: number; by_status: Record<string, number> };
  applications: { total: number; by_status: Record<string, number> };
}

export interface LoginResponse {
  refresh: string;
  access: string;
  user: User;
}
