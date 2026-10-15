import type {
  Institution, Course, Skill, Industry, Location, OpportunityType,
  StudentProfile, StudentSkill, StudentPreferences, CVDocument,
  Organization, OrganizationOpportunity, OpportunityListItem, OpportunityDetail,
  StudentApplicationListItem, StudentApplicationDetail,
  OrganizationApplicationListItem, OrganizationApplicationDetail, Applicant,
  AdminOrganization, AdminOpportunity, AdminActionLog, PlatformStats,
  User, ApplicationStatus, ApplicationEvent, OpportunityStatus,
} from "@/types";

let _id = 1000;
const nextId = () => ++_id;
const now = () => new Date().toISOString();
const todayISO = () => new Date().toISOString().slice(0, 10);

// ─── Taxonomy ───────────────────────────────────────────────────────────────
export const institutions: Institution[] = [
  { id: 1, name: "University of Dar es Salaam", slug: "udsm", short_name: "UDSM" },
  { id: 2, name: "Ardhi University", slug: "aru", short_name: "ARU" },
  { id: 3, name: "Sokoine University of Agriculture", slug: "sua", short_name: "SUA" },
  { id: 4, name: "University of Dodoma", slug: "udom", short_name: "UDOM" },
  { id: 5, name: "Nelson Mandela African Institution of Sci & Tech", slug: "nm-aist", short_name: "NM-AIST" },
  { id: 6, name: "Dar es Salaam Institute of Technology", slug: "dit", short_name: "DIT" },
  { id: 7, name: "Institute of Finance Management", slug: "ifm", short_name: "IFM" },
  { id: 8, name: "Mzumbe University", slug: "mzumbe", short_name: "MU" },
];

export const courses: Course[] = [
  { id: 1, name: "Computer Science", slug: "computer-science" },
  { id: 2, name: "Information Technology", slug: "information-technology" },
  { id: 3, name: "Software Engineering", slug: "software-engineering" },
  { id: 4, name: "Electrical Engineering", slug: "electrical-engineering" },
  { id: 5, name: "Civil Engineering", slug: "civil-engineering" },
  { id: 6, name: "Business Administration", slug: "business-administration" },
  { id: 7, name: "Accounting and Finance", slug: "accounting-finance" },
  { id: 8, name: "Marketing", slug: "marketing" },
  { id: 9, name: "Agricultural Economics", slug: "agricultural-economics" },
  { id: 10, name: "Mechanical Engineering", slug: "mechanical-engineering" },
  { id: 11, name: "Architecture", slug: "architecture" },
  { id: 12, name: "Law", slug: "law" },
  { id: 13, name: "Medicine", slug: "medicine" },
  { id: 14, name: "Nursing", slug: "nursing" },
  { id: 15, name: "Journalism and Mass Communication", slug: "journalism" },
  { id: 16, name: "Environmental Science", slug: "environmental-science" },
];

export const skills: Skill[] = [
  { id: 1, name: "Python", slug: "python", category: "Programming" },
  { id: 2, name: "JavaScript", slug: "javascript", category: "Programming" },
  { id: 3, name: "React", slug: "react", category: "Frontend" },
  { id: 4, name: "Django", slug: "django", category: "Backend" },
  { id: 5, name: "Data Analysis", slug: "data-analysis", category: "Data" },
  { id: 6, name: "Public Speaking", slug: "public-speaking", category: "Soft Skills" },
  { id: 7, name: "Project Management", slug: "project-management", category: "Management" },
  { id: 8, name: "Graphic Design", slug: "graphic-design", category: "Design" },
  { id: 9, name: "AutoCAD", slug: "autocad", category: "Engineering" },
  { id: 10, name: "Financial Modeling", slug: "financial-modeling", category: "Finance" },
  { id: 11, name: "SEO", slug: "seo", category: "Marketing" },
  { id: 12, name: "Content Writing", slug: "content-writing", category: "Marketing" },
  { id: 13, name: "Machine Learning", slug: "machine-learning", category: "Data" },
  { id: 14, name: "SQL", slug: "sql", category: "Data" },
  { id: 15, name: "TypeScript", slug: "typescript", category: "Programming" },
];

