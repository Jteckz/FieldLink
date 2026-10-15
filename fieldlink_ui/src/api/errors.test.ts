import { describe, expect, it } from "vitest";
import { normalizeError } from "@/api/errors";

function axiosErr(status: number, data: unknown) {
  return { response: { status, data } };
}

describe("normalizeError", () => {
  it("uses the backend error envelope", () => {
    const ne = normalizeError(
      axiosErr(400, {
        error: {
          code: "already_applied",
          message: "You have already applied.",
          details: {},
        },
      })
    );
    expect(ne.code).toBe("already_applied");
    expect(ne.message).toBe("You have already applied.");
  });

  it("maps details arrays to field errors", () => {
    const ne = normalizeError(
      axiosErr(400, {
        error: {
          code: "validation_error",
          message: "Validation failed.",
          details: { email: ["An account with this email already exists."] },
        },
      })
    );
    expect(ne.fieldErrors.email).toEqual(["An account with this email already exists."]);
  });

  it("exposes missing_fields for profile-incomplete flows", () => {
    const ne = normalizeError(
      axiosErr(400, {
        error: {
          code: "profile_incomplete",
          message: "Please complete your profile.",
          details: { missing_fields: ["phone", "institution"] },
        },
      })
    );
    expect(ne.code).toBe("profile_incomplete");
    expect(ne.details).toMatchObject({ missing_fields: ["phone", "institution"] });
  });

  it("handles the special logout shape as session expiry", () => {
    const ne = normalizeError(axiosErr(400, { refresh: "Invalid or expired token." }));
    expect(ne.code).toBe("not_authenticated");
  });

  it("maps HTML responses to a connectivity message", () => {
    const ne = normalizeError(axiosErr(500, "<html><body>Server Error</body></html>"));
    expect(ne.code).toBe("network_error");
    expect(ne.message).not.toContain("<html>");
  });

  it("maps network failures to a connectivity message", () => {
    const ne = normalizeError({ code: "ERR_NETWORK", message: "Network Error" });
    expect(ne.isNetwork).toBe(true);
    expect(ne.message).toMatch(/connection/i);
  });

  it("maps throttling to a wait-and-retry message", () => {
    const ne = normalizeError(axiosErr(429, null));
    expect(ne.code).toBe("throttled");
    expect(ne.message).toMatch(/wait/i);
  });
});
