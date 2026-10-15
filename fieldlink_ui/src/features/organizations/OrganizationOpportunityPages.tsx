import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Plus, Briefcase } from "lucide-react";
import {
  useOrgOpportunities, useOrgOpportunityDetail, useCreateOrgOpportunity,
  useUpdateOrgOpportunity, useDeleteOrgOpportunity, useOrgOppAction,
  useOpportunityTypes, useLocations, useCourses, useSkills,
} from "@/api/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, TextArea, FormField, Checkbox } from "@/components/ui/Field";
import { LoadingState, ErrorState, EmptyState, SkeletonCard } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaginationControls } from "@/components/layout/PaginationControls";
import { StatusPill } from "@/components/layout/StatusPill";
import { DataTable } from "@/components/tables/DataTable";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { normalizeError } from "@/api/errors";
import { formatDate } from "@/lib/utils";
import type { OrganizationOpportunity } from "@/types";

export function OrganizationOpportunityListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page")) || 1;
  const { data, isLoading, isError } = useOrgOpportunities({
    status: status || undefined, search: search || undefined, page, page_size: 10,
  });
  const [q, setQ] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (q) next.set("search", q); else next.delete("search");
      next.delete("page");
      setSearchParams(next);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set(k, v); else next.delete(k);
    next.delete("page");
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        description="Manage every status: draft, pending, published, closed, expired, archived, suspended."
        actions={<Link to="/org/opportunities/new"><Button><Plus className="h-4 w-4" /> New opportunity</Button></Link>}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search by title…" value={q} onChange={e => setQ(e.target.value)} className="sm:max-w-xs" />
        <Select value={status} onChange={e => setParam("status", e.target.value)} className="sm:w-56">
          <option value="">All statuses</option>
          {["draft", "pending_review", "published", "closed", "expired", "archived", "suspended"].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <SkeletonCard key={i} />)}</div>
      ) : isError ? (
        <ErrorState title="Unable to load opportunities" description="Create your organization profile first, then try again." />
      ) : data && data.results.length > 0 ? (
        <Card>
          <DataTable<OrganizationOpportunity & { id: number }>
            data={data.results as (OrganizationOpportunity & { id: number })[]}
            onRowClick={row => navigate(`/org/opportunities/${row.id}`)}
            columns={[
              { key: "title", header: "Title", render: r => <span className="font-medium text-slate-900">{r.title}</span> },
              { key: "status", header: "Status", render: r => <StatusPill status={r.status} /> },
              { key: "deadline", header: "Deadline", render: r => formatDate(r.deadline) },
              { key: "application_count", header: "Applicants", render: r => String(r.application_count ?? 0), className: "text-right" },
            ]}
          />
          <PaginationControls data={data} page={page} pageSize={10} onPageChange={p => setParam("page", String(p))} />
        </Card>
      ) : (
        <Card><CardBody>
          <EmptyState
            icon={<Briefcase className="h-7 w-7" />} title="No opportunities yet"
            description="Create a draft, then submit it for review."
            action={<Link to="/org/opportunities/new"><Button>New opportunity</Button></Link>}
          />
        </CardBody></Card>
      )}
    </div>
  );
}