export const industries: Industry[] = [
  { id: 1, name: "Technology", slug: "technology" },
  { id: 2, name: "Finance & Banking", slug: "finance-banking" },
  { id: 3, name: "Agriculture", slug: "agriculture" },
  { id: 4, name: "Healthcare", slug: "healthcare" },
  { id: 5, name: "Education", slug: "education" },
  { id: 6, name: "Manufacturing", slug: "manufacturing" },
  { id: 7, name: "Media & Communications", slug: "media-communications" },
  { id: 8, name: "Construction", slug: "construction" },
];

export const locations: Location[] = [
  { id: 1, name: "Dar es Salaam", region: "Dar es Salaam", slug: "dar-es-salaam" },
  { id: 2, name: "Dodoma", region: "Dodoma", slug: "dodoma" },
  { id: 3, name: "Arusha", region: "Arusha", slug: "arusha" },
  { id: 4, name: "Mwanza", region: "Mwanza", slug: "mwanza" },
  { id: 5, name: "Zanzibar City", region: "Zanzibar", slug: "zanzibar-city" },
  { id: 6, name: "Mbeya", region: "Mbeya", slug: "mbeya" },
  { id: 7, name: "Moshi", region: "Kilimanjaro", slug: "moshi" },
  { id: 8, name: "Tanga", region: "Tanga", slug: "tanga" },
  { id: 9, name: "Morogoro", region: "Morogoro", slug: "morogoro" },
  { id: 10, name: "Remote", region: "Remote", slug: "remote" },
];

export const opportunityTypes: OpportunityType[] = [
  { id: 1, name: "Internship", slug: "internship", description: "Hands-on work experience with mentorship." },
  { id: 2, name: "Industrial Training", slug: "industrial-training", description: "Practical training attachment required by academic programs." },
  { id: 3, name: "Graduate Programme", slug: "graduate-programme", description: "Structured entry-level programme for recent graduates." },
  { id: 4, name: "Volunteer Opportunity", slug: "volunteer", description: "Unpaid community impact opportunity." },
  { id: 5, name: "Research Attachment", slug: "research-attachment", description: "Academic or applied research collaboration." },
];

// ─── Demo users & accounts ──────────────────────────────────────────────────
const DEMO_PASS = "Demo-Pass-12345";

interface StoredUser extends User {
  password: string;
}

export const users: StoredUser[] = [
  { id: 1, email: "admin@demo.tz", role: "admin", is_active: true, date_joined: "2026-09-01T08:00:00+03:00", password: DEMO_PASS },
  { id: 2, email: "student@demo.tz", role: "student", is_active: true, date_joined: "2026-09-15T10:00:00+03:00", password: DEMO_PASS },
  { id: 3, email: "hr@demo.tz", role: "organization", is_active: true, date_joined: "2026-09-10T09:00:00+03:00", password: DEMO_PASS },
  { id: 4, email: "amina@demo.tz", role: "student", is_active: true, date_joined: "2026-09-20T14:00:00+03:00", password: DEMO_PASS },
  { id: 5, email: "joseph@demo.tz", role: "student", is_active: true, date_joined: "2026-09-25T11:00:00+03:00", password: DEMO_PASS },
  { id: 6, email: "tech@demo.tz", role: "organization", is_active: true, date_joined: "2026-09-05T12:00:00+03:00", password: DEMO_PASS },
  { id: 7, email: "suspended@demo.tz", role: "student", is_active: false, date_joined: "2026-08-01T08:00:00+03:00", password: DEMO_PASS },
];

export const tokens: Record<number, { access: string; refresh: string }> = {};
for (const u of users) {
  tokens[u.id] = { access: `mock-access-${u.id}`, refresh: `mock-refresh-${u.id}` };
}

export function userByToken(access: string): StoredUser | undefined {
  const match = access.match(/^mock-access-(\d+)$/);
  if (!match) return undefined;
  return users.find(u => u.id === Number(match[1]));
}

export function userByRefresh(refresh: string): StoredUser | undefined {
  const match = refresh.match(/^mock-refresh-(\d+)$/);
  if (!match) return undefined;
  return users.find(u => u.id === Number(match[1]));
}

