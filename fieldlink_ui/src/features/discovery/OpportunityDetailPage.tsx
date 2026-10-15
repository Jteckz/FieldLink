import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Users, BadgeCheck, Bookmark, Send } from "lucide-react";
import { usePublicOpportunityDetail, useSaveOpportunity, useUnsaveOpportunity, useApplyToOpportunity, useStudentMe } from "@/api/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TextArea, FormField } from "@/components/ui/Field";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { normalizeError } from "@/api/errors";
import { getStoredUser } from "@/auth/session";
import { formatDate, daysUntil } from "@/lib/utils";

export function OpportunityDetailPage() {
  const { id } = useParams();
  const oppId = Number(id);
  const navigate = useNavigate();
  const { show } = useToast();
  const user = getStoredUser();
  const isStudent = user?.role === "student";

  const { data: opp, isLoading, isError, refetch } = usePublicOpportunityDetail(oppId);
  const { data: studentMe } = useStudentMe();
  const save = useSaveOpportunity();
  const unsave = useUnsaveOpportunity();
  const apply = useApplyToOpportunity();
  const [coverLetter, setCoverLetter] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);

  if (isLoading) return <LoadingState label="Loading opportunity…" />;
  if (isError || !opp) {
    return (
      <ErrorState
        title="Opportunity not found"
        description="This opportunity may have been removed, expired, or is no longer published."
        action={<Link to="/opportunities"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to search</Button></Link>}
      />
    );
  }

  const profileComplete = studentMe ? studentMe.profile.is_complete : true;
  const expired = daysUntil(opp.deadline) < 0;
  const canApply = isStudent && !opp.has_applied && profileComplete && !expired;

  const handleSaveToggle = async () => {
    if (!user) { navigate("/login", { state: { from: { pathname: `/opportunities/${oppId}` } } }); return; }
    if (!isStudent) { show("Only student accounts can save opportunities.", "error"); return; }
    try {
      if (opp.is_saved) { await unsave.mutateAsync(oppId); show("Removed from saved.", "info"); }
      else { await save.mutateAsync(oppId); show("Saved to your list.", "success"); }
      refetch();
    } catch (err) {
      show(normalizeError(err).message, "error");
    }
  };

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    if (coverLetter.length > 5000) { show("Cover letter must be 5000 characters or fewer.", "error"); return; }
    try {
      await apply.mutateAsync({ id: oppId, body: { cover_letter: coverLetter } });
      show("Application submitted!", "success");
      setApplyOpen(false);
      refetch();
      navigate("/applications");
    } catch (err) {
      const ne = normalizeError(err);
      const missing = (ne.details as { missing_fields?: string[] } | undefined)?.missing_fields;
      if (ne.code === "profile_incomplete" && missing) {
        show(`Complete your profile first: ${missing.join(", ")}`, "error");
        navigate("/student/profile");
      } else if (ne.code === "not_eligible") {
        const reasons = (ne.details as { reasons?: string[] } | undefined)?.reasons;
        show(reasons?.join(" ") ?? ne.message, "error");
      } else {
        show(ne.message, "error");
      }
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/opportunities" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to opportunities
      </Link>

      <PageHeader
        title={opp.title}
        description={`${opp.organization.name} · ${opp.opportunity_type.name}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveToggle} loading={save.isPending || unsave.isPending}>
              <Bookmark className="h-4 w-4" /> {opp.is_saved ? "Unsave" : "Save"}
            </Button>
            {isStudent && (
              opp.has_applied
                ? <Button variant="outline" disabled>Applied ✓</Button>
                : <Button onClick={() => (user ? setApplyOpen(v => !v) : navigate("/login"))} disabled={!canApply && !!user}>
                    <Send className="h-4 w-4" /> Apply
                  </Button>
            )}
            {!user && <Button onClick={() => navigate("/login")}><Send className="h-4 w-4" /> Log in to apply</Button>}
          </div>
        }
      />

      {!user && (
        <Card><CardBody className="text-sm text-slate-600">
          <Link to="/login" className="link-teal">Log in</Link> as a student to save this opportunity and apply.
        </CardBody></Card>
      )}
      {isStudent && !profileComplete && (
        <Card><CardBody className="text-sm text-amber-700 bg-amber-50 rounded-xl">
          Your profile is incomplete. <Link to="/student/profile" className="font-medium underline">Complete your profile</Link> before applying.
        </CardBody></Card>
      )}
      {expired && (
        <Card><CardBody className="text-sm text-red-700 bg-red-50 rounded-xl">This opportunity has passed its deadline and is no longer accepting applications.</CardBody></Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>About this opportunity</CardTitle></CardHeader>
            <CardBody><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{opp.description}</p></CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Requirements & eligibility</CardTitle></CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={opp.requirements.students_eligible ? "success" : "neutral"}>
                  {opp.requirements.students_eligible ? "Students eligible" : "Not for students"}
                </Badge>
                <Badge variant={opp.requirements.graduates_eligible ? "success" : "neutral"}>
                  {opp.requirements.graduates_eligible ? "Graduates eligible" : "Not for graduates"}
                </Badge>
                {opp.requirements.min_study_level && <Badge>Min level: {opp.requirements.min_study_level}</Badge>}
                {opp.requirements.min_year_of_study && <Badge>Min year: {opp.requirements.min_year_of_study}</Badge>}
              </div>
              {opp.requirements.courses.length > 0 && (
                <p className="text-slate-600"><span className="font-medium text-slate-900">Relevant courses: </span>{opp.requirements.courses.map(c => c.name).join(", ")}</p>
              )}
              {opp.requirements.skills.length > 0 && (
                <p className="text-slate-600"><span className="font-medium text-slate-900">Useful skills: </span>{opp.requirements.skills.map(s => s.name).join(", ")}</p>
              )}
              {opp.requirements.eligibility_notes && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">{opp.requirements.eligibility_notes}</p>
              )}
              <p className="text-xs text-slate-400">Courses and skills are informational for this MVP — there is no automatic matching score.</p>
            </CardBody>
          </Card>

          {isStudent && applyOpen && !opp.has_applied && (
            <Card>
              <CardHeader><CardTitle>Submit your application</CardTitle></CardHeader>
              <CardBody>
                <form onSubmit={handleApply} className="space-y-4">
                  <FormField label="Cover letter (optional)" hint="Up to 5000 characters. Your current CV will be attached automatically.">
                    <TextArea rows={5} value={coverLetter} onChange={e => setCoverLetter(e.target.value)} placeholder="Tell the employer why you're a good fit…" />
                  </FormField>
                  <p className="text-xs text-slate-400">One application per opportunity. Withdrawn applications cannot be resubmitted.</p>
                  <Button type="submit" loading={apply.isPending}>Submit application</Button>
                </form>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                {opp.organization.name}
                {opp.organization.is_verified && <BadgeCheck className="h-4 w-4 text-emerald-600" />}
              </div>
              <div className="flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4" />{opp.is_remote ? "Remote" : opp.location ? `${opp.location.name}, ${opp.location.region}` : "—"}</div>
              <div className="flex items-center gap-2 text-slate-600"><Clock className="h-4 w-4" />Deadline {formatDate(opp.deadline)}</div>
              <div className="flex items-center gap-2 text-slate-600"><Users className="h-4 w-4" />{opp.positions} position{opp.positions === 1 ? "" : "s"}</div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant={opp.is_paid ? "success" : "neutral"}>{opp.is_paid ? "Paid" : "Unpaid"}</Badge>
                {opp.duration_months && <Badge>{opp.duration_months} months</Badge>}
                {opp.start_date && <Badge>Starts {formatDate(opp.start_date)}</Badge>}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
