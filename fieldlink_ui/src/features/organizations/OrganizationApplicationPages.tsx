import { Link, useParams, useSearchParams } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Users, Download } from "lucide-react";
import { useOrgApplications, useOrgApplicationDetail, useOrgAppChangeStatus, useOrgOpportunities, downloadCV } from "@/api/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, FormField } from "@/components/ui/Field";
import { LoadingState, ErrorState, EmptyState, SkeletonCard } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaginationControls } from "@/components/layout/PaginationControls";
import { StatusPill } from "@/components/layout/StatusPill";
import { DataTable } from "@/components/tables/DataTable";
import { EventsTimeline } from "@/features/shared/EventsTimeline";
import { useToast } from "@/components/ui/Toast";
import { normalizeError } from "@/api/errors";
import { formatDateTime } from "@/lib/utils";
import type { ApplicationStatus, OrganizationApplicationListItem } from "@/types";

const NEXT: Record<string, ApplicationStatus[]> = {
  submitted: ["reviewing", "rejected"],
  reviewing: ["shortlisted", "rejected"],
  shortlisted: ["interview", "accepted", "rejected"],
  interview: ["accepted", "rejected"],
  accepted: [], rejected: [], withdrawn: [],
};

export function OrganizationApplicationListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const opportunity = searchParams.get("opportunity") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page")) || 1;

  const { data, isLoading, isError } = useOrgApplications({
    status: status || undefined,
    opportunity: opportunity ? Number(opportunity) : undefined,
    search: search || undefined,
    page, page_size: 10,
  });
  const { data: opps } = useOrgOpportunities({ page_size: 100 });

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set(k, v); else next.delete(k);
    next.delete("page");
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Applications" description="Only applications sent to your organization. Never shared externally." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search applicant name…" value={search} onChange={e => setParam("search", e.target.value)} className="sm:max-w-xs" />
        <Select value={status} onChange={e => setParam("status", e.target.value)} className="sm:w-48">
          <option value="">All statuses</option>
          {["submitted", "reviewing", "shortlisted", "interview", "accepted", "rejected", "withdrawn"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select value={opportunity} onChange={e => setParam("opportunity", e.target.value)} className="sm:w-64">
          <option value="">All opportunities</option>
          {opps?.results.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <SkeletonCard key={i} />)}</div>
      ) : isError ? (
        <ErrorState title="Unable to load applications" description="Please try again." />
      ) : data && data.results.length > 0 ? (
        <Card>
          <DataTable<OrganizationApplicationListItem & { id: number }>
            data={data.results as (OrganizationApplicationListItem & { id: number })[]}
            columns={[
              { key: "applicant_name", header: "Applicant", render: r => <Link to={`/org/applications/${r.id}`} className="font-medium text-teal-700 hover:underline">{r.applicant_name}</Link> },
              { key: "opportunity_title", header: "Opportunity", render: r => r.opportunity_title },
              { key: "status", header: "Status", render: r => <StatusPill status={r.status} type="application" /> },
              { key: "submitted_at", header: "Submitted", render: r => formatDateTime(r.submitted_at) },
            ]}
          />
          <PaginationControls data={data} page={page} pageSize={10} onPageChange={p => setParam("page", String(p))} />
        </Card>
      ) : (
        <Card><CardBody>
          <EmptyState icon={<Users className="h-7 w-7" />} title="No applications yet" description="Applications to your opportunities will appear here." />
        </CardBody></Card>
      )}
    </div>
  );
}