export function userByEmail(email: string): StoredUser | undefined {
  return users.find(u => u.email === email.toLowerCase());
}

// ─── Organizations ──────────────────────────────────────────────────────────
export const organizations: Organization[] = [
  {
    id: 1, name: "Alpha Tech Ltd", description: "Leading software company in Dar es Salaam specializing in fintech solutions and enterprise software.",
    industry: 1, industry_name: "Technology", location: 1, location_name: "Dar es Salaam",
    address: "Sam Nujoma Road, Mikocheni", website: "https://alpha.example.tz",
    contact_email: "hr@alpha.example.tz", contact_phone: "+255700000900",
    registration_number: "BRELA-2024-001", verification_status: "verified",
    verification_notes: "Registration documents verified.", verified_at: "2026-09-12T10:00:00+03:00",
    created_at: "2026-09-05T12:00:00+03:00",
  },
  {
    id: 2, name: "Bongo Media House", description: "Digital media and content production company serving East Africa.",
    industry: 7, industry_name: "Media & Communications", location: 1, location_name: "Dar es Salaam",
    address: "Mlimani City, 1st Floor", website: "https://bongomedia.example.tz",
    contact_email: "careers@bongomedia.example.tz", contact_phone: "+255700000800",
    registration_number: "BRELA-2023-456", verification_status: "verified",
    verification_notes: "Verified business registration.", verified_at: "2026-09-08T14:00:00+03:00",
    created_at: "2026-09-03T09:00:00+03:00",
  },
  {
    id: 3, name: "Green Farms Tanzania", description: "Sustainable agriculture enterprise supporting smallholder farmers.",
    industry: 3, industry_name: "Agriculture", location: 9, location_name: "Morogoro",
    address: "Kingo Kingo Road", website: "https://greenfarms.example.tz",
    contact_email: "info@greenfarms.example.tz", contact_phone: "+255700000700",
    registration_number: "BRELA-2024-789", verification_status: "pending",
    verification_notes: "", verified_at: null,
    created_at: "2026-09-28T08:00:00+03:00",
  },
  {
    id: 4, name: "Cloud Innovate", description: "Cloud infrastructure and DevOps consulting firm.",
    industry: 1, industry_name: "Technology", location: 3, location_name: "Arusha",
    address: "Clock Tower Area", website: "https://cloudinnovate.example.tz",
    contact_email: "hello@cloudinnovate.example.tz", contact_phone: "+255700000600",
    registration_number: "BRELA-2024-100", verification_status: "unverified",
    verification_notes: "", verified_at: null,
    created_at: "2026-10-01T11:00:00+03:00",
  },
];

export function orgByUserId(userId: number): Organization | undefined {
  // user 3 (hr@demo.tz) → org 1, user 6 (tech@demo.tz) → org 4
  if (userId === 3) return organizations.find(o => o.id === 1);
  if (userId === 6) return organizations.find(o => o.id === 4);
  return undefined;
}

export function orgOwnerId(orgId: number): number | undefined {
  if (orgId === 1) return 3;
  if (orgId === 4) return 6;
  return undefined;
}

// ─── Student profiles ───────────────────────────────────────────────────────
export const studentProfiles: Record<number, StudentProfile> = {
  2: {
    id: 1, email: "student@demo.tz", account_type: "student", full_name: "Amina Juma",
    phone: "+255711111111", institution: 1, institution_name: "University of Dar es Salaam",
    course: 1, course_name: "Computer Science", study_level: "bachelor",
    year_of_study: 3, graduation_year: null, bio: "Final-year Computer Science student passionate about web development and data science.",
    is_complete: true, missing_fields: [], updated_at: "2026-09-20T14:00:00+03:00",
  },
  4: {
    id: 2, email: "amina@demo.tz", account_type: "student", full_name: "Amina Hassan",
    phone: "+255722222222", institution: 2, institution_name: "Ardhi University",
    course: 11, course_name: "Architecture", study_level: "bachelor",
    year_of_study: 2, graduation_year: null, bio: "Architecture student interested in sustainable urban design.",
    is_complete: true, missing_fields: [], updated_at: "2026-09-20T15:00:00+03:00",
  },
  5: {
    id: 3, email: "joseph@demo.tz", account_type: "graduate", full_name: "Joseph Mwakyusa",
    phone: "", institution: 1, institution_name: "University of Dar es Salaam",
    course: 2, course_name: "Information Technology", study_level: "bachelor",
    year_of_study: null, graduation_year: 2025, bio: "Recent IT graduate seeking first professional role.",
    is_complete: false, missing_fields: ["phone"], updated_at: "2026-09-25T11:00:00+03:00",
  },
};

