/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceDisplay } from "./PriceDisplay";
import { StatusChip } from "./StatusChip";
import { formatCurrency, formatDate } from "./formatters";

describe("common display components and formatters", () => {
  it("formats currencies and dates", () => {
    expect(formatCurrency(1234)).toContain("1,234");
    expect(formatCurrency(1234, "USD")).toContain("1,234");
    expect(
      formatDate("2025-01-15T12:00:00.000Z", { timeZone: "UTC", year: "numeric" }),
    ).toContain("2025");
  });

  it("renders a formatted price with typography props", () => {
    render(<PriceDisplay amount={1234} currency="AED" data-testid="price" />);
    expect(screen.getByTestId("price")).toHaveTextContent(
      formatCurrency(1234, "AED").replace(/\s+/g, " "),
    );
  });

  it("renders known and humanized unknown statuses", () => {
    render(
      <>
        <StatusChip status="pending_payment" />
        <StatusChip status="awaiting_review" />
      </>,
    );
    expect(screen.getByText("Payment pending")).toBeInTheDocument();
    expect(screen.getByText("awaiting review")).toBeInTheDocument();
  });
});