export function OrganizationApplicationDetailPage() {
  const { id } = useParams();
  const appId = Number(id);
  const { data: app, isLoading, isError, refetch } = useOrgApplicationDetail(appId);
  const change = useOrgAppChangeStatus();
  const { show } = useToast();
  const [nextStatus, setNextStatus] = useState<ApplicationStatus | "">("");
  const [note, setNote] = useState("");
  const [downloading, setDownloading] = useState(false);

  if (isLoading) return <LoadingState label="Loading application…" />;
  if (isError || !app) {
    return (
      <ErrorState
        title="Application not found"
        description="Applications from other organizations return not-found."
        action={<Link to="/org/applications"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to applications</Button></Link>}
      />
    );
  }

  const allowed = NEXT[app.status] ?? [];

  const handleChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!nextStatus) { show("Choose the next status.", "error"); return; }
    try {
      await change.mutateAsync({ id: appId, status: nextStatus as ApplicationStatus, note });
      show(`Application moved to ${nextStatus}.`, "success");
      setNextStatus("");
      setNote("");
      refetch();
    } catch (err) {
      show(normalizeError(err).message, "error");
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/org/applications" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </Link>

      <PageHeader
        title={app.applicant_name}
        description={`${app.opportunity_title} · submitted ${formatDateTime(app.submitted_at)}`}
        actions={<StatusPill status={app.status} type="application" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Applicant</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-600">
            <p><span className="font-medium text-slate-900">Email:</span> {app.applicant.email}</p>
            <p><span className="font-medium text-slate-900">Phone:</span> {app.applicant.phone || "—"}</p>
            <p><span className="font-medium text-slate-900">Type:</span> {app.applicant.account_type} · {app.applicant.study_level || "—"}
              {app.applicant.year_of_study ? ` · year ${app.applicant.year_of_study}` : ""}
              {app.applicant.graduation_year ? ` · graduated ${app.applicant.graduation_year}` : ""}</p>
            <p><span className="font-medium text-slate-900">Education:</span> {app.applicant.institution ?? "—"} · {app.applicant.course ?? "—"}</p>
            {app.applicant.bio && <p className="whitespace-pre-wrap rounded bg-slate-50 px-3 py-2">{app.applicant.bio}</p>}
            {app.applicant.skills.length > 0 && (
              <p><span className="font-medium text-slate-900">Skills:</span> {app.applicant.skills.map(s => `${s.name} (${s.proficiency})`).join(", ")}</p>
            )}
            <div className="pt-2">
              <p className="font-medium text-slate-900">Cover letter</p>
              <p className="mt-1 whitespace-pre-wrap">{app.cover_letter || <span className="text-slate-400">None provided.</span>}</p>
            </div>
            {app.cv ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="font-medium text-slate-700">{app.cv.original_name} (v{app.cv.version})</span>
                <Button
                  variant="outline" size="sm" loading={downloading}
                  onClick={async () => {
                    setDownloading(true);
                    try { await downloadCV(app.cv!.id, app.cv!.original_name); }
                    catch (err) { show(normalizeError(err).message, "error"); }
                    finally { setDownloading(false); }
                  }}
                >
                  <Download className="h-4 w-4" /> Download CV
                </Button>
              </div>
            ) : (
              <p className="text-slate-400">No CV attached.</p>
            )}
            <p className="text-xs text-slate-400">Only the CV attached to this application is visible — never other CVs.</p>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Change status</CardTitle></CardHeader>
            <CardBody>
              {allowed.length === 0 ? (
                <p className="text-sm text-slate-500">No further transitions from <span className="font-medium">{app.status}</span>. Organizations cannot withdraw applications.</p>
              ) : (
                <form onSubmit={handleChange} className="space-y-3">
                  <FormField label="Next status" required hint={`Valid next: ${allowed.join(", ")}`}>
                    <Select value={nextStatus} onChange={e => setNextStatus(e.target.value as ApplicationStatus)}>
                      <option value="">Select…</option>
                      {allowed.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Note" hint="Encouraged for rejections; recorded in history.">
                    <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Strong academic background…" />
                  </FormField>
                  <Button type="submit" loading={change.isPending}>Update status</Button>
                </form>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Event history</CardTitle></CardHeader>
            <CardBody><EventsTimeline events={app.events} /></CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
