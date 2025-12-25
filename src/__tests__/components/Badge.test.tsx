import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders with children", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders with default variant by default", () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-slate-800", "text-slate-300");
  });

  it("renders with primary variant", () => {
    render(
      <Badge variant="primary" data-testid="badge">
        Primary
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-purple-500/20", "text-purple-300");
  });

  it("renders with secondary variant", () => {
    render(
      <Badge variant="secondary" data-testid="badge">
        Secondary
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-amber-500/20", "text-amber-300");
  });

  it("renders with success variant", () => {
    render(
      <Badge variant="success" data-testid="badge">
        Success
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-emerald-500/20", "text-emerald-300");
  });

  it("renders with warning variant", () => {
    render(
      <Badge variant="warning" data-testid="badge">
        Warning
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-orange-500/20", "text-orange-300");
  });

  it("applies custom className", () => {
    render(
      <Badge className="custom-class" data-testid="badge">
        Custom
      </Badge>
    );
    expect(screen.getByTestId("badge")).toHaveClass("custom-class");
  });

  it("has proper base styles", () => {
    render(<Badge data-testid="badge">Styled</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("inline-flex", "rounded-full", "text-xs");
  });
});
