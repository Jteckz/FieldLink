import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { getStoredUser } from "@/auth/session";
import type { Role } from "@/types";

export function RequireAuth({ children }: { children: ReactNode }) {
  const user = getStoredUser();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = getStoredUser();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!roles.includes(user.role)) {
    const home = user.role === "student" ? "/student" : user.role === "organization" ? "/org" : user.role === "admin" ? "/admin" : "/";
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}
