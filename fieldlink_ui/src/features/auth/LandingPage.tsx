import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Check, Clock, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { SkeletonCard } from "@/components/ui/States";
import {
  usePublicOpportunities,
  usePublicOrganizations,
  useLocations,
  useOpportunityTypes,
  useCourses,
} from "@/api/hooks";
import { daysUntil, formatDate } from "@/lib/utils";

/** The stages every application passes through on this platform. */
const JOURNEY_STEPS = [
  { title: "Apply", desc: "One application per opening, with your current CV attached." },
  { title: "Reviewing", desc: "The organisation reads your profile and cover letter." },
  { title: "Shortlisted", desc: "Strong candidates are moved to interview." },
  { title: "Interview", desc: "You meet the team behind the placement." },
  { title: "Accepted", desc: "You start, and the work counts as experience." },
];

export function LandingPage() {
  const { data: opps } = usePublicOpportunities({ page: 1, page_size: 1 });
  const { data: orgs } = usePublicOrganizations({ page: 1, page_size: 1 });
  const { data: locations } = useLocations({ page_size: 100 });
  const { data: types } = useOpportunityTypes({ page_size: 100 });

  const regions = new Set((locations?.results ?? []).map(l => l.region)).size;

  return (
    <div className="animate-rise space-y-4 pb-10">
      {/* ── Hero: search first, no stock imagery ─────────── */}
      <section className="grid items-start gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
        <div className="py-2">
          <p className="text-sm font-semibold text-brand">Internships · Field placements · Graduate programmes</p>
          <h1 className="mt-3 max-w-[16ch] font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-6xl">
            Find a placement in Tanzania.
          </h1>
          <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-ink-soft">
            Search live openings from verified organisations. Students and graduates
            apply with one profile — <span lang="sw">mafunzo kwa vitendo, internships na graduate programmes.</span>
          </p>
          <HeroSearch />
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-5 text-sm text-ink-soft">
            <span><strong className="mr-1.5 font-display text-lg text-ink">{opps?.count ?? "—"}</strong>open placements</span>
            <span><strong className="mr-1.5 font-display text-lg text-ink">{orgs?.count ?? "—"}</strong>verified organisations</span>
            <span><strong className="mr-1.5 font-display text-lg text-ink">{regions || "—"}</strong>regions covered</span>
          </div>
        </div>

        <ClosingSoonBoard />
      </section>

      {/* ── Course finder (rule-based shortcuts, no scores)  */}
      <section className="py-4">
        <CourseFinder />
      </section>

      {/* ── Browse by type ───────────────────────────────── */}
      <section className="grid gap-10 py-12 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="text-sm font-semibold text-brand">Start here</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">Browse by opportunity type</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Each type links straight into filtered, live results.
          </p>
        </div>
        <div className="grid content-start sm:grid-cols-2">
          {(types?.results ?? []).map((t, i) => (
            <Link
              key={t.id}
              to={`/opportunities?type=${t.slug}`}
              className="group flex gap-4 border-b border-line py-4 sm:px-4"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-soft text-xs font-bold text-brand">{i + 1}</span>
              <div>
                <h3 className="font-display text-base font-bold text-ink group-hover:text-brand">{t.name}</h3>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">{t.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How applications move ────────────────────────── */}
      <section className="-mx-5 bg-brand-soft px-5 py-14 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold text-brand">How it works</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">One application, five visible stages.</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              No black box. You see exactly where every application stands,
              with a written note each time the status changes.
            </p>
            <Link to="/register" className="mt-5 inline-block">
              <Button variant="navy">Create a free account <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
          <ol className="grid content-start gap-x-8 sm:grid-cols-2">
            {JOURNEY_STEPS.map((s, i) => (
              <li key={s.title} className="border-b border-line py-3">
                <p className="text-sm font-bold text-ink"><span className="mr-2 text-brand">{i + 1}.</span>{s.title}</p>
                <p className="ml-6 mt-0.5 text-xs leading-relaxed text-ink-soft">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Recently published ───────────────────────────── */}
      <section className="py-14">
        <FreshList />
      </section>

      {/* ── Employer panel ───────────────────────────────── */}
      <section className="mb-6 rounded-2xl border border-line border-l-4 border-l-brand bg-white px-6 py-10 sm:px-10">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-navy text-white">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Employers: publish a placement.</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">
                Register your organisation, complete verification, and post openings
                that reach students across the country.
              </p>
            </div>
          </div>
          <Link to="/register" className="shrink-0">
            <Button>Register as an organisation <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

/** Keyword + type + location search that lands on filtered results. */
function HeroSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const { data: types } = useOpportunityTypes({ page_size: 100 });
  const { data: locations } = useLocations({ page_size: 100 });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (type) p.set("type", type);
    if (location) p.set("location", location);
    navigate(`/opportunities${p.toString() ? `?${p}` : ""}`);
  };

  return (
    <form onSubmit={submit} className="mt-7 rounded-2xl border border-line bg-white p-3 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-[1fr_180px_180px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Title, organisation, or skill…"
            className="border-0 bg-paper pl-9 focus:ring-0"
            aria-label="Search keywords"
          />
        </div>
        <Select value={type} onChange={e => setType(e.target.value)} aria-label="Opportunity type" className="border-0 bg-paper">
          <option value="">All types</option>
          {types?.results.map(t => <option key={t.id} value={t.slug}>{t.name}</option>)}
        </Select>
        <Select value={location} onChange={e => setLocation(e.target.value)} aria-label="Location" className="border-0 bg-paper">
          <option value="">All locations</option>
          {locations?.results.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
        <Button type="submit" className="whitespace-nowrap">Search</Button>
      </div>
    </form>
  );
}

/** Live deadlines board: soonest-closing openings, most urgent first. */
function ClosingSoonBoard() {
  const { data, isLoading } = usePublicOpportunities({ page: 1, page_size: 5, ordering: "deadline" });

  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <Clock className="h-4 w-4 text-brand" /> Closing soon
        </p>
        <Link to="/opportunities?ordering=deadline" className="text-xs font-semibold text-brand hover:underline">
          All deadlines
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-2 p-4">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      ) : (data?.results.length ?? 0) > 0 ? (
        <ul className="divide-y divide-line/70">
          {data!.results.map(o => {
            const left = daysUntil(o.deadline);
            return (
              <li key={o.id}>
                <Link to={`/opportunities/${o.id}`} className="group flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-brand-soft/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink group-hover:text-brand">{o.title}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">{o.organization.name} · {o.is_remote ? "Remote" : o.location?.name ?? "—"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-ink">{formatDate(o.deadline)}</p>
                    <p className={`text-xs ${left <= 7 ? "font-bold text-red-600" : "text-ink-soft"}`}>
                      {left < 0 ? "closed" : left === 0 ? "closes today" : `${left}d left`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-8 text-sm text-ink-soft">No open placements right now. Check back soon.</p>
      )}
    </div>
  );
}

/** Recently published openings, newest first. */
function FreshList() {
  const { data: latest } = usePublicOpportunities({ page: 1, page_size: 3, ordering: "-published_at" });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand">Open now</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">Recently published</h2>
        </div>
        <Link to="/opportunities" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          See all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-6 divide-y divide-line border-y border-line">
        {(latest?.results ?? []).map(o => (
          <Link
            key={o.id}
            to={`/opportunities/${o.id}`}
            className="group grid gap-2 py-5 sm:grid-cols-[1fr_0.7fr_auto] sm:items-center"
          >
            <div>
              <p className="text-xs font-semibold text-brand">{o.opportunity_type.name}</p>
              <h3 className="mt-0.5 font-display text-lg font-bold text-ink group-hover:text-brand">{o.title}</h3>
              <p className="text-sm text-ink-soft">{o.organization.name}</p>
            </div>
            <div className="flex gap-5 text-sm text-ink-soft">
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{o.is_remote ? "Remote" : o.location?.name ?? "—"}</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" />{o.positions} slots</span>
              <span className="hidden sm:inline">Closes {formatDate(o.deadline)}</span>
            </div>
            <ArrowRight className="hidden text-brand transition-transform group-hover:translate-x-1 sm:block" />
          </Link>
        ))}
        {(!latest || latest.results.length === 0) && (
          <p className="py-8 text-sm text-ink-soft">New placements appear here as organisations publish them.</p>
        )}
      </div>
    </>
  );
}

/**
 * Rule-based course shortcut. Not AI and not a score: it only links the
 * student's words to the live course taxonomy and on to filtered search.
 */
function CourseFinder() {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const { data, isLoading } = useCourses(query.length >= 2 ? { search: query, page_size: 6 } : undefined);
  const showResults = query.length >= 2;
  const matches = showResults ? (data?.results ?? []) : [];

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold text-ink">Know your course? Jump straight in.</p>
          <p className="mt-0.5 text-sm text-ink-soft">Type it below — English or Kiswahili — and pick your course to filter openings.</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={120}
            placeholder="e.g. Computer Science, Uuguzi…"
            className="pl-9"
            aria-label="Your course"
          />
        </div>
      </div>

      {showResults && (
        <div className="mt-4 border-t border-line/70 pt-4">
          {isLoading ? (
            <p className="text-sm text-ink-soft">Looking up courses…</p>
          ) : matches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {matches.map(c => (
                <Link
                  key={c.id}
                  to={`/opportunities?course=${c.id}`}
                  className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              No exact course found. <Link to={`/opportunities?q=${encodeURIComponent(query)}`} className="font-semibold text-brand hover:underline">Search “{query}” as a keyword instead</Link> — it also matches titles, descriptions and skills.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
