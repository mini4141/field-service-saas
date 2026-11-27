import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JobCard } from "./JobCard";

describe("JobCard", () => {
  it("shows the job title, customer, address and status", () => {
    render(
      <JobCard job={{ id: "1", title: "Office deep clean", status: "scheduled", address: "1-2-3 Shibuya", customer: { name: "Yamada" } }} />,
    );
    expect(screen.getByText("Office deep clean")).toBeTruthy();
    expect(screen.getByText("Yamada")).toBeTruthy();
    expect(screen.getByText("1-2-3 Shibuya")).toBeTruthy();
    expect(screen.getByText("scheduled")).toBeTruthy();
  });
});
