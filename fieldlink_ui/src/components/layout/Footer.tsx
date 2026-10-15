import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-navy bg-navy text-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-brand font-sans text-xs font-extrabold text-brand-foreground">
            F
          </span>
          <span className="font-display text-sm font-bold tracking-tight">
            Fieldlink
          </span>
          <span className="text-xs text-paper/60">Student placements across Tanzania — run as a public utility.</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-paper/70">
          <Link to="/opportunities" className="transition-colors hover:text-paper">Opportunities</Link>
          <Link to="/organizations" className="transition-colors hover:text-paper">Organizations</Link>
          <Link to="/login" className="transition-colors hover:text-paper">Log in</Link>
        </div>
      </div>
    </footer>
  );
}
