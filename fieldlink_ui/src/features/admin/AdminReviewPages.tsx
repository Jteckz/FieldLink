import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useAdminUsers, useAdminUserDetail, useAdminUserAction,
  useAdminOrganizations, useAdminOrgDetail, useAdminOrgAction,
  useAdminOpportunities, useAdminOppDetail, useAdminOppAction,
  useAdminAuditLog,
} from "@/api/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { LoadingState, ErrorState, EmptyState, SkeletonCard } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaginationControls } from "@/components/layout/PaginationControls";
import { StatusPill } from "@/components/layout/StatusPill";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/tables/DataTable";
import { NoteForm } from "@/features/shared/NoteForm";
import { useToast } from "@/components/ui/Toast";
import { normalizeError } from "@/api/errors";
import { formatDateTime } from "@/lib/utils";
import type { AdminUser, AdminOrganization, AdminOpportunity } from "@/types";

function usePageParams() {
  const [sp, setSp] = useSearchParams();
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v); else next.delete(k);
    next.delete("page");
    setSp(next);
  };
  return { sp, set, page: Number(sp.get("page")) || 1 };
}

function DetailShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Users ───────────────────────────────────────────────────────────────────
export function AdminUsersPage() {
  const { sp, set, page } = usePageParams();
  const role = sp.get("role") ?? "";
  const search = sp.get("search") ?? "";
  const isActive = sp.get("is_active") ?? "";
  const { data, isLoading, isError, refetch } = useAdminUsers({
    role: role || undefined, search: search || undefined,
    is_active: isActive || undefined, page, page_size: 15,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const { data: detail } = useAdminUserDetail(selected ?? 0);
  const action = useAdminUserAction();
  const { show } = useToast();

  const run = async (id: number, a: "suspend" | "reactivate", note: string) => {
    try {
      await action.mutateAsync({ id, action: a, note });
      show(`User ${a === "suspend" ? "suspended" : "reactivated"}.`, "success");
      refetch();
    } catch (err) {
      show(normalizeError(err).message, "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Suspend or reactivate non-admin users. Admin accounts are protected." />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search email…" value={search} onChange={e => set("search", e.target.value)} className="sm:max-w-xs" />
        <Select value={role} onChange={e => set("role", e.target.value)} className="sm:w-48">
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="organization">Organization</option>
          <option value="admin">Admin</option>
        </Select>
        <Select value={isActive} onChange={e => set("is_active", e.target.value)} className="sm:w-48">
          <option value="">Any state</option>
          <option value="true">Active</option>
          <option value="false">Suspended</option>
        </Select>
      </div>

      {isLoading ? <SkeletonCard /> : isError ? (
        <ErrorState title="Unable to load users" description="Please try again." />
      ) : data && data.results.length > 0 ? (
        <Card>
          <DataTable<AdminUser & { id: number }>
            data={data.results as (AdminUser & { id: number })[]}
            onRowClick={r => setSelected(r.id)}
            columns={[
              { key: "email", header: "Email", render: r => <span className="font-medium text-slate-900">{r.email}</span> },
              { key: "role", header: "Role", render: r => <Badge>{r.role}</Badge> },
              { key: "is_active", header: "State", render: r => <Badge variant={r.is_active ? "success" : "error"}>{r.is_active ? "Active" : "Suspended"}</Badge> },
              { key: "date_joined", header: "Joined", render: r => formatDateTime(r.date_joined) },
            ]}
          />
          <PaginationControls data={data} page={page} pageSize={15} onPageChange={p => set("page", String(p))} />
        </Card>
      ) : (
        <Card><CardBody><EmptyState title="No users found" description="Try adjusting filters." /></CardBody></Card>
      )}

      {selected !== null && (
        <DetailShell title="User detail" onClose={() => setSelected(null)}>
          {!detail ? <LoadingState /> : (
            <div className="space-y-4 text-sm">
              <p><span className="font-medium">Email:</span> {detail.email}</p>
              <p><span className="font-medium">Role:</span> {detail.role} · {detail.is_active ? "Active" : "Suspended"}</p>
              <p><span className="font-medium">Joined:</span> {formatDateTime(detail.date_joined)} · <span className="font-medium">Last login:</span> {detail.last_login ? formatDateTime(detail.last_login) : "—"}</p>
              {detail.role === "admin" ? (
                <p className="rounded bg-slate-100 px-3 py-2 text-slate-500">Admin and superuser accounts cannot be suspended.</p>
              ) : (
                <NoteForm
                  label={detail.is_active ? "Suspend reason" : "Reactivate note"}
                  placeholder="Reason for the audit log…"
                  confirmLabel={detail.is_active ? "Suspend user" : "Reactivate user"}
                  pending={action.isPending}
                  onSubmit={note => run(detail.id, detail.is_active ? "suspend" : "reactivate", note)}
                />
              )}
            </div>
          )}
        </DetailShell>
      )}
    </div>
  );
}

// ─── Organizations ───────────────────────────────────────────────────────────
export function AdminOrganizationsPage() {
  const { sp, set, page } = usePageParams();
  const vs = sp.get("verification_status") ?? "";
  const search = sp.get("search") ?? "";
  const { data, isLoading, isError, refetch } = useAdminOrganizations({
    verification_status: vs || undefined, search: search || undefined, page, page_size: 15,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const { data: detail } = useAdminOrgDetail(selected ?? 0);
  const action = useAdminOrgAction();
  const { show } = useToast();

  const run = async (id: number, a: "approve" | "reject" | "suspend" | "reactivate", note: string) => {
    try {
      await action.mutateAsync({ id, action: a, note });
      show(`Organization ${a}d.`, "success");
      refetch();
    } catch (err) {
      show(normalizeError(err).message, "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Organizations" description="Verify, reject (note required), suspend, or reactivate." />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search name or registration no…" value={search} onChange={e => set("search", e.target.value)} className="sm:max-w-xs" />
        <Select value={vs} onChange={e => set("verification_status", e.target.value)} className="sm:w-56">
          <option value="">All verification states</option>
          {["unverified", "pending", "verified", "rejected"].map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      {isLoading ? <SkeletonCard /> : isError ? (
        <ErrorState title="Unable to load organizations" description="Please try again." />
      ) : data && data.results.length > 0 ? (
        <Card>
          <DataTable<AdminOrganization & { id: number }>
            data={data.results as (AdminOrganization & { id: number })[]}
            onRowClick={r => setSelected(r.id)}
            columns={[
              { key: "name", header: "Name", render: r => <span className="font-medium text-slate-900">{r.name}</span> },
              { key: "verification_status", header: "Verification", render: r => <StatusPill status={r.verification_status} type="verification" /> },
              { key: "is_active", header: "Active", render: r => <Badge variant={r.is_active ? "success" : "error"}>{r.is_active ? "Yes" : "No"}</Badge> },
              { key: "owner_email", header: "Owner", render: r => r.owner_email ?? "—" },
            ]}
          />
          <PaginationControls data={data} page={page} pageSize={15} onPageChange={p => set("page", String(p))} />
        </Card>
      ) : (
        <Card><CardBody><EmptyState title="No organizations found" description="Try adjusting filters." /></CardBody></Card>
      )}

      {selected !== null && (
        <DetailShell title="Organization review" onClose={() => setSelected(null)}>
          {!detail ? <LoadingState /> : (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-900">{detail.name}</p>
                <p className="text-slate-500">{detail.description}</p>
                <p className="mt-1 text-slate-500">Reg: {detail.registration_number || "—"} · Owner: {detail.owner_email ?? "—"}</p>
                <p className="text-slate-500">Contact: {detail.contact_email} · {detail.contact_phone || "—"} · {detail.website || "—"}</p>
                {detail.verification_notes && <p className="mt-2 rounded bg-slate-50 px-3 py-2">Reviewer note: {detail.verification_notes}</p>}
                <div className="mt-2 flex gap-2"><StatusPill status={detail.verification_status} type="verification" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="mb-2 font-medium">Approve (pending → verified)</p>
                  <NoteForm confirmLabel="Approve" pending={action.isPending} onSubmit={n => run(detail.id, "approve", n)} />
                </div>
                <div className="rounded-lg border p-3">
                  <p className="mb-2 font-medium">Reject (note required)</p>
                  <NoteForm required confirmLabel="Reject" pending={action.isPending} onSubmit={n => run(detail.id, "reject", n)} />
                </div>
                <div className="rounded-lg border p-3">
                  <p className="mb-2 font-medium">Suspend (toggles active)</p>
                  <NoteForm confirmLabel="Suspend" pending={action.isPending} onSubmit={n => run(detail.id, "suspend", n)} />
                </div>
                <div className="rounded-lg border p-3">
                  <p className="mb-2 font-medium">Reactivate</p>
                  <NoteForm confirmLabel="Reactivate" pending={action.isPending} onSubmit={n => run(detail.id, "reactivate", n)} />
                </div>
              </div>
            </div>
          )}
        </DetailShell>
      )}
    </div>
  );
}

// ─── Opportunities ───────────────────────────────────────────────────────────
export function AdminOpportunitiesPage() {
  const { sp, set, page } = usePageParams();
  const st = sp.get("status") ?? "";
  const search = sp.get("search") ?? "";
  const { data, isLoading, isError, refetch } = useAdminOpportunities({
    status: st || undefined, search: search || undefined, page, page_size: 15,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const { data: detail } = useAdminOppDetail(selected ?? 0);
  const action = useAdminOppAction();
  const { show } = useToast();

  const run = async (id: number, a: "approve" | "reject" | "suspend", note: string) => {
    try {
      await action.mutateAsync({ id, action: a, note });
      show(`Opportunity ${a}d.`, "success");
      refetch();
    } catch (err) {
      show(normalizeError(err).message, "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Opportunities" description="Approve (publish), reject to draft (note required), or suspend (note required)." />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search title or organization…" value={search} onChange={e => set("search", e.target.value)} className="sm:max-w-xs" />
        <Select value={st} onChange={e => set("status", e.target.value)} className="sm:w-56">
          <option value="">All statuses</option>
          {["draft", "pending_review", "published", "closed", "expired", "archived", "suspended"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </Select>
      </div>

      {isLoading ? <SkeletonCard /> : isError ? (
        <ErrorState title="Unable to load opportunities" description="Please try again." />
      ) : data && data.results.length > 0 ? (
        <Card>
          <DataTable<AdminOpportunity & { id: number }>
            data={data.results as (AdminOpportunity & { id: number })[]}
            onRowClick={r => setSelected(r.id)}
            columns={[
              { key: "title", header: "Title", render: r => <span className="font-medium text-slate-900">{r.title}</span> },
              { key: "organization_name", header: "Organization", render: r => r.organization_name },
              { key: "status", header: "Status", render: r => <StatusPill status={r.status} /> },
              { key: "deadline", header: "Deadline", render: r => r.deadline },
            ]}
          />
          <PaginationControls data={data} page={page} pageSize={15} onPageChange={p => set("page", String(p))} />
        </Card>
      ) : (
        <Card><CardBody><EmptyState title="No opportunities found" description="Try adjusting filters." /></CardBody></Card>
      )}

      {selected !== null && (
        <DetailShell title="Opportunity moderation" onClose={() => setSelected(null)}>
          {!detail ? <LoadingState /> : (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-900">{detail.title}</p>
                <p className="text-slate-500">{detail.organization_name} · {detail.type_name} · {detail.positions} positions · deadline {detail.deadline}</p>
                <p className="mt-2 whitespace-pre-wrap text-slate-700">{detail.description}</p>
                {detail.moderation_note && <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-amber-800">Moderation: {detail.moderation_note}</p>}
                <div className="mt-2 flex gap-2"><StatusPill status={detail.status} />
                  <Badge>Published: {detail.published_at ?? "—"}</Badge></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="mb-2 font-medium">Approve → published</p>
                  <NoteForm confirmLabel="Approve" pending={action.isPending} onSubmit={n => run(detail.id, "approve", n)} />
                </div>
                <div className="rounded-lg border p-3">
                  <p className="mb-2 font-medium">Reject → draft</p>
                  <NoteForm required confirmLabel="Reject" pending={action.isPending} onSubmit={n => run(detail.id, "reject", n)} />
                </div>
                <div className="rounded-lg border p-3">
                  <p className="mb-2 font-medium">Suspend</p>
                  <NoteForm required confirmLabel="Suspend" pending={action.isPending} onSubmit={n => run(detail.id, "suspend", n)} />
                </div>
              </div>
            </div>
          )}
        </DetailShell>
      )}
    </div>
  );
}

// ─── Audit log ───────────────────────────────────────────────────────────────
export function AdminAuditLogPage() {
  const { sp, set, page } = usePageParams();
  const act = sp.get("action") ?? "";
  const tt = sp.get("target_type") ?? "";
  const { data, isLoading, isError } = useAdminAuditLog({
    action: act || undefined, target_type: tt || undefined, page, page_size: 20,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Every admin action, refreshed after each mutation. Unknown actors show as system/unknown." />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={act} onChange={e => set("action", e.target.value)} className="sm:w-64">
          <option value="">All actions</option>
          {["user.suspend", "user.reactivate", "organization.verify", "organization.reject", "organization.suspend", "organization.reactivate", "opportunity.approve", "opportunity.reject", "opportunity.suspend"].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        <Select value={tt} onChange={e => set("target_type", e.target.value)} className="sm:w-64">
          <option value="">All target types</option>
          <option value="accounts.user">accounts.user</option>
          <option value="organizations.organization">organizations.organization</option>
          <option value="opportunities.opportunity">opportunities.opportunity</option>
        </Select>
      </div>

      {isLoading ? <SkeletonCard /> : isError ? (
        <ErrorState title="Unable to load audit log" description="Please try again." />
      ) : data && data.results.length > 0 ? (
        <Card>
          <CardHeader><CardTitle>{data.count} entries</CardTitle></CardHeader>
          <DataTable<{ id: number; actor_email: string | null; action: string; target_type: string; target_id: number; note: string; created_at: string }>
            data={data.results}
            columns={[
              { key: "action", header: "Action", render: r => <Badge variant="info">{r.action}</Badge> },
              { key: "actor_email", header: "Actor", render: r => r.actor_email ?? "system/unknown" },
              { key: "target_type", header: "Target", render: r => `${r.target_type} #${r.target_id}` },
              { key: "note", header: "Note", render: r => r.note || "—" },
              { key: "created_at", header: "When", render: r => formatDateTime(r.created_at) },
            ]}
          />
          <PaginationControls data={data} page={page} pageSize={20} onPageChange={p => set("page", String(p))} />
        </Card>
      ) : (
        <Card><CardBody><EmptyState title="No audit entries" description="Actions you take will appear here." /></CardBody></Card>
      )}
    </div>
  );
}
