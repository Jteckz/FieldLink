import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { useStudentApplications, useStudentApplicationDetail, useWithdrawApplication, downloadCV } from "@/api/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { LoadingState, ErrorState, EmptyState, SkeletonCard } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaginationControls } from "@/components/layout/PaginationControls";
import { StatusPill } from "@/components/layout/StatusPill";
import { EventsTimeline } from "@/features/shared/EventsTimeline";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { normalizeError } from "@/api/errors";
import { formatDateTime } from "@/lib/utils";
import { useState } from "react";

export function StudentApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const page = Number(searchParams.get("page")) || 1;
  const { data, isLoading, isError } = useStudentApplications({
    status: status || undefined, page, page_size: 10,
  });

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set(k, v); else next.delete(k);
    next.delete("page");
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Applications"
        description="Track every application and its full status history."
        actions={
          <Select value={status} onChange={e => setParam("status", e.target.value)} className="w-48">
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="reviewing">Reviewing</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview">Interview</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </Select>
        }
      />

      {isLoading ? (
        <div className="space-y-4">{[1, 2].map(i => <SkeletonCard key={i} />)}</div>
      ) : isError ? (
        <ErrorState title="Unable to load applications" description="Please try again." />
      ) : data && data.results.length > 0 ? (
        <div className="space-y-4">
          {data.results.map(a => (
            <Link key={a.id} to={`/applications/${a.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{a.opportunity.title}</p>
                    <p className="text-sm text-slate-500">{a.opportunity.organization.name} · submitted {formatDateTime(a.submitted_at)}</p>
                  </div>
                  <StatusPill status={a.status} type="application" />
                </CardBody>
              </Card>
            </Link>
          ))}
          <Card>
            <PaginationControls data={data} page={page} pageSize={10} onPageChange={p => setParam("page", String(p))} />
          </Card>
        </div>
      ) : (
        <Card><CardBody>
          <EmptyState
            icon={<FileText className="h-7 w-7" />}
            title="No applications yet"
            description="Find an opportunity and submit your first application."
            action={<Link to="/opportunities"><Button>Browse opportunities</Button></Link>}
          />
        </CardBody></Card>
      )}
    </div>
  );
}

export function StudentApplicationDetailPage() {
  const { id } = useParams();
  const appId = Number(id);
  const { data: app, isLoading, isError, refetch } = useStudentApplicationDetail(appId);
  const withdraw = useWithdrawApplication();
  const { show } = useToast();
  const { confirm } = useConfirm();
  const [downloading, setDownloading] = useState(false);

  if (isLoading) return <LoadingState label="Loading application…" />;
  if (isError || !app) {
    return (
      <ErrorState
        title="Application not found"
        description="It may have been removed or belong to another account."
        action={<Link to="/applications"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to applications</Button></Link>}
      />
    );
  }

  const withdrawable = app.status === "submitted" || app.status === "reviewing";

  const handleWithdraw = () => {
    confirm({
      title: "Withdraw application?",
      message: "Withdrawing is permanent — a withdrawn application still counts as applied and cannot be resubmitted.",
      confirmLabel: "Withdraw",
      variant: "danger",
      onConfirm: async () => {
        try {
          await withdraw.mutateAsync(appId);
          show("Application withdrawn.", "info");
          refetch();
        } catch (err) {
          show(normalizeError(err).message, "error");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <Link to="/applications" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </Link>

      <PageHeader
        title={app.opportunity.title}
        description={`${app.opportunity.organization.name} · submitted ${formatDateTime(app.submitted_at)}`}
        actions={
          <>
            <StatusPill status={app.status} type="application" />
            {withdrawable && (
              <Button variant="danger" size="sm" onClick={handleWithdraw} loading={withdraw.isPending}>Withdraw</Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Cover letter & CV snapshot</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <p className="whitespace-pre-wrap text-sm text-slate-700">{app.cover_letter || <span className="text-slate-400">No cover letter provided.</span>}</p>
            {app.cv ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
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
                  <Download className="h-4 w-4" /> Download
                </Button>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No CV attached to this application.</p>
            )}
            <p className="text-xs text-slate-400">Uploading a newer CV does not rewrite this snapshot.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Status history</CardTitle></CardHeader>
          <CardBody><EventsTimeline events={app.events} /></CardBody>
        </Card>
      </div>
    </div>
  );
}
