import { useEffect, useState, type FormEvent } from "react";
import { useStudentProfile, useUpdateStudentProfile, useInstitutions, useCourses } from "@/api/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, TextArea, FormField } from "@/components/ui/Field";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { normalizeError } from "@/api/errors";
import type { AccountType, StudyLevel } from "@/types";

export function StudentProfilePage() {
  const { data: profile, isLoading, isError } = useStudentProfile();
  const { data: institutions } = useInstitutions();
  const { data: courses } = useCourses();
  const update = useUpdateStudentProfile();
  const { show } = useToast();

  const [form, setForm] = useState({
    account_type: "student" as AccountType,
    full_name: "", phone: "",
    institution: "" as string, course: "" as string,
    study_level: "" as string, year_of_study: "" as string,
    graduation_year: "" as string, bio: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setForm({
        account_type: profile.account_type,
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        institution: profile.institution ? String(profile.institution) : "",
        course: profile.course ? String(profile.course) : "",
        study_level: profile.study_level ?? "",
        year_of_study: profile.year_of_study ? String(profile.year_of_study) : "",
        graduation_year: profile.graduation_year ? String(profile.graduation_year) : "",
        bio: profile.bio ?? "",
      });
    }
  }, [profile]);

  if (isLoading) return <LoadingState label="Loading profile…" />;
  if (isError || !profile) return <ErrorState title="Unable to load profile" description="Please try again." />;

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    const payload: Record<string, unknown> = {
      account_type: form.account_type,
      full_name: form.full_name,
      phone: form.phone,
      institution: form.institution ? Number(form.institution) : null,
      course: form.course ? Number(form.course) : null,
      study_level: form.study_level || "",
      bio: form.bio,
    };
    if (form.account_type === "student") {
      payload.year_of_study = form.year_of_study ? Number(form.year_of_study) : null;
      payload.graduation_year = null;
    } else {
      payload.graduation_year = form.graduation_year ? Number(form.graduation_year) : null;
      payload.year_of_study = null;
    }
    try {
      await update.mutateAsync(payload as never);
      show("Profile updated.", "success");
    } catch (err) {
      const ne = normalizeError(err);
      const fe: Record<string, string> = {};
      for (const [k, v] of Object.entries(ne.fieldErrors)) {
        if (Array.isArray(v) && v.length) fe[k] = String(v[0]);
      }
      setErrors(fe);
      const missing = (ne.details as { missing_fields?: string[] } | undefined)?.missing_fields;
      show(missing?.length ? `Still missing: ${missing.join(", ")}` : ne.message, "error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="My Profile" description="Keep your academic details accurate — employers see these on your applications." />

      {(profile.missing_fields?.length ?? 0) > 0 && (
        <Card><CardBody className="bg-amber-50 rounded-xl text-sm text-amber-800">
          <span className="font-medium">Incomplete profile.</span> Missing: {profile.missing_fields.join(", ")}
        </CardBody></Card>
      )}

      <Card>
        <CardHeader><CardTitle>Profile details</CardTitle></CardHeader>
        <CardBody>
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Account type" required>
              <Select value={form.account_type} onChange={e => set("account_type", e.target.value)}>
                <option value="student">Student (currently enrolled)</option>
                <option value="graduate">Graduate (completed studies)</option>
              </Select>
            </FormField>
            <FormField label="Full name" required error={errors.full_name}>
              <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} error={!!errors.full_name} />
            </FormField>
            <FormField label="Phone" required error={errors.phone} hint="e.g. +255711111111">
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} error={!!errors.phone} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Institution" required error={errors.institution}>
                <Select value={form.institution} onChange={e => set("institution", e.target.value)} error={!!errors.institution}>
                  <option value="">Select institution…</option>
                  {institutions?.results.map(i => <option key={i.id} value={i.id}>{i.name} ({i.short_name})</option>)}
                </Select>
              </FormField>
              <FormField label="Course" required error={errors.course}>
                <Select value={form.course} onChange={e => set("course", e.target.value)} error={!!errors.course}>
                  <option value="">Select course…</option>
                  {courses?.results.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Study level" required error={errors.study_level}>
                <Select value={form.study_level} onChange={e => set("study_level", e.target.value as StudyLevel)} error={!!errors.study_level}>
                  <option value="">Select level…</option>
                  <option value="certificate">Certificate</option>
                  <option value="diploma">Diploma</option>
                  <option value="bachelor">Bachelor</option>
                  <option value="masters">Masters</option>
                  <option value="phd">PhD</option>
                </Select>
              </FormField>
              {form.account_type === "student" ? (
                <FormField label="Year of study" required error={errors.year_of_study} hint="1–8">
                  <Input type="number" min={1} max={8} value={form.year_of_study} onChange={e => set("year_of_study", e.target.value)} error={!!errors.year_of_study} />
                </FormField>
              ) : (
                <FormField label="Graduation year" required error={errors.graduation_year} hint="1990–2100">
                  <Input type="number" min={1990} max={2100} value={form.graduation_year} onChange={e => set("graduation_year", e.target.value)} error={!!errors.graduation_year} />
                </FormField>
              )}
            </div>
            <FormField label="Bio" error={errors.bio}>
              <TextArea rows={4} value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="Tell employers about yourself…" />
            </FormField>
            <Button type="submit" loading={update.isPending}>Save profile</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
