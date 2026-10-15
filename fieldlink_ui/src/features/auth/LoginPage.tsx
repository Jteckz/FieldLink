import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Field";
import { useLogin } from "@/api/hooks";
import { useToast } from "@/components/ui/Toast";
import { normalizeError } from "@/api/errors";
import type { Role } from "@/types";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { show } = useToast();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError("");
    try {
      const res = await login.mutateAsync({ email, password });
      show("Welcome back!", "success");
      const role: Role = res.user.role;
      const home = role === "student" ? "/student" : role === "organization" ? "/org" : role === "admin" ? "/admin" : "/";
      navigate(from ?? home, { replace: true });
    } catch (err) {
      const ne = normalizeError(err);
      if (ne.fieldErrors.non_field_errors) setGeneralError(ne.fieldErrors.non_field_errors[0]);
      else if (ne.fieldErrors.email) setErrors({ email: ne.fieldErrors.email[0] });
      else setGeneralError(ne.message);
    }
  };

  const fillDemo = (demoEmail: string) => { setEmail(demoEmail); setPassword("Demo-Pass-12345"); };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-navy font-sans text-xl font-extrabold text-white">
            F
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-ink-soft">Sign in to your Fieldlink account</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {generalError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email" required htmlFor="email" error={errors.email}>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" error={!!errors.email} autoComplete="email" required />
            </FormField>
            <FormField label="Password" required htmlFor="password">
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
            </FormField>
            <Button type="submit" className="w-full" loading={login.isPending}>Sign in</Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-medium text-slate-400">Demo accounts (click to fill):</p>
            <div className="flex flex-wrap gap-2">
              {["admin@demo.tz", "student@demo.tz", "hr@demo.tz"].map(d => (
                <button key={d} onClick={() => fillDemo(d)} className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account? <Link to="/register" className="link-teal">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
