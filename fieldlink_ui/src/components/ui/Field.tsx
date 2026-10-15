import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const baseField = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors disabled:bg-brand-soft/50 disabled:text-ink-soft";

export function FormField({ label, error, required, hint, children, htmlFor }: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-soft/80">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Input({ className, error, ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input className={cn(baseField, error && "border-red-400 focus:border-red-500 focus:ring-red-500/20", className)} {...rest} />;
}

export function TextArea({ className, error, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return <textarea className={cn(baseField, "resize-y", error && "border-red-400 focus:border-red-500 focus:ring-red-500/20", className)} {...rest} />;
}

export function Select({ className, error, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return <select className={cn(baseField, "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2364748b%22%20strokeWidth%3D%222%22%3E%3Cpath%20strokeLinecap%3D%22round%22%20strokeLinejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22/%3E%3C/svg%3E')] bg-[right_0.5rem_center] bg-[length_1.5em_1.5em] bg-no-repeat pr-9", error && "border-red-400 focus:border-red-500 focus:ring-red-500/20", className)} {...rest}>{children}</select>;
}

export function Checkbox({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={cn("h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500", className)} {...rest} />;
}
