import { Link } from "react-router-dom";
import { User as UserIcon, FileText, Bookmark, Briefcase, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useStudentMe, useStudentApplications, useSavedOpportunities } from "@/api/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatFileSize, formatDate } from "@/lib/utils";

export function StudentDashboardPage() {
  const { data, isLoading, isError } = useStudentMe();
  const { data: apps } = useStudentApplications({ page_size: 1 });
  const { data: saved } = useSavedOpportunities({ page_size: 1 });

  if (isLoading) return <LoadingState label="Loading your dashboard…" />;
  if (isError || !data) {
    return <ErrorState title="Unable to load dashboard" description="Please check your connection and try again." />;
  }

  const { profile, current_cv } = data;
  const missing = profile.missing_fields ?? [];

  const nextActions: { label: string; to: string; done: boolean }[] = [
    { label: "Complete your profile", to: "/student/profile", done: profile.is_complete },
    { label: "Add your skills", to: "/student/skills", done: true },
    { label: "Upload your CV", to: "/student/cv", done: !!current_cv },
    { label: "Browse opportunities", to: "/opportunities", done: false },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${profile.full_name || "Student"}`}
        description="Track your progress and take the next step toward your opportunity."
      />

      {!profile.is_complete && (
        <Card>
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-amber-50/50 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-slate-900">Complete your profile to apply</p>
                <p className="text-sm text-slate-500">Missing: {missing.join(", ") || "a few details"}</p>
              </div>
            </div>
            <Link to="/student/profile"><Button size="sm">Complete profile <ArrowRight className="h-4 w-4" /></Button></Link>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: <UserIcon className="h-5 w-5" />, label: "Profile", value: profile.is_complete ? "Complete" : "Incomplete", to: "/student/profile" },
          { icon: <Briefcase className="h-5 w-5" />, label: "Applications", value: String(apps?.count ?? "—"), to: "/applications" },
          { icon: <Bookmark className="h-5 w-5" />, label: "Saved", value: String(saved?.count ?? "—"), to: "/saved" },
          { icon: <FileText className="h-5 w-5" />, label: "Current CV", value: current_cv ? `v${current_cv.version}` : "None", to: "/student/cv" },
        ].map((s, i) => (
          <Link key={i} to={s.to}>
            <Card className="transition-shadow hover:shadow-md">
              <CardBody className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">{s.icon}</div>
                <div>
                  <p className="text-sm text-slate-500">{s.label}</p>
                  <p className="font-semibold text-slate-900">{s.value}</p>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile completion checklist</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {[
              "full_name", "phone", "institution", "course", "study_level",
              profile.account_type === "student" ? "year_of_study" : "graduation_year",
            ].map(f => {
              const done = !missing.includes(f);
              return (
                <div key={f} className="flex items-center gap-2 text-sm">
                  {done
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : <span className="h-4 w-4 rounded-full border-2 border-slate-300" />}
                  <span className={done ? "text-slate-700" : "text-slate-400"}>{f.replace(/_/g, " ")}</span>
                </div>
              );
            })}
            <Link to="/student/profile"><Button variant="outline" size="sm" className="mt-3">Edit profile</Button></Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Current CV</CardTitle></CardHeader>
          <CardBody>
            {current_cv ? (
              <div className="text-sm">
                <p className="font-medium text-slate-900">{current_cv.original_name}</p>
                <p className="mt-1 text-slate-500">
                  v{current_cv.version} · {formatFileSize(current_cv.size)} · uploaded {formatDate(current_cv.uploaded_at)} · {current_cv.parsed_status}
                </p>
                <Link to="/student/cv"><Button variant="outline" size="sm" className="mt-3">Manage CVs</Button></Link>
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                <p>No CV uploaded yet. Uploading a CV strengthens your applications.</p>
                <Link to="/student/cv"><Button size="sm" className="mt-3">Upload CV</Button></Link>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Next actions</CardTitle></CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {nextActions.map(a => (
            <Link key={a.label} to={a.to} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50">
              <span className="font-medium text-slate-700">{a.label}</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
