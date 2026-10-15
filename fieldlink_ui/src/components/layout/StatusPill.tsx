import type {
  OpportunityStatus, VerificationStatus, ApplicationStatus,
} from "@/types";
import { cn } from "@/lib/utils";

interface StatusConfig {
  label: string;
  classes: string;
  dot: string;
}

const oppStatusMap: Record<OpportunityStatus, StatusConfig> = {
  draft: { label: "Draft", classes: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  pending_review: { label: "Pending Review", classes: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  published: { label: "Published", classes: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  closed: { label: "Closed", classes: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  expired: { label: "Expired", classes: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" },
  archived: { label: "Archived", classes: "bg-gray-200 text-gray-600 border-gray-300", dot: "bg-gray-500" },
  suspended: { label: "Suspended", classes: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

const verificationMap: Record<VerificationStatus, StatusConfig> = {
  unverified: { label: "Unverified", classes: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  pending: { label: "Pending", classes: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  verified: { label: "Verified", classes: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", classes: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

const applicationMap: Record<ApplicationStatus, StatusConfig> = {
  submitted: { label: "Submitted", classes: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  reviewing: { label: "Reviewing", classes: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  shortlisted: { label: "Shortlisted", classes: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  interview: { label: "Interview", classes: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  accepted: { label: "Accepted", classes: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", classes: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  withdrawn: { label: "Withdrawn", classes: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" },
};

export function StatusPill({ status, type = "opportunity" }: {
  status: OpportunityStatus | VerificationStatus | ApplicationStatus;
  type?: "opportunity" | "verification" | "application";
}) {
  const map: Record<string, StatusConfig> =
    type === "verification" ? verificationMap : type === "application" ? applicationMap : oppStatusMap;
  const cfg = map[status] ?? { label: String(status), classes: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", cfg.classes)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