// ─── Shared opportunity form ─────────────────────────────────────────────────
function OpportunityForm({ initial, onSubmit, pending }: {
  initial?: Partial<OrganizationOpportunity>;
  pending?: boolean;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}) {
  const { data: types } = useOpportunityTypes();
  const { data: locations } = useLocations();
  const { data: courses } = useCourses();
  const { data: skills } = useSkills();

  const [form, setForm] = useState({
    opportunity_type: initial?.opportunity_type ? String(initial.opportunity_type) : "",
    title: initial?.title ?? "", description: initial?.description ?? "",
    location: initial?.location ? String(initial.location) : "",
    is_remote: initial?.is_remote ?? false,
    duration_months: initial?.duration_months ? String(initial.duration_months) : "",
    start_date: initial?.start_date ?? "", deadline: initial?.deadline ?? "",
    positions: String(initial?.positions ?? 1), is_paid: initial?.is_paid ?? false,
    min_study_level: initial?.requirements?.min_study_level ?? "",
    min_year_of_study: initial?.requirements?.min_year_of_study ? String(initial.requirements.min_year_of_study) : "",
    students_eligible: initial?.requirements?.students_eligible ?? true,
    graduates_eligible: initial?.requirements?.graduates_eligible ?? true,
    eligibility_notes: initial?.requirements?.eligibility_notes ?? "",
    courseIds: (initial?.requirements?.courses ?? []).map(String),
    skillIds: (initial?.requirements?.skills ?? []).map(String),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { show } = useToast();
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v } as typeof form));

  const toggleId = (key: "courseIds" | "skillIds", id: string) =>
    setForm(f => ({ ...f, [key]: f[key].includes(id) ? f[key].filter(x => x !== id) : [...f[key], id] }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!form.students_eligible && !form.graduates_eligible) {
      setErrors({ requirements: "Allow students, graduates, or both." });
      return;
    }
    const payload: Record<string, unknown> = {
      opportunity_type: Number(form.opportunity_type),
      title: form.title, description: form.description,
      location: form.is_remote ? (form.location ? Number(form.location) : null) : (form.location ? Number(form.location) : null),
      is_remote: form.is_remote,
      duration_months: form.duration_months ? Number(form.duration_months) : null,
      start_date: form.start_date || null,
      deadline: form.deadline,
      positions: Number(form.positions) || 1,
      is_paid: form.is_paid,
      requirements: {
        courses: form.courseIds.map(Number),
        skills: form.skillIds.map(Number),
        min_study_level: form.min_study_level || "",
        min_year_of_study: form.min_year_of_study ? Number(form.min_year_of_study) : null,
        students_eligible: form.students_eligible,
        graduates_eligible: form.graduates_eligible,
        eligibility_notes: form.eligibility_notes,
      },
    };
    try {
      await onSubmit(payload);
    } catch (err) {
      const ne = normalizeError(err);
      const fe: Record<string, string> = {};
      for (const [k, v] of Object.entries(ne.fieldErrors)) {
        if (Array.isArray(v) && v.length) fe[k] = String(v[0]);
      }
      setErrors(fe);
      show(ne.message, "error");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Opportunity type" required error={errors.opportunity_type}>
          <Select value={form.opportunity_type} onChange={e => set("opportunity_type", e.target.value)} error={!!errors.opportunity_type}>
            <option value="">Select…</option>
            {types?.results.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Positions" required error={errors.positions} hint="At least 1.">
          <Input type="number" min={1} value={form.positions} onChange={e => set("positions", e.target.value)} />
        </FormField>
      </div>
      <FormField label="Title" required error={errors.title}>
        <Input value={form.title} onChange={e => set("title", e.target.value)} error={!!errors.title} placeholder="Software Engineering Internship" />
      </FormField>
      <FormField label="Description" required error={errors.description}>
        <TextArea rows={5} value={form.description} onChange={e => set("description", e.target.value)} error={!!errors.description} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Location" error={errors.location} hint={form.is_remote ? "Optional for remote." : "Required for on-site."}>
          <Select value={form.location} onChange={e => set("location", e.target.value)}>
            <option value="">Select…</option>
            {locations?.results.map(l => <option key={l.id} value={l.id}>{l.name}, {l.region}</option>)}
          </Select>
        </FormField>
        <FormField label="Deadline" required error={errors.deadline} hint="YYYY-MM-DD, not in the past.">
          <Input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} error={!!errors.deadline} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Start date" error={errors.start_date} hint="Must not be before the deadline.">
          <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
        </FormField>
        <FormField label="Duration (months)" error={errors.duration_months} hint="1–60.">
          <Input type="number" min={1} max={60} value={form.duration_months} onChange={e => set("duration_months", e.target.value)} />
        </FormField>
        <div className="flex items-end gap-4 pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-700"><Checkbox checked={form.is_remote} onChange={e => set("is_remote", e.target.checked)} /> Remote</label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><Checkbox checked={form.is_paid} onChange={e => set("is_paid", e.target.checked)} /> Paid</label>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Minimum study level">
          <Select value={form.min_study_level} onChange={e => set("min_study_level", e.target.value)}>
            <option value="">No minimum</option>
            <option value="certificate">Certificate</option>
            <option value="diploma">Diploma</option>
            <option value="bachelor">Bachelor</option>
            <option value="masters">Masters</option>
            <option value="phd">PhD</option>
          </Select>
        </FormField>
        <FormField label="Minimum year of study" hint="1–8, blank for none.">
          <Input type="number" min={1} max={8} value={form.min_year_of_study} onChange={e => set("min_year_of_study", e.target.value)} />
        </FormField>
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700"><Checkbox checked={form.students_eligible} onChange={e => set("students_eligible", e.target.checked)} /> Students eligible</label>
        <label className="flex items-center gap-2 text-sm text-slate-700"><Checkbox checked={form.graduates_eligible} onChange={e => set("graduates_eligible", e.target.checked)} /> Graduates eligible</label>
      </div>
      {errors.requirements && <p className="text-xs text-red-600">{errors.requirements}</p>}
      <FormField label="Eligibility notes">
        <TextArea rows={2} value={form.eligibility_notes} onChange={e => set("eligibility_notes", e.target.value)} placeholder="Open to second-year students and above." />
      </FormField>
      <FormField label="Relevant courses (informational)">
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {(courses?.results ?? []).map(c => (
            <button type="button" key={c.id} onClick={() => toggleId("courseIds", String(c.id))}
              className={`rounded-full px-2.5 py-1 text-xs ${form.courseIds.includes(String(c.id)) ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              {c.name}
            </button>
          ))}
        </div>
      </FormField>
      <FormField label="Useful skills (informational)">
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {(skills?.results ?? []).map(s => (
            <button type="button" key={s.id} onClick={() => toggleId("skillIds", String(s.id))}
              className={`rounded-full px-2.5 py-1 text-xs ${form.skillIds.includes(String(s.id)) ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              {s.name}
            </button>
          ))}
        </div>
      </FormField>
      <Button type="submit" loading={pending}>Save opportunity</Button>
    </form>
  );
}

export function OrganizationOpportunityFormPage({ mode }: { mode: "new" | "edit" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { show } = useToast();
  const create = useCreateOrgOpportunity();
  const update = useUpdateOrgOpportunity();
  const { data: existing, isLoading } = useOrgOpportunityDetail(mode === "edit" ? Number(id) : 0);

  const initial = useMemo(() => {
    if (mode === "new" || !existing) return undefined;
    return {
      ...existing,
      requirements: {
        courses: existing.requirements?.courses ?? [],
        skills: existing.requirements?.skills ?? [],
        min_study_level: existing.requirements?.min_study_level ?? "",
        min_year_of_study: existing.requirements?.min_year_of_study ?? null,
        students_eligible: existing.requirements?.students_eligible ?? true,
        graduates_eligible: existing.requirements?.graduates_eligible ?? true,
        eligibility_notes: existing.requirements?.eligibility_notes ?? "",
      },
    };
  }, [mode, existing]);

  if (mode === "edit" && isLoading) return <LoadingState label="Loading opportunity…" />;
  if (mode === "edit" && existing && existing.status !== "draft") {
    return (
      <ErrorState
        title="Only drafts can be edited"
        description={`This opportunity is ${existing.status}. Unpublish it first if the lifecycle allows.`}
        action={<Link to={`/org/opportunities/${id}`}><Button variant="outline">Back to detail</Button></Link>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={mode === "new" ? "New opportunity" : "Edit opportunity"} description={mode === "new" ? "New opportunities always start as draft." : "Only draft opportunities can be edited."} />
      <Card><CardBody>
        <OpportunityForm
          key={mode === "edit" ? existing?.id : "new"}
          initial={initial}
          pending={create.isPending || update.isPending}
          onSubmit={async (data) => {
            if (mode === "new") {
              const created = await create.mutateAsync(data as never);
              show("Draft created.", "success");
              navigate(`/org/opportunities/${created.id}`);
            } else {
              await update.mutateAsync({ id: Number(id), data: data as never });
              show("Opportunity updated.", "success");
              navigate(`/org/opportunities/${id}`);
            }
          }}
        />
      </CardBody></Card>
    </div>
  );
}

export function OrganizationOpportunityDetailPage() {
  const { id } = useParams();
  const oppId = Number(id);
  const navigate = useNavigate();
  const { show } = useToast();
  const { confirm } = useConfirm();
  const { data: opp, isLoading, isError, refetch } = useOrgOpportunityDetail(oppId);
  const action = useOrgOppAction();
  const remove = useDeleteOrgOpportunity();

  if (isLoading) return <LoadingState label="Loading opportunity…" />;
  if (isError || !opp) {
    return (
      <ErrorState
        title="Opportunity not found"
        description="It may belong to another organization or have been deleted."
        action={<Link to="/org/opportunities"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to list</Button></Link>}
      />
    );
  }

  const doAction = (a: "submit" | "unpublish" | "close" | "archive", label: string) => {
    confirm({
      title: `${label} this opportunity?`,
      message:
        a === "submit" ? "Submitting sends it to pending review. Note: verified organizations do NOT auto-publish in this MVP."
        : a === "archive" ? "Archived opportunities leave the active pipeline."
        : a === "close" ? "Closing stops new applications."
        : "Unpublishing returns it to draft.",
      confirmLabel: label,
      onConfirm: async () => {
        try {
          await action.mutateAsync({ id: oppId, action: a });
          show(`${label} successful.`, "success");
          refetch();
        } catch (err) {
          show(normalizeError(err).message, "error");
        }
      },
    });
  };

  const lifecycle: { action: "submit" | "unpublish" | "close" | "archive"; label: string }[] = [];
  if (opp.status === "draft") { lifecycle.push({ action: "submit", label: "Submit for review" }); lifecycle.push({ action: "archive", label: "Archive" }); }
  if (opp.status === "pending_review" || opp.status === "published") lifecycle.push({ action: "unpublish", label: "Unpublish to draft" });
  if (opp.status === "published") lifecycle.push({ action: "close", label: "Close" });
  if (opp.status === "closed" || opp.status === "expired") lifecycle.push({ action: "archive", label: "Archive" });

  return (
    <div className="space-y-6">
      <Link to="/org/opportunities" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to opportunities
      </Link>

      <PageHeader
        title={opp.title}
        description={`Deadline ${formatDate(opp.deadline)} · ${opp.application_count} application${opp.application_count === 1 ? "" : "s"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusPill status={opp.status} />
            {opp.status === "draft" && <Link to={`/org/opportunities/${opp.id}/edit`}><Button variant="outline" size="sm">Edit</Button></Link>}
            {lifecycle.map(l => (
              <Button key={l.action} size="sm" variant={l.action === "archive" ? "danger" : "primary"} loading={action.isPending} onClick={() => doAction(l.action, l.label)}>
                {l.label}
              </Button>
            ))}
            {opp.status === "draft" && (opp.application_count ?? 0) === 0 && (
              <Button size="sm" variant="ghost" onClick={() => confirm({
                title: "Delete this draft?", message: "Only drafts without applications can be deleted.", confirmLabel: "Delete", variant: "danger",
                onConfirm: async () => {
                  try { await remove.mutateAsync(oppId); show("Deleted.", "info"); navigate("/org/opportunities"); }
                  catch (err) { show(normalizeError(err).message, "error"); }
                },
              })}>
                Delete
              </Button>
            )}
          </div>
        }
      />

      {opp.moderation_note && (
        <Card><CardBody className="bg-amber-50 rounded-xl text-sm text-amber-800">
          <span className="font-medium">Moderation note:</span> {opp.moderation_note}
        </CardBody></Card>
      )}

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardBody className="space-y-2 text-sm text-slate-600">
          <p className="whitespace-pre-wrap text-slate-700">{opp.description}</p>
          <p>Remote: {opp.is_remote ? "Yes" : "No"} · Location: {opp.location ?? "—"} · Paid: {opp.is_paid ? "Yes" : "No"}</p>
          <p>Positions: {opp.positions} · Duration: {opp.duration_months ?? "—"} months · Start: {opp.start_date ?? "—"}</p>
          <p>Published: {opp.published_at ?? "—"} · Created: {formatDate(opp.created_at)} · Updated: {formatDate(opp.updated_at)}</p>
          <p>Eligibility: students {opp.requirements?.students_eligible ? "yes" : "no"} · graduates {opp.requirements?.graduates_eligible ? "yes" : "no"} · min level {opp.requirements?.min_study_level || "none"} · min year {opp.requirements?.min_year_of_study ?? "—"}</p>
          {opp.requirements?.eligibility_notes && <p className="rounded bg-slate-50 px-3 py-2">{opp.requirements.eligibility_notes}</p>}
        </CardBody>
      </Card>
    </div>
  );
}
