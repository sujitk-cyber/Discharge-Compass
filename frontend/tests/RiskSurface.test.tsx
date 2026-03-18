import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RiskSurfacePage from "../app/risk-surface/page";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: ReactNode }) => <div data-testid="canvas">{children}</div>,
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
}));

vi.mock("../lib/api", () => ({
  fetchJson: vi.fn(async () => ({
    feature_x: "time_in_hospital",
    feature_y: "num_medications",
    x_values: [1, 2],
    y_values: [1, 2],
    z_matrix: [
      [0.1, 0.2],
      [0.2, 0.3],
    ],
  })),
}));

describe("RiskSurface", () => {
  it("renders dropdowns and mounts canvas after generate", async () => {
    render(<RiskSurfacePage />);

    expect(screen.getByText(/Feature X/i)).toBeInTheDocument();
    expect(screen.getByText(/Feature Y/i)).toBeInTheDocument();
    expect(screen.getByText(/Select two features/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    expect(await screen.findByTestId("canvas")).toBeInTheDocument();
  });
});
