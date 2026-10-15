import { Link } from "react-router-dom";
import { Users, Building2, Briefcase, FileText, ArrowRight } from "lucide-react";
import { useAdminStats } from "@/api/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";

function zeroed(record: Record<string, number> | undefined, keys: string[]): [string, number][] {
  return keys.map(k => [k, record?.[k] ?? 0]);
}

export function AdminDashboardPage() {
  const { data: stats, isLoading, isError } = useAdminStats();

  if (isLoading) return <LoadingState label="Loading platform statistics…" />;
  if (isError || !stats) return <ErrorState title="Unable to load statistics" description="Please try again." />;

  const cards = [
    { icon: <Users className="h-5 w-5" />, label: "Users", value: stats.users.total, to: "/admin/users", sub: `${stats.users.suspended} suspended` },
    { icon: <Building2 className="h-5 w-5" />, label: "Organizations", value: stats.organizations.total, to: "/admin/organizations", sub: "by verification below" },
    { icon: <Briefcase className="h-5 w-5" />, label: "Opportunities", value: stats.opportunities.total, to: "/admin/opportunities", sub: "by status below" },
    { icon: <FileText className="h-5 w-5" />, label: "Applications", value: stats.applications.total, to: "/admin/audit-log", sub: "by status below" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Overview" description="Totals and breakdowns. Missing buckets mean zero." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <Link key={i} to={c.to}>
            <Card className="transition-shadow hover:shadow-md">
              <CardBody className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-white">{c.icon}</div>
                <div>
                  <p className="text-sm text-slate-500">{c.label}</p>
                  <p className="text-xl font-bold text-slate-900">{c.value}</p>
                  <p className="text-xs text-slate-400">{c.sub}</p>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Users by role</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {zeroed(stats.users.by_role, ["student", "organization", "admin", "university"]).map(([k, v]) => (
              <BreakdownRow key={k} label={k} value={v} total={stats.users.total} />
            ))}
            <BreakdownRow label="suspended" value={stats.users.suspended} total={stats.users.total} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Organizations by verification</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {zeroed(stats.organizations.by_verification_status, ["verified", "pending", "unverified", "rejected"]).map(([k, v]) => (
              <BreakdownRow key={k} label={k} value={v} total={stats.organizations.total} />
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Opportunities by status</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {zeroed(stats.opportunities.by_status, ["draft", "pending_review", "published", "closed", "expired", "archived", "suspended"]).map(([k, v]) => (
              <BreakdownRow key={k} label={k.replace(/_/g, " ")} value={v} total={stats.opportunities.total} />
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Applications by status</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {zeroed(stats.applications.by_status, ["submitted", "reviewing", "shortlisted", "interview", "accepted", "rejected", "withdrawn"]).map(([k, v]) => (
              <BreakdownRow key={k} label={k} value={v} total={stats.applications.total} />
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Review queues</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link to="/admin/users" className="link-teal inline-flex items-center gap-1">Users <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Link to="/admin/organizations" className="link-teal inline-flex items-center gap-1">Organizations <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Link to="/admin/opportunities" className="link-teal inline-flex items-center gap-1">Opportunities <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Link to="/admin/audit-log" className="link-teal inline-flex items-center gap-1">Audit log <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function BreakdownRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-32 shrink-0 font-medium text-slate-700">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-800" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 shrink-0 text-right text-slate-500">{value} ({pct}%)</span>
    </div>
  );
}
