import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, ShieldCheck, Briefcase, FileText, ArrowRight } from "lucide-react";
import { useOrgMe, useCreateOrg, useUpdateOrg, useSubmitVerification, useIndustries, useLocations, useOrgOpportunities, useOrgApplications } from "@/api/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, TextArea, FormField } from "@/components/ui/Field";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/layout/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { normalizeError } from "@/api/errors";

export function OrganizationOnboardingPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const create = useCreateOrg();
  const { data: industries } = useIndustries();
  const { data: locations } = useLocations();
  const [form, setForm] = useState({
    name: "", description: "", industry: "", location: "",
    address: "", website: "", contact_email: "", contact_phone: "", registration_number: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      await create.mutateAsync({
        name: form.name,
        description: form.description,
        industry: form.industry ? Number(form.industry) : null,
        location: form.location ? Number(form.location) : null,
        address: form.address, website: form.website,
        contact_email: form.contact_email, contact_phone: form.contact_phone,
        registration_number: form.registration_number,
      } as never);
      show("Organization created!", "success");
      navigate("/org");
    } catch (err) {
      const ne = normalizeError(err);
      if (ne.code === "organization_exists") {
        show("You already have an organization — loading it.", "info");
        navigate("/org");
        return;
      }
      const fe: Record<string, string> = {};
      for (const [k, v] of Object.entries(ne.fieldErrors)) {
        if (Array.isArray(v) && v.length) fe[k] = String(v[0]);
      }
      setErrors(fe);
      show(ne.message, "error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Create your organization" description="Set up your employer profile. Name, description, and contact email are needed for verification." />
      <Card>
        <CardBody>
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Organization name" required error={errors.name}>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Alpha Tech Ltd" error={!!errors.name} required />
            </FormField>
            <FormField label="Description" required error={errors.description} hint="Required for verification submission.">
              <TextArea rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What does your organization do?" error={!!errors.description} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Industry">
                <Select value={form.industry} onChange={e => set("industry", e.target.value)}>
                  <option value="">Select…</option>
                  {industries?.results.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Location">
                <Select value={form.location} onChange={e => set("location", e.target.value)}>
                  <option value="">Select…</option>
                  {locations?.results.map(l => <option key={l.id} value={l.id}>{l.name}, {l.region}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Physical address" error={errors.address}>
              <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Sam Nujoma Road" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Website" error={errors.website}>
                <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://…" />
              </FormField>
              <FormField label="Registration number" error={errors.registration_number}>
                <Input value={form.registration_number} onChange={e => set("registration_number", e.target.value)} placeholder="BRELA-…" />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Contact email" required error={errors.contact_email} hint="Required for verification submission.">
                <Input type="email" value={form.contact_email} onChange={e => set("contact_email", e.target.value)} error={!!errors.contact_email} />
              </FormField>
              <FormField label="Contact phone" error={errors.contact_phone}>
                <Input value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="+255…" />
              </FormField>
            </div>
            <Button type="submit" loading={create.isPending}>Create organization</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export function OrganizationDashboardPage() {
  const { data: org, isLoading, isError } = useOrgMe();
  const { data: opps } = useOrgOpportunities({ page_size: 1 });
  const { data: apps } = useOrgApplications({ page_size: 1 });

  if (isLoading) return <LoadingState label="Loading organization…" />;
  // No profile yet → onboarding (spec: 404 means show onboarding, not dashboard)
  if (isError || !org) {
    return (
      <EmptyState
        icon={<Building2 className="h-7 w-7" />}
        title="No organization profile yet"
        description="Create your organization profile to post opportunities and receive applications."
        action={<Link to="/org/verification"><Button>Create organization</Button></Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        description="Your recruitment workspace at a glance."
        actions={<StatusPill status={org.verification_status} type="verification" />}
      />

      {org.verification_status !== "verified" && (
        <Card><CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-amber-50/60 rounded-xl">
          <p className="text-sm text-amber-800">
            Status: <span className="font-medium">{org.verification_status}</span>.
            {org.verification_notes ? ` Note: ${org.verification_notes}` : " Submit for verification to publish opportunities."}
          </p>
          <Link to="/org/verification"><Button size="sm">Review verification <ArrowRight className="h-4 w-4" /></Button></Link>
        </CardBody></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: <Briefcase className="h-5 w-5" />, label: "Opportunities", value: String(opps?.count ?? "—"), to: "/org/opportunities" },
          { icon: <FileText className="h-5 w-5" />, label: "Applications", value: String(apps?.count ?? "—"), to: "/org/applications" },
          { icon: <ShieldCheck className="h-5 w-5" />, label: "Verification", value: org.verification_status, to: "/org/verification" },
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/org/opportunities/new">
          <Card className="transition-shadow hover:shadow-md"><CardBody className="flex items-center justify-between">
            <span className="font-medium text-slate-900">Post a new opportunity</span><ArrowRight className="h-4 w-4 text-slate-400" />
          </CardBody></Card>
        </Link>
        <Link to="/org/applications">
          <Card className="transition-shadow hover:shadow-md"><CardBody className="flex items-center justify-between">
            <span className="font-medium text-slate-900">Review applicants</span><ArrowRight className="h-4 w-4 text-slate-400" />
          </CardBody></Card>
        </Link>
      </div>
    </div>
  );
}

export function OrganizationVerificationPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const { data: org, isLoading, isError, refetch } = useOrgMe();
  const update = useUpdateOrg();
  const submitVer = useSubmitVerification();
  const { data: industries } = useIndustries();
  const { data: locations } = useLocations();

  const [form, setForm] = useState({ description: "", contact_email: "" });
  useEffect(() => {
    if (org) setForm({ description: org.description ?? "", contact_email: org.contact_email ?? "" });
  }, [org]);

  if (isLoading) return <LoadingState label="Loading organization…" />;
  if (isError || !org) {
    // Reuse onboarding inline rather than a dead end
    return <OrganizationOnboardingPage />;
  }

  const ready = !!(org.description || form.description) && !!(org.contact_email || form.contact_email);

  const handleSave = async () => {
    try {
      await update.mutateAsync({ description: form.description, contact_email: form.contact_email } as never);
      show("Organization updated.", "success");
      refetch();
    } catch (err) {
      show(normalizeError(err).message, "error");
    }
  };

  const handleSubmit = async () => {
    try {
      await submitVer.mutateAsync();
      show("Submitted for verification.", "success");
      refetch();
    } catch (err) {
      const ne = normalizeError(err);
      const missing = (ne.details as { missing_fields?: string[] } | undefined)?.missing_fields;
      show(missing?.length ? `Missing: ${missing.join(", ")}` : ne.message, "error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Verification" description="Verified organizations appear in the public directory." actions={<StatusPill status={org.verification_status} type="verification" />} />

      <Card>
        <CardHeader><CardTitle>{org.name}</CardTitle></CardHeader>
        <CardBody className="space-y-4 text-sm">
          <div className="grid gap-2 text-slate-600">
            <p><span className="font-medium text-slate-900">Industry:</span> {org.industry_name ?? "—"}</p>
            <p><span className="font-medium text-slate-900">Location:</span> {org.location_name ?? "—"}</p>
            <p><span className="font-medium text-slate-900">Contact:</span> {org.contact_email || "—"} · {org.contact_phone || "—"}</p>
            {org.verified_at && <p><span className="font-medium text-slate-900">Verified at:</span> {org.verified_at}</p>}
            {org.verification_notes && (
              <p className="rounded-lg bg-slate-50 px-3 py-2"><span className="font-medium text-slate-900">Reviewer note:</span> {org.verification_notes}</p>
            )}
          </div>

          <FormField label="Description" required hint="Required for verification.">
            <TextArea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField label="Contact email" required hint="Required for verification.">
            <Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
          </FormField>
          <div className="text-xs text-slate-400">
            Industry: {industries?.results.find(i => i.id === org.industry)?.name ?? "—"} · Location: {locations?.results.find(l => l.id === org.location)?.name ?? "—"}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleSave} loading={update.isPending}>Save details</Button>
            <Button onClick={handleSubmit} loading={submitVer.isPending} disabled={!ready || org.verification_status === "pending" || org.verification_status === "verified"}>
              Submit for verification
            </Button>
            <Button variant="ghost" onClick={() => navigate("/org")}>Back to dashboard</Button>
          </div>
          {!ready && <p className="text-xs text-amber-700">Add a description and contact email before submitting.</p>}
          {org.verification_status === "pending" && <p className="text-xs text-slate-500">Your profile is under review. Resubmission is blocked while pending.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