export const studentSkills: Record<number, StudentSkill[]> = {
  2: [
    { skill: 1, skill_name: "Python", proficiency: "advanced" },
    { skill: 2, skill_name: "JavaScript", proficiency: "intermediate" },
    { skill: 14, skill_name: "SQL", proficiency: "advanced" },
    { skill: 6, skill_name: "Public Speaking", proficiency: "beginner" },
  ],
  4: [
    { skill: 9, skill_name: "AutoCAD", proficiency: "advanced" },
    { skill: 8, skill_name: "Graphic Design", proficiency: "intermediate" },
  ],
  5: [
    { skill: 5, skill_name: "Data Analysis", proficiency: "intermediate" },
    { skill: 10, skill_name: "Financial Modeling", proficiency: "beginner" },
  ],
};

export const studentPreferences: Record<number, StudentPreferences> = {
  2: { preferred_locations: [1, 3], preferred_opportunity_types: [1, 3], preferred_industries: [1] },
  4: { preferred_locations: [1], preferred_opportunity_types: [1], preferred_industries: [1, 8] },
  5: { preferred_locations: [1, 2], preferred_opportunity_types: [3], preferred_industries: [1, 2] },
};

export const studentCVs: Record<number, CVDocument[]> = {
  2: [
    { id: 101, original_name: "Amina_Juma_CV.pdf", size: 245678, version: 2, is_current: true, parsed_status: "done", uploaded_at: "2026-09-22T10:00:00+03:00", download_url: `/documents/cvs/101/download/` },
    { id: 100, original_name: "Amina_Juma_CV_v1.pdf", size: 220000, version: 1, is_current: false, parsed_status: "done", uploaded_at: "2026-09-15T10:00:00+03:00", download_url: `/documents/cvs/100/download/` },
  ],
  4: [
    { id: 201, original_name: "Amina_Hassan_CV.docx", size: 180000, version: 1, is_current: true, parsed_status: "pending", uploaded_at: "2026-09-21T09:00:00+03:00", download_url: `/documents/cvs/201/download/` },
  ],
  5: [],
};

