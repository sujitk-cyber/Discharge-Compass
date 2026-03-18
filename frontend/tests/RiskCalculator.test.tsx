import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RiskCalculatorPage from "../app/risk-calculator/page";

vi.mock("../lib/api", () => ({
  fetchJson: vi.fn(async () => ({
    probability: 0.42,
    risk_tier: "medium",
    top_features: [
      { feature: "time_in_hospital", contribution: 0.1, direction: "increases_risk" },
    ],
    caution: "Test caution",
  })),
}));

describe("RiskCalculator", () => {
  it("submits and renders prediction", async () => {
    render(<RiskCalculatorPage />);

    const button = screen.getByRole("button", { name: /predict risk/i });
    fireEvent.click(button);

    expect(await screen.findByText(/Probability/i)).toBeInTheDocument();
    expect(await screen.findByText(/medium/i)).toBeInTheDocument();
    expect(await screen.findByText(/time_in_hospital/i)).toBeInTheDocument();
  });
});
