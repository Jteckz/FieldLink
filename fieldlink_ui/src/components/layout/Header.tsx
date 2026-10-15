import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useLogout } from "@/api/hooks";
import { getStoredUser, clearSession } from "@/auth/session";
import {
  GraduationCap, Building2, Shield, LayoutDashboard, User as UserIcon,
  FileText, Bookmark, Briefcase, LogOut, ChevronDown, Menu, X, Search,
} from "lucide-react";

interface NavItem { label: string; to: string; icon: ReactNode }

const studentNav: NavItem[] = [
  { label: "Dashboard", to: "/student", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Profile", to: "/student/profile", icon: <UserIcon className="h-4 w-4" /> },
  { label: "Skills", to: "/student/skills", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Preferences", to: "/student/preferences", icon: <Bookmark className="h-4 w-4" /> },
  { label: "My CV", to: "/student/cv", icon: <FileText className="h-4 w-4" /> },
  { label: "Saved", to: "/saved", icon: <Bookmark className="h-4 w-4" /> },
  { label: "Applications", to: "/applications", icon: <FileText className="h-4 w-4" /> },
];

const orgNav: NavItem[] = [
  { label: "Dashboard", to: "/org", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Verification", to: "/org/verification", icon: <Shield className="h-4 w-4" /> },
  { label: "Opportunities", to: "/org/opportunities", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Applications", to: "/org/applications", icon: <FileText className="h-4 w-4" /> },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Users", to: "/admin/users", icon: <UserIcon className="h-4 w-4" /> },
  { label: "Organizations", to: "/admin/organizations", icon: <Building2 className="h-4 w-4" /> },
  { label: "Opportunities", to: "/admin/opportunities", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Audit Log", to: "/admin/audit-log", icon: <FileText className="h-4 w-4" /> },
];

export function Header() {
  const user = getStoredUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const nav = user?.role === "student" ? studentNav : user?.role === "organization" ? orgNav : user?.role === "admin" ? adminNav : [];
  const qc = useQueryClient();
  const logoutMutation = useLogout();
  const roleLabel = user?.role === "student" ? "Student" : user?.role === "organization" ? "Organization" : user?.role === "admin" ? "Admin" : "";
  const roleIcon = user?.role === "student" ? <GraduationCap className="h-4 w-4" /> : user?.role === "organization" ? <Building2 className="h-4 w-4" /> : user?.role === "admin" ? <Shield className="h-4 w-4" /> : null;

  const handleLogout = async () => {
    try { await logoutMutation.mutateAsync(); } catch { /* apiLogout already clears session */ }
    clearSession();
    qc.clear();
    setMenuOpen(false);
    navigate("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-navy font-sans text-base font-extrabold text-white">
                F
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-ink">
                Fieldlink
              </span>
            </Link>
            {user && nav.length > 0 && (
              <nav className="hidden items-center gap-6 lg:flex">
                {nav.map(item => {
                  const active = location.pathname === item.to || (item.to !== "/student" && item.to !== "/org" && item.to !== "/admin" && location.pathname.startsWith(item.to));
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-2 text-sm transition-colors",
                        active ? "font-semibold text-ink" : "text-ink-soft hover:text-ink"
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
            {!user && (
              <nav className="hidden items-center gap-6 lg:flex">
                <Link to="/opportunities" className={cn("flex items-center gap-2 text-sm transition-colors", location.pathname.startsWith("/opportunities") ? "font-semibold text-ink" : "text-ink-soft hover:text-ink")}>
                  <Search className="h-4 w-4" />Opportunities
                </Link>
                <Link to="/organizations" className={cn("flex items-center gap-2 text-sm transition-colors", location.pathname.startsWith("/organizations") ? "font-semibold text-ink" : "text-ink-soft hover:text-ink")}>
                  <Building2 className="h-4 w-4" />Organizations
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!user && (
              <div className="hidden items-center gap-4 sm:flex">
                <Link to="/login" className="text-sm text-ink-soft transition-colors hover:text-ink">Log in</Link>
                <Link to="/register" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-navy">Sign up</Link>
              </div>
            )}
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:border-brand"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-brand">
                    {roleIcon}
                  </div>
                  <span className="hidden sm:inline">{roleLabel}</span>
                  <ChevronDown className="h-4 w-4 text-ink-soft" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-line bg-white p-2 shadow-lift">
                    <div className="px-3 py-2">
                      <p className="text-xs text-ink-soft">Signed in as</p>
                      <p className="truncate text-sm font-medium text-ink">{user.email}</p>
                    </div>
                    <div className="my-1 h-px bg-line/70" />
                    {user.role === "student" && <Link to="/student" className="block rounded-xl px-3 py-2 text-sm text-ink hover:bg-brand-soft">Dashboard</Link>}
                    {user.role === "organization" && <Link to="/org" className="block rounded-xl px-3 py-2 text-sm text-ink hover:bg-brand-soft">Dashboard</Link>}
                    {user.role === "admin" && <Link to="/admin" className="block rounded-xl px-3 py-2 text-sm text-ink hover:bg-brand-soft">Dashboard</Link>}
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="h-4 w-4" />Log out
                    </button>
                  </div>
                )}
              </div>
            )}
            {user && nav.length > 0 && (
              <button onClick={() => setMobileNavOpen(o => !o)} className="lg:hidden" aria-label="Menu">
                {mobileNavOpen ? <X className="h-5 w-5 text-ink" /> : <Menu className="h-5 w-5 text-ink" />}
              </button>
            )}
          </div>
        </div>
      </header>
      {user && mobileNavOpen && nav.length > 0 && (
        <div className="fixed inset-x-0 top-[60px] z-30 border-b border-line bg-paper lg:hidden">
          <nav className="mx-auto max-w-6xl px-5 py-3">
            {nav.map(item => {
              const active = location.pathname === item.to || (item.to !== "/student" && item.to !== "/org" && item.to !== "/admin" && location.pathname.startsWith(item.to));
              return (
                <Link key={item.to} to={item.to} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm", active ? "font-semibold text-ink" : "text-ink-soft hover:text-ink")}>
                  {item.icon}{item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
