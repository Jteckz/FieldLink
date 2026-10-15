import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: number }>({ columns, data, onRowClick, emptyState }: {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
}) {
  if (data.length === 0 && emptyState) return <>{emptyState}</>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map(col => (
              <th key={col.key} className={cn("px-4 py-3 text-left font-semibold text-slate-600", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "border-b border-slate-100 transition-colors",
                onRowClick && "cursor-pointer hover:bg-slate-50",
                i % 2 === 1 && "bg-slate-50/30"
              )}
            >
              {columns.map(col => (
                <td key={col.key} className={cn("px-4 py-3 text-slate-700", col.className)}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
