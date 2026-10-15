import { Link, useSearchParams } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { useSavedOpportunities, useUnsaveOpportunity } from "@/api/hooks";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState, EmptyState, SkeletonCard } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaginationControls } from "@/components/layout/PaginationControls";
import { OpportunityCard } from "@/features/discovery/OpportunityCard";
import { useToast } from "@/components/ui/Toast";
import { normalizeError } from "@/api/errors";

export function SavedOpportunitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const { data, isLoading, isError, refetch } = useSavedOpportunities({ page, page_size: 10 });
  const unsave = useUnsaveOpportunity();
  const { show } = useToast();

  const handleUnsave = async (oppId: number) => {
    try {
      await unsave.mutateAsync(oppId);
      show("Removed from saved.", "info");
      refetch();
    } catch (err) {
      show(normalizeError(err).message, "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Saved Opportunities" description="Opportunities you bookmarked for later." />

      {isLoading ? (
        <div className="space-y-4">{[1, 2].map(i => <SkeletonCard key={i} />)}</div>
      ) : isError ? (
        <ErrorState title="Unable to load saved opportunities" description="Please try again." />
      ) : data && data.results.length > 0 ? (
        <div className="space-y-4">
          {data.results.map(s => (
            <div key={s.id} className="relative">
              <OpportunityCard opp={s.opportunity} />
              <div className="mt-1 flex justify-end">
                <button
                  onClick={() => handleUnsave(s.opportunity.id)}
                  className="text-xs text-slate-400 hover:text-red-600 hover:underline"
                >
                  Remove from saved
                </button>
              </div>
            </div>
          ))}
          <Card>
            <PaginationControls
              data={data} page={page} pageSize={10}
              onPageChange={p => setSearchParams({ page: String(p) })}
            />
          </Card>
        </div>
      ) : (
        <Card><CardBody>
          <EmptyState
            icon={<Bookmark className="h-7 w-7" />}
            title="No saved opportunities"
            description="Browse opportunities and save the ones that interest you."
            action={<Link to="/opportunities"><Button>Browse opportunities</Button></Link>}
          />
        </CardBody></Card>
      )}
    </div>
  );
}
