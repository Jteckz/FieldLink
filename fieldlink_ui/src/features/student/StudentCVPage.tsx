import { useRef, useState } from "react";
import { Upload, Download, FileText } from "lucide-react";
import { useStudentCVs, useUploadCV, downloadCV } from "@/api/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { normalizeError } from "@/api/errors";
import { formatFileSize, formatDateTime } from "@/lib/utils";

const ACCEPT = ".pdf,.doc,.docx";
const MAX_BYTES = 5 * 1024 * 1024;

function signatureOk(file: File, buf: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buf);
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  }
  if (name.endsWith(".docx")) {
    return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04; // PK..
  }
  if (name.endsWith(".doc")) {
    return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  }
  return false;
}

export function StudentCVPage() {
  const { data: cvs, isLoading, isError } = useStudentCVs();
  const upload = useUploadCV();
  const { show } = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <LoadingState label="Loading CVs…" />;
  if (isError) return <ErrorState title="Unable to load CVs" description="Please try again." />;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    if (!ext || !["pdf", "doc", "docx"].includes(ext)) { show("Only PDF, DOC, and DOCX files are allowed.", "error"); return; }
    if (file.size === 0) { show("File is empty.", "error"); return; }
    if (file.size > MAX_BYTES) { show("File must be 5MB or smaller.", "error"); return; }
    const head = await file.slice(0, 8).arrayBuffer();
    if (!signatureOk(file, head)) { show("File content doesn't match its extension.", "error"); return; }
    try {
      await upload.mutateAsync(file);
      show("CV uploaded — a new version was created.", "success");
    } catch (err) {
      show(normalizeError(err).message, "error");
    }
  };

  const handleDownload = async (cvId: number, filename: string) => {
    setDownloading(cvId);
    try {
      await downloadCV(cvId, filename);
    } catch (err) {
      show(normalizeError(err).message, "error");
    } finally {
      setDownloading(null);
    }
  };

  const sorted = [...(cvs ?? [])].sort((a, b) => b.version - a.version);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My CV" description="Upload a new version anytime. Older versions stay available; applications keep a snapshot." />

      <Card>
        <CardBody>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${dragOver ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-slate-50"}`}
          >
            <Upload className="mb-3 h-8 w-8 text-slate-400" />
            <p className="font-medium text-slate-900">Drag & drop your CV here, or</p>
            <Button className="mt-3" variant="outline" onClick={() => fileRef.current?.click()} loading={upload.isPending}>
              <FileText className="h-4 w-4" /> Choose file
            </Button>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            <p className="mt-3 text-xs text-slate-400">PDF, DOC, DOCX · max 5MB · validated by file signature</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Version history ({sorted.length})</CardTitle></CardHeader>
        <CardBody>
          {sorted.length === 0 ? (
            <EmptyState title="No CV yet" description="Upload your first CV to strengthen your applications." />
          ) : (
            <div className="space-y-3">
              {sorted.map(cv => (
                <div key={cv.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{cv.original_name}</p>
                      {cv.is_current && <Badge variant="success">Current</Badge>}
                      <Badge variant={cv.parsed_status === "done" ? "info" : cv.parsed_status === "failed" ? "error" : "neutral"}>
                        {cv.parsed_status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">v{cv.version} · {formatFileSize(cv.size)} · {formatDateTime(cv.uploaded_at)}</p>
                  </div>
                  <Button variant="outline" size="sm" loading={downloading === cv.id} onClick={() => handleDownload(cv.id, cv.original_name)}>
                    <Download className="h-4 w-4" /> Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
