import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useStudentSkills, useUpdateStudentSkills, useSkills } from "@/api/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Field";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { normalizeError } from "@/api/errors";
import type { Proficiency } from "@/types";

interface Row { skill: string; proficiency: Proficiency }

export function StudentSkillsPage() {
  const { data: current, isLoading, isError } = useStudentSkills();
  const { data: taxonomy } = useSkills();
  const update = useUpdateStudentSkills();
  const { show } = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (current) setRows(current.map(s => ({ skill: String(s.skill), proficiency: s.proficiency })));
  }, [current]);

  if (isLoading) return <LoadingState label="Loading skills…" />;
  if (isError) return <ErrorState title="Unable to load skills" description="Please try again." />;

  const filtered = (taxonomy?.results ?? []).filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())
  );

  const addSkill = (id: number) => {
    if (rows.some(r => r.skill === String(id))) { show("That skill is already in your list.", "info"); return; }
    setRows(r => [...r, { skill: String(id), proficiency: "beginner" }]);
  };

  const save = async () => {
    try {
      await update.mutateAsync(rows.filter(r => r.skill).map(r => ({ skill: Number(r.skill), proficiency: r.proficiency })));
      show("Skills saved.", "success");
    } catch (err) {
      show(normalizeError(err).message, "error");
    }
  };

  const nameOf = (id: string) => taxonomy?.results.find(s => String(s.id) === id)?.name ?? `#${id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="My Skills"
        description="Your skill list is replaced as a whole — add, adjust, then save."
        actions={<Button onClick={save} loading={update.isPending}>Save skills</Button>}
      />

      <Card>
        <CardHeader><CardTitle>Current skills ({rows.length})</CardTitle></CardHeader>
        <CardBody>
          {rows.length === 0 ? (
            <EmptyState title="No skills yet" description="Search the taxonomy on the right and add your first skill." />
          ) : (
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <span className="flex-1 text-sm font-medium text-slate-900">{nameOf(r.skill)}</span>
                  <Select
                    value={r.proficiency}
                    onChange={e => setRows(prev => prev.map((x, j) => (j === i ? { ...x, proficiency: e.target.value as Proficiency } : x)))}
                    className="w-40"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                  <button onClick={() => setRows(prev => prev.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove skill">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add from skill taxonomy</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <Input placeholder="Search skills or categories…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
            {filtered.slice(0, 60).map(s => (
              <button
                key={s.id}
                onClick={() => addSkill(s.id)}
                disabled={rows.some(r => r.skill === String(s.id))}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-teal-400 hover:bg-teal-50 disabled:opacity-40"
              >
                <Plus className="h-3 w-3" /> {s.name} <span className="text-slate-400">· {s.category}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">Duplicates are removed automatically (last proficiency wins).</p>
          <div className="flex gap-2">
            {rows.length > 0 && <Badge>{rows.length} selected</Badge>}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
