import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/Confirm";
import { getRefreshToken, getStoredUser, clearSession } from "@/auth/session";
import { apiMe } from "@/api/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return count < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

/** Restores session from persisted refresh token via GET /auth/me/. */
function SessionRestore() {
  useEffect(() => {
    if (getStoredUser() || !getRefreshToken()) return;
    apiMe().catch(() => clearSession());
  }, []);

  useEffect(() => {
    const onExpired = () => {
      clearSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <SessionRestore />
          {children}
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export { queryClient };
