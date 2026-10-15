const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
const rawBase = (envBase || "http://localhost:8000/api/v1").replace(/\/+$/, "");
export const API_BASE_URL = rawBase.endsWith("/api/v1") ? rawBase : `${rawBase}/api/v1`;
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "false") === "true";
// Opt-in mock only: VITE_USE_MOCK=true. Default is the living Django backend.
