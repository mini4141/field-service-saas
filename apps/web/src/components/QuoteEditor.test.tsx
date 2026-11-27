import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuoteEditor } from "./QuoteEditor";

describe("QuoteEditor", () => {
  it("renders the computed total for the line items", () => {
    render(
      <QuoteEditor
        initial={[
          { description: "Deep cleaning", qty: 1, unitPrice: 30000, taxPercent: 10 },
          { description: "Windows", qty: 2, unitPrice: 6000, taxPercent: 0 },
        ]}
      />,
    );
    expect(screen.getByTestId("quote-total").textContent).toBe("Total: ¥45,000");
  });
});