// ─── Opportunities ──────────────────────────────────────────────────────────
export const orgOpportunities: OrganizationOpportunity[] = [
  {
    id: 10, opportunity_type: 1, title: "Software Engineering Internship",
    description: "Join our engineering team to build and maintain web applications using Django and React. You will work on real features, participate in code reviews, and learn modern development practices.",
    location: 1, is_remote: false, duration_months: 3, start_date: "2026-12-01",
    deadline: "2026-11-15", positions: 3, is_paid: true,
    requirements: { courses: [1, 2, 3], skills: [1, 2, 4], min_study_level: "diploma", min_year_of_study: 2, students_eligible: true, graduates_eligible: true, eligibility_notes: "Open to second-year students and above." },
    status: "published", published_at: "2026-09-14T10:00:00+03:00", moderation_note: "",
    application_count: 2, created_at: "2026-09-10T10:00:00+03:00", updated_at: "2026-09-14T10:00:00+03:00",
  },
  {
    id: 11, opportunity_type: 3, title: "Data Science Graduate Programme",
    description: "A 12-month structured programme for recent graduates in Computer Science, Statistics, or related fields. Includes mentorship, rotation across teams, and a final capstone project.",
    location: 1, is_remote: false, duration_months: 12, start_date: "2027-01-15",
    deadline: "2026-11-30", positions: 5, is_paid: true,
    requirements: { courses: [1, 2], skills: [1, 5, 13, 14], min_study_level: "bachelor", min_year_of_study: null, students_eligible: false, graduates_eligible: true, eligibility_notes: "Graduates only." },
    status: "published", published_at: "2026-09-16T10:00:00+03:00", moderation_note: "",
    application_count: 1, created_at: "2026-09-12T10:00:00+03:00", updated_at: "2026-09-16T10:00:00+03:00",
  },
  {
    id: 12, opportunity_type: 4, title: "Community Tech Volunteer",
    description: "Help teach coding basics to secondary school students in underserved communities across Dar es Salaam.",
    location: 1, is_remote: false, duration_months: 2, start_date: null,
    deadline: "2026-12-01", positions: 10, is_paid: false,
    requirements: { courses: [], skills: [2, 6], min_study_level: "", min_year_of_study: null, students_eligible: true, graduates_eligible: true, eligibility_notes: "Open to all passionate volunteers." },
    status: "draft", published_at: null, moderation_note: "",
    application_count: 0, created_at: "2026-10-01T10:00:00+03:00", updated_at: "2026-10-01T10:00:00+03:00",
  },
  {
    id: 20, opportunity_type: 2, title: "Media Production Training Attachment",
    description: "Industrial training attachment for students in journalism, media, and communication programs. Hands-on experience in video production, editing, and digital content creation.",
    location: 1, is_remote: false, duration_months: 3, start_date: "2026-12-01",
    deadline: "2026-11-20", positions: 4, is_paid: false,
    requirements: { courses: [15], skills: [8, 12], min_study_level: "diploma", min_year_of_study: 1, students_eligible: true, graduates_eligible: false, eligibility_notes: "Students currently enrolled in media-related programs." },
    status: "published", published_at: "2026-09-18T10:00:00+03:00", moderation_note: "",
    application_count: 0, created_at: "2026-09-14T10:00:00+03:00", updated_at: "2026-09-18T10:00:00+03:00",
  },
  {
    id: 21, opportunity_type: 5, title: "Sustainable Agriculture Research Attachment",
    description: "Research attachment focusing on climate-smart agriculture practices for smallholder farmers.",
    location: 9, is_remote: false, duration_months: 6, start_date: "2027-01-01",
    deadline: "2026-11-25", positions: 2, is_paid: true,
    requirements: { courses: [9, 16], skills: [5], min_study_level: "bachelor", min_year_of_study: 3, students_eligible: true, graduates_eligible: true, eligibility_notes: "Preference for agriculture and environmental science students." },
    status: "pending_review", published_at: null, moderation_note: "",
    application_count: 0, created_at: "2026-09-29T10:00:00+03:00", updated_at: "2026-09-29T10:00:00+03:00",
  },
  {
    id: 30, opportunity_type: 1, title: "Cloud DevOps Internship",
    description: "Learn cloud infrastructure, CI/CD pipelines, and containerization in a hands-on internship.",
    location: null, is_remote: true, duration_months: 4, start_date: "2026-12-15",
    deadline: "2026-11-10", positions: 2, is_paid: true,
    requirements: { courses: [1, 2, 3], skills: [1, 15], min_study_level: "diploma", min_year_of_study: 2, students_eligible: true, graduates_eligible: true, eligibility_notes: "" },
    status: "draft", published_at: null, moderation_note: "",
    application_count: 0, created_at: "2026-10-02T10:00:00+03:00", updated_at: "2026-10-02T10:00:00+03:00",
  },
];

// saved opportunities: studentUserId → Set<opportunityId>
export const savedOpps: Record<number, Set<number>> = {
  2: new Set([10, 11]),
  4: new Set([10]),
};

// Applications
export interface StoredApplication {
  id: number;
  studentUserId: number;
  opportunityId: number;
  orgId: number;
  status: ApplicationStatus;
  cover_letter: string;
  cv: CVDocument | null;
  submitted_at: string;
  status_updated_at: string;
  events: ApplicationEvent[];
}

