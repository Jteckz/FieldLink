import type { User } from "@/types";

const ACCESS_KEY = "__access_token";
const REFRESH_KEY = "__refresh_token";
const USER_KEY = "__current_user";

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_KEY);
}
export function setAccessToken(token: string) {
  sessionStorage.setItem(ACCESS_KEY, token);
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_KEY, token);
}
export function getStoredUser(): User | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as User; } catch { return null; }
}
export function setStoredUser(user: User | null) {
  if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  else sessionStorage.removeItem(USER_KEY);
}
export function clearSession() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
