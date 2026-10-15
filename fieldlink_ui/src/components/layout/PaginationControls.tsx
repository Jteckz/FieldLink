import type { ApiList } from "@/types";
import { Button } from "@/components/ui/Button";

export function PaginationControls<T>({ data, page, pageSize, onPageChange }: {
  data: ApiList<T>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(data.count / pageSize) || 1;
  const from = data.count === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, data.count);
  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}</span>–<span className="font-medium text-slate-700">{to}</span> of <span className="font-medium text-slate-700">{data.count}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!data.previous} onClick={() => onPageChange(page - 1)}>Previous</Button>
        <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={!data.next} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
