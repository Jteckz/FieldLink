import type { ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth, RequireRole } from "@/auth/RequireAuth";
import { LandingPage } from "@/features/auth/LandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { OpportunitySearchPage } from "@/features/discovery/OpportunitySearchPage";
import { OpportunityDetailPage } from "@/features/discovery/OpportunityDetailPage";
import {
  PublicOrganizationDirectoryPage,
  PublicOrganizationDetailPage,
} from "@/features/organizations/PublicOrganizationPages";
import { StudentDashboardPage } from "@/features/student/StudentDashboardPage";
import { StudentProfilePage } from "@/features/student/StudentProfilePage";
import { StudentSkillsPage } from "@/features/student/StudentSkillsPage";
import { StudentPreferencesPage } from "@/features/student/StudentPreferencesPage";
import { StudentCVPage } from "@/features/student/StudentCVPage";
import { SavedOpportunitiesPage } from "@/features/student/SavedOpportunitiesPage";
import { StudentApplicationsPage, StudentApplicationDetailPage } from "@/features/student/StudentApplicationPages";
import {
  OrganizationOnboardingPage,
  OrganizationDashboardPage,
  OrganizationVerificationPage,
} from "@/features/organizations/OrganizationWorkspacePages";
import {
  OrganizationOpportunityListPage,
  OrganizationOpportunityFormPage,
  OrganizationOpportunityDetailPage,
} from "@/features/organizations/OrganizationOpportunityPages";
import {
  OrganizationApplicationListPage,
  OrganizationApplicationDetailPage,
} from "@/features/organizations/OrganizationApplicationPages";
import { AdminDashboardPage } from "@/features/admin/AdminDashboardPage";
import {
  AdminUsersPage,
  AdminOrganizationsPage,
  AdminOpportunitiesPage,
  AdminAuditLogPage,
} from "@/features/admin/AdminReviewPages";
import { NotFoundPage } from "@/features/misc/StatusPages";

function Shell({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export function AppRouter() {
  return (
    <Shell>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/opportunities" element={<OpportunitySearchPage />} />
        <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
        <Route path="/organizations" element={<PublicOrganizationDirectoryPage />} />
        <Route path="/organizations/:id" element={<PublicOrganizationDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Student */}
        <Route path="/student" element={<RequireRole roles={["student"]}><StudentDashboardPage /></RequireRole>} />
        <Route path="/student/profile" element={<RequireRole roles={["student"]}><StudentProfilePage /></RequireRole>} />
        <Route path="/student/skills" element={<RequireRole roles={["student"]}><StudentSkillsPage /></RequireRole>} />
        <Route path="/student/preferences" element={<RequireRole roles={["student"]}><StudentPreferencesPage /></RequireRole>} />
        <Route path="/student/cv" element={<RequireRole roles={["student"]}><StudentCVPage /></RequireRole>} />
        <Route path="/saved" element={<RequireRole roles={["student"]}><SavedOpportunitiesPage /></RequireRole>} />
        <Route path="/applications" element={<RequireRole roles={["student"]}><StudentApplicationsPage /></RequireRole>} />
        <Route path="/applications/:id" element={<RequireRole roles={["student"]}><StudentApplicationDetailPage /></RequireRole>} />

        {/* Organization */}
        <Route path="/org" element={<RequireRole roles={["organization"]}><OrganizationDashboardPage /></RequireRole>} />
        <Route path="/org/onboarding" element={<RequireRole roles={["organization"]}><OrganizationOnboardingPage /></RequireRole>} />
        <Route path="/org/verification" element={<RequireRole roles={["organization"]}><OrganizationVerificationPage /></RequireRole>} />
        <Route path="/org/opportunities" element={<RequireRole roles={["organization"]}><OrganizationOpportunityListPage /></RequireRole>} />
        <Route path="/org/opportunities/new" element={<RequireRole roles={["organization"]}><OrganizationOpportunityFormPage mode="new" /></RequireRole>} />
        <Route path="/org/opportunities/:id" element={<RequireRole roles={["organization"]}><OrganizationOpportunityDetailPage /></RequireRole>} />
        <Route path="/org/opportunities/:id/edit" element={<RequireRole roles={["organization"]}><OrganizationOpportunityFormPage mode="edit" /></RequireRole>} />
        <Route path="/org/applications" element={<RequireRole roles={["organization"]}><OrganizationApplicationListPage /></RequireRole>} />
        <Route path="/org/applications/:id" element={<RequireRole roles={["organization"]}><OrganizationApplicationDetailPage /></RequireRole>} />

        {/* Admin */}
        <Route path="/admin" element={<RequireRole roles={["admin"]}><AdminDashboardPage /></RequireRole>} />
        <Route path="/admin/users" element={<RequireRole roles={["admin"]}><AdminUsersPage /></RequireRole>} />
        <Route path="/admin/organizations" element={<RequireRole roles={["admin"]}><AdminOrganizationsPage /></RequireRole>} />
        <Route path="/admin/opportunities" element={<RequireRole roles={["admin"]}><AdminOpportunitiesPage /></RequireRole>} />
        <Route path="/admin/audit-log" element={<RequireRole roles={["admin"]}><AdminAuditLogPage /></RequireRole>} />

        {/* Legacy guard re-export compatibility */}
        <Route path="/forbidden" element={<RequireAuth><NotFoundPage /></RequireAuth>} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Shell>
  );
}

// Role home helper used after login when no explicit target exists
export function homeForRole(role: string): string {
  if (role === "student") return "/student";
  if (role === "organization") return "/org";
  if (role === "admin") return "/admin";
  return "/";
}

export { Navigate };
