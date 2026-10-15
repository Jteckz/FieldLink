import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useStudentPreferences, useUpdateStudentPreferences, useLocations, useOpportunityTypes, useIndustries } from "@/api/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { normalizeError } from "@/api/errors";
import { cn } from "@/lib/utils";

function MultiGroup({ title, description, options, selected, onToggle, searchPlaceholder }: {
  title: string; description: string;
  options: { id: number; label: string; sub?: string }[];
  selected: number[]; onToggle: (id: number) => void; searchPlaceholder: string;
}) {
  const [q, setQ] = useState("");
  const filtered = options.filter(o => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardBody className="space-y-3">
        <p className="text-sm text-slate-500">{description}</p>
        <Input placeholder={searchPlaceholder} value={q} onChange={e => setQ(e.target.value)} />
        <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
          {filtered.slice(0, 80).map(o => {
            const active = selected.includes(o.id);
            return (
              <button
                key={o.id}
                onClick={() => onToggle(o.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 text-slate-600 hover:border-teal-400 hover:bg-teal-50"
                )}
              >
                {o.label}{o.sub ? ` · ${o.sub}` : ""}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400">{selected.length} selected</p>
      </CardBody>
    </Card>
  );
}

export function StudentPreferencesPage() {
  const { data: prefs, isLoading, isError } = useStudentPreferences();
  const { data: locations } = useLocations();
  const { data: types } = useOpportunityTypes();
  const { data: industries } = useIndustries();
  const update = useUpdateStudentPreferences();
  const { show } = useToast();

  const [loc, setLoc] = useState<number[]>([]);
  const [typ, setTyp] = useState<number[]>([]);
  const [ind, setInd] = useState<number[]>([]);

  useEffect(() => {
    if (prefs) {
      setLoc(prefs.preferred_locations ?? []);
      setTyp(prefs.preferred_opportunity_types ?? []);
      setInd(prefs.preferred_industries ?? []);
    }
  }, [prefs]);

  if (isLoading) return <LoadingState label="Loading preferences…" />;
  if (isError) return <ErrorState title="Unable to load preferences" description="Please try again." />;

  const toggle = (setter: Dispatch<SetStateAction<number[]>>) => (id: number) =>
    setter(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const save = async () => {
    try {
      await update.mutateAsync({ preferred_locations: loc, preferred_opportunity_types: typ, preferred_industries: ind });
      show("Preferences saved.", "success");
    } catch (err) {
      show(normalizeError(err).message, "error");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="My Preferences"
        description="Tell us where and what you're looking for. Three independent groups."
        actions={<Button onClick={save} loading={update.isPending}>Save preferences</Button>}
      />
      <MultiGroup
        title="Preferred locations" description="Cities or regions you'd like to work in."
        options={(locations?.results ?? []).map(l => ({ id: l.id, label: l.name, sub: l.region }))}
        selected={loc} onToggle={toggle(setLoc)} searchPlaceholder="Search locations…"
      />
      <MultiGroup
        title="Preferred opportunity types" description="Internships, graduate programmes, volunteering…"
        options={(types?.results ?? []).map(t => ({ id: t.id, label: t.name }))}
        selected={typ} onToggle={toggle(setTyp)} searchPlaceholder="Search types…"
      />
      <MultiGroup
        title="Preferred industries" description="Sectors you're most interested in."
        options={(industries?.results ?? []).map(i => ({ id: i.id, label: i.name }))}
        selected={ind} onToggle={toggle(setInd)} searchPlaceholder="Search industries…"
      />
    </div>
  );
}