export const applications: StoredApplication[] = [
  {
    id: 1, studentUserId: 2, opportunityId: 10, orgId: 1, status: "reviewing",
    cover_letter: "I am a final-year Computer Science student with strong Python and Django skills. I would love to contribute to Alpha Tech's engineering team.",
    cv: studentCVs[2]?.[0] ?? null,
    submitted_at: "2026-09-16T12:00:00+03:00", status_updated_at: "2026-09-18T09:00:00+03:00",
    events: [
      { old_status: "", new_status: "submitted", note: "", created_at: "2026-09-16T12:00:00+03:00" },
      { old_status: "submitted", new_status: "reviewing", note: "Strong academic background, moving to review.", created_at: "2026-09-18T09:00:00+03:00" },
    ],
  },
  {
    id: 2, studentUserId: 2, opportunityId: 11, orgId: 1, status: "submitted",
    cover_letter: "Recent graduate with data science coursework experience, eager to join the graduate programme.",
    cv: studentCVs[2]?.[0] ?? null,
    submitted_at: "2026-09-17T14:00:00+03:00", status_updated_at: "2026-09-17T14:00:00+03:00",
    events: [
      { old_status: "", new_status: "submitted", note: "", created_at: "2026-09-17T14:00:00+03:00" },
    ],
  },
  {
    id: 3, studentUserId: 4, opportunityId: 10, orgId: 1, status: "shortlisted",
    cover_letter: "Architecture student with strong design skills looking to pivot into tech.",
    cv: studentCVs[4]?.[0] ?? null,
    submitted_at: "2026-09-17T10:00:00+03:00", status_updated_at: "2026-09-19T15:00:00+03:00",
    events: [
      { old_status: "", new_status: "submitted", note: "", created_at: "2026-09-17T10:00:00+03:00" },
      { old_status: "submitted", new_status: "reviewing", note: "Interesting background.", created_at: "2026-09-18T10:00:00+03:00" },
      { old_status: "reviewing", new_status: "shortlisted", note: "Shortlisted for interview.", created_at: "2026-09-19T15:00:00+03:00" },
    ],
  },
];

// Audit log
export const auditLog: AdminActionLog[] = [
  { id: 1, actor_email: "admin@demo.tz", action: "organization.verify", target_type: "organizations.organization", target_id: 1, note: "Registration documents verified.", created_at: "2026-09-12T10:00:00+03:00" },
  { id: 2, actor_email: "admin@demo.tz", action: "organization.verify", target_type: "organizations.organization", target_id: 2, note: "Verified business registration.", created_at: "2026-09-08T14:00:00+03:00" },
  { id: 3, actor_email: "admin@demo.tz", action: "opportunity.approve", target_type: "opportunities.opportunity", target_id: 10, note: "Approved for publication.", created_at: "2026-09-14T10:00:00+03:00" },
  { id: 4, actor_email: "admin@demo.tz", action: "opportunity.approve", target_type: "opportunities.opportunity", target_id: 11, note: "Approved for publication.", created_at: "2026-09-16T10:00:00+03:00" },
  { id: 5, actor_email: "admin@demo.tz", action: "opportunity.approve", target_type: "opportunities.opportunity", target_id: 20, note: "Approved for publication.", created_at: "2026-09-18T10:00:00+03:00" },
  { id: 6, actor_email: "admin@demo.tz", action: "user.suspend", target_type: "accounts.user", target_id: 7, note: "Spam activity reported.", created_at: "2026-09-22T08:00:00+03:00" },
];

// ─── Helper functions ───────────────────────────────────────────────────────
export function getOpportunityById(id: number): OrganizationOpportunity | undefined {
  return orgOpportunities.find(o => o.id === id);
}

export function getOrgByOpportunity(oppId: number): Organization | undefined {
  const opp = getOpportunityById(oppId);
  if (!opp) return undefined;
  // org 1 owns 10,11,12; org 2 owns 20; org 3 owns 21; org 4 owns 30
  if ([10, 11, 12].includes(oppId)) return organizations.find(o => o.id === 1);
  if (oppId === 20) return organizations.find(o => o.id === 2);
  if (oppId === 21) return organizations.find(o => o.id === 3);
  if (oppId === 30) return organizations.find(o => o.id === 4);
  return undefined;
}

