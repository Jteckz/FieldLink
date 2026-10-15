import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StatusPill } from "@/components/layout/StatusPill";
import { PaginationControls } from "@/components/layout/PaginationControls";
import type { ApiList } from "@/types";

afterEach(cleanup);

describe("StatusPill", () => {
  it("pairs every status with text (never color alone)", () => {
    render(<StatusPill status="pending_review" />);
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });

  it("renders application, verification, and archived states", () => {
    const { rerender } = render(<StatusPill status="interview" type="application" />);
    expect(screen.getByText("Interview")).toBeInTheDocument();
    rerender(<StatusPill status="verified" type="verification" />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    rerender(<StatusPill status="archived" />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });
});

describe("PaginationControls", () => {
  const page: ApiList<unknown> = { count: 45, next: "?page=3", previous: "?page=1", results: [] };

  it("shows count, current page, and total pages", () => {
    const noop = () => undefined;
    render(<PaginationControls data={page} page={2} pageSize={20} onPageChange={noop} />);
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
  });

  it("disables previous on the first page", () => {
    const noop = () => undefined;
    const first: ApiList<unknown> = { count: 45, next: "?page=2", previous: null, results: [] };
    render(<PaginationControls data={first} page={1} pageSize={20} onPageChange={noop} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });
});
