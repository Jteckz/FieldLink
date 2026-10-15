import { beforeEach, describe, expect, it } from "vitest";
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  getStoredUser,
  setStoredUser,
  clearSession,
} from "@/auth/session";
import type { User } from "@/types";

const user: User = {
  id: 2,
  email: "student@demo.tz",
  role: "student",
  is_active: true,
  date_joined: "2026-09-15T10:00:00+03:00",
};

describe("session storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("keeps the access token in session storage only", () => {
    setAccessToken("access-123");
    expect(getAccessToken()).toBe("access-123");
    expect(localStorage.getItem("__access_token")).toBeNull();
  });

  it("persists only the refresh token in local storage", () => {
    setRefreshToken("refresh-123");
    expect(getRefreshToken()).toBe("refresh-123");
    expect(sessionStorage.getItem("__refresh_token")).toBeNull();
  });

  it("round-trips the stored user", () => {
    setStoredUser(user);
    expect(getStoredUser()).toMatchObject({ email: "student@demo.tz", role: "student" });
  });

  it("clears everything on logout", () => {
    setAccessToken("a");
    setRefreshToken("r");
    setStoredUser(user);
    clearSession();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it("returns null for a corrupt stored user instead of throwing", () => {
    sessionStorage.setItem("__current_user", "{not-json");
    expect(getStoredUser()).toBeNull();
  });
});
