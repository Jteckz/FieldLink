import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config";
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearSession,
} from "@/auth/session";

/**
 * Centralized Axios client per frontend.md §10.
 * - JSON by default (multipart only for CV upload)
 * - Automatic bearer attachment
 * - Exactly one silent refresh + one retry after a 401
 * - No token logging
 */
export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const rt = getRefreshToken();
      if (!rt) return null;
      try {
        // Bypass interceptors to avoid recursion
        const res = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh: rt });
        const access = res.data?.access as string | undefined;
        const refresh = res.data?.refresh as string | undefined;
        if (!access) return null;
        setAccessToken(access);
        if (refresh) setRefreshToken(refresh); // rotation: always replace
        return access;
      } catch {
        return null;
      } finally {
        // allow future refresh attempts after this one settles
        setTimeout(() => { refreshing = null; }, 0);
      }
    })();
  }
  return refreshing;
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    // Exactly one silent refresh + one retry for 401s (but never for the auth endpoints themselves)
    const url = original?.url ?? "";
    const isAuthCall =
      url.includes("/auth/login/") ||
      url.includes("/auth/register/") ||
      url.includes("/auth/refresh/");

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      const newAccess = await doRefresh();
      if (newAccess) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
        return http.request(original);
      }
      clearSession();
      // Signal session expiry; callers redirect to /login
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    return Promise.reject(error);
  }
);

export default http;
