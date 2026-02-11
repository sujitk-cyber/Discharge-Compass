import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Navigation from "../components/Navigation";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("Navigation", () => {
  it("renders primary links", () => {
    render(<Navigation />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Risk Calculator")).toBeInTheDocument();
    expect(screen.getByText("Cohort Analytics")).toBeInTheDocument();
    expect(screen.getByText("Fairness")).toBeInTheDocument();
    expect(screen.getByText("Model Card")).toBeInTheDocument();
  });
});
