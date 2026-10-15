import { Link } from "react-router-dom";
import { MapPin, Clock, Briefcase, BadgeCheck, Bookmark, CheckCircle2 } from "lucide-react";
import type { OpportunityListItem } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { daysUntil, formatDate } from "@/lib/utils";

export function OpportunityCard({ opp }: { opp: OpportunityListItem }) {
  const days = daysUntil(opp.deadline);
  const urgent = days >= 0 && days <= 7;

  return (
    <Link
      to={`/opportunities/${opp.id}`}
      className="group block rounded-2xl border border-line bg-white p-5 shadow-sm transition-all hover:border-brand hover:shadow-md sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {opp.opportunity_type.name}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold text-ink group-hover:text-brand">
            {opp.title}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{opp.organization.name}</span>
            {opp.organization.is_verified && (
              <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {opp.has_applied && (
            <Badge variant="info">
              <CheckCircle2 className="h-3 w-3" /> Applied
            </Badge>
          )}
          {opp.is_saved && (
            <Badge variant="default">
              <Bookmark className="h-3 w-3" /> Saved
            </Badge>
          )}
          <Badge variant={opp.is_paid ? "success" : "neutral"}>
            {opp.is_paid ? "Paid" : "Unpaid"}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line/70 pt-4 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-brand" />
          {opp.is_remote ? "Remote" : opp.location ? `${opp.location.name}, ${opp.location.region}` : "Location TBD"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-brand" />
          Deadline {formatDate(opp.deadline)}
          {days >= 0 && days <= 30 && (
            <span className={urgent ? "font-semibold text-red-600" : "text-ink-soft/70"}>
              ({days === 0 ? "today" : `in ${days}d`})
            </span>
          )}
        </span>
        <span>{opp.positions} position{opp.positions === 1 ? "" : "s"}</span>
      </div>
    </Link>
  );
}
