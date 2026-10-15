import type { ApiErrorDetails } from "@/types";

export interface NormalizedError {
  code: string;
  message: string;
  details?: ApiErrorDetails | null;
  fieldErrors: Record<string, string[]>;
  status: number;
  isNetwork: boolean;
}

export function normalizeError(err: unknown): NormalizedError {
  const base: NormalizedError = {
    code: "unknown", message: "Something went wrong. Please try again.",
    fieldErrors: {}, status: 0, isNetwork: false,
  };

  if (!err || typeof err !== "object") return base;
  const e = err as Record<string, unknown>;
  const response = e.response as Record<string, unknown> | undefined;

  if (!response) {
    if (e.code === "ERR_NETWORK" || e.code === "ECONNABORTED") {
      base.isNetwork = true;
      base.code = "network_error";
      base.message = "Unable to reach the server. Please check your connection and try again.";
    }
    return base;
  }

  const status = (response.status as number) ?? 0;
  base.status = status;
  const raw = response.data as unknown;

  if (!raw) {
    if (status === 401) { base.code = "not_authenticated"; base.message = "Please log in to continue."; }
    else if (status === 403) { base.code = "permission_denied"; base.message = "You do not have permission to do this."; }
    else if (status === 404) { base.code = "not_found"; base.message = "The requested resource was not found."; }
    else if (status === 429) { base.code = "throttled"; base.message = "Too many requests. Please wait a moment and try again."; }
    return base;
  }

  if (typeof raw === "string") {
    if (raw.length > 0 && raw[0] === "<") {
      base.code = "network_error"; base.message = "Server error. Please try again later.";
    }
    return base;
  }

  const data = raw as Record<string, unknown>;

  if (data.refresh && typeof data.refresh === "string") {
    base.code = "not_authenticated"; base.message = "Your session has ended. Please log in again.";
    return base;
  }

  const error = data.error as Record<string, unknown> | undefined;
  if (error && error.code && error.message) {
    base.code = error.code as string;
    base.message = error.message as string;
    const details = error.details as ApiErrorDetails | undefined;
    if (details) {
      base.details = details;
      const fe: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(details)) {
        if (Array.isArray(v)) fe[k] = v as string[];
      }
      base.fieldErrors = fe;
    }
    return base;
  }

  if (data.details && typeof data.details === "object") {
    const details = data.details as Record<string, unknown>;
    const fe: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(details)) {
      if (Array.isArray(v)) fe[k] = v as string[];
    }
    base.fieldErrors = fe;
    base.message = (data.message as string) ?? "Validation failed.";
    base.code = (data.code as string) ?? "validation_error";
    return base;
  }

  if (status === 400) { base.code = "validation_error"; base.message = "Please correct the errors below."; }
  else if (status === 401) { base.code = "not_authenticated"; base.message = "Please log in to continue."; }
  else if (status === 403) { base.code = "permission_denied"; base.message = "You do not have permission to do this."; }
  else if (status === 404) { base.code = "not_found"; base.message = "Not found."; }
  else if (status === 405) { base.code = "method_not_allowed"; base.message = "This action is not supported."; }
  else if (status === 409) { base.code = "conflict"; base.message = "This item already exists."; }
  else if (status === 429) { base.code = "throttled"; base.message = "Too many requests. Please wait and try again."; }

  return base;
}
