import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireRole } from "@/auth/RequireAuth";
import { setStoredUser, clearSession } from "@/auth/session";
import type { User } from "@/types";

const student: User = {
  id: 2, email: "student@demo.tz", role: "student",
  is_active: true, date_joined: "2026-09-15T10:00:00+03:00",
};

function Harness({ roles }: { roles: User["role"][] }) {
  return (
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/login" element={<div>login-page</div>} />
        <Route path="/student" element={<div>student-home</div>} />
        <Route
          path="/protected"
          element={
            <RequireRole roles={roles}>
              <div>protected-content</div>
            </RequireRole>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireRole", () => {
  it("redirects anonymous users to login", () => {
    clearSession();
    render(<Harness roles={["student"]} />);
    expect(screen.getByText("login-page")).toBeInTheDocument();
  });

  it("renders content for an allowed role", () => {
    setStoredUser(student);
    render(<Harness roles={["student"]} />);
    expect(screen.getByText("protected-content")).toBeInTheDocument();
    clearSession();
  });

  it("redirects a wrong-role user to their own home", () => {
    setStoredUser(student);
    render(<Harness roles={["organization"]} />);
    expect(screen.getByText("student-home")).toBeInTheDocument();
    clearSession();
  });
});
