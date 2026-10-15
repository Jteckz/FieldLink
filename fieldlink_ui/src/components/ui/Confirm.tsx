import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger" | "success";
  onConfirm: () => void | Promise<void>;
}

const ConfirmCtx = createContext<{ confirm: (opts: ConfirmOptions) => void } | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [pending, setPending] = useState(false);

  const confirm = useCallback((o: ConfirmOptions) => setOpts(o), []);

  const handleConfirm = async () => {
    if (!opts) return;
    setPending(true);
    try { await opts.onConfirm(); } finally { setPending(false); setOpts(null); }
  };

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !pending && setOpts(null)} />
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{opts.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{opts.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpts(null)} disabled={pending}>{opts.cancelLabel ?? "Cancel"}</Button>
              <Button variant={opts.variant ?? "primary"} loading={pending} onClick={handleConfirm}>{opts.confirmLabel ?? "Confirm"}</Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
