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
    expect(badge).toHaveClass("border-filete/30", "text-letra-suave");
  });

  it("renders with primary variant", () => {
    render(
      <Badge variant="primary" data-testid="badge">
        Primary
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("text-letra-acento");
  });

  it("renders with secondary variant", () => {
    render(
      <Badge variant="secondary" data-testid="badge">
        Secondary
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-filete", "text-suelo");
  });

  it("renders with success variant", () => {
    render(
      <Badge variant="success" data-testid="badge">
        Success
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("text-letra-exito");
  });

  it("renders with warning variant", () => {
    render(
      <Badge variant="warning" data-testid="badge">
        Warning
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-rosa-luz", "text-tinta");
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
    expect(badge).toHaveClass("inline-flex", "rounded-full", "font-dato", "uppercase", "text-[0.6875rem]");
  });
});
