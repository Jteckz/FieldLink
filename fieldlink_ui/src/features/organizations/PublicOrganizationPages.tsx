import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Building2, Search, Globe } from "lucide-react";
import { usePublicOrganizations, usePublicOrganizationDetail, useIndustries, useLocations } from "@/api/hooks";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingState, SkeletonCard, ErrorState } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaginationControls } from "@/components/layout/PaginationControls";
import { Badge } from "@/components/ui/Badge";

export function PublicOrganizationDirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("search") ?? "");

  const params = useMemo(() => {
    const p: { search?: string; industry?: number; location?: number; page?: number; page_size?: number } = {
      page: Number(searchParams.get("page")) || 1,
      page_size: 12,
    };
    if (searchParams.get("search")) p.search = searchParams.get("search")!;
    if (searchParams.get("industry")) p.industry = Number(searchParams.get("industry"));
    if (searchParams.get("location")) p.location = Number(searchParams.get("location"));
    return p;
  }, [searchParams]);

  const { data, isLoading, isError } = usePublicOrganizations(params);
  const { data: industries } = useIndustries();
  const { data: locations } = useLocations();

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (q) next.set("search", q); else next.delete("search");
      next.delete("page");
      setSearchParams(next);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set(k, v); else next.delete(k);
    next.delete("page");
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Verified Organizations" description="Employers verified by the platform team. Only verified, active organizations appear here." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input className="pl-10" placeholder="Search organizations…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Select value={searchParams.get("industry") ?? ""} onChange={e => setParam("industry", e.target.value)} className="sm:w-56">
          <option value="">All industries</option>
          {industries?.results.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </Select>
        <Select value={searchParams.get("location") ?? ""} onChange={e => setParam("location", e.target.value)} className="sm:w-56">
          <option value="">All locations</option>
          {locations?.results.map(l => <option key={l.id} value={l.id}>{l.name}, {l.region}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      ) : isError ? (
        <ErrorState title="Unable to load organizations" description="Please check your connection and try again." />
      ) : data && data.results.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{data.count} verified organization{data.count === 1 ? "" : "s"}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map(o => (
              <Link key={o.id} to={`/organizations/${o.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardBody className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-slate-900">{o.name}</h3>
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-500">{o.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {o.industry_name && <Badge>{o.industry_name}</Badge>}
                      {o.location_name && <Badge>{o.location_name}</Badge>}
                      <Badge variant="success">Verified</Badge>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
          <Card>
            <PaginationControls data={data} page={params.page!} pageSize={params.page_size!} onPageChange={p => setParam("page", String(p))} />
          </Card>
        </div>
      ) : (
        <Card><CardBody>
          <EmptyState icon={<Building2 className="h-7 w-7" />} title="No organizations found" description="Try adjusting your search or filters." />
        </CardBody></Card>
      )}
    </div>
  );
}

export function PublicOrganizationDetailPage() {
  const { id } = useParams();
  const { data: org, isLoading, isError } = usePublicOrganizationDetail(Number(id));

  if (isLoading) return <LoadingState label="Loading organization…" />;
  if (isError || !org) {
    return (
      <ErrorState
        title="Organization not found"
        description="Only verified, active organizations are publicly visible."
        action={<Link to="/organizations"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to directory</Button></Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/organizations" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to organizations
      </Link>
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
              <div className="mt-1 flex flex-wrap gap-2">
                {org.industry_name && <Badge>{org.industry_name}</Badge>}
                {org.location_name && <Badge>{org.location_name}</Badge>}
                <Badge variant="success">Verified</Badge>
              </div>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{org.description}</p>
          {org.website && (
            <a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm link-teal">
              <Globe className="h-4 w-4" /> {org.website}
            </a>
          )}
          <div>
            <Link to={`/opportunities?organization=${org.id}`}><Button variant="outline">View open opportunities</Button></Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