export function getOrgIdByOpportunity(oppId: number): number | undefined {
  const org = getOrgByOpportunity(oppId);
  return org?.id;
}

export function toPublicOpportunity(opp: OrganizationOpportunity, studentUserId?: number): OpportunityListItem {
  const org = getOrgByOpportunity(opp.id)!;
  const loc = opp.location ? locations.find(l => l.id === opp.location) ?? null : null;
  const type = opportunityTypes.find(t => t.id === opp.opportunity_type)!;
  const isSaved = studentUserId ? (savedOpps[studentUserId]?.has(opp.id) ?? false) : false;
  const hasApplied = studentUserId ? applications.some(a => a.studentUserId === studentUserId && a.opportunityId === opp.id) : false;
  return {
    id: opp.id, title: opp.title, opportunity_type: type, organization: { id: org.id, name: org.name, is_verified: org.verification_status === "verified" },
    location: loc, is_remote: opp.is_remote, duration_months: opp.duration_months,
    deadline: opp.deadline, positions: opp.positions, is_paid: opp.is_paid,
    published_at: opp.published_at, is_saved: isSaved, has_applied: hasApplied,
  };
}

export function toPublicOpportunityDetail(opp: OrganizationOpportunity, studentUserId?: number): OpportunityDetail {
  const base = toPublicOpportunity(opp, studentUserId);
  const reqCourses = (opp.requirements?.courses ?? []).map(cid => courses.find(c => c.id === cid)!).filter(Boolean);
  const reqSkills = (opp.requirements?.skills ?? []).map(sid => skills.find(s => s.id === sid)!).filter(Boolean);
  return {
    ...base, description: opp.description, start_date: opp.start_date,
    requirements: {
      courses: reqCourses, skills: reqSkills,
      min_study_level: opp.requirements?.min_study_level ?? "",
      min_year_of_study: opp.requirements?.min_year_of_study ?? null,
      students_eligible: opp.requirements?.students_eligible ?? true,
      graduates_eligible: opp.requirements?.graduates_eligible ?? true,
      eligibility_notes: opp.requirements?.eligibility_notes ?? "",
    },
  };
}

export function toStudentAppListItem(app: StoredApplication): StudentApplicationListItem {
  const opp = getOpportunityById(app.opportunityId)!;
  return {
    id: app.id, status: app.status, opportunity: toPublicOpportunity(opp, app.studentUserId),
    submitted_at: app.submitted_at, status_updated_at: app.status_updated_at,
  };
}

export function toStudentAppDetail(app: StoredApplication): StudentApplicationDetail {
  return { ...toStudentAppListItem(app), cover_letter: app.cover_letter, cv: app.cv, events: app.events };
}

export function toOrgAppListItem(app: StoredApplication): OrganizationApplicationListItem {
  const profile = studentProfiles[app.studentUserId];
  return {
    id: app.id, status: app.status, applicant_name: profile?.full_name ?? "Unknown",
    opportunity: app.opportunityId, opportunity_title: getOpportunityById(app.opportunityId)?.title ?? "Unknown",
    submitted_at: app.submitted_at, status_updated_at: app.status_updated_at,
  };
}

export function toOrgAppDetail(app: StoredApplication): OrganizationApplicationDetail {
  const profile = studentProfiles[app.studentUserId];
  const sk = studentSkills[app.studentUserId] ?? [];
  const applicant: Applicant = {
    full_name: profile?.full_name ?? "", email: profile?.email ?? "", phone: profile?.phone ?? "",
    account_type: profile?.account_type ?? "student", institution: profile?.institution_name ?? null,
    course: profile?.course_name ?? null, study_level: profile?.study_level ?? "",
    year_of_study: profile?.year_of_study ?? null, graduation_year: profile?.graduation_year ?? null,
    bio: profile?.bio ?? "", skills: sk.map(s => ({ name: s.skill_name, proficiency: s.proficiency })),
  };
  return { ...toOrgAppListItem(app), cover_letter: app.cover_letter, applicant, cv: app.cv, events: app.events };
}

