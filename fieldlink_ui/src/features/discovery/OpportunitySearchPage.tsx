import { useSearchParams } from "react-router-dom";
import { useState, useMemo, useEffect, type ReactNode } from "react";
import { usePublicOpportunities, useOpportunityTypes, useLocations, useIndustries } from "@/api/hooks";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState, SkeletonCard } from "@/components/ui/States";
import { PaginationControls } from "@/components/layout/PaginationControls";
import { OpportunityCard } from "@/features/discovery/OpportunityCard";
import { Search, SlidersHorizontal } from "lucide-react";

export function OpportunitySearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState(searchParams.get("q") ?? "");

  const params = useMemo(() => {
    const p: Record<string, unknown> = {};
    for (const [k, v] of searchParams.entries()) { if (v) p[k] = v; }
    if (!p.page) p.page = 1;
    if (!p.page_size) p.page_size = 10;
    if (!p.ordering) p.ordering = "-published_at";
    return p;
  }, [searchParams]);

  const { data, isLoading, isError } = usePublicOpportunities(params);
  const { data: types } = useOpportunityTypes();
  const { data: locations } = useLocations();
  const { data: industries } = useIndustries();

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  };

  const handleSearch = (value: string) => {
    setDebouncedQ(value);
  };

  useEffect(() => {
    const t = setTimeout(() => updateParam("q", debouncedQ), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const activeFilterCount = ["type", "location", "region", "industry", "study_level", "is_paid", "is_remote", "deadline_before", "deadline_after"].filter(k => searchParams.get(k)).length;

  const clearFilters = () => {
    const next = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) next.set("q", q);
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Browse Opportunities</h1>
        <p className="mt-1 text-sm text-slate-500">Discover internships, graduate programmes, and more from verified organizations.</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input className="pl-10" placeholder="Search by title, description, organization, or skill…" value={debouncedQ} onChange={e => handleSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(s => !s)} className="shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && <span className="ml-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">{activeFilterCount}</span>}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters sidebar */}
        {showFilters && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Filters</h3>
              {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-teal-600 hover:underline">Clear all</button>}
            </div>

            <FilterSection label="Opportunity Type">
              <Select value={searchParams.get("type") ?? ""} onChange={e => updateParam("type", e.target.value)}>
                <option value="">All types</option>
                {types?.results.map(t => <option key={t.id} value={t.slug}>{t.name}</option>)}
              </Select>
            </FilterSection>

            <FilterSection label="Location">
              <Select value={searchParams.get("location") ?? ""} onChange={e => updateParam("location", e.target.value)}>
                <option value="">All locations</option>
                {locations?.results.map(l => <option key={l.id} value={l.id}>{l.name}, {l.region}</option>)}
              </Select>
            </FilterSection>

            <FilterSection label="Industry">
              <Select value={searchParams.get("industry") ?? ""} onChange={e => updateParam("industry", e.target.value)}>
                <option value="">All industries</option>
                {industries?.results.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </FilterSection>

            <FilterSection label="Study Level">
              <Select value={searchParams.get("study_level") ?? ""} onChange={e => updateParam("study_level", e.target.value)}>
                <option value="">Any level</option>
                <option value="certificate">Certificate</option>
                <option value="diploma">Diploma</option>
                <option value="bachelor">Bachelor</option>
                <option value="masters">Masters</option>
                <option value="phd">PhD</option>
              </Select>
            </FilterSection>

            <FilterSection label="Payment">
              <Select value={searchParams.get("is_paid") ?? ""} onChange={e => updateParam("is_paid", e.target.value)}>
                <option value="">Any</option>
                <option value="true">Paid only</option>
                <option value="false">Unpaid only</option>
              </Select>
            </FilterSection>

            <FilterSection label="Remote">
              <Select value={searchParams.get("is_remote") ?? ""} onChange={e => updateParam("is_remote", e.target.value)}>
                <option value="">Any</option>
                <option value="true">Remote only</option>
                <option value="false">On-site only</option>
              </Select>
            </FilterSection>

            <FilterSection label="Sort by">
              <Select value={searchParams.get("ordering") ?? "-published_at"} onChange={e => updateParam("ordering", e.target.value)}>
                <option value="-published_at">Newest first</option>
                <option value="published_at">Oldest first</option>
                <option value="-deadline">Deadline (soonest)</option>
                <option value="deadline">Deadline (latest)</option>
                <option value="title">Title A–Z</option>
                <option value="-title">Title Z–A</option>
              </Select>
            </FilterSection>
          </div>
        )}

        {/* Results */}
        <div>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : isError ? (
            <Card><CardBody><EmptyState title="Unable to load opportunities" description="Please check your connection and try again." /></CardBody></Card>
          ) : data && data.results.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">{data.count} opportunit{data.count === 1 ? "y" : "ies"} found</p>
              {data.results.map(opp => <OpportunityCard key={opp.id} opp={opp} />)}
              <Card>
                <PaginationControls data={data} page={Number(params.page)} pageSize={Number(params.page_size)} onPageChange={p => updateParam("page", String(p))} />
              </Card>
            </div>
          ) : (
            <Card><CardBody>
              <EmptyState
                icon={<Search className="h-7 w-7" />}
                title="No opportunities found"
                description="Try adjusting your search terms or filters to find more results."
                action={activeFilterCount > 0 ? <Button variant="outline" onClick={clearFilters}>Clear filters</Button> : undefined}
              />
            </CardBody></Card>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
