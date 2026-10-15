import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Building2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, FormField } from "@/components/ui/Field";
import { useRegister } from "@/api/hooks";
import { useToast } from "@/components/ui/Toast";
import { normalizeError } from "@/api/errors";
import type { AccountType } from "@/types";
import { cn } from "@/lib/utils";

export function RegisterPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const register = useRegister();
  const [role, setRole] = useState<"student" | "organization">("student");
  const [accountType, setAccountType] = useState<AccountType>("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError("");
    if (password.length < 8) { setErrors({ password: "Password must be at least 8 characters." }); return; }
    try {
      await register.mutateAsync({
        email, password, role,
        account_type: role === "student" ? accountType : undefined,
        full_name: role === "student" ? fullName : undefined,
      });
      show("Account created! Please log in.", "success");
      navigate("/login");
    } catch (err) {
      const ne = normalizeError(err);
      if (ne.fieldErrors.email) setErrors({ email: ne.fieldErrors.email[0] });
      else if (ne.fieldErrors.password) setErrors({ password: ne.fieldErrors.password[0] });
      else if (ne.fieldErrors.full_name) setErrors({ full_name: ne.fieldErrors.full_name[0] });
      else setGeneralError(ne.message);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-navy font-sans text-xl font-extrabold text-white">
            F
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">Create your account</h1>
          <p className="mt-2 text-sm text-ink-soft">One account for students and organisations.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {/* Role selector */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">I am a…</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                  role === "student" ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <GraduationCap className="h-6 w-6" />
                <span className="text-sm font-medium">Student</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("organization")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                  role === "organization" ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <Building2 className="h-6 w-6" />
                <span className="text-sm font-medium">Organization</span>
              </button>
            </div>
          </div>

          {generalError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {role === "student" && (
              <>
                <FormField label="Full name" required htmlFor="full_name" error={errors.full_name}>
                  <Input id="full_name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Amina Juma" error={!!errors.full_name} required />
                </FormField>
                <FormField label="Account type" required htmlFor="account_type" hint="Select 'student' if currently enrolled, or 'graduate' if you've completed your studies.">
                  <Select id="account_type" value={accountType} onChange={e => setAccountType(e.target.value as AccountType)}>
                    <option value="student">Student (currently enrolled)</option>
                    <option value="graduate">Graduate (completed studies)</option>
                  </Select>
                </FormField>
              </>
            )}
            <FormField label="Email" required htmlFor="email" error={errors.email}>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" error={!!errors.email} autoComplete="email" required />
            </FormField>
            <FormField label="Password" required htmlFor="password" error={errors.password} hint="At least 8 characters.">
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" error={!!errors.password} autoComplete="new-password" required />
            </FormField>
            <Button type="submit" className="w-full" loading={register.isPending}>Create account</Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="link-teal">Log in</Link>
        </p>
      </div>
    </div>
  );
}
