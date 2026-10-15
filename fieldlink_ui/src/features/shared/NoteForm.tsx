import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, FormField } from "@/components/ui/Field";

export function NoteForm({ label = "Note", required, placeholder, confirmLabel = "Submit", onSubmit, pending }: {
  label?: string;
  required?: boolean;
  placeholder?: string;
  confirmLabel?: string;
  pending?: boolean;
  onSubmit: (note: string) => void | Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (required && !note.trim()) {
      setError("A note is required for this action.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await onSubmit(note.trim());
      setNote("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <FormField label={label} required={required} error={error}>
        <TextArea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={placeholder ?? "Add an explanatory note (written to the audit log)…"}
        />
      </FormField>
      <Button type="submit" size="sm" loading={busy || pending}>{confirmLabel}</Button>
    </form>
  );
}