export function toAdminOrg(o: Organization): AdminOrganization {
  const ownerId = orgOwnerId(o.id);
  const owner = ownerId ? users.find(u => u.id === ownerId) : undefined;
  return {
    ...o, is_active: true, owner_email: owner?.email ?? null,
  };
}

export function toAdminOpp(opp: OrganizationOpportunity): AdminOpportunity {
  const org = getOrgByOpportunity(opp.id)!;
  const type = opportunityTypes.find(t => t.id === opp.opportunity_type)!;
  return {
    id: opp.id, title: opp.title, description: opp.description,
    organization: org.id, organization_name: org.name, type_name: type.name,
    status: opp.status, deadline: opp.deadline, positions: opp.positions,
    moderation_note: opp.moderation_note, published_at: opp.published_at, created_at: opp.created_at,
  };
}

export function getStats(): PlatformStats {
  return {
    users: {
      total: users.length,
      by_role: { student: users.filter(u => u.role === "student").length, organization: users.filter(u => u.role === "organization").length, admin: users.filter(u => u.role === "admin").length },
      suspended: users.filter(u => !u.is_active).length,
    },
    organizations: {
      total: organizations.length,
      by_verification_status: {
        verified: organizations.filter(o => o.verification_status === "verified").length,
        pending: organizations.filter(o => o.verification_status === "pending").length,
        unverified: organizations.filter(o => o.verification_status === "unverified").length,
        rejected: organizations.filter(o => o.verification_status === "rejected").length,
      },
    },
    opportunities: {
      total: orgOpportunities.length,
      by_status: {
        published: orgOpportunities.filter(o => o.status === "published").length,
        draft: orgOpportunities.filter(o => o.status === "draft").length,
        pending_review: orgOpportunities.filter(o => o.status === "pending_review").length,
        closed: orgOpportunities.filter(o => o.status === "closed").length,
        expired: orgOpportunities.filter(o => o.status === "expired").length,
        archived: orgOpportunities.filter(o => o.status === "archived").length,
        suspended: orgOpportunities.filter(o => o.status === "suspended").length,
      },
    },
    applications: {
      total: applications.length,
      by_status: {
        submitted: applications.filter(a => a.status === "submitted").length,
        reviewing: applications.filter(a => a.status === "reviewing").length,
        shortlisted: applications.filter(a => a.status === "shortlisted").length,
        interview: applications.filter(a => a.status === "interview").length,
        accepted: applications.filter(a => a.status === "accepted").length,
        rejected: applications.filter(a => a.status === "rejected").length,
        withdrawn: applications.filter(a => a.status === "withdrawn").length,
      },
    },
  };
}

export function genId() { return nextId(); }
export function nowISO() { return now(); }
export function today() { return todayISO(); }

// lifecycle validation for opportunities
export function canTransition(status: OpportunityStatus, action: "submit" | "unpublish" | "close" | "archive"): boolean {
  if (action === "submit") return status === "draft";
  if (action === "unpublish") return status === "pending_review" || status === "published";
  if (action === "close") return status === "published";
  if (action === "archive") return status === "draft" || status === "closed" || status === "expired";
  return false;
}

// application transition validation
export function canTransitionApp(current: ApplicationStatus, next: ApplicationStatus, isOrg: boolean): boolean {
  const orgTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    submitted: ["reviewing", "rejected"],
    reviewing: ["shortlisted", "rejected"],
    shortlisted: ["interview", "accepted", "rejected"],
    interview: ["accepted", "rejected"],
    accepted: [], rejected: [], withdrawn: [],
  };
  const studentTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    submitted: ["withdrawn"], reviewing: ["withdrawn"], shortlisted: ["withdrawn"],
    interview: [], accepted: [], rejected: [], withdrawn: [],
  };
  const allowed = isOrg ? orgTransitions[current] : studentTransitions[current];
  return allowed.includes(next);
}

export function addAuditEntry(action: string, target_type: string, target_id: number, note: string, actorId: number) {
  const actor = users.find(u => u.id === actorId);
  auditLog.unshift({
    id: nextId(), actor_email: actor?.email ?? null, action, target_type, target_id, note, created_at: now(),
  });
}

export { DEMO_PASS };
