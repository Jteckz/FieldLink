import type { ApplicationEvent } from "@/types";
import { StatusPill } from "@/components/layout/StatusPill";
import { formatDateTime } from "@/lib/utils";

export function EventsTimeline({ events }: { events: ApplicationEvent[] }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-slate-500">No status history yet.</p>;
  }
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-5">
      {sorted.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-teal-500 ring-4 ring-teal-50" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={e.new_status} type="application" />
            <span className="text-xs text-slate-400">{formatDateTime(e.created_at)}</span>
          </div>
          {e.old_status && (
            <p className="mt-1 text-xs text-slate-500">From {e.old_status} → {e.new_status}</p>
          )}
          {e.note && <p className="mt-1 text-sm text-slate-600">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
